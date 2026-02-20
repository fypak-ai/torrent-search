# 🔍 Torrent Search Aggregator

Busca em **9 sites de torrent** simultaneamente e retorna magnet links ordenados por seeds.

## Sites

### Internacionais
- The Pirate Bay (API)
- 1337x (scraping)
- YTS (API)
- Nyaa (scraping)
- EZTV (API)

### Brasileiros
- HDR Torrent
- Apache Torrent
- Rede Torrent
- Baixar Filmes HD

## Instalação

```bash
pip install -r requirements.txt
python app.py
```

Acesse: http://localhost:5000

## Proxy (se sites estiverem bloqueados)

Se seu provedor/rede bloqueia sites de torrent:

1. Baixe e abra o [Tor Browser](https://www.torproject.org/download/)
2. No app, clique em ⚙️ Configurar Proxy
3. Selecione **SOCKS5** e digite `127.0.0.1:9150`
4. Clique em **Conectar**

Também funciona com proxy HTTP ou SOCKS5 de VPN.

## Diagnóstico

Acesse http://localhost:5000/test para verificar a conectividade com cada site.

## Stack

- **Backend**: Python (Flask) + BeautifulSoup4 + Requests
- **Frontend**: HTML/CSS/JS puro (dark mode)
- **Proxy**: PySocks (SOCKS5/HTTP)

## Screenshots

![search](https://img.shields.io/badge/9_sites-simultaneamente-667eea)
![proxy](https://img.shields.io/badge/proxy-SOCKS5%20%2F%20HTTP-764ba2)
