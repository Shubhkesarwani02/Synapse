interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: (useNaturalLanguage: boolean) => void;
  loading: boolean;
}

export default function SearchBar({ query, setQuery, onSearch, loading }: SearchBarProps) {
  return (
    <div className="mb-12">
      <div className="relative max-w-3xl mx-auto">
        <label htmlFor="global-search" className="sr-only">Search memories</label>
        <input
          type="text"
          id="global-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onSearch(false);
            }
          }}
          placeholder='Try: "articles about AI" or "products under $300"'
          className="w-full pr-28 px-5 py-4 text-base rounded-lg border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none bg-[var(--panel)] text-[var(--text)] placeholder-muted"
          disabled={loading}
        />
        <div className="absolute right-3 top-3 flex gap-2 items-center">
          <button
            aria-label="clear search"
            onClick={() => setQuery('')}
            disabled={!query}
            className="btn-outline p-2 mr-2 disabled:opacity-40"
            title="Clear"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button
            onClick={() => onSearch(true)}
            disabled={loading || !query.trim()}
            className="btn-outline disabled:opacity-60 px-3 btn-sm"
            title="Natural Language Search - understands complex queries"
          >
            NL
          </button>
          <button
            onClick={() => onSearch(false)}
            disabled={loading || !query.trim()}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed ml-2"
            aria-label="Search"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
      
      <p className="text-center text-sm muted mt-4">
        Use <span className="font-semibold">NL</span> for natural language queries like "shoes under $300 from last week"
      </p>
    </div>
  );
}
