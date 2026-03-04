import { useState, useCallback } from 'react';
import SearchBar from './components/SearchBar.jsx';
import SourcePills from './components/SourcePills.jsx';
import ResultCard from './components/ResultCard.jsx';
import StreamModal from './components/StreamModal.jsx';

const ALL_SOURCES = ['tpb','yts','nyaa','eztv','1337x','limetorrents','btdigg','torrentz2'];

export default function App() {
  const [query, setQuery] = useState('');
  const [activeSources, setActiveSources] = useState(new Set(ALL_SOURCES));
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [streamMagnet, setStreamMagnet] = useState(null);
  const [directMagnet, setDirectMagnet] = useState('');

  const handleSearch = useCallback(async (q) => {
    const sq = (q || query).trim();
    if (!sq) return;
    setLoading(true); setError(''); setSearched(true); setResults([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(sq)}&sources=${[...activeSources].join(',')}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [query, activeSources]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">⚡ TORRENT SEARCH</div>
        <div className="header-sub">Busca paralela · 8 fontes · Streaming Offcloud · Dropbox</div>
      </header>
      <main className="main">
        <SearchBar query={query} setQuery={setQuery} onSearch={handleSearch} loading={loading} />
        <SourcePills allSources={ALL_SOURCES} activeSources={activeSources} setActiveSources={setActiveSources} />
        <div className="direct-magnet">
          <input className="direct-magnet__input" type="text"
            placeholder="Cole um magnet link diretamente: magnet:?xt=urn:btih:..."
            value={directMagnet} onChange={e => setDirectMagnet(e.target.value)} />
          <button className="btn btn-stream" disabled={!directMagnet.startsWith('magnet:')}
            onClick={() => directMagnet.startsWith('magnet:') && setStreamMagnet(directMagnet)}>
            ▶ STREAM
          </button>
        </div>
        {error && <div className="error-msg">⚠ {error}</div>}
        {loading && <div className="loading"><div className="loading-dots"><span/><span/><span/></div><div className="loading-text">Buscando em {activeSources.size} fontes...</div></div>}
        {searched && !loading && !error && results.length === 0 && <div className="no-results">Nenhum resultado encontrado.</div>}
        <div className="results-grid">
          {results.map((r, i) => <ResultCard key={i} result={r} onStream={() => setStreamMagnet(r.magnet)} />)}
        </div>
      </main>
      {streamMagnet && <StreamModal magnet={streamMagnet} onClose={() => setStreamMagnet(null)} />}
    </div>
  );
}
