const axios = require('axios');
const cheerio = require('cheerio');

async function search(query) {
  try {
    const res = await axios.get(`https://nyaa.si/?f=0&c=0_0&q=${encodeURIComponent(query)}&s=seeders&o=desc`, {
      timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const $ = cheerio.load(res.data);
    const results = [];
    $('table.torrent-list tbody tr').slice(0, 20).each((_, row) => {
      const cells = $(row).find('td');
      const title = $(cells[1]).find('a[href^="/view/"]').last().text().trim();
      const magnet = $(cells[2]).find('a[href^="magnet:"]').attr('href') || '';
      if (title && magnet) {
        results.push({
          source: 'Nyaa', title,
          size: $(cells[3]).text().trim(),
          seeds: parseInt($(cells[5]).text()) || 0,
          peers: parseInt($(cells[6]).text()) || 0,
          magnet, category: 'Anime',
          date: $(cells[4]).text().trim(),
        });
      }
    });
    return results;
  } catch (e) {
    console.error('Nyaa:', e.message);
    return [];
  }
}

module.exports = { search };
