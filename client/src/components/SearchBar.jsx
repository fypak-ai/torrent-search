export default function SearchBar({ query, setQuery, onSearch, loading }) {
  return (
    <div className="searchbar">
      <input className="searchbar__input" type="text"
        placeholder="Buscar: Ubuntu, The Matrix, Naruto..."
        value={query} onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch()}
        disabled={loading} autoFocus />
      <button className="btn btn-primary" onClick={() => onSearch()} disabled={loading || !query.trim()}>
        {loading ? '⏳' : '🔍 BUSCAR'}
      </button>
    </div>
  );
}
