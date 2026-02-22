const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');

const router = express.Router();

// GET all topics (with card count)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT t.*, COUNT(c.id) as card_count
      FROM topics t LEFT JOIN cards c ON c.topic_id = t.id
      GROUP BY t.id ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST create topic
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const id = uuidv4();
    await query('INSERT INTO topics (id, name) VALUES ($1, $2)', [id, name.trim()]);
    const result = await query('SELECT * FROM topics WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT update topic
router.put('/:id', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await query('UPDATE topics SET name = $1 WHERE id = $2', [name.trim(), req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Topic not found' });
    const topicResult = await query('SELECT * FROM topics WHERE id = $1', [req.params.id]);
    res.json(topicResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE topic (cascades to cards)
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM topics WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Topic not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
