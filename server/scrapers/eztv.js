const axios = require('axios');
const { formatSize } = require('../utils');

async function search(query) {
  try {
    const res = await axios.get(`https://eztv.re/api/get-torrents?imdb_id=0&limit=30&page=1&keywords=${encodeURIComponent(query)}`, {
      timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    return (res.data?.torrents || []).slice(0, 20).map(t => ({
      source: 'EZTV', title: t.title,
      size: formatSize(parseInt(t.size_bytes)),
      seeds: t.seeds || 0, peers: t.peers || 0,
      magnet: t.magnet_url || '', category: 'TV',
      date: t.date_released_unix ? new Date(t.date_released_unix * 1000).toLocaleDateString('pt-BR') : '',
    })).filter(r => r.magnet);
  } catch (e) {
    console.error('EZTV:', e.message);
    return [];
  }
}

module.exports = { search };
