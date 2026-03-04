# Torrent Search

Buscador de torrents com streaming via Offcloud e envio para Dropbox.

## Stack
- **Backend**: Node.js + Express (scraping server-side)
- **Frontend**: React + Vite
- **Deploy**: Railway

## Fontes
TPB, YTS, Nyaa, EZTV, 1337x, LimeTorrents, BTDigg, Torrentz2

## Deploy no Railway
1. Fork este repo
2. Conecte ao Railway (New Project → Deploy from GitHub)
3. Adicione a variável de ambiente `OFFCLOUD_TOKEN`
4. Deploy automático

## Dev local
```bash
npm install
cp .env.example .env
npm run dev
```
