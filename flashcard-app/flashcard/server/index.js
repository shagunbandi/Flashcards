const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const topicRoutes = require('./routes/topics');
const cardRoutes = require('./routes/cards');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API routes
app.use('/api/topics', topicRoutes);
app.use('/api/cards', cardRoutes);

// Serve frontend (only in production where public/ is built)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Flashcard server running on port ${PORT}`);
});
