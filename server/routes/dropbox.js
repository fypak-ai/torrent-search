const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/upload', async (req, res) => {
  const { files, token } = req.body;
  const dbxToken = token || process.env.DROPBOX_TOKEN;
  if (!dbxToken) return res.status(400).json({ error: 'Dropbox token required' });
  if (!files?.length) return res.status(400).json({ error: 'files required' });

  const results = [];
  const BATCH = 5;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const r = await Promise.allSettled(batch.map(f => uploadOne(f, dbxToken)));
    r.forEach(p => results.push(p.status === 'fulfilled' ? p.value : { ok: false, error: p.reason?.message }));
  }
  res.json({ ok: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results });
});

async function uploadOne({ name, url }, token) {
  const fileRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  const safeName = name.replace(/[<>:"/\\|?*]/g, '_');
  await axios.post('https://content.dropboxapi.com/2/files/upload', fileRes.data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: `/TorrentStream/${safeName}`, mode: 'overwrite', autorename: true }),
      'Content-Type': 'application/octet-stream',
    },
    timeout: 120000, maxBodyLength: Infinity, maxContentLength: Infinity,
  });
  return { ok: true, name, path: `/TorrentStream/${safeName}` };
}

module.exports = router;
