const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const { query } = require('../db');

const importsDir = '/data/imports';
if (!fs.existsSync(importsDir)) fs.mkdirSync(importsDir, { recursive: true });

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const gcs = new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
const bucket = gcs.bucket(GCS_BUCKET_NAME);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

const router = express.Router();

// Upload image endpoint
router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const ext = path.extname(req.file.originalname);
    const folder = req.body.folder
      ? req.body.folder.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'uploads';
    const blobName = `${folder}/${uuidv4()}${ext}`;
    const blob = bucket.file(blobName);
    await blob.save(req.file.buffer, { contentType: req.file.mimetype });
    res.json({ path: `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${blobName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// GET cards (optionally filter by topic_id)
router.get('/', async (req, res) => {
  const { topic_id } = req.query;
  try {
    let result;
    if (topic_id) {
      result = await query(
        'SELECT c.*, t.name as topic_name FROM cards c JOIN topics t ON t.id = c.topic_id WHERE c.topic_id = $1 ORDER BY c.created_at DESC',
        [topic_id]
      );
    } else {
      result = await query(
        'SELECT c.*, t.name as topic_name FROM cards c JOIN topics t ON t.id = c.topic_id ORDER BY c.created_at DESC'
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST create card
router.post('/', async (req, res) => {
  const { topic_id, front_type, front_content, back_type, back_content, difficulty, tags } = req.body;
  if (!topic_id || !front_type || !front_content || !back_type || !back_content) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const topicResult = await query('SELECT id FROM topics WHERE id = $1', [topic_id]);
    if (topicResult.rows.length === 0) return res.status(404).json({ error: 'Topic not found' });

    const id = uuidv4();
    await query(
      'INSERT INTO cards (id, topic_id, front_type, front_content, back_type, back_content, difficulty, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, topic_id, front_type, front_content, back_type, back_content, difficulty || null, Array.isArray(tags) ? tags : []]
    );
    const cardResult = await query(
      'SELECT c.*, t.name as topic_name FROM cards c JOIN topics t ON t.id = c.topic_id WHERE c.id = $1',
      [id]
    );
    res.status(201).json(cardResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT update card
router.put('/:id', async (req, res) => {
  const { topic_id, front_type, front_content, back_type, back_content, difficulty, tags } = req.body;
  try {
    const existingResult = await query('SELECT * FROM cards WHERE id = $1', [req.params.id]);
    if (existingResult.rows.length === 0) return res.status(404).json({ error: 'Card not found' });
    const existing = existingResult.rows[0];

    await query(
      'UPDATE cards SET topic_id = $1, front_type = $2, front_content = $3, back_type = $4, back_content = $5, difficulty = $6, tags = $7 WHERE id = $8',
      [
        topic_id || existing.topic_id,
        front_type || existing.front_type,
        front_content || existing.front_content,
        back_type || existing.back_type,
        back_content || existing.back_content,
        difficulty !== undefined ? difficulty : existing.difficulty,
        tags !== undefined ? (Array.isArray(tags) ? tags : []) : (existing.tags || []),
        req.params.id
      ]
    );
    const cardResult = await query(
      'SELECT c.*, t.name as topic_name FROM cards c JOIN topics t ON t.id = c.topic_id WHERE c.id = $1',
      [req.params.id]
    );
    res.json(cardResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE card
router.delete('/:id', async (req, res) => {
  try {
    // Delete associated image files
    const cardResult = await query('SELECT * FROM cards WHERE id = $1', [req.params.id]);
    if (cardResult.rows.length === 0) return res.status(404).json({ error: 'Card not found' });
    const card = cardResult.rows[0];

    const gcsPrefix = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/`;
    if (card.front_type === 'image' && card.front_content.startsWith(gcsPrefix)) {
      const blobName = card.front_content.slice(gcsPrefix.length);
      await bucket.file(blobName).delete().catch(() => {});
    }
    if (card.back_type === 'image' && card.back_content.startsWith(gcsPrefix)) {
      const blobName = card.back_content.slice(gcsPrefix.length);
      await bucket.file(blobName).delete().catch(() => {});
    }

    await query('DELETE FROM cards WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Format options for front (array or object e.g. { a: "...", b: "..." })
function formatOptions(options) {
  if (!options) return '';
  if (Array.isArray(options)) return options.length ? '\n\n' + options.join('\n') : '';
  if (typeof options === 'object' && options !== null) {
    const lines = Object.entries(options).map(([k, v]) => `${k}. ${v}`).filter(Boolean);
    return lines.length ? '\n\n' + lines.join('\n') : '';
  }
  return '';
}

// --- Normalize various JSON shapes into { front, back, question_number? }[]
function normalizeToCards(payload) {
  let items = null;
  if (Array.isArray(payload)) {
    items = payload;
  } else if (payload && Array.isArray(payload.questions)) {
    items = payload.questions;
  } else if (payload && Array.isArray(payload.cards)) {
    items = payload.cards;
  }
  if (!items || items.length === 0) return null;

  return items.map((q) => {
    const front =
      q.question ??
      q.front ??
      q.q ??
      '';
    let back =
      q.answer ??
      q.correct_answer_text ??
      q.back ??
      q.a ??
      '(Your answer)';
    if (q.explanation && typeof q.explanation === 'string' && q.explanation.trim()) {
      back = (typeof back === 'string' ? back : String(back)) + '\n\n' + q.explanation.trim();
    }
    const frontText = typeof front === 'string' ? front : String(front);
    const statements =
      q.statements && Array.isArray(q.statements) && q.statements.length
        ? '\n\n' +
          q.statements
            .map((s, i) => {
              const t = String(s).trim();
              if (/^\d+\.\s/.test(t)) return t;
              return `${i + 1}. ${t}`;
            })
            .join('\n')
        : '';
    const optionsText = Array.isArray(q.options)
      ? formatOptions(q.options)
      : typeof q.options === 'object' && q.options !== null
        ? formatOptions(q.options)
        : '';
    const fullFront = (frontText + statements + optionsText).trim() || frontText;
    const backText = typeof back === 'string' ? back : String(back);
    const questionNumber = q.question_number != null ? Number(q.question_number) : null;
    return { front: fullFront, back: backText, question_number: questionNumber };
  });
}

// --- Bulk import helper. importMeta: { file_name, file_title, raw_content } ---
async function processImport(topicIdOrName, cards, useTopicId, importMeta) {
  if (!cards || cards.length === 0) {
    return { error: 'No valid questions/cards to import' };
  }

  try {
    let topicId;
    if (useTopicId && topicIdOrName) {
      const topicResult = await query('SELECT id FROM topics WHERE id = $1', [topicIdOrName]);
      if (topicResult.rows.length === 0) return { error: 'Topic not found' };
      topicId = topicResult.rows[0].id;
    } else if (topicIdOrName && typeof topicIdOrName === 'string') {
      const topicResult = await query('SELECT id FROM topics WHERE name = $1', [topicIdOrName.trim()]);
      if (topicResult.rows.length > 0) {
        topicId = topicResult.rows[0].id;
      } else {
        topicId = uuidv4();
        await query('INSERT INTO topics (id, name) VALUES ($1, $2)', [topicId, topicIdOrName.trim()]);
      }
    } else {
      return { error: 'topic_id or topic_name is required' };
    }

    let sourceImportId = null;
    const sourceTitle = (importMeta && (importMeta.file_title || importMeta.file_name)) ? (importMeta.file_title || importMeta.file_name) : null;

    if (importMeta && importMeta.raw_content) {
      sourceImportId = uuidv4();
      const filePath = path.join(importsDir, sourceImportId + '.json');
      fs.writeFileSync(filePath, importMeta.raw_content, 'utf-8');
      await query(
        `INSERT INTO import_sources (id, file_name, file_title, file_path, topic_id) VALUES ($1, $2, $3, $4, $5)`,
        [
          sourceImportId,
          importMeta.file_name || null,
          importMeta.file_title || null,
          filePath,
          topicId,
        ]
      );
    }

    for (const { front, back, question_number } of cards) {
      await query(
        `INSERT INTO cards (id, topic_id, front_type, front_content, back_type, back_content, source_import_id, source_title, source_question_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          topicId,
          'text',
          front || '(No question)',
          'text',
          back || '(Your answer)',
          sourceImportId,
          sourceTitle,
          question_number != null && Number.isInteger(question_number) ? question_number : null,
        ]
      );
    }

    return {
      success: true,
      topic_id: topicId,
      cards_created: cards.length,
      import_id: sourceImportId,
    };
  } catch (err) {
    console.error(err);
    return { error: 'Database error: ' + err.message };
  }
}

// POST /import - bulk import from JSON body (topic_id or topic_name + normalized questions/cards; optional file_name, file_title, raw_file)
router.post('/import', async (req, res) => {
  const { topic_id, topic_name, questions, cards, file_name, file_title, raw_file } = req.body;
  const normalized = normalizeToCards(req.body) ?? normalizeToCards({ questions: questions || cards });
  if (!normalized) {
    return res.status(400).json({
      error: 'Invalid format. Provide an array of questions/cards, or an object with "questions" or "cards" (each item: question/front, answer/back, optional options).',
    });
  }
  const useTopicId = !!topic_id;
  const topic = topic_id || topic_name;
  if (!topic) {
    return res.status(400).json({ error: 'topic_id or topic_name is required' });
  }
  const importMeta =
    raw_file || file_title || file_name
      ? {
          file_name: file_name || null,
          file_title: file_title || null,
          raw_content: typeof raw_file === 'string' ? raw_file : null,
        }
      : null;
  const result = await processImport(topic, normalized, useTopicId, importMeta);
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json(result);
});

// POST /import-json-file - bulk import from uploaded .json file
const jsonUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.json') cb(null, true);
    else cb(new Error('Only .json files are allowed'));
  }
});

router.post('/import-json-file', jsonUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const rawContent = req.file.buffer.toString('utf-8');
    const data = JSON.parse(rawContent);
    const normalized = normalizeToCards(data);
    if (!normalized) {
      return res.status(400).json({
        error: 'Invalid format. File must contain "questions" or "cards" array, or be a root array (each item: question/front, answer/back, optional options).',
      });
    }
    const topicId = req.body.topic_id || data.topic_id;
    const topicName = req.body.topic_name || data.topic_name || data.topic || data.name;
    const topic = topicId || topicName;
    if (!topic) {
      return res.status(400).json({ error: 'topic_id or topic_name is required (in body or in file)' });
    }
    const importMeta = {
      file_name: req.file.originalname || null,
      file_title: data.title || data.topic_name || data.topic || data.name || null,
      raw_content: rawContent,
    };
    const result = await processImport(topic, normalized, !!topicId, importMeta);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON file: ' + e.message });
  }
});

module.exports = router;
