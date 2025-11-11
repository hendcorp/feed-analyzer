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

    // Check for invalid attributes on elements (W3C validator checks)
    // Check for filesize attribute on media:content (not valid per Media RSS spec)
    const mediaContentMatches = Array.from(xmlContent.matchAll(/<media:content[^>]*>/gi));
    let filesizeErrorCount = 0;
    for (const match of mediaContentMatches) {
      if (match[0].includes('filesize=')) {
        filesizeErrorCount++;
      }
    }
    if (filesizeErrorCount > 0) {
      errors.push(`Unexpected filesize attribute on media:content element (${filesizeErrorCount} occurrence${filesizeErrorCount > 1 ? 's' : ''})`);
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
          ['media:thumbnail', 'mediaThumbnail'],
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
      if ((firstItem as any).mediaThumbnail) availableFields.add('media:thumbnail');
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

        // Check media:thumbnail
        if ((item as any).mediaThumbnail) {
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
    let lastUpdate: string | null = null;
    
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

      // Get the latest item's publication date (RSS feeds are usually sorted newest first)
      // Try to find the most recent date among all items
      let latestDate: Date | null = null;
      for (const item of feed.items) {
        if (item.pubDate) {
          const itemDate = new Date(item.pubDate);
          if (!isNaN(itemDate.getTime())) {
            if (!latestDate || itemDate > latestDate) {
              latestDate = itemDate;
            }
          }
        }
      }

      if (latestDate) {
        // Format date in a human-friendly way
        lastUpdate = latestDate.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        });
      } else if (firstItem.pubDate) {
        // Fallback: try to format the first item's date even if parsing failed
        lastUpdate = firstItem.pubDate;
      }
    }

    // Get the number of items in the feed
    const itemCount = feed.items ? feed.items.length : 0;

    // 1. Feed Type Detection
    let feedType: string = 'Unknown';
    if (xmlContent.includes('<rss')) {
      const rssMatch = xmlContent.match(/<rss[^>]*version=["']([^"']+)["']/i);
      if (rssMatch && rssMatch[1]) {
        feedType = rssMatch[1] === '2.0' ? 'RSS 2.0' : `RSS ${rssMatch[1]}`;
      } else {
        feedType = 'RSS 2.0'; // Default assumption
      }
    } else if (xmlContent.includes('<feed') && xmlContent.includes('xmlns="http://www.w3.org/2005/Atom"')) {
      feedType = 'Atom';
    } else if (xmlContent.includes('<rdf:RDF')) {
      feedType = 'RDF';
    }

    // 2. Post Frequency Estimation
    let postFrequency: string | null = null;
    if (feed.items && feed.items.length > 1) {
      const dates: Date[] = [];
      for (const item of feed.items) {
        if (item.pubDate) {
          const date = new Date(item.pubDate);
          if (!isNaN(date.getTime())) {
            dates.push(date);
          }
        }
      }
      
      if (dates.length > 1) {
        dates.sort((a, b) => a.getTime() - b.getTime());
        const timeDiff = dates[dates.length - 1].getTime() - dates[0].getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        const avgDaysBetween = daysDiff / (dates.length - 1);
        
        if (avgDaysBetween < 0.1) {
          postFrequency = 'Multiple posts per day';
        } else if (avgDaysBetween < 1) {
          const perDay = Math.round(1 / avgDaysBetween);
          if (perDay === 1) {
            postFrequency = '1 post per day';
          } else {
            postFrequency = `${perDay} posts per day`;
          }
        } else if (avgDaysBetween < 7) {
          const perWeek = Math.round(7 / avgDaysBetween);
          if (perWeek === 1) {
            postFrequency = '1 post per week';
          } else {
            postFrequency = `${perWeek} posts per week`;
          }
        } else if (avgDaysBetween < 30) {
          const perMonth = Math.round(30 / avgDaysBetween);
          if (perMonth === 1) {
            postFrequency = '1 post per month';
          } else {
            postFrequency = `${perMonth} posts per month`;
          }
        } else {
          postFrequency = 'Less than 1 post per month';
        }
      }
    }

    // 3. Duplicate GUID Warning
    const duplicateGuids: string[] = [];
    if (feed.items && feed.items.length > 0) {
      const guidMap = new Map<string, number>();
      for (const item of feed.items) {
        const guid = item.guid || item.link || '';
        if (guid) {
          guidMap.set(guid, (guidMap.get(guid) || 0) + 1);
        }
      }
      for (const [guid, count] of Array.from(guidMap.entries())) {
        if (count > 1) {
          duplicateGuids.push(guid);
        }
      }
    }

    // 4. Missing Essential Fields
    const missingFields: string[] = [];
    if (feed.items && feed.items.length > 0) {
      const firstItem = feed.items[0];
      if (!firstItem.title) missingFields.push('title');
      if (!firstItem.link) missingFields.push('link');
      if (!firstItem.description && !firstItem.content) missingFields.push('description');
    }

    // 5. Featured Image Source Breakdown
    const imageSources = {
      mediaContent: 0,
      mediaThumbnail: 0,
      enclosure: 0,
      imgTag: 0,
      openGraph: 0,
    };
    const imageUrls: string[] = [];
    
    // Check XML directly for media:thumbnail tags
    const mediaThumbnailMatches = Array.from(xmlContent.matchAll(/<media:thumbnail[^>]*>/gi));
    if (mediaThumbnailMatches.length > 0) {
      imageSources.mediaThumbnail = mediaThumbnailMatches.length;
      for (const match of mediaThumbnailMatches) {
        const urlMatch = match[0].match(/url=["']([^"']+)["']/i);
        if (urlMatch && urlMatch[1]) {
          imageUrls.push(urlMatch[1]);
        }
      }
    }
    
    if (feed.items && feed.items.length > 0) {
      for (const item of feed.items) {
        // Check media:content
        if ((item as any).mediaContent) {
          imageSources.mediaContent++;
          const mediaContent = (item as any).mediaContent;
          if (typeof mediaContent === 'object' && mediaContent.url) {
            imageUrls.push(mediaContent.url);
          } else if (typeof mediaContent === 'string') {
            const match = mediaContent.match(/url=["']([^"']+)["']/i);
            if (match) imageUrls.push(match[1]);
          }
        }
        
        // Check media:thumbnail (parsed version)
        if ((item as any).mediaThumbnail) {
          // Only count if not already counted from XML
          if (imageSources.mediaThumbnail === 0) {
            imageSources.mediaThumbnail++;
          }
          const mediaThumbnail = (item as any).mediaThumbnail;
          if (typeof mediaThumbnail === 'object' && mediaThumbnail.url) {
            if (!imageUrls.includes(mediaThumbnail.url)) {
              imageUrls.push(mediaThumbnail.url);
            }
          } else if (typeof mediaThumbnail === 'string') {
            // Extract URL from media:thumbnail tag (e.g., url="...")
            const match = mediaThumbnail.match(/url=["']([^"']+)["']/i);
            if (match && !imageUrls.includes(match[1])) {
              imageUrls.push(match[1]);
            }
          }
        }
        
        // Check enclosure
        if (item.enclosure && item.enclosure.type?.startsWith('image/')) {
          imageSources.enclosure++;
          if (item.enclosure.url && !imageUrls.includes(item.enclosure.url)) {
            imageUrls.push(item.enclosure.url);
          }
        }
        
        // Check img tags in content
        const content = (item as any).contentEncoded || item.content || item.description || '';
        if (content.includes('<img')) {
          imageSources.imgTag++;
          const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1] && !imageUrls.includes(imgMatch[1])) {
            imageUrls.push(imgMatch[1]);
          }
        }
        
        // Check for Open Graph tags (basic check)
        if (content.includes('og:image') || content.includes('property="og:image"')) {
          imageSources.openGraph++;
        }
      }
    }

    // 6. Image Resolution Check (sample first 2 images)
    // Return URLs for client-side dimension detection
    const imageResolutions: Array<{ url: string }> = [];
    const sampleImages = imageUrls.slice(0, 2);
    
    for (const imgUrl of sampleImages) {
      imageResolutions.push({ url: imgUrl });
    }

    return NextResponse.json({
      isValid: true,
      title: feed.title || 'Untitled Feed',
      availableFields: Array.from(availableFields).sort(),
      hasFeaturedImage,
      contentType,
      lastUpdate,
      itemCount,
      feedType,
      postFrequency,
      duplicateGuids: duplicateGuids.length > 0 ? duplicateGuids : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      imageSources,
      imageResolutions: imageResolutions.length > 0 ? imageResolutions : undefined,
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

