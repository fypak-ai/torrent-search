import requests
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.parse
import re
import traceback
import time
import sys

app = Flask(__name__)

BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
}

TIMEOUT = 25

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Global proxy config
PROXY_CONFIG = {
    'enabled': False,
    'type': 'none',  # none, http, socks5
    'url': '',
}


def get_session():
    """Create a requests session with proxy if configured."""
    s = requests.Session()
    s.headers.update(BASE_HEADERS)
    if PROXY_CONFIG['enabled'] and PROXY_CONFIG['url']:
        proxy_url = PROXY_CONFIG['url']
        s.proxies = {
            'http': proxy_url,
            'https': proxy_url,
        }
    return s


def safe_get(url, **kwargs):
    """requests.get with proxy + SSL fallback."""
    kwargs.setdefault('timeout', TIMEOUT)
    s = get_session()
    try:
        return s.get(url, verify=True, **kwargs)
    except requests.exceptions.SSLError:
        print(f"  [SSL fallback] {url}")
        return s.get(url, verify=False, **kwargs)
    except requests.exceptions.ProxyError as e:
        print(f"  [Proxy error] {url}: {e}")
        raise
    finally:
        s.close()


def format_size(size_bytes):
    if size_bytes <= 0:
        return 'N/A'
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    idx = 0
    size = float(size_bytes)
    while size >= 1024 and idx < len(units) - 1:
        size /= 1024
        idx += 1
    return f"{size:.1f} {units[idx]}"


# ============================================================
# SITES INTERNACIONAIS
# ============================================================

def search_piratebay(query):
    results = []
    try:
        url = f"https://apibay.org/q.php?q={urllib.parse.quote(query)}"
        resp = safe_get(url)
        data = resp.json()
        if isinstance(data, list):
            for item in data:
                if item.get('id') == '0' or item.get('name') == 'No results returned':
                    continue
                name = item.get('name', '')
                info_hash = item.get('info_hash', '')
                seeds = int(item.get('seeders', 0))
                leeches = int(item.get('leechers', 0))
                size = format_size(int(item.get('size', 0)))
                magnet = f"magnet:?xt=urn:btih:{info_hash}&dn={urllib.parse.quote(name)}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://open.stealth.si:80/announce"
                results.append({'name': name, 'magnet': magnet, 'seeds': seeds, 'leeches': leeches, 'size': size, 'source': 'The Pirate Bay'})
    except Exception as e:
        print(f"[PirateBay] Error: {e}")
    return results


def search_1337x(query):
    results = []
    try:
        for domain in ['1337x.to', '1337xx.to', '1337x.st']:
            search_url = f"https://{domain}/search/{urllib.parse.quote(query)}/1/"
            try:
                resp = safe_get(search_url)
                if resp.status_code == 200 and '<tbody>' in resp.text:
                    break
            except:
                continue
        else:
            return results

        soup = BeautifulSoup(resp.text, 'html.parser')
        rows = soup.select('tbody tr')
        detail_urls = []
        row_data = []
        base = f"https://{domain}"
        for row in rows[:10]:
            cols = row.find_all('td')
            if len(cols) < 5:
                continue
            links = cols[0].find_all('a', href=True)
            name_tag = links[1] if len(links) > 1 else (links[0] if links else None)
            if not name_tag:
                continue
            name = name_tag.get_text(strip=True)
            link = name_tag['href']
            seeds = int(cols[1].get_text(strip=True)) if cols[1].get_text(strip=True).isdigit() else 0
            leeches = int(cols[2].get_text(strip=True)) if cols[2].get_text(strip=True).isdigit() else 0
            size_text = cols[4].get_text(strip=True) if len(cols) > 4 else 'N/A'
            detail_urls.append(f"{base}{link}")
            row_data.append({'name': name, 'seeds': seeds, 'leeches': leeches, 'size': size_text})

        def get_magnet(url):
            try:
                r = safe_get(url)
                s = BeautifulSoup(r.text, 'html.parser')
                mag = s.find('a', href=re.compile(r'^magnet:'))
                return mag['href'] if mag else None
            except:
                return None

        with ThreadPoolExecutor(max_workers=5) as ex:
            futures = {ex.submit(get_magnet, url): i for i, url in enumerate(detail_urls)}
            for future in as_completed(futures):
                idx = futures[future]
                magnet = future.result()
                if magnet:
                    row_data[idx]['magnet'] = magnet
                    row_data[idx]['source'] = '1337x'
        results = [r for r in row_data if 'magnet' in r]
    except Exception as e:
        print(f"[1337x] Error: {e}")
    return results


def search_yts(query):
    results = []
    try:
        url = f"https://yts.mx/api/v2/list_movies.json?query_term={urllib.parse.quote(query)}&limit=15"
        resp = safe_get(url)
        data = resp.json()
        movies = data.get('data', {}).get('movies', [])
        if not movies:
            return results
        for movie in movies:
            title = movie.get('title_long', movie.get('title', ''))
            for torrent in movie.get('torrents', []):
                quality = torrent.get('quality', '')
                ttype = torrent.get('type', '')
                seeds = int(torrent.get('seeds', 0))
                leeches = int(torrent.get('peers', 0))
                size = torrent.get('size', 'N/A')
                info_hash = torrent.get('hash', '')
                name = f"{title} [{quality}] [{ttype}]"
                magnet = f"magnet:?xt=urn:btih:{info_hash}&dn={urllib.parse.quote(name)}&tr=udp://open.demonii.si:1337/announce&tr=udp://tracker.openbittorrent.com:80"
                results.append({'name': name, 'magnet': magnet, 'seeds': seeds, 'leeches': leeches, 'size': size, 'source': 'YTS'})
    except Exception as e:
        print(f"[YTS] Error: {e}")
    return results


def search_nyaa(query):
    results = []
    try:
        url = f"https://nyaa.si/?f=0&c=0_0&q={urllib.parse.quote(query)}&s=seeders&o=desc"
        resp = safe_get(url)
        soup = BeautifulSoup(resp.text, 'html.parser')
        rows = soup.select('table.torrent-list tbody tr')
        if not rows:
            rows = soup.select('tbody tr')
        for row in rows[:15]:
            cols = row.find_all('td')
            if len(cols) < 7:
                continue
            name_tag = cols[1].find_all('a')
            name = name_tag[-1].get_text(strip=True) if name_tag else ''
            if not name:
                continue
            magnet_tag = cols[2].find('a', href=re.compile(r'^magnet:'))
            if not magnet_tag:
                continue
            magnet = magnet_tag['href']
            size = cols[3].get_text(strip=True)
            seeds = int(cols[5].get_text(strip=True)) if cols[5].get_text(strip=True).isdigit() else 0
            leeches = int(cols[6].get_text(strip=True)) if cols[6].get_text(strip=True).isdigit() else 0
            results.append({'name': name, 'magnet': magnet, 'seeds': seeds, 'leeches': leeches, 'size': size, 'source': 'Nyaa'})
    except Exception as e:
        print(f"[Nyaa] Error: {e}")
    return results


def search_eztv(query):
    results = []
    try:
        url = f"https://eztv.re/api/get-torrents?limit=15&page=1&query={urllib.parse.quote(query)}"
        resp = safe_get(url)
        data = resp.json()
        torrents = data.get('torrents', [])
        if not torrents:
            return results
        for t in torrents:
            name = t.get('title', t.get('filename', ''))
            magnet = t.get('magnet_url', '')
            if not magnet:
                info_hash = t.get('hash', '')
                if info_hash:
                    magnet = f"magnet:?xt=urn:btih:{info_hash}&dn={urllib.parse.quote(name)}&tr=udp://tracker.opentrackr.org:1337/announce"
            if not magnet:
                continue
            seeds = int(t.get('seeds', 0))
            leeches = int(t.get('peers', 0))
            size_bytes = int(t.get('size_bytes', 0))
            size = format_size(size_bytes) if size_bytes else t.get('size', 'N/A')
            results.append({'name': name, 'magnet': magnet, 'seeds': seeds, 'leeches': leeches, 'size': size, 'source': 'EZTV'})
    except Exception as e:
        print(f"[EZTV] Error: {e}")
    return results


# ============================================================
# SITES BRASILEIROS
# ============================================================

def _scrape_br_detail_magnet(url):
    try:
        r = safe_get(url)
        soup = BeautifulSoup(r.text, 'html.parser')
        mag = soup.find('a', href=re.compile(r'^magnet:'))
        if mag:
            return mag['href']
        match = re.search(r'magnet:\?[^"\'<>\s]+', r.text)
        return match.group(0) if match else None
    except Exception as e:
        print(f"  [detail] Error fetching {url}: {e}")
        return None


def search_hdrtorrent(query):
    results = []
    try:
        url = f"https://hdrtorrent.com/index.php?s={urllib.parse.quote(query)}"
        resp = safe_get(url)
        soup = BeautifulSoup(resp.text, 'html.parser')
        print(f"  [HDRTorrent] Search: {resp.status_code}, {len(resp.text)} bytes")

        seen = set()
        detail_urls = []
        names = []
        for h2 in soup.find_all('h2'):
            a = h2.find('a', href=True)
            if a:
                href = a['href']
                text = a.get_text(strip=True)
                if href not in seen and text and len(text) > 5:
                    seen.add(href)
                    detail_urls.append(href)
                    names.append(text)

        if not detail_urls:
            for a in soup.find_all('a', href=True):
                href = a['href']
                text = a.get_text(strip=True)
                if ('torrent-download' in href or 'torrent' in href) and href not in seen and text and len(text) > 10:
                    if '/index.php' not in href and '/categoria/' not in href:
                        seen.add(href)
                        if not href.startswith('http'):
                            href = 'https://hdrtorrent.com/' + href
                        detail_urls.append(href)
                        names.append(text)

        print(f"  [HDRTorrent] {len(detail_urls)} detail pages")

        def fetch(idx):
            return idx, _scrape_br_detail_magnet(detail_urls[idx])

        with ThreadPoolExecutor(max_workers=5) as ex:
            for f in as_completed([ex.submit(fetch, i) for i in range(min(len(detail_urls), 10))]):
                idx, magnet = f.result()
                if magnet:
                    results.append({'name': names[idx], 'magnet': magnet, 'seeds': 0, 'leeches': 0, 'size': 'N/A', 'source': 'HDR Torrent'})
        print(f"  [HDRTorrent] {len(results)} magnets")
    except Exception as e:
        print(f"[HDRTorrent] Error: {e}")
    return results


def search_apachetorrent(query):
    results = []
    try:
        url = f"https://apachetorrent.com/index.php?s={urllib.parse.quote(query)}"
        resp = safe_get(url)
        soup = BeautifulSoup(resp.text, 'html.parser')
        print(f"  [ApacheTorrent] Search: {resp.status_code}, {len(resp.text)} bytes")

        seen = set()
        detail_urls = []
        names = []
        for h2 in soup.find_all('h2'):
            a = h2.find('a', href=True)
            if a:
                href = a['href']
                text = a.get_text(strip=True)
                if href not in seen and text and len(text) > 5:
                    seen.add(href)
                    detail_urls.append(href)
                    names.append(text)

        if not detail_urls:
            for a in soup.find_all('a', href=True):
                href = a['href']
                text = a.get_text(strip=True)
                if ('baixar-torrent' in href or 'torrent' in href) and href not in seen and text and len(text) > 10:
                    if '/index.php' not in href and '/categoria/' not in href:
                        seen.add(href)
                        if not href.startswith('http'):
                            href = 'https://apachetorrent.com/' + href
                        detail_urls.append(href)
                        names.append(text)

        print(f"  [ApacheTorrent] {len(detail_urls)} detail pages")

        def fetch(idx):
            return idx, _scrape_br_detail_magnet(detail_urls[idx])

        with ThreadPoolExecutor(max_workers=5) as ex:
            for f in as_completed([ex.submit(fetch, i) for i in range(min(len(detail_urls), 10))]):
                idx, magnet = f.result()
                if magnet:
                    results.append({'name': names[idx], 'magnet': magnet, 'seeds': 0, 'leeches': 0, 'size': 'N/A', 'source': 'Apache Torrent'})
        print(f"  [ApacheTorrent] {len(results)} magnets")
    except Exception as e:
        print(f"[ApacheTorrent] Error: {e}")
    return results


def search_redetorrent(query):
    results = []
    try:
        url = f"https://redetorrent.com/index.php?s={urllib.parse.quote(query)}"
        resp = safe_get(url)
        soup = BeautifulSoup(resp.text, 'html.parser')
        print(f"  [RedeTorrent] Search: {resp.status_code}, {len(resp.text)} bytes")

        seen = set()
        detail_urls = []
        names = []
        for h2 in soup.find_all('h2'):
            a = h2.find('a', href=True)
            if a:
                href = a['href']
                text = a.get_text(strip=True)
                if href not in seen and text and len(text) > 5:
                    if '/index.php' not in href and '/categoria/' not in href:
                        seen.add(href)
                        if not href.endswith('/'):
                            href = href + '/'
                        if not href.endswith('-download/'):
                            href = href.rstrip('/') + '-download/'
                        detail_urls.append(href)
                        clean = text.split(')')[0] + ')' if ')' in text else text[:80]
                        names.append(clean)

        print(f"  [RedeTorrent] {len(detail_urls)} detail pages")

        def fetch(idx):
            return idx, _scrape_br_detail_magnet(detail_urls[idx])

        with ThreadPoolExecutor(max_workers=5) as ex:
            for f in as_completed([ex.submit(fetch, i) for i in range(min(len(detail_urls), 10))]):
                idx, magnet = f.result()
                if magnet:
                    results.append({'name': names[idx], 'magnet': magnet, 'seeds': 0, 'leeches': 0, 'size': 'N/A', 'source': 'Rede Torrent'})
        print(f"  [RedeTorrent] {len(results)} magnets")
    except Exception as e:
        print(f"[RedeTorrent] Error: {e}")
    return results


def search_baixarfilmehd(query):
    results = []
    try:
        url = f"https://baixarfilmehd.net/?s={urllib.parse.quote(query)}"
        resp = safe_get(url)
        soup = BeautifulSoup(resp.text, 'html.parser')
        print(f"  [BaixarFilmeHD] Search: {resp.status_code}, {len(resp.text)} bytes")

        seen = set()
        detail_urls = []
        names = []
        for h2 in soup.find_all('h2'):
            a = h2.find('a', href=True)
            if a:
                href = a['href']
                text = a.get_text(strip=True)
                if href not in seen and text and len(text) > 5 and 'baixarfilmehd.net' in href:
                    seen.add(href)
                    detail_urls.append(href)
                    names.append(text)

        print(f"  [BaixarFilmeHD] {len(detail_urls)} detail pages")

        def fetch(idx):
            try:
                r = safe_get(detail_urls[idx])
                soup2 = BeautifulSoup(r.text, 'html.parser')
                mag = soup2.find('a', href=re.compile(r'^magnet:'))
                if mag:
                    return idx, mag['href']
                sys_links = soup2.find_all('a', href=lambda h: h and 'systemads' in h)
                if sys_links:
                    return idx, sys_links[0]['href']
                match = re.search(r'magnet:\?[^"\'<>\s]+', r.text)
                if match:
                    return idx, match.group(0)
                return idx, None
            except:
                return idx, None

        with ThreadPoolExecutor(max_workers=5) as ex:
            for f in as_completed([ex.submit(fetch, i) for i in range(min(len(detail_urls), 8))]):
                idx, link = f.result()
                if link:
                    is_redirect = not link.startswith('magnet:')
                    results.append({'name': names[idx], 'magnet': link, 'seeds': 0, 'leeches': 0, 'size': 'N/A', 'source': 'Baixar Filmes HD', 'is_redirect': is_redirect})
        print(f"  [BaixarFilmeHD] {len(results)} results")
    except Exception as e:
        print(f"[BaixarFilmeHD] Error: {e}")
    return results


# ============================================================
# FLASK ROUTES
# ============================================================

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/proxy', methods=['POST'])
def set_proxy():
    """Configure proxy settings."""
    data = request.get_json()
    proxy_type = data.get('type', 'none')
    proxy_url = data.get('url', '').strip()

    if proxy_type == 'none':
        PROXY_CONFIG['enabled'] = False
        PROXY_CONFIG['type'] = 'none'
        PROXY_CONFIG['url'] = ''
        return jsonify({'status': 'ok', 'message': 'Proxy desativado'})

    if not proxy_url:
        return jsonify({'status': 'error', 'message': 'URL do proxy obrigatoria'})

    # Format the proxy URL
    if proxy_type == 'socks5':
        if not proxy_url.startswith('socks5'):
            proxy_url = f"socks5h://{proxy_url}"
    elif proxy_type == 'http':
        if not proxy_url.startswith('http'):
            proxy_url = f"http://{proxy_url}"

    PROXY_CONFIG['enabled'] = True
    PROXY_CONFIG['type'] = proxy_type
    PROXY_CONFIG['url'] = proxy_url

    # Quick test
    try:
        s = get_session()
        r = s.get('https://hdrtorrent.com/', timeout=10, verify=False)
        s.close()
        if r.status_code == 200 and len(r.text) > 5000:
            return jsonify({'status': 'ok', 'message': f'Proxy conectado! HDR Torrent acessivel ({len(r.text)} bytes)'})
        else:
            return jsonify({'status': 'warning', 'message': f'Proxy conectado mas HDR Torrent retornou {r.status_code} ({len(r.text)} bytes)'})
    except Exception as e:
        PROXY_CONFIG['enabled'] = False
        return jsonify({'status': 'error', 'message': f'Proxy falhou: {str(e)[:100]}'})


@app.route('/proxy/status')
def proxy_status():
    return jsonify(PROXY_CONFIG)


@app.route('/search')
def search():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'results': [], 'errors': [], 'site_stats': {}})

    all_results = []
    errors = []
    site_stats = {}

    search_funcs = {
        'The Pirate Bay': search_piratebay,
        '1337x': search_1337x,
        'YTS': search_yts,
        'Nyaa': search_nyaa,
        'EZTV': search_eztv,
        'HDR Torrent': search_hdrtorrent,
        'Apache Torrent': search_apachetorrent,
        'Rede Torrent': search_redetorrent,
        'Baixar Filmes HD': search_baixarfilmehd,
    }

    proxy_label = f" [proxy: {PROXY_CONFIG['type']}]" if PROXY_CONFIG['enabled'] else " [direto]"
    print(f"\n{'='*60}")
    print(f"  Buscando: '{query}'{proxy_label}")
    print(f"{'='*60}")

    with ThreadPoolExecutor(max_workers=9) as executor:
        futures = {executor.submit(func, query): name for name, func in search_funcs.items()}
        for future in as_completed(futures):
            site = futures[future]
            try:
                site_results = future.result()
                all_results.extend(site_results)
                site_stats[site] = len(site_results)
                status = "ok" if site_results else "0"
                print(f"  [{site}] {status} - {len(site_results)} results")
            except Exception as e:
                errors.append(f"{site}: {str(e)}")
                site_stats[site] = -1
                print(f"  [{site}] ERRO: {e}")

    print(f"{'='*60}")
    print(f"  Total: {len(all_results)} resultados de {sum(1 for v in site_stats.values() if v > 0)} sites")
    print(f"{'='*60}\n")

    all_results.sort(key=lambda x: x.get('seeds', 0), reverse=True)
    return jsonify({'results': all_results, 'errors': errors, 'site_stats': site_stats})


@app.route('/test')
def test_sites():
    results = {}
    sites = {
        'The Pirate Bay': 'https://apibay.org/q.php?q=test',
        '1337x': 'https://1337x.to/',
        'YTS': 'https://yts.mx/api/v2/list_movies.json?limit=1',
        'Nyaa': 'https://nyaa.si/',
        'EZTV': 'https://eztv.re/api/get-torrents?limit=1',
        'HDR Torrent': 'https://hdrtorrent.com/',
        'Apache Torrent': 'https://apachetorrent.com/',
        'Rede Torrent': 'https://redetorrent.com/',
        'Baixar Filmes HD': 'https://baixarfilmehd.net/',
    }

    def check(name, url):
        start = time.time()
        try:
            r = safe_get(url, timeout=10)
            elapsed = round(time.time() - start, 2)
            ok = r.status_code == 200 and len(r.text) > 5000
            cf = 'Just a moment' in r.text or 'cloudflare' in r.text.lower()[:2000]
            status = 'cloudflare_blocked' if cf else ('ok' if ok else f'http_{r.status_code}')
            return name, {'status': status, 'time': elapsed, 'size': len(r.text)}
        except Exception as e:
            elapsed = round(time.time() - start, 2)
            return name, {'status': f'error: {str(e)[:80]}', 'time': elapsed}

    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = [ex.submit(check, n, u) for n, u in sites.items()]
        for f in as_completed(futs):
            name, info = f.result()
            results[name] = info

    return jsonify({'version': 'v6', 'proxy': PROXY_CONFIG, 'diagnostics': results})


if __name__ == '__main__':
    print()
    print("=" * 60)
    print("  Torrent Search Aggregator v6")
    print("  9 sites + suporte a proxy")
    print()
    print("  App:  http://localhost:5000")
    print("  Test: http://localhost:5000/test")
    print("=" * 60)
    print()

    # Check if PySocks is available for SOCKS5
    try:
        import socks
        print("  PySocks: instalado (SOCKS5 disponivel)")
    except ImportError:
        print("  PySocks: NAO instalado")
        print("  Para usar proxy SOCKS5/Tor, execute:")
        print("    pip install pysocks")
    print()

    app.run(debug=True, host='0.0.0.0', port=5000)
