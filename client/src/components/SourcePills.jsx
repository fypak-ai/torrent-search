const LABELS = { tpb:'The Pirate Bay', yts:'YTS', nyaa:'Nyaa', eztv:'EZTV', '1337x':'1337x', limetorrents:'LimeTorrents', btdigg:'BTDigg', torrentz2:'Torrentz2' };

export default function SourcePills({ allSources, activeSources, setActiveSources }) {
  const toggle = s => {
    const n = new Set(activeSources);
    if (n.has(s)) { if (n.size > 1) n.delete(s); } else n.add(s);
    setActiveSources(n);
  };
  return (
    <div className="source-pills">
      <span className="source-pills__label">FONTES ({activeSources.size}/{allSources.length}):</span>
      <div className="source-pills__list">
        <button className="pill pill--all" onClick={() => setActiveSources(new Set(allSources))}>TODAS</button>
        {allSources.map(s => (
          <button key={s} className={`pill ${activeSources.has(s) ? 'pill--active' : ''}`} onClick={() => toggle(s)}>{LABELS[s]||s}</button>
        ))}
        <button className="pill pill--clear" onClick={() => setActiveSources(new Set([allSources[0]]))}>LIMPAR</button>
      </div>
    </div>
  );
}
