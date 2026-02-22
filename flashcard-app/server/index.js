const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const topicRoutes = require('./routes/topics');
const cardRoutes = require('./routes/cards');

const app = express();
const PORT = 3000;

// Ensure upload dir
const uploadDir = '/data/uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(uploadDir));

// API routes
app.use('/api/topics', topicRoutes);
app.use('/api/cards', cardRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Flashcard server running on port ${PORT}`);
});
