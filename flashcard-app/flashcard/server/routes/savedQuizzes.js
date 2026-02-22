const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');

const router = express.Router();

// GET all saved quizzes
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM saved_quizzes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST create saved quiz
router.post('/', async (req, res) => {
  const { name, filters } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const id = uuidv4();
    await query(
      'INSERT INTO saved_quizzes (id, name, filters) VALUES ($1, $2, $3)',
      [id, name.trim(), JSON.stringify(filters || {})]
    );
    const result = await query('SELECT * FROM saved_quizzes WHERE id = $1', [id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE saved quiz
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM saved_quizzes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
