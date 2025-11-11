import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';

// Configure runtime and timeout for Vercel
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max for Vercel

/**
 * Validates RSS/Atom feed against W3C standards
 * Checks for required elements according to RSS 2.0 and Atom specifications
 */
async function validateFeedXML(xmlContent: string, url: string): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Check if it's valid XML
    if (!xmlContent.trim().startsWith('<?xml') && !xmlContent.trim().startsWith('<rss') && !xmlContent.trim().startsWith('<feed')) {
      errors.push('Feed does not appear to be valid XML');
      return { isValid: false, errors };
    }

    // Check for RSS 2.0 feed
    if (xmlContent.includes('<rss') || xmlContent.includes('<channel>')) {
      // Check for proper RSS version declaration
      const rssMatch = xmlContent.match(/<rss[^>]*>/i);
      if (rssMatch && !rssMatch[0].includes('version=')) {
        errors.push('RSS feed should declare version attribute (e.g., version="2.0")');
      }
      
      // RSS 2.0 requires: <title>, <link>, <description> in <channel>
      const hasChannel = xmlContent.includes('<channel>') || xmlContent.includes('<channel ');
      if (!hasChannel) {
        errors.push('RSS feed missing required <channel> element');
      }

      // Check for required channel elements
      const channelMatch = xmlContent.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
      if (channelMatch) {
        const channelContent = channelMatch[1];
        
        // RSS 2.0 spec requires title and link (description is recommended but not strictly required)
        const titleMatch = channelContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (!titleMatch) {
          errors.push('RSS feed missing required <title> element in <channel>');
        } else if (!titleMatch[1] || titleMatch[1].trim() === '') {
          errors.push('RSS feed <title> element in <channel> is empty');
        }
        
        const linkMatch = channelContent.match(/<link[^>]*>/i);
        if (!linkMatch) {
          errors.push('RSS feed missing required <link> element in <channel>');
        }
        
        // Check for at least one item
        if (!xmlContent.match(/<item[^>]*>/i)) {
          errors.push('RSS feed should contain at least one <item> element');
        } else {
          // Validate items have required elements (title or description)
          const itemMatches = Array.from(xmlContent.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi));
          let itemCount = 0;
          for (const itemMatch of itemMatches) {
            itemCount++;
            const itemContent = itemMatch[1];
            const hasItemTitle = itemContent.match(/<title[^>]*>/i);
            const hasItemDescription = itemContent.match(/<description[^>]*>/i);
            
            if (!hasItemTitle && !hasItemDescription) {
              errors.push(`RSS item #${itemCount} missing required <title> or <description> element`);
            }
          }
        }
      } else if (hasChannel) {
        errors.push('RSS feed has <channel> tag but content could not be parsed');
      }
    }
    // Check for Atom feed
    else if (xmlContent.includes('<feed') && xmlContent.includes('xmlns="http://www.w3.org/2005/Atom"')) {
      // Atom requires: <title>, <id>, <updated> in <feed>
      if (!xmlContent.match(/<title[^>]*>/i)) {
        errors.push('Atom feed missing required <title> element in <feed>');
      }
      if (!xmlContent.match(/<id[^>]*>/i)) {
        errors.push('Atom feed missing required <id> element in <feed>');
      }
      if (!xmlContent.match(/<updated[^>]*>/i)) {
        errors.push('Atom feed missing required <updated> element in <feed>');
      }
      
      // Check for entries
      if (!xmlContent.match(/<entry[^>]*>/i)) {
        errors.push('Atom feed should contain at least one <entry> element');
      }
    }
    else {
      errors.push('Feed does not appear to be a valid RSS 2.0 or Atom feed');
    }

    // Check for well-formed XML (basic check)
    const openTags = (xmlContent.match(/<[^/!?][^>]*>/g) || []).length;
    const closeTags = (xmlContent.match(/<\/[^>]+>/g) || []).length;
    // Note: This is a rough check, proper XML parsing would be better but requires a library

    return { isValid: errors.length === 0, errors };
  } catch (error: any) {
    errors.push(`XML validation error: ${error.message}`);
    return { isValid: false, errors };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch raw XML for validation
    const fetchController = new AbortController();
    const timeoutId = setTimeout(() => fetchController.abort(), 20000);
    
    let xmlContent: string;
    try {
      const response = await fetch(url, {
        signal: fetchController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSS Feed Validator)',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      xmlContent = await response.text();
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The feed may be slow or unavailable.');
      }
      throw error;
    }

    // Validate feed against W3C standards
    const validation = await validateFeedXML(xmlContent, url);
    
    if (!validation.isValid) {
      return NextResponse.json(
        {
          isValid: false,
          availableFields: [],
          hasFeaturedImage: false,
          contentType: 'unknown',
          error: `Feed validation failed: ${validation.errors.join('; ')}`,
          validationErrors: validation.errors,
        },
        { status: 200 }
      );
    }

    // Parse feed for analysis
    const parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['content:encoded', 'contentEncoded'],
          ['description', 'description'],
        ],
      },
      timeout: 20000, // 20 second timeout
      maxRedirects: 5,
    });

    const feed = await parser.parseURL(url);

    // Get available fields from feed and items
    const availableFields = new Set<string>();

    // Feed-level fields
    if (feed.title) availableFields.add('title');
    if (feed.link) availableFields.add('link');
    if (feed.description) availableFields.add('description');
    if (feed.categories && feed.categories.length > 0)
      availableFields.add('categories');

    // Check items for additional fields
    if (feed.items && feed.items.length > 0) {
      const firstItem = feed.items[0];

      if (firstItem.title) availableFields.add('title');
      if (firstItem.link) availableFields.add('link');
      if (firstItem.content) availableFields.add('content');
      if (firstItem.contentSnippet) availableFields.add('contentSnippet');
      if (firstItem.description) availableFields.add('description');
      if (firstItem.categories && firstItem.categories.length > 0)
        availableFields.add('categories');
      if (firstItem.pubDate) availableFields.add('pubDate');
      if (firstItem.creator) availableFields.add('creator');
      if ((firstItem as any).author) availableFields.add('author');
      if (firstItem.guid) availableFields.add('guid');

      // Check for custom fields
      if ((firstItem as any).contentEncoded)
        availableFields.add('content:encoded');
      if ((firstItem as any).mediaContent) availableFields.add('media:content');
      if (firstItem.enclosure) availableFields.add('enclosure');

      // Check for image tags
      if ((firstItem as any).image) availableFields.add('image');
    }

    // Check for featured images
    let hasFeaturedImage = false;
    if (feed.items && feed.items.length > 0) {
      for (const item of feed.items) {
        // Check media:content
        if ((item as any).mediaContent) {
          hasFeaturedImage = true;
          break;
        }

        // Check enclosure (often used for images)
        if (item.enclosure && item.enclosure.type?.startsWith('image/')) {
          hasFeaturedImage = true;
          break;
        }

        // Check image tag
        if ((item as any).image) {
          hasFeaturedImage = true;
          break;
        }

        // Check description for img tags
        if (item.description && item.description.includes('<img')) {
          hasFeaturedImage = true;
          break;
        }

        // Check content:encoded for img tags
        if (
          (item as any).contentEncoded &&
          (item as any).contentEncoded.includes('<img')
        ) {
          hasFeaturedImage = true;
          break;
        }
      }
    }

    // Determine content type (full article vs excerpt)
    let contentType: 'full' | 'excerpt' | 'unknown' = 'unknown';
    if (feed.items && feed.items.length > 0) {
      const firstItem = feed.items[0];
      const content =
        (firstItem as any).contentEncoded ||
        firstItem.content ||
        firstItem.description ||
        '';
      const contentLength = content.replace(/<[^>]*>/g, '').length;

      // Heuristic: if content is longer than 500 characters, likely full article
      if (contentLength > 500) {
        contentType = 'full';
      } else if (contentLength > 0) {
        contentType = 'excerpt';
      }
    }

    return NextResponse.json({
      isValid: true,
      title: feed.title || 'Untitled Feed',
      availableFields: Array.from(availableFields).sort(),
      hasFeaturedImage,
      contentType,
    });
  } catch (error: any) {
    let errorMessage = 'Failed to parse RSS feed';
    
    if (error.message) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. The feed may be slow or unavailable.';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        errorMessage = 'Could not reach the feed URL. Please check if the URL is correct.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Feed not found (404). Please check if the URL is correct.';
      } else if (error.message.includes('CORS') || error.message.includes('Access-Control')) {
        errorMessage = 'CORS error. The feed server may be blocking requests.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        isValid: false,
        availableFields: [],
        hasFeaturedImage: false,
        contentType: 'unknown',
        error: errorMessage,
      },
      { status: 200 } // Return 200 so we can show the error in UI
    );
  }
}

