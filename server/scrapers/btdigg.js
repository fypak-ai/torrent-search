const axios = require('axios');
const cheerio = require('cheerio');

async function search(query) {
  try {
    const res = await axios.get(`https://btdig.com/search?q=${encodeURIComponent(query)}&p=0&order=1`, {
      timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const $ = cheerio.load(res.data);
    const results = [];
    $('.one_result').slice(0, 20).each((_, el) => {
      const title = $(el).find('.torrent_name').text().trim();
      const magnet = $(el).find('a[href^="magnet:"]').attr('href') || '';
      const size = $(el).find('.torrent_size').text().trim();
      const date = $(el).find('.torrent_age').text().trim();
      if (title && magnet) results.push({ source: 'BTDigg', title, size, seeds: 0, peers: 0, magnet, category: 'DHT', date });
    });
    return results;
  } catch (e) {
    console.error('BTDigg:', e.message);
    return [];
  }
}

module.exports = { search };
