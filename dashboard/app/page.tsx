'use client';

import { useState, useEffect } from 'react';
import MemoryCard from '@/components/MemoryCard';
import SearchBar from '@/components/SearchBar';
import Header from '@/components/Header';
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
    // Get or create userId - syncs with extension's storage
    // Extension checks localStorage first, so they should always match
    const initializeUserId = async () => {
      // Try to sync with extension first (helps fix any existing mismatches)
      // This prioritizes extension's user_id since it has the saved content
      const synced = await syncWithExtension();
      
      // Get or create user ID (will use extension's ID if synced)
      const uid = getOrCreateUserId();
      console.log('🆔 Dashboard user_id:', uid);
      setUserId(uid);
    };
    
    initializeUserId();
  }, []);

  // Fetch all memories and stats
  const fetchAllMemories = async () => {
    if (!userId) return;
    
    setLoadingMemories(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Fetch all memories
      const memoriesResponse = await fetch(`${apiUrl}/get_all?user_id=${userId}`);
      if (memoriesResponse.ok) {
        const memoriesData = await memoriesResponse.json();
        
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
      setResults(data);
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-6 pb-12">
        <div className="container-pro">
          <div className="mb-10">
            <h1 className="text-3xl font-semibold tracking-tight mb-2">Your Second Brain</h1>
            <p className="text-sm text-[rgb(var(--muted))] max-w-prose">Search, filter and revisit anything you've captured. Monochrome interface keeps focus on the content.</p>
            <div className="flex items-center gap-3 mt-4 text-xs text-[rgb(var(--muted))]">
              <span className="px-2 py-1 rounded-md badge">User: {userId}</span>
              <button
                onClick={fetchAllMemories}
                disabled={loadingMemories}
                className="btn-secondary px-3 py-1 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgb(var(--elev))] transition-colors"
                title="Refresh memories"
              >
                {loadingMemories ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>

        {/* Stats */}
        {stats && stats.total > 0 && (
          <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="card p-4 flex flex-col">
              <span className="text-xs uppercase tracking-wide text-[rgb(var(--muted))]">Total</span>
              <span className="mt-1 text-2xl font-semibold">{stats.total}</span>
            </div>
            <div className="card p-4 flex flex-col">
              <span className="text-xs uppercase tracking-wide text-[rgb(var(--muted))]">Recent (7d)</span>
              <span className="mt-1 text-2xl font-semibold">{stats.recent_count}</span>
            </div>
            {Object.entries(stats.by_type).map(([type, count]) => (
              <div key={type} className="card p-4 flex flex-col">
                <span className="text-xs uppercase tracking-wide text-[rgb(var(--muted))] capitalize">{type}</span>
                <span className="mt-1 text-xl font-semibold">{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            query={query}
            setQuery={setQuery}
            onSearch={handleSearch}
            loading={loading}
          />
        </div>

        {/* Content Type Filters */}
        {!isSearchMode && allMemories.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedType === 'all'
                    ? 'btn-primary'
                    : 'btn-secondary hover:bg-[rgb(var(--elev))]'
                }`}
              >
                All ({allMemories.length})
              </button>
              {getContentTypes().map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                    selectedType === type
                      ? 'btn-primary'
                      : 'btn-secondary hover:bg-[rgb(var(--elev))]'
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
          <div className="mb-6 p-4 rounded-md border border-red-400 text-red-600 bg-red-50 text-sm">
            {error}
          </div>
        )}

        {/* Results Count */}
        {displayMemories.length > 0 && (
          <div className="mb-4 text-xs text-[rgb(var(--muted))]">
            {isSearchMode 
              ? `Found ${results.length} results`
              : `Showing ${displayMemories.length} ${selectedType === 'all' ? 'items' : selectedType + 's'}`}
          </div>
        )}

        {/* Loading State */}
        {(loading || loadingMemories) && (
          <div className="py-10 text-sm text-[rgb(var(--muted))]">Loading…</div>
        )}

        {/* Results Grid */}
        {!loading && !loadingMemories && displayMemories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayMemories.map((item) => (
              <MemoryCard key={item.id} item={item} />
            ))}
          </div>
        ) : !loading && !loadingMemories && isSearchMode && (
          <div className="py-12 text-sm text-[rgb(var(--muted))]">No results. Refine your query.</div>
        )}

        {/* Empty State - No memories at all */}
        {!loading && !loadingMemories && !isSearchMode && allMemories.length === 0 && (
          <div className="py-16 text-sm text-[rgb(var(--muted))]">
            <p className="mb-4 font-medium">No items yet. Start saving content with the extension.</p>
            <div className="flex flex-wrap gap-2">
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
                  className="px-3 py-1 rounded-md btn-secondary text-xs hover:bg-[rgb(var(--elev))] transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - No results for selected filter */}
        {!loading && !loadingMemories && !isSearchMode && allMemories.length > 0 && displayMemories.length === 0 && (
          <div className="py-12 text-sm text-[rgb(var(--muted))]">
            <p>No {selectedType === 'all' ? 'items' : selectedType + 's'} found.</p>
            <button
              onClick={() => setSelectedType('all')}
              className="mt-4 px-3 py-1 rounded-md btn-primary text-xs"
            >
              Show All
            </button>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
