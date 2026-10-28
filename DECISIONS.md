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
