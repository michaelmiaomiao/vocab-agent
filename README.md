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
- Bulk import page for loose vocab notes and expression lists
- Vocabulary list page with newest-first ordering and status filtering
- Review page for learning items with review-state actions
- Smart ordering mode for review priority
- AI suggestion flow for grouping, meanings, synonyms, antonyms, and example sentences
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
- `POST /api/vocab/bulk-create`
- `POST /api/vocab/:id/enrich`
- `POST /api/vocab/:id/apply-ai`
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

Example bulk import payload:

```json
{
  "raw_text": "[IV] Business English\n- Contingent on 视什么而定\n- Bridge the gap\n## 动词\n- dive deeper 更详细地分析"
}
```

Bulk import behavior:

- Heading lines such as `[IV] Business English` or `## 动词` become `group_label`
- Bullet lines become vocab entries
- Inline Chinese text or text after ` - ` becomes `note`
- Slash-separated variants such as `A / B / C` become one phrase plus synonyms
- Existing identical `phrase_text` values are skipped during import

AI enrichment behavior:

- Uses OpenAI when `OPENAI_API_KEY` is configured, with heuristic fallback otherwise
- Generates correction suggestions for spelling, grammar, and more natural phrasing
- Generates suggestions for `group_label`, `meaning`, `synonyms`, `antonyms`
- Generates an example sentence tuned for business, data, or engineering contexts
- Computes a `smart_score` used for smart ordering in list and review pages
- Keeps AI suggestions separate until you click `Apply AI`

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

If you want real LLM enrichment locally, create a `.dev.vars` file:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

You can copy the checked-in example first:

```bash
cp .dev.vars.example .dev.vars
```

For frontend-only iteration:

```bash
npm run dev
```

## Testing

Run the core engineering checks before pushing:

```bash
npm run typecheck
npm run test:run
npm run build
```

Current automated coverage focuses on:

- bulk import parsing
- phrase normalization and payload sanitization
- heuristic enrichment and smart score behavior

GitHub Actions runs the same checks on pushes to `main` and on pull requests.

## Deployment

1. Push this repo to GitHub.
2. Create a Cloudflare Pages project connected to this repository.
3. Set build command to `npm run build`.
4. Set build output directory to `dist`.
5. Add the D1 binding named `DB`.
6. Add an `OPENAI_API_KEY` secret if you want real LLM enrichment:

```bash
npx wrangler secret put OPENAI_API_KEY
```

Optional model override:

```bash
npx wrangler secret put OPENAI_MODEL
```

7. Put Cloudflare Access in front of the deployed app.

## Notes

- `tags` and `synonyms` are stored as JSON text in D1 for easy future expansion.
- The phrase list you paste into chat is not stored automatically. Paste it into
  Bulk Import to actually save it into D1.
- `mark as reviewed` currently keeps the item in `learning`, which is a minimal
  V1 behavior without spaced repetition.
- Current AI enrichment uses OpenAI if configured and falls back to heuristic
  suggestions when no API key is present or the request fails.
- V2 can add Telegram, email reminders, semantic grouping, and LLM synonym generation.
