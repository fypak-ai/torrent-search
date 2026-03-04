export default function DropboxSettings({ token, onChange }) {
  return (
    <div className="dbx-settings">
      <div className="dbx-settings__title">⚙ Dropbox Token</div>
      <input className="dbx-settings__input" type="password"
        placeholder="Cole seu Dropbox Access Token..."
        value={token} onChange={e => onChange(e.target.value)} />
      <div className="dbx-settings__hint">
        Gere em <a href="https://dropbox.com/developers/apps" target="_blank" rel="noreferrer">dropbox.com/developers/apps</a> com permissão <code>files.content.write</code>. Arquivos vão para <code>/TorrentStream/</code>.
      </div>
      {token && <div className="dbx-settings__ok">🟢 Token salvo</div>}
    </div>
  );
}
