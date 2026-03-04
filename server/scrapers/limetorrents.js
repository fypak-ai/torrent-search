const axios = require('axios');
const cheerio = require('cheerio');

async function search(query) {
  try {
    const res = await axios.get(`https://www.limetorrents.lol/search/all/${encodeURIComponent(query)}/seeds/1/`, {
      timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const $ = cheerio.load(res.data);
    const results = [];
    $('#listtorrents tbody tr').slice(0, 20).each((_, row) => {
      const title = $(row).find('td.tdleft a').eq(1).text().trim();
      const cells = $(row).find('td');
      const size = $(cells[2]).text().trim();
      const seeds = parseInt($(cells[3]).text()) || 0;
      const peers = parseInt($(cells[4]).text()) || 0;
      const torrentLink = $(row).find('a[href*=".torrent"]').attr('href') || '';
      const hashMatch = torrentLink.match(/([a-f0-9]{40})/i);
      const magnet = hashMatch
        ? `magnet:?xt=urn:btih:${hashMatch[1]}&dn=${encodeURIComponent(title)}&tr=udp://tracker.opentrackr.org:1337/announce`
        : '';
      if (title && magnet) results.push({ source: 'LimeTorrents', title, size, seeds, peers, magnet, category: 'General', date: '' });
    });
    return results;
  } catch (e) {
    console.error('LimeTorrents:', e.message);
    return [];
  }
}

module.exports = { search };
