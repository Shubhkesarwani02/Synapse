interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: (useNaturalLanguage: boolean) => void;
  loading: boolean;
}

export default function SearchBar({ query, setQuery, onSearch, loading }: SearchBarProps) {
  return (
    <div className="mb-8">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onSearch(false);
            }
          }}
          placeholder='Try: "articles about AI" or "products under $300"'
          className="w-full px-5 py-4 text-base rounded-lg border focus:outline-none bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:ring-2 focus:ring-[rgb(var(--fg))]/10"
          disabled={loading}
        />
        <div className="absolute right-2 top-2.5 flex gap-2">
          <button
            onClick={() => onSearch(false)}
            disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-md text-sm font-medium btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={() => onSearch(true)}
            disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-md text-sm font-medium btn-secondary hover:bg-[rgb(var(--elev))] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Natural Language Search - understands complex queries"
          >
            NL
          </button>
        </div>
      </div>
      <p className="text-xs text-[rgb(var(--muted))] mt-2">
        Tip: use <span className="font-semibold">NL</span> for natural language queries like "shoes under $300 from last week".
      </p>
    </div>
  );
}
