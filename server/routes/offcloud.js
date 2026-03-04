const express = require('express');
const axios = require('axios');
const router = express.Router();

const TOKEN = process.env.OFFCLOUD_TOKEN || '';

router.post('/', async (req, res) => {
  const { magnet } = req.body;
  if (!magnet) return res.status(400).json({ error: 'magnet required' });
  if (!TOKEN) return res.status(500).json({ error: 'OFFCLOUD_TOKEN not set' });
  try {
    // Step 1: submit to /api/instant
    const instantRes = await axios.post('https://offcloud.com/api/instant',
      { url: magnet },
      { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, timeout: 20000 }
    );
    const d = instantRes.data;
    const requestId = d?.requestId || d?.request_id || d?.id;
    const cached = !!d?.cached;
    if (!requestId) return res.status(502).json({ error: 'No requestId from Offcloud', raw: d });

    // Step 2: explore files
    const exploreRes = await axios.get(`https://offcloud.com/api/cloud/explore/${requestId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` }, timeout: 15000 }
    );
    const files = (Array.isArray(exploreRes.data) ? exploreRes.data : []).map(f => {
      const name = f.fileName || f.filename || f.name || 'file';
      const url = f.url || f.downloadUrl || f.link || '';
      const size = f.size || 0;
      const ext = name.split('.').pop().toLowerCase();
      const type = (['mp4','mkv','avi','mov','wmv','webm','flv','m4v'].includes(ext) ? 'video' :
                   ['mp3','flac','aac','ogg','wav','m4a','opus'].includes(ext) ? 'audio' :
                   ['srt','vtt','ass','ssa'].includes(ext) ? 'subtitle' :
                   ['jpg','jpeg','png','gif','webp'].includes(ext) ? 'image' : 'file');
      return { name, url, size, type, ext };
    });
    res.json({ cached, requestId, files });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: e.message, detail: e.response?.data });
  }
});

module.exports = router;
