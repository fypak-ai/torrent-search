const axios = require('axios');
const cheerio = require('cheerio');

async function search(query) {
  try {
    const res = await axios.get(`https://torrentz2.nz/search?q=${encodeURIComponent(query)}`, {
      timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const $ = cheerio.load(res.data);
    const results = [];
    $('dl dt').slice(0, 20).each((_, el) => {
      const title = $(el).find('a').first().text().trim();
      const dd = $(el).next('dd');
      const seeds = parseInt(dd.find('span.u').text()) || 0;
      const peers = parseInt(dd.find('span.d').text()) || 0;
      const size = dd.find('span.s').text().trim();
      const hash = dd.find('span.m a').attr('href')?.match(/([a-f0-9]{40})/i)?.[1] || '';
      const magnet = hash ? `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}&tr=udp://tracker.opentrackr.org:1337/announce` : '';
      if (title && magnet) results.push({ source: 'Torrentz2', title, size, seeds, peers, magnet, category: 'General', date: '' });
    });
    return results;
  } catch (e) {
    console.error('Torrentz2:', e.message);
    return [];
  }
}

module.exports = { search };
