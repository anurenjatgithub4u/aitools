# Keyword Planner

AI-powered App Store keyword research (ASO): brainstorm keywords with OpenAI, localize them per
country, check real App Store ranks via Apple's public iTunes Search API, and score each keyword.

> Volume scores are **estimates** derived from competitor rating counts, not Apple's search volume.

## Run

```bash
cp .env.example .env.local   # then set OPENAI_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

Data lives in a local SQLite file at `./data/app.db` (gitignored, created and migrated on first use).

## Workflow

1. **New project**: your app (App Store link) or just a niche idea, plus target countries.
2. **Add keywords**: AI brainstorm (~30) or paste your own.
3. **Localize**: the phrase locals actually search, per country (non-English stores need this).
4. **Check all** / per-row **Check now**: rank checks run as a background job, paced for Apple's
   rate limit (about 15 searches a minute), with progress shown on the board.
5. Read the board: rank (yours and competitors'), volume, difficulty, top 5 apps and a verdict.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run build` | Production build |
| `npm run db:generate` | New migration after editing `src/lib/db/schema.ts` |

## API

| Route | |
| --- | --- |
| `GET/POST /api/apps`, `GET/PATCH/DELETE /api/apps/{id}` | Projects; `GET /api/apps/{id}` returns the board |
| `POST /api/apps/{id}/keywords`, `DELETE …/keywords/{keywordId}` | Manual keywords |
| `GET/POST /api/apps/{id}/competitors`, `DELETE …/competitors/{cid}` | Competitors (name, link or id) |
| `POST /api/brainstorm` | ~30 keyword ideas from OpenAI, saved to the project |
| `POST /api/localize` | Local search phrase per keyword × country |
| `POST /api/check` → `202 { jobId }`, `GET /api/jobs/{id}` | Background rank check and its progress |

Not built in v1: App Store Connect, payments/licences, Google Play, accounts/auth, desktop
packaging. See `DECISIONS.md` for design notes and where those would plug in.
