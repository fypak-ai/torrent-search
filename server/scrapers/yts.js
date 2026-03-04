const axios = require('axios');

async function search(query) {
  try {
    const res = await axios.get('https://yts.mx/api/v2/list_movies.json', {
      params: { query_term: query, limit: 20, sort_by: 'seeds' },
      timeout: 10000,
    });
    const movies = res.data?.data?.movies || [];
    const results = [];
    for (const m of movies) {
      for (const t of (m.torrents || [])) {
        results.push({
          source: 'YTS',
          title: `${m.title} (${m.year}) [${t.quality}]`,
          size: t.size,
          seeds: t.seeds || 0,
          peers: t.peers || 0,
          magnet: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(m.title)}&tr=udp://tracker.opentrackr.org:1337/announce`,
          category: 'Movies',
          date: m.date_uploaded?.split(' ')[0] || '',
        });
      }
    }
    return results;
  } catch (e) {
    console.error('YTS:', e.message);
    return [];
  }
}

module.exports = { search };
