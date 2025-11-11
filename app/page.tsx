'use client';

import { useState } from 'react';

interface FeedAnalysis {
  isValid: boolean;
  title?: string;
  availableFields: string[];
  hasFeaturedImage: boolean;
  contentType: 'full' | 'excerpt' | 'unknown';
  lastUpdate?: string | null;
  itemCount?: number;
  error?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeedAnalysis | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const analysis = await response.json();
      setResult(analysis);
    } catch (error) {
      setResult({
        isValid: false,
        availableFields: [],
        hasFeaturedImage: false,
        contentType: 'unknown',
        error: 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {!result ? (
        // Initial centered layout
        <div className="container mx-auto px-6 py-16 max-w-5xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-3 tracking-tight">
              RSS Feed Analyzer
            </h1>
            <p className="text-gray-500 text-lg font-light">
              Validate and analyze any RSS feed URL
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 mb-8 border border-gray-100 max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="feed-url"
                  className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide"
                >
                  RSS Feed URL
                </label>
                <input
                  id="feed-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="w-full px-4 py-3.5 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all text-gray-900 placeholder-gray-400"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full bg-primary-500 text-white font-medium py-3.5 px-6 rounded-lg hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Check Feed'
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // Split layout after result
        <div className="flex flex-col lg:flex-row h-screen">
          {/* Left Sidebar - 25% */}
          <div className="w-full lg:w-1/4 border-r border-gray-100 bg-gray-50 p-6 overflow-y-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-light text-gray-900 mb-1 tracking-tight">
                RSS Feed Analyzer
              </h1>
              <p className="text-sm text-gray-500 font-light">
                Check another feed
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="feed-url-sidebar"
                  className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide"
                >
                  RSS Feed URL
                </label>
                <input
                  id="feed-url-sidebar"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="w-full px-4 py-3 border-0 bg-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-gray-900 placeholder-gray-400 text-sm"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full bg-primary-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Check Feed'
                )}
              </button>
            </form>
          </div>

          {/* Right Content - 75% */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-8">
            {result.isValid ? (
              <div>
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                  <div className="flex-shrink-0 w-10 h-10 bg-success-50 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-success-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-medium text-gray-900">
                    Feed is valid
                  </h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Feed Title */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Feed Title
                    </div>
                    <div className="text-lg text-gray-900 font-light">
                      {result.title}
                    </div>
                  </div>

                  {/* Number of Items */}
                  {result.itemCount !== undefined && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        Number of Items
                      </div>
                      <div className="text-lg text-gray-900 font-light">
                        {result.itemCount} {result.itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  )}

                  {/* Last Update */}
                  {result.lastUpdate && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last Update
                      </div>
                      <div className="text-lg text-gray-900 font-light">
                        {result.lastUpdate}
                      </div>
                    </div>
                  )}

                  {/* Featured Image */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Featured Image
                    </div>
                    <div className="text-lg text-gray-900 font-light">
                      {result.hasFeaturedImage ? 'Yes' : 'No'}
                    </div>
                  </div>

                  {/* Content Type */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Content Type
                    </div>
                    <div className="text-lg text-gray-900 font-light capitalize">
                      {result.contentType === 'full'
                        ? 'Full article'
                        : result.contentType === 'excerpt'
                        ? 'Excerpt'
                        : 'Unknown'}
                    </div>
                  </div>

                  {/* Available Fields */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Available Fields
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.availableFields.map((field) => (
                        <span
                          key={field}
                          className="px-2.5 py-1 bg-gray-50 rounded text-xs text-gray-700 font-mono"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-medium text-gray-900 mb-1">
                      Feed is invalid
                    </h2>
                    <p className="text-gray-600">{result.error || 'Unable to parse the RSS feed'}</p>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

