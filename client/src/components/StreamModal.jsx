import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DropboxSettings from './DropboxSettings.jsx';

function StepLoader({ steps }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= steps.length - 1) return;
    const t = setTimeout(() => setStep(s => s + 1), 900);
    return () => clearTimeout(t);
  }, [step, steps.length]);
  return (
    <div className="step-loader">
      {steps.map((s, i) => <div key={i} className={`step-loader__line ${i <= step ? 'step-loader__line--active' : ''}`}>{s}</div>)}
    </div>
  );
}

function fileIcon(t) { return { video:'🎬', audio:'🎵', subtitle:'💬', image:'🖼️', file:'📄' }[t]||'📄'; }
function fmtSize(b) {
  if (!b) return '';
  if (b > 1e9) return (b/1e9).toFixed(2)+' GB';
  if (b > 1e6) return (b/1e6).toFixed(1)+' MB';
  if (b > 1e3) return (b/1e3).toFixed(0)+' KB';
  return b+' B';
}

export default function StreamModal({ magnet, onClose }) {
  const [status, setStatus] = useState('loading');
  const [cached, setCached] = useState(false);
  const [files, setFiles] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeFile, setActiveFile] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [dbxToken, setDbxToken] = useState(() => localStorage.getItem('dbx_token') || '');
  const [dbxStatus, setDbxStatus] = useState('');

  useEffect(() => {
    fetch('/api/stream', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ magnet }) })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setCached(data.cached);
        setFiles(data.files||[]);
        setStatus('ready');
        const first = (data.files||[]).find(f => f.type==='video'||f.type==='audio');
        if (first) setActiveFile(first);
      })
      .catch(e => { setErrorMsg(e.message); setStatus('error'); });
  }, [magnet]);

  const saveToken = t => { setDbxToken(t); localStorage.setItem('dbx_token', t); };

  const sendAll = async () => {
    if (!dbxToken) { setShowSettings(true); return; }
    setDbxStatus('Enviando...');
    const res = await fetch('/api/dropbox/upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ files: files.map(f=>({name:f.name,url:f.url})), token: dbxToken }) });
    const d = await res.json();
    setDbxStatus(`✅ ${d.ok} enviados${d.failed>0?`, ${d.failed} falhou`:''}`);
  };

  const sendOne = async f => {
    if (!dbxToken) { setShowSettings(true); return; }
    const res = await fetch('/api/dropbox/upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ files:[{name:f.name,url:f.url}], token:dbxToken }) });
    const d = await res.json();
    alert(d.ok > 0 ? '✅ Enviado!' : '❌ Falhou: '+(d.results?.[0]?.error||'erro'));
  };

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">▶ STREAM</span>
          <div className="modal-header-actions">
            {status==='ready' && <span className={`cache-badge ${cached?'cached':'cloud'}`}>{cached?'⚡ CACHED':'⏳ CLOUD'}</span>}
            <button className={`btn btn-settings${dbxToken?' btn-settings--active':''}`} onClick={() => setShowSettings(s=>!s)}>⚙</button>
            <button className="btn btn-close" onClick={onClose}>✕</button>
          </div>
        </div>
        {showSettings && <DropboxSettings token={dbxToken} onChange={saveToken} />}
        <div className="modal-body">
          {status==='loading' && <div className="modal-loading"><StepLoader steps={['🧲 Extraindo info-hash...','📡 Enviando para Offcloud...','🗂️ Listando arquivos...','✅ Pronto!']} /></div>}
          {status==='error' && <div className="modal-error"><div>❌ {errorMsg}</div><div className="modal-error-hint">Verifique o token Offcloud</div></div>}
          {status==='ready' && (
            <div className="modal-content">
              {activeFile && (
                <div className="player-panel">
                  {activeFile.type==='video' && <video key={activeFile.url} src={activeFile.url} controls autoPlay className="player-video" />}
                  {activeFile.type==='audio' && <audio key={activeFile.url} src={activeFile.url} controls autoPlay className="player-audio" />}
                  <div className="player-filename">{activeFile.name}</div>
                </div>
              )}
              <div className="file-list">
                <div className="file-list-toolbar">
                  <span>{files.length} arquivo(s)</span>
                  <button className="btn btn-dbx-all" onClick={sendAll}>☁ ENVIAR TUDO</button>
                  {dbxStatus && <span className="dbx-status">{dbxStatus}</span>}
                </div>
                {files.map((f,i) => (
                  <div key={i} className={`file-row file-row--${f.type}${activeFile?.url===f.url?' file-row--active':''}`}
                    onClick={() => (f.type==='video'||f.type==='audio') && setActiveFile(f)}>
                    <span className="file-icon">{fileIcon(f.type)}</span>
                    <span className="file-name">{f.name}</span>
                    <span className="file-size">{fmtSize(f.size)}</span>
                    <div className="file-actions">
                      <a className="btn btn-dl" href={f.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>⬇</a>
                      <button className="btn btn-copy-url" onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(f.url);}}>📋</button>
                      <button className="btn btn-dbx" onClick={e=>{e.stopPropagation();sendOne(f);}}>☁</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
