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

## Scoring

- Formulas are documented in `src/lib/scoring/scores.ts`; verdict rules are one ordered array in
  `src/lib/scoring/verdict.ts` (first match wins, last rule is a catch-all).
- Spot-check against live US/DE data (2026-10-28): "meditation" vol 89 / diff 71, "habit tracker"
  74 / 61, "habit tracker for adhd teens" 61 / 44, "gewohnheitstracker" (DE) 57 / 35,
  "kakeibo budget planner" 26 / 25. The ordering matches intuition.
- Apple's search is fuzzy and returns ~180–200 results even for niche phrases, so the
  result-count ("breadth") factor in volume rarely bites; the rating-count term does the work.
- Scores are computed on read from the stored top-10 snapshot, so retuning a formula re-scores
  history without a migration.

## UI

- **Board data** is one request (`GET /api/apps/{id}`) built by a pure `buildBoardRows()`; the page
  server-renders it as `initialData` for React Query, then refetches each time a job task finishes.
- **Per-row "Check now"** joins the running job when there is one (its tasks are appended, duplicates
  skipped), so it is never silently dropped. Rows in the job's `pending` list show a spinner.
- **Localize** runs inside the request (≈9 model calls, 3 at a time, typically under a minute), not
  as a job. If that ever gets slow, it can move onto the same job runner.
- **Flags:** Windows can't draw flag emoji, so `country-flag-emoji-polyfill` loads a flags-only
  Twemoji font on those systems. The font is self-hosted in `public/fonts` (CC-BY 4.0, Twemoji)
  instead of the package's jsdelivr default.
- **App icons** come straight from Apple's CDN with `next/image` `unoptimized` (no image proxy).
- Home and board pages are `force-dynamic` so `next build` never opens the database.

## Storefront size adjustment (2026-10-28)

- Rating counts are per storefront, so smaller App Stores scored low on volume *and* difficulty
  even for strong keywords (e.g. DE "habit tracker" 43 vs US 74). Both scores now use
  US-equivalent ratings: `ratings / ratingShare`, with `ratingShare` per country in
  `lib/countries.ts`.
- `ratingShare` = median ratio (store ÷ US) of rating counts for 12 global apps, measured live on
  2026-10-28: UK 0.13, DE 0.093, FR 0.11, ES 0.065, IT 0.07, JP 0.14, BR 0.20, IN 0.17. Per-app
  ratios vary 3–10×, so these are rough; re-measure if scores look off for one country.
- Effect on stored checks: DE/JP/BR volume +8…+17 and difficulty +6…+15. A few verdicts move from
  Target to Maybe because difficulty crossed 50. Thin phrases (BR "rastreador de sequência", vol 7)
  stay low, as they should.

## Hosting on Vercel (2026-10-29)

findurai.com is a Vercel project auto-deployed from GitHub `main`. Serverless hosting forced
three changes:

- **Database: libSQL.** The same Drizzle schema runs on a local file (`./data/app.db`, dev) or on
  Turso (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`, set by Vercel's Turso integration). Migrations
  still apply on first access; `outputFileTracingIncludes` ships `./drizzle` with the functions.
  Deletes remove child rows explicitly, because a remote libSQL connection may not enforce
  `ON DELETE CASCADE`.
- **Rank checks are browser-driven**, replacing the in-memory job queue from Phase 3 (Vercel
  freezes functions after they respond, and instances don't share memory). The board queues
  tasks and POSTs `/api/check` once per keyword × country, 4s apart (`CHECK_SPACING_MS`). A rate
  limit returns 429 + `retryAfterMs` at once; the browser shows the countdown and retries.
  Trade-off: checks stop if the tab closes (finished ones are saved). A durable queue (Vercel
  Queues, QStash) can replace it later behind the same `/api/check` route.
- **Shared password** (`APP_PASSWORD`) via `src/proxy.ts`: pages redirect to `/login`, API routes
  401. Without it, anyone with the URL could spend the OpenAI key. Unset locally = no login.
- Apple rate-limits per IP, and Vercel's outbound IPs are shared with other sites, so 429s may
  be more frequent there than locally; the retry countdown covers it.

## Accounts and the free plan (2026-10-29)

The site is public freemium: 2 free projects per person, then Premium (payments not built yet).

- **Firebase Auth** for sign-up/sign-in (Google + email/password, password reset). The browser
  signs in with Firebase, sends the ID token to `POST /api/session`, and the server (Firebase
  Admin) turns it into a 14-day http-only session cookie. Firebase in the browser keeps nothing
  (in-memory persistence); the cookie is the source of truth. This replaces the `APP_PASSWORD`
  gate, which is removed.
- **Data stays in Turso.** A `users` table keyed by Firebase uid holds `plan` and
  `projects_created`. Every project has an `owner_id`; every repository call takes the owner, and
  someone else's project behaves exactly like a missing one (404), so ids can't be probed.
- **Free limit = projects ever created** (`lib/plans.ts`), so deleting doesn't refill it. Taken
  with one conditional `UPDATE … WHERE projects_created < limit`, so parallel requests can't both
  get the last slot; given back if the insert fails. Over the limit: 402 `upgrade_required`.
- **Local mode:** with no `NEXT_PUBLIC_FIREBASE_*` set, sign-in is off and everything belongs to
  a single unlimited "local" user, which is what existing local projects were migrated to.
- Not yet limited per project: brainstorm/localize calls inside one project. Worth a cap before
  heavy public traffic, since each call costs OpenAI money.

## SEO and going live (2026-10-30)

- Site identity lives in `src/lib/site.ts` (name, brand, URL, description, keywords, FAQ) so a
  rename is one edit. `metadataBase` = `NEXT_PUBLIC_SITE_URL` or `https://www.findurai.com`.
- Root metadata: title template, description, keywords, canonical, Open Graph, Twitter card,
  robots. Generated `icon`, `apple-icon` and `opengraph-image` (next/og), plus `robots.txt`
  (hides `/api/` and `/app/`), `sitemap.xml` and a web manifest. Project boards are `noindex`.
- Home has a short FAQ (crawlable text) and JSON-LD: `WebApplication` with a free `Offer`, and
  `FAQPage`. The OG image avoids CJK text (Satori has no CJK font) and every multi-child element
  in it is flex (Satori fails the build otherwise; caught by `next build`, not by `next dev`).
- **Local mode is blocked on Vercel**: if `NEXT_PUBLIC_FIREBASE_*` is missing there, requests fail
  with 503 instead of letting every visitor share one unlimited account.
