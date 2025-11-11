# RSS Feed Analyzer

A modern, user-friendly web application to validate and analyze RSS feeds. Built with Next.js, React, and TailwindCSS.

## Features

- ✅ Validate RSS feed URLs
- 📰 Extract feed title and metadata
- 🏷️ Display all available fields in the feed
- 🖼️ Detect featured images (checks `media:content`, `enclosure`, and `image` tags)
- 📖 Determine if content is full articles or excerpts
- 🎨 Beautiful, modern UI with soft colors and responsive design

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## How to Use

1. Enter an RSS feed URL in the input field
2. Click "Check Feed" button
3. View the analysis results:
   - Feed validation status
   - Feed title
   - Available fields (title, link, description, categories, etc.)
   - Whether featured images are present
   - Content type (full article or excerpt)

## Supported Feed Formats

- RSS 2.0
- Atom feeds
- Custom fields (content:encoded, media:content, etc.)

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **rss-parser** - RSS/Atom feed parsing

## Project Structure

```
feed-analyzer/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts    # API endpoint for RSS parsing
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main page component
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## License

MIT

