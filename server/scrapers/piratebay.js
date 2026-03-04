const axios = require('axios');
const { formatSize } = require('../utils');

async function search(query) {
  try {
    const res = await axios.get(`https://apibay.org/q.php?q=${encodeURIComponent(query)}&cat=0`, {
      timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const data = res.data;
    if (!Array.isArray(data) || (data.length === 1 && data[0].id === '0')) return [];
    return data.slice(0, 20).map(t => ({
      source: 'TPB',
      title: t.name,
      size: formatSize(parseInt(t.size)),
      seeds: parseInt(t.seeders) || 0,
      peers: parseInt(t.leechers) || 0,
      magnet: `magnet:?xt=urn:btih:${t.info_hash}&dn=${encodeURIComponent(t.name)}&tr=udp://tracker.opentrackr.org:1337/announce`,
      category: t.category || '',
      date: t.added ? new Date(t.added * 1000).toLocaleDateString('pt-BR') : '',
    }));
  } catch (e) {
    console.error('TPB:', e.message);
    return [];
  }
}

module.exports = { search };
