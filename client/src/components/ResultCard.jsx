function fmt(n) { return n >= 1000 ? (n/1000).toFixed(1)+'k' : n; }

export default function ResultCard({ result, onStream }) {
  const { source, title, size, seeds, peers, magnet, category, date } = result;
  const sc = seeds > 50 ? 'seeds--high' : seeds > 10 ? 'seeds--mid' : 'seeds--low';
  return (
    <div className="result-card">
      <div className="result-card__header">
        <span className="result-card__source">{source}</span>
        {category && <span className="result-card__cat">{category}</span>}
        {date && <span className="result-card__date">{date}</span>}
      </div>
      <div className="result-card__title">{title}</div>
      <div className="result-card__meta">
        <span className="result-card__size">💾 {size||'?'}</span>
        <span className={`result-card__seeds ${sc}`}>▲ {fmt(seeds)}</span>
        <span className="result-card__peers">▼ {fmt(peers)}</span>
      </div>
      <div className="result-card__actions">
        <button className="btn btn-stream" onClick={onStream}>▶ STREAM</button>
        <a className="btn btn-open" href={magnet}>🧲 ABRIR</a>
        <button className="btn btn-copy" onClick={() => navigator.clipboard.writeText(magnet)}>📋 COPIAR</button>
      </div>
    </div>
  );
}
