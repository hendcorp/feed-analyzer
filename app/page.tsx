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
      <div className="container mx-auto px-6 py-16 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-3 tracking-tight">
            RSS Feed Analyzer
          </h1>
          <p className="text-gray-500 text-lg font-light">
            Validate and analyze any RSS feed URL
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 mb-8 border border-gray-100">
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

        {result && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {result.isValid ? (
              <div className="p-8">
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
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Feed Title
                    </div>
                    <div className="text-lg text-gray-900 font-light">
                      {result.title}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
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

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Featured Image
                    </div>
                    <div className="text-lg text-gray-900 font-light">
                      {result.hasFeaturedImage ? 'Yes' : 'No'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
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

                  {result.lastUpdate && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Last Update
                      </div>
                      <div className="text-lg text-gray-900 font-light">
                        {result.lastUpdate}
                      </div>
                    </div>
                  )}

                  {result.itemCount !== undefined && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Number of Items
                      </div>
                      <div className="text-lg text-gray-900 font-light">
                        {result.itemCount} {result.itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8">
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
        )}
      </div>
    </main>
  );
}

