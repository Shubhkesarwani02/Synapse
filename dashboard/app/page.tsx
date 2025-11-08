'use client';

import { useState, useEffect } from 'react';
import MemoryCard from '@/components/MemoryCard';
import SearchBar from '@/components/SearchBar';

interface SearchResult {
  id: string;
  content: string;
  url: string;
  title: string;
  metadata: any;
  similarity_score: number;
  timestamp: string;
}

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Get userId from localStorage (can be set by extension or manually)
    const uid = localStorage.getItem('recallhub_user_id') || 
                 localStorage.getItem('synapse_user_id') ||
                 'demo_user';
    setUserId(uid);
  }, []);

  const handleSearch = async (useNaturalLanguage: boolean = false) => {
    if (!query.trim() || !userId) return;

    setLoading(true);
    setError('');
    
    try {
      const endpoint = useNaturalLanguage ? '/api/search/nl' : '/api/search';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          user_id: userId,
          limit: 20
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
            Recallhub
          </h1>
          <p className="text-xl text-gray-600">Your Second Brain - Search Your Memories Naturally</p>
          <p className="text-sm text-gray-500 mt-2">User: {userId}</p>
        </div>

        {/* Search Bar */}
        <SearchBar
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          loading={loading}
        />

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        {results.length > 0 && (
          <div className="max-w-3xl mx-auto mb-6 text-center text-gray-600">
            Found {results.length} memories
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((item) => (
              <MemoryCard key={item.id} item={item} />
            ))}
          </div>
        ) : !loading && query && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No memories found. Try a different search.</p>
          </div>
        )}

        {/* Empty State */}
        {!query && results.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-4">Start searching to find your memories</p>
            <div className="space-y-2">
              <p className="text-sm">Try searches like:</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {[
                  'machine learning articles',
                  'videos about AI',
                  'products under $100',
                  'books I saved',
                  'notes from last week'
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setQuery(example)}
                    className="px-4 py-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow text-sm text-gray-700 border border-gray-200"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
