'use client';

import { useState } from 'react';

interface FeedAnalysis {
  isValid: boolean;
  title?: string;
  availableFields: string[];
  hasFeaturedImage: boolean;
  contentType: 'full' | 'excerpt' | 'unknown';
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
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          RSS Feed Analyzer
        </h1>
        <p className="text-lg text-gray-600">
          Validate and analyze any RSS feed URL
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="feed-url"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              RSS Feed URL
            </label>
            <input
              id="feed-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
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
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {result.isValid ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Feed is valid
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📰</span>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1">
                        Feed Title
                      </h3>
                      <p className="text-gray-800 text-lg">{result.title}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🏷️</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-700 mb-2">
                        Available Fields
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.availableFields.map((field) => (
                          <span
                            key={field}
                            className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-purple-200"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-pink-50 rounded-xl p-6 border border-pink-100">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🖼️</span>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1">
                        Featured Image
                      </h3>
                      <p className="text-gray-800 text-lg">
                        {result.hasFeaturedImage ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📖</span>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1">
                        Content Type
                      </h3>
                      <p className="text-gray-800 text-lg capitalize">
                        {result.contentType === 'full'
                          ? 'Full article'
                          : result.contentType === 'excerpt'
                          ? 'Excerpt'
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Feed is invalid
                </h2>
                <p className="text-gray-600">{result.error || 'Unable to parse the RSS feed'}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

