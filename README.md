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

| Script | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run build` | Production build |

Data lives in a local SQLite file at `./data/app.db` (gitignored). See `DECISIONS.md` for design notes.
