const axios = require('axios');
const cheerio = require('cheerio');

const MIRRORS = ['https://1337x.to', 'https://1337x.st', 'https://x1337x.ws'];

async function search(query) {
  for (const mirror of MIRRORS) {
    try {
      const res = await axios.get(`${mirror}/search/${encodeURIComponent(query)}/1/`, {
        timeout: 12000,
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: mirror },
      });
      const $ = cheerio.load(res.data);
      const results = [];
      const rows = $('table.table-list tbody tr').slice(0, 15);
      const jobs = [];
      rows.each((_, row) => {
        const nameEl = $(row).find('td.name a').eq(1);
        const title = nameEl.text().trim();
        const href = nameEl.attr('href') || '';
        const seeds = parseInt($(row).find('td.seeds').text()) || 0;
        const peers = parseInt($(row).find('td.leeches').text()) || 0;
        const size = $(row).find('td.size').text().replace(/\d+$/, '').trim();
        if (title && href) {
          jobs.push(axios.get(mirror + href, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0', Referer: mirror } })
            .then(r => {
              const $p = cheerio.load(r.data);
              const magnet = $p('a[href^="magnet:"]').first().attr('href') || '';
              if (magnet) results.push({ source: '1337x', title, size, seeds, peers, magnet, category: 'General', date: '' });
            }).catch(() => {}));
        }
      });
      await Promise.all(jobs);
      return results;
    } catch (e) { /* try next mirror */ }
  }
  return [];
}

module.exports = { search };
