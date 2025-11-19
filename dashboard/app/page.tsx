'use client';

import { useState, useEffect } from 'react';
import MemoryCard from '@/components/MemoryCard';
import SearchBar from '@/components/SearchBar';
import { getOrCreateUserId, syncWithExtension } from '@/utils/userId';

interface SearchResult {
  id: string;
  content: string;
  url: string;
  title: string;
  metadata: any;
  similarity_score?: number;
  timestamp: string;
}

interface MemoryItem {
  id: string;
  text: string;
  metadata: any;
}

interface Stats {
  total: number;
  by_type: Record<string, number>;
  recent_count: number;
}

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allMemories, setAllMemories] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    // MVP: Use hardcoded user ID
    const uid = getOrCreateUserId();
    console.log('🆔 Dashboard user_id:', uid);
    setUserId(uid);
  }, []);

  // Fetch all memories and stats
  const fetchAllMemories = async () => {
    if (!userId) return;
    
    setLoadingMemories(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Fetch all memories
      const memoriesResponse = await fetch(`${apiUrl}/get_all?user_id=${userId}`);
      console.log('📦 Fetch all memories response status:', memoriesResponse.status);
      if (memoriesResponse.ok) {
        const memoriesData = await memoriesResponse.json();
        console.log('📦 Fetch all memories data:', memoriesData);
        console.log('📦 Items count:', memoriesData.items?.length || 0);
        
        // Parse and format memories
        const formattedMemories: SearchResult[] = (memoriesData.items || []).map((item: MemoryItem) => {
          // Parse metadata if it contains JSON strings
          let metadata = item.metadata || {};
          
          // If metadata has serialized JSON strings (like media, tasks), parse them
          if (metadata.media && typeof metadata.media === 'string') {
            try {
              metadata.media = JSON.parse(metadata.media);
            } catch (e) {
              // Keep as string if parsing fails
            }
          }
          if (metadata.tasks && typeof metadata.tasks === 'string') {
            try {
              metadata.tasks = JSON.parse(metadata.tasks);
            } catch (e) {
              // Keep as string if parsing fails
            }
          }
          
          return {
            id: item.id,
            content: item.text || '',
            url: metadata.url || '',
            title: metadata.title || item.text?.substring(0, 100) || 'Untitled',
            metadata: metadata,
            timestamp: metadata.timestamp || metadata.time || '',
          };
        });
        
        // Sort by timestamp (newest first)
        formattedMemories.sort((a, b) => {
          const timeA = a.timestamp || '';
          const timeB = b.timestamp || '';
          return timeB.localeCompare(timeA);
        });
        
        console.log('📦 Loaded memories:', formattedMemories.length);
        console.log('📊 Memory types:', formattedMemories.map(m => m.metadata?.type || m.metadata?.content_type || 'unknown'));
        
        setAllMemories(formattedMemories);
      } else {
        console.error('Failed to fetch memories:', memoriesResponse.status, memoriesResponse.statusText);
      }

      // Fetch stats
      const statsResponse = await fetch(`${apiUrl}/api/stats?user_id=${userId}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setLoadingMemories(false);
    }
  };

  // Fetch all memories and stats when userId is available
  useEffect(() => {
    if (userId) {
      fetchAllMemories();
    }
  }, [userId]);

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
      console.log('🔍 Search response:', data);
      console.log('🔍 Search results count:', Array.isArray(data) ? data.length : 'Not an array');
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        // Parse metadata.media and metadata.tasks if they're JSON strings
        const parsedResults = data.map((item: SearchResult) => {
          if (item.metadata) {
            const metadata = { ...item.metadata };
            
            // Parse media if it's a JSON string
            if (metadata.media && typeof metadata.media === 'string') {
              try {
                metadata.media = JSON.parse(metadata.media);
              } catch (e) {
                // Keep as string if parsing fails
              }
            }
            
            // Parse tasks if it's a JSON string
            if (metadata.tasks && typeof metadata.tasks === 'string') {
              try {
                metadata.tasks = JSON.parse(metadata.tasks);
              } catch (e) {
                // Keep as string if parsing fails
              }
            }
            
            return { ...item, metadata };
          }
          return item;
        });
        
        setResults(parsedResults);
      } else {
        console.error('❌ Search response is not an array:', data);
        setResults([]);
        setError('Invalid search response format');
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Filter memories by type
  const getFilteredMemories = () => {
    if (selectedType === 'all') {
      return allMemories;
    }
    return allMemories.filter(memory => {
      // Check both 'type' (new format) and 'content_type' (old format)
      const type = memory.metadata?.type || memory.metadata?.content_type || 'note';
      return type === selectedType;
    });
  };

  // Get available content types from stats and actual memories
  const getContentTypes = () => {
    const typesFromStats = stats?.by_type ? Object.keys(stats.by_type) : [];
    // Also get types from actual memories (in case stats is outdated)
    const typesFromMemories = new Set(
      allMemories.map(m => m.metadata?.type || m.metadata?.content_type || 'note')
    );
    // Combine and deduplicate
    const allTypes = new Set([...typesFromStats, ...Array.from(typesFromMemories)]);
    return Array.from(allTypes).sort();
  };

  const displayMemories = query ? results : getFilteredMemories();
  const isSearchMode = !!query.trim();

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div>
              <h1 className="text-3xl font-semibold text-[var(--text)] leading-tight">Recallhub</h1>
              <p className="text-sm muted mt-1">Your Second Brain — search your memories naturally</p>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-sm muted">User: <span className="font-mono text-xs muted">{userId || '—'}</span></p>
              <button
                onClick={fetchAllMemories}
                disabled={loadingMemories}
                className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh memories"
              >
                {loadingMemories ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-6 border-t" style={{borderTopColor: 'var(--border)'}} />
        </div>

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="max-w-4xl mx-auto mb-6 p-4 card">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--text)]">{stats.total}</div>
                <div className="muted">Total Memories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--text)]">{stats.recent_count}</div>
                <div className="muted">Recent (7 days)</div>
              </div>
              {Object.entries(stats.by_type).map(([type, count]) => (
                <div key={type} className="text-center">
                  <div className="text-xl font-semibold text-[var(--text)]">{count}</div>
                  <div className="muted capitalize">{type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-6">
          <SearchBar
            query={query}
            setQuery={setQuery}
            onSearch={handleSearch}
            loading={loading}
          />
        </div>

        {/* Content Type Filters */}
        {!isSearchMode && allMemories.length > 0 && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedType === 'all' ? 'btn-primary' : 'btn-outline'
                }`}
              >
                All ({allMemories.length})
              </button>
              {getContentTypes().map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                    selectedType === type ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  {type} ({stats?.by_type[type] || 0})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Results Count */}
        {displayMemories.length > 0 && (
          <div className="max-w-4xl mx-auto mb-6 text-center muted">
            {isSearchMode 
              ? `Found ${results.length} memories` 
              : `Showing ${displayMemories.length} ${selectedType === 'all' ? 'memories' : selectedType + 's'}`
            }
          </div>
        )}

        {/* Loading State */}
        {(loading || loadingMemories) && (
          <div className="text-center py-12 muted">
            <p className="text-lg">Loading...</p>
          </div>
        )}

        {/* Results Grid */}
        {!loading && !loadingMemories && displayMemories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayMemories.map((item) => (
              <MemoryCard key={item.id} item={item} />
            ))}
          </div>
        ) : !loading && !loadingMemories && isSearchMode && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No memories found. Try a different search.</p>
          </div>
        )}

        {/* Empty State - No memories at all */}
        {!loading && !loadingMemories && !isSearchMode && allMemories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-4">No memories yet. Start saving content with the extension!</p>
            <div className="space-y-2">
              <p className="text-sm">Or try searching:</p>
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

        {/* Empty State - No results for selected filter */}
        {!loading && !loadingMemories && !isSearchMode && allMemories.length > 0 && displayMemories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No {selectedType === 'all' ? 'memories' : selectedType + 's'} found.</p>
            <button
              onClick={() => setSelectedType('all')}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
            >
              Show All Memories
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
