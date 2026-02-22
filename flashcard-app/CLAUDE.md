# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend** (`flashcard/client/`):
```bash
npm run dev    # Vite dev server (proxies /api to localhost:3000)
npm run build  # Build to ../../public/
```

**Backend** (`server/`):
```bash
npm start      # Express server on port 3000
```

**Docker** (from repo root):
```bash
docker-compose build
docker-compose up
```

No linting or test framework is configured.

## Architecture

Two-layer monolith: React SPA (Vite) + Express REST API + PostgreSQL.

```
repo root
├── flashcard/client/src/   # React frontend
├── server/                 # Express backend
├── public/                 # Built frontend (served by Express)
├── Dockerfile              # Multi-stage: build client → run server
└── docker-compose.yml      # Traefik reverse proxy, deployed at flashcard.pocketfusion.in
```

### Frontend (`flashcard/client/src/`)

Routing via React Router. Main views:
- `TopicList.jsx` — home, lists study topics
- `CardManager.jsx` — create/edit/delete cards per topic
- `Quiz.jsx` — study mode with flip-card animation
- `ImportModal.jsx` — multi-format import dialog (JSON, .tex, .txt, .md)

Shared utilities:
- `api.js` — fetch wrapper for all backend calls
- `texParser.js` / `textParser.js` — file parsing happens **in the browser** before sending to server
- `MathContent.jsx` — renders KaTeX for LaTeX math expressions

### Backend (`server/`)

- `index.js` — Express setup, CORS, static file serving (`/public`), SPA fallback
- `db.js` — PostgreSQL pool, schema initialization, `query()` helper; uses lazy `ALTER TABLE` for schema evolution (try/catch per column)
- `routes/topics.js` — CRUD for topics
- `routes/cards.js` — CRUD for cards + `/upload` (Multer, 10MB limit), `/import` (bulk JSON), `/import-json-file` (file upload)

### Database Schema (`flashcard` schema in PostgreSQL)

```
topics          id (UUID PK), name, created_at
cards           id (UUID PK), topic_id (FK), front_type, front_content,
                back_type, back_content, source_import_id (FK, nullable),
                source_title, source_question_number, created_at
import_sources  id (UUID PK), file_name, file_title, file_path, topic_id (FK), created_at
```

Card `*_type` values: `'text'` or `'image'`. Image content is the path `/uploads/<filename>`. Import sources store the original file at `/data/imports/<id>.json`.

### Key Patterns

- **Parsing is client-side**: `texParser.js` and `textParser.js` normalize files into a standard card array before POSTing to `/import`.
- **Flexible JSON import**: The server normalizes multiple JSON structures (questions/cards arrays, varying key names) into a unified format.
- **Schema evolution**: `db.js` adds new columns via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` wrapped in try/catch — safe to run on every startup.
- **No pagination**: All cards for a topic are loaded in one query; quiz cards are shuffled in memory.
- **Dark mode**: Persisted to `localStorage`, toggled via Tailwind's `class` strategy.
