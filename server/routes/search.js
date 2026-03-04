const express = require('express');
const router = express.Router();

const scrapers = {
  tpb: require('../scrapers/piratebay'),
  yts: require('../scrapers/yts'),
  nyaa: require('../scrapers/nyaa'),
  eztv: require('../scrapers/eztv'),
  '1337x': require('../scrapers/1337x'),
  limetorrents: require('../scrapers/limetorrents'),
  btdigg: require('../scrapers/btdigg'),
  torrentz2: require('../scrapers/torrentz2'),
};

router.get('/', async (req, res) => {
  const query = req.query.q?.trim();
  if (!query) return res.status(400).json({ error: 'query required' });
  const requested = req.query.sources ? req.query.sources.split(',').map(s => s.trim().toLowerCase()) : Object.keys(scrapers);
  const active = requested.filter(s => scrapers[s]);
  const settled = await Promise.allSettled(active.map(s => scrapers[s].search(query)));
  const all = [];
  const meta = {};
  settled.forEach((p, i) => {
    const s = active[i];
    if (p.status === 'fulfilled') { all.push(...p.value); meta[s] = { count: p.value.length }; }
    else { meta[s] = { count: 0, error: p.reason?.message }; }
  });
  all.sort((a, b) => (b.seeds || 0) - (a.seeds || 0));
  res.json({ results: all, meta, total: all.length });
});

module.exports = router;
