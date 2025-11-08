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
          className="w-full px-6 py-5 text-lg rounded-2xl shadow-xl border-2 border-transparent focus:border-purple-500 focus:outline-none bg-white"
          disabled={loading}
        />
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            onClick={() => onSearch(false)}
            disabled={loading || !query.trim()}
            className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={() => onSearch(true)}
            disabled={loading || !query.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            title="Natural Language Search - understands complex queries"
          >
            NL
          </button>
        </div>
      </div>
      
      <p className="text-center text-sm text-gray-500 mt-4">
        Use <span className="font-semibold">NL</span> for natural language queries like "shoes under $300 from last week"
      </p>
    </div>
  );
}
