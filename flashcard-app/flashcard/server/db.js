const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Connect to shared PostgreSQL using injected env vars
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'openclaw',
  password: process.env.POSTGRES_PASSWORD || 'openclaw',
  database: process.env.POSTGRES_DB || 'openclaw',
});

// Create schema for this app and tables
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS flashcard');
    await client.query('SET search_path TO flashcard');

    await client.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        front_type TEXT NOT NULL CHECK(front_type IN ('text', 'image')),
        front_content TEXT NOT NULL,
        back_type TEXT NOT NULL CHECK(back_type IN ('text', 'image')),
        back_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS import_sources (
        id TEXT PRIMARY KEY,
        file_name TEXT,
        file_title TEXT,
        file_path TEXT NOT NULL,
        topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS card_tags (
        card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (card_id, tag_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_quizzes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filters JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const col of [
      'ALTER TABLE cards ADD COLUMN source_import_id TEXT',
      'ALTER TABLE cards ADD COLUMN source_title TEXT',
      'ALTER TABLE cards ADD COLUMN source_question_number INTEGER',
      'ALTER TABLE cards ADD COLUMN difficulty INTEGER CHECK(difficulty >= 1 AND difficulty <= 5)',
      "ALTER TABLE cards ADD COLUMN tags TEXT[] DEFAULT '{}'",
    ]) {
      try {
        await client.query(col);
      } catch (e) {
        if (e.code !== '42701') throw e;
      }
    }

    // One-time migration: move cards.tags TEXT[] into tags + card_tags tables
    const cardsWithTags = await client.query(
      "SELECT id, tags FROM cards WHERE array_length(tags, 1) > 0"
    );
    for (const card of cardsWithTags.rows) {
      for (const tagName of card.tags) {
        const tagRes = await client.query(
          'INSERT INTO tags (id, name) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
          [uuidv4(), tagName]
        );
        await client.query(
          'INSERT INTO card_tags (card_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [card.id, tagRes.rows[0].id]
        );
      }
    }
    if (cardsWithTags.rows.length > 0) {
      await client.query("UPDATE cards SET tags = '{}' WHERE array_length(tags, 1) > 0");
      console.log(`Migrated tags for ${cardsWithTags.rows.length} cards to junction table`);
    }

    console.log('Database initialized: flashcard schema created');
  } finally {
    client.release();
  }
}

initDB().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Helper to run queries in the flashcard schema
async function query(text, params) {
  const client = await pool.connect();
  try {
    await client.query('SET search_path TO flashcard');
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

module.exports = { pool, query };
