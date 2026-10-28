# Decisions

Non-obvious choices, newest last.

## Phase 0: setup (2026-10-28)

- **Branched from `reelforge-ui`, not `main`.** `main` still contains the old 3D game; `reelforge-ui`
  already has it removed. The uncommitted video-studio WIP was stashed
  (`stash@{0}`, "reelforge video-studio WIP …"), not discarded.
- **No re-scaffold.** The project was already Next.js 16 (App Router), TypeScript strict, Tailwind v4,
  ESLint flat config, `src/`, `@/*` alias. The video-studio pages, the Fly.io relay workflow and
  `three` were removed instead.
- **Folder is `aitools/aitools`.** The brief says `aitools/findurai`; there is no such folder. Kept the
  existing path.
- **`@types/node` bumped 20 → 24** (and `engines.node` to `>=22`): vitest 5 requires `@types/node`
  ≥ 22, and the machine runs Node 24.
- **Static export removed** (`output: "export"`) because route handlers are required.
  `better-sqlite3` is listed in `serverExternalPackages` so the native module isn't bundled.
- **shadcn/ui**: Radix base, Nova preset (Lucide icons, Geist font). shadcn now ships its class merger
  as the `cn` package (from `shadcn-ui/cn`) instead of clsx + tailwind-merge.
- **Dark mode** via `next-themes` (class strategy, follows system by default). `next-themes` came in
  with shadcn's `sonner` component.
- **Analytics kept as-is**: GA4 via gtag.js in the root layout, enabled only when `NEXT_PUBLIC_GA_ID`
  is set. No custom events yet.

## Phase 1: architecture

- **Extra schema beyond the five tables:** `apps.countries` (the countries a project targets) and an
  `itunes_cache` table (the iTunes response cache survives restarts, so the rate limit isn't re-spent).
- **Ranks are derived, not stored.** Each `rank_checks` row keeps the full ordered list of result
  track ids (≤200) plus a top-10 snapshot. My app's rank and every competitor's rank come from that
  list, so a competitor added later still gets ranks from older checks, and `apps.itunes_id` can be
  set after the fact.
- **Repository layer** (`src/lib/db/repo/*`, exported from `src/lib/db`) is the only code that
  imports the schema. All functions are async even though better-sqlite3 is sync, so a Postgres
  port changes `schema.ts` + `client.ts` only.
- **Migrations** are generated with `npm run db:generate` into `./drizzle` (committed) and applied
  automatically the first time `getDb()` runs. `DATABASE_PATH` overrides `./data/app.db`.
- **Env is read lazily** (`src/lib/env.ts`), so builds and pages that don't call OpenAI work
  without a key. A missing key surfaces as HTTP 503 `missing_openai_key`.
- **OpenAI:** Responses API with structured outputs (`zodTextFormat`), then re-validated with zod;
  one retry that tells the model what failed. Default model `gpt-5.4-mini` (`OPENAI_MODEL`).
- **`server-only`** guards every module that touches keys or the DB; vitest aliases it to an empty
  module so those modules stay testable.

## Phase 2–3: rank checks

- **Rank checks are background jobs from the start** (Phase 3's job pattern built into feature 3
  rather than retrofitted). `POST /api/check` returns `202 { jobId }`; `GET /api/jobs/{id}` returns
  progress, back-off state and per-task results (my rank + top 5). `GET /api/check?appId=` returns
  the running job so a reloaded page resumes polling. One running job per project.
- **Jobs live in memory** (`src/lib/jobs/store.ts`), pruned an hour after finishing. They don't
  survive a restart and don't work on serverless; results are already in `rank_checks`, so only
  progress is lost.
- **Throttle** is one process-wide queue spacing requests 60s/`ITUNES_RPM` apart (default 15/min).
  Apple signals rate limits with **403** as well as 429; both pause the *whole* queue, not just the
  failing request. Backoff 5s→10s→20s→40s (cap 60s, 20% jitter, `Retry-After` wins), 4 attempts.
- **Cache** in SQLite keyed by request URL, default TTL **60 min** (not 6 h as first proposed) so
  checks don't look stale. Per-row "Check now" sends `force: true` and bypasses it. A cache hit
  isn't written to history again.
- **Which phrase is searched:** the localized phrase for that country; English storefronts fall back
  to the English keyword; other storefronts are skipped (and reported) until localized.
- **Localization** sends one model call per country per 30 keywords (3 in parallel). US returns
  the keyword unchanged without a call.
