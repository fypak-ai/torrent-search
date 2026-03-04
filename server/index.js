require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const searchRouter = require('./routes/search');
const offcloudRouter = require('./routes/offcloud');
const dropboxRouter = require('./routes/dropbox');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/search', searchRouter);
app.use('/api/stream', offcloudRouter);
app.use('/api/dropbox', dropboxRouter);

const clientBuild = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Torrent Search on port ${PORT}`);
});
