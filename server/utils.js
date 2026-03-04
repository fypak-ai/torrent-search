const axios = require('axios');

async function fetchHTML(url, extraHeaders = {}) {
  const res = await axios.get(url, {
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121',
      'Accept-Language': 'en-US,en;q=0.9',
      ...extraHeaders,
    },
  });
  return res.data;
}

function formatSize(bytes) {
  if (!bytes || isNaN(bytes)) return '?';
  if (bytes > 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
  if (bytes > 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  return (bytes / 1e3).toFixed(0) + ' KB';
}

module.exports = { fetchHTML, formatSize };
