const { Pool } = require('pg');

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

    for (const col of [
      'ALTER TABLE cards ADD COLUMN source_import_id TEXT',
      'ALTER TABLE cards ADD COLUMN source_title TEXT',
      'ALTER TABLE cards ADD COLUMN source_question_number INTEGER',
    ]) {
      try {
        await client.query(col);
      } catch (e) {
        if (e.code !== '42701') throw e;
      }
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
