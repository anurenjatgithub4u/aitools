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
