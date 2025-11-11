import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';

// Configure runtime and timeout for Vercel
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max for Vercel

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
      if (firstItem.author) availableFields.add('author');
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

