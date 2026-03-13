# Vocab Agent

Personal Business English vocabulary app built for Cloudflare Pages, Pages
Functions, and D1.

## Architecture

- Frontend: React + Vite single-page app in [`frontend/`](/Users/michaelmiaoair/Documents/GitHub/vocab-agent/frontend)
- API: Cloudflare Pages Functions in [`functions/api/vocab/`](/Users/michaelmiaoair/Documents/GitHub/vocab-agent/functions/api/vocab)
- Database: Cloudflare D1 schema and migrations in [`db/`](/Users/michaelmiaoair/Documents/GitHub/vocab-agent/db)
- Shared types: [`shared/types.ts`](/Users/michaelmiaoair/Documents/GitHub/vocab-agent/shared/types.ts)
- Security: external protection through Cloudflare Access

## MVP Features

- Capture page for new phrases with note, tags, source, meaning, synonyms, and group label
- Vocabulary list page with newest-first ordering and status filtering
- Review page for learning items with review-state actions
- CRUD API for `vocab_items`
- D1 schema with `new`, `learning`, and `mastered` review states

## Project Structure

```text
vocab-agent/
  frontend/
    index.html
    src/
      App.tsx
      pages/
  functions/
    api/
      vocab/
        create.ts
        list.ts
        [id].ts
  db/
    schema.sql
    migrations/
  shared/
    types.ts
  wrangler.toml
```

## API Routes

- `POST /api/vocab/create`
- `GET /api/vocab/list`
- `GET /api/vocab/:id`
- `PATCH /api/vocab/:id`
- `DELETE /api/vocab/:id`

Example create payload:

```json
{
  "phrase_text": "I'll chase it up with the team",
  "note": "follow-up phrase",
  "tags": ["meeting", "followup"],
  "source": "slack",
  "meaning": "Follow up on an issue",
  "synonyms": ["follow up", "check in"],
  "group_label": "meeting communication"
}
```

## Database Setup

1. Create the D1 database:

```bash
wrangler d1 create vocab-db
```

2. Copy the returned `database_id` into [`wrangler.toml`](/Users/michaelmiaoair/Documents/GitHub/vocab-agent/wrangler.toml).

3. Apply the schema locally or remotely:

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

If you prefer migrations:

```bash
wrangler d1 migrations apply vocab-db
```

## Local Development

Your machine needs Node.js and npm first. They were not available in this
session, so install them before running the commands below.

```bash
npm install
npx wrangler login
npm run build
npm run cf:dev
```

For frontend-only iteration:

```bash
npm run dev
```

## Deployment

1. Push this repo to GitHub.
2. Create a Cloudflare Pages project connected to this repository.
3. Set build command to `npm run build`.
4. Set build output directory to `dist`.
5. Add the D1 binding named `DB`.
6. Put Cloudflare Access in front of the deployed app.

## Notes

- `tags` and `synonyms` are stored as JSON text in D1 for easy future expansion.
- `mark as reviewed` currently keeps the item in `learning`, which is a minimal
  V1 behavior without spaced repetition.
- V2 can add Telegram, email reminders, semantic grouping, and LLM synonym generation.
