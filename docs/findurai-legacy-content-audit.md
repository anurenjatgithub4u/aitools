# FindurAI Legacy Content Audit

> Generated: 2026-09-25
> Purpose: Identify what belongs to the OLD AI-tools directory product vs the CURRENT 3D virtual world — and classify each asset for KEEP / DELETE / REDIRECT / REVIEW.

---

## Executive Summary

**The codebase is already clean.** After a full inspection of every file in `src/`, `public/`, `server/`, and configuration files, **there is no legacy AI-tools directory system remaining in this project.** The repository has already been fully repositioned as a free multiplayer 3D virtual world.

Every route, component, data file, database connection, and SEO configuration in the project is either:
- Part of the **current 3D virtual world experience** (KEEP), or
- Core shared infrastructure that supports the 3D world (KEEP).

**No files or routes need to be deleted, redirected, or further reviewed** as legacy AI-tool content.

---

## 1. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (static export, `output: "export"`) | No server-side rendering; entire site is statically generated |
| 3D Engine | Three.js 0.186 | All world rendering in `src/world/world.ts` |
| State | `localStorage` via `src/world/store.ts` | No Firebase, no MongoDB, no external DB |
| Realtime | Custom WebSocket relay (`server/index.mjs`) | Plain Node.js + `ws`, no Socket.IO, no Firebase |
| Styling | Vanilla CSS (`src/app/globals.css`) + Tailwind (imported but not used for custom components) |
| Ads | Google AdSense H5 Games API (`src/world/ads.ts`) + standard AdSense (`src/app/ads.tsx`) |
| Analytics | Google Analytics 4 (via `NEXT_PUBLIC_GA_ID` env var) |

---

## 2. Database & External Services Audit

| Service | Used? | Purpose | Action |
|---|---|---|---|
| MongoDB | NOT PRESENT | No MongoDB client, no connection strings, no collections | NONE |
| Firebase | NOT PRESENT | No Firebase SDK, no Firestore, no Auth | NONE |
| Supabase | NOT PRESENT | — | NONE |
| PostgreSQL | NOT PRESENT | — | NONE |
| Redis | NOT PRESENT | — | NONE |
| External APIs | None | No tool-fetching APIs, no search APIs, no directory APIs | NONE |
| localStorage only | CURRENT | `wander.v1` key: stores explorer name, gender, points, friends, gifts, coins, visited worlds | KEEP |

---

## 3. Route Audit

### 3a. App Routes (`src/app/`)

| Route | File | Purpose | Old/Current | Action |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Home page — renders the 3D city directly (WorldView with CITY destination). Includes sr-only section for SEO. | CURRENT | KEEP |
| `/about/` | `src/app/about/page.tsx` | Static landing page about FindurAI City: places, games, social features | CURRENT | KEEP |
| `/games/` | `src/app/games/page.tsx` | Listing of all games available in the city (cricket, football, racing, etc.) | CURRENT | KEEP |
| `/how-to-play/` | `src/app/how-to-play/page.tsx` | Controls guide, cricket batting/bowling, pool, racing, zombie night | CURRENT | KEEP |
| `/map/` | `src/app/map/page.tsx` | Textual guide to every district in FindurAI City | CURRENT | KEEP |
| `/little-kerala/` | `src/app/little-kerala/page.tsx` | SEO landing page targeting Little Kerala / Kerala Dhilber players | CURRENT | KEEP |
| `/world/[id]/` | `src/app/world/[id]/page.tsx` | Dynamic route for each 3D destination (currently only `city` is published) | CURRENT | KEEP |
| `/play/[slug]/` | `src/app/play/[slug]/page.tsx` | SEO landing pages per game intent (cricket, football, ludo, etc.) | CURRENT | KEEP |
| `/play/monopoly/` | `src/app/play/monopoly/page.tsx` | Standalone Monopoly board game (hot-seat, CSS 3D board) | CURRENT | KEEP |
| `/ads.txt` | `src/app/ads.txt/route.ts` | AdSense publisher verification | CURRENT | KEEP |
| `robots.txt` | `src/app/robots.ts` | Standard robots config, allows all | CURRENT | KEEP |
| `sitemap.xml` | `src/app/sitemap.ts` | Lists all real pages | CURRENT | KEEP |
| `opengraph-image` | `src/app/opengraph-image.tsx` | Root OG image (1200x630) | CURRENT | KEEP |

**No AI-tool routes found** (no `/tools/*`, `/tool/*`, `/category/*`, `/categories/*`, `/ai-tools/*`, `/developer-tools/*`, `/compare/*`, `/submit/*`, `/collections/*` etc.)

---

### 3b. Play Pages Data (`src/app/play/pages.ts`)

All 12 entries in PLAY_PAGES are for games inside the 3D world:

| Slug | Game | Action |
|---|---|---|
| `cricket-game-online` | Cricket in the city | KEEP |
| `football-game-online` | 5-a-side football | KEEP |
| `zombie-game-online` | Zombie night survival | KEEP |
| `car-racing-game-online` | FindurAI Speedway | KEEP |
| `8-ball-pool-online` | Pool at Neon Palace | KEEP |
| `carrom-game-online` | Carrom board | KEEP |
| `ludo-online` | Ludo board game | KEEP |
| `chess-online` | Chess | KEEP |
| `virtual-dating-game` | Hangout / dating in city | KEEP |
| `kerala-3d-game` | Kerala-themed city SEO page | KEEP |
| `games-to-play-with-friends-online` | Social/multiplayer SEO page | KEEP |
| `monopoly` | Links to `/play/monopoly/` (own route) | KEEP |

---

### 3c. World Routes (`src/app/world/[id]/`)

| File | Purpose | Action |
|---|---|---|
| `page.tsx` | Dynamic static page per destination | KEEP |
| `gate.tsx` | Splash screen + "create your explorer" profile setup | KEEP |
| `world-view.tsx` | Client component: mounts Three.js world + HUD | KEEP |

---

### 3d. Monopoly Game (`src/app/play/monopoly/`)

| File | Purpose | Action |
|---|---|---|
| `page.tsx` | Page wrapper with JSON-LD structured data | KEEP |
| `MonopolyGame.tsx` | Full Monopoly board game (React) | KEEP |
| `MonoCity.tsx` | 3D mini-city visualization for board center | KEEP |
| `monopoly.css` | Monopoly-specific styles | KEEP |
| `opengraph-image.tsx` | Monopoly-specific OG image | KEEP |
| `engine/board.ts` | Board squares + rent tables | KEEP |
| `engine/cards.ts` | Chance & Community Chest card decks | KEEP |
| `engine/types.ts` | TypeScript types for game state | KEEP |
| `engine/useGameState.ts` | Game state hook | KEEP |

---

## 4. World Modules (`src/world/`)

All 23 files are part of the 3D virtual world engine. None relate to AI tools.

| File | Purpose | Action |
|---|---|---|
| `world.ts` | Main Three.js world: city building, physics, NPC, events (300 KB) | KEEP |
| `city.ts` | City geometry: buildings, roads, landmarks (94 KB) | KEEP |
| `landmarks.ts` | Individual landmark 3D meshes (49 KB) | KEEP |
| `hud.ts` | DOM HUD renderer: joystick, buttons, minimap, chat, quest (45 KB) | KEEP |
| `avatar.ts` | Player avatar mesh + animations (21 KB) | KEEP |
| `destinations.ts` | Destination data (only `city` exported to sitemap/routes) | KEEP |
| `arena.ts` | Arena/stadium logic | KEEP |
| `audio.ts` | Sound effects and music | KEEP |
| `bake.ts` | Geometry baking/instancing | KEEP |
| `carrom.ts` + `carromEngine.ts` | Carrom board game (UI + physics) | KEEP |
| `chess.ts` | Chess game | KEEP |
| `ludo.ts` | Ludo board game | KEEP |
| `pool.ts` + `poolEngine.ts` | 8-ball pool (UI + physics) | KEEP |
| `chat.ts` | In-world chat UI | KEEP |
| `net.ts` | WebSocket multiplayer networking | KEEP |
| `store.ts` | localStorage-backed player state | KEEP |
| `terrain.ts` | Procedural terrain generation | KEEP |
| `vehicles.ts` | Vehicle physics and controls | KEEP |
| `quests.ts` | Tasks and quests (cash hunt, taxi job, etc.) | KEEP |
| `ads.ts` | Google H5 Games Ads (preroll, interstitial, rewarded) | KEEP |
| `life.ts` | NPC animals and ambient life | KEEP |

---

## 5. Public Assets (`public/`)

| Asset | Purpose | Action |
|---|---|---|
| `favicon.svg` | Site icon | KEEP |
| `manifest.webmanifest` | PWA manifest — describes the 3D city | KEEP |
| `flags/*.png` | 22 country flag images used in the multiplayer HUD | KEEP |

---

## 6. Server (`server/`)

| File | Purpose | Action |
|---|---|---|
| `server/index.mjs` | WebSocket relay server for real-time multiplayer. Handles join/leave/relay, rate limiting, room management. No DB. | KEEP |
| `server/package.json` | `ws` dependency only | KEEP |
| `server/Dockerfile` | Docker deployment for relay server | KEEP |
| `server/fly.toml` | Fly.io deployment config | KEEP |

---

## 7. SEO & Metadata Audit

| Item | Contains AI-tool references? | Action |
|---|---|---|
| `seo.ts` TAGLINE | No — "FindurAI · Free 3D city game..." | KEEP |
| `seo.ts` DESCRIPTION | No — describes the 3D city, multiplayer, games | KEEP |
| `seo.ts` KEYWORDS | No — all keywords are about games, dating, social, Kerala, racing. No AI tools. | KEEP |
| `layout.tsx` JSON-LD | No — VideoGame + WebSite + Organization schema | KEEP |
| `sitemap.ts` | No — only lists current 3D world pages | KEEP |
| `robots.ts` | No — allows all, links sitemap | KEEP |
| `manifest.webmanifest` | No — describes the 3D city | KEEP |

---

## 8. Navigation Audit

There is **no shared header or footer component.** Each landing page renders its own inline nav with:
- Brand link (FindurAI logo) → `/`
- "Play now →" CTA → `/` or `/?start=<game>`

**No navigation links to AI tools, categories, tool submissions, comparisons, or any directory pages exist.**

---

## 9. Data Files Audit

| Type | Found? | Details |
|---|---|---|
| JSON tool data files | NONE | No `.json` files with tool listings |
| TypeScript tool arrays | NONE | No arrays of AI tools, categories, or tool metadata |
| MDX/content directories | NONE | No blog, no MDX files |
| Seed data files | NONE | |
| Tool icons/images | NONE | Only flags and favicon |
| Category data | NONE | |
| Tag systems | NONE | |

---

## 10. Redirects, Middleware & Search Audit

- **Redirects:** None configured in `next.config.ts`
- **Middleware:** No `middleware.ts` file exists
- **Search:** No search functionality (no search bar, no search API, no Algolia)
- **Admin:** No admin panel or CMS routes

---

## 11. Environment Variables

| Variable | Purpose | Used in |
|---|---|---|
| `NEXT_PUBLIC_REALTIME_URL` | WebSocket relay URL | `src/world/net.ts` |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 measurement ID | `src/app/layout.tsx` |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | AdSense publisher ID | `src/app/ads.tsx`, `src/world/ads.ts`, `src/app/ads.txt/route.ts` |
| `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` | AdSense slot for in-article units | `src/app/ads.tsx` |
| `ALLOWED_ORIGINS` | Allowed WebSocket origins | `server/index.mjs` |
| `PORT` | WebSocket server port (default 8787) | `server/index.mjs` |
| `MAX_ROOM` | Max players per city room (default 60) | `server/index.mjs` |

---

## 12. Summary Action Table

| Category | File Count | Action | Reason |
|---|---|---|---|
| App routes (pages) | 13 routes | KEEP ALL | All are 3D world content |
| World engine modules | 23 files | KEEP ALL | Three.js city engine |
| Monopoly game files | 8 files | KEEP ALL | Standalone board game |
| SEO/metadata | 5 files | KEEP ALL | All describe the 3D world |
| Server relay | 4 files | KEEP ALL | Real-time multiplayer |
| Public assets | 24 files | KEEP ALL | Flags used in HUD, favicon, manifest |
| Config files | 6 files | KEEP ALL | Standard Next.js config |
| Database code | 0 files | N/A | No database exists |
| AI tool routes | 0 found | N/A | None exist |
| Tool data files | 0 found | N/A | None exist |
| Tool UI components | 0 found | N/A | None exist |
| Legacy redirects needed | 0 code-level | REVIEW at CDN | If old URLs were indexed by Google, handle at Vercel/CDN |

---

## 13. Conclusion

**FindurAI's codebase is already a clean, focused 3D virtual world product.**

The repository contains:
- A Next.js static site with game-focused SEO landing pages
- A Three.js 3D city with real-time multiplayer via WebSocket
- In-city games: cricket, football, racing, zombie night, tasks, pool, chess, ludo, carrom
- A standalone Monopoly board game
- No Firebase, no MongoDB, no tool directories, no AI product listings, no categories

**No files need to be removed.** The migration from AI tools to the 3D world has already been completed at the code level.

If the live findurai.com website still serves pages from the old AI tools system (perhaps from a different deployment branch or CDN cache), that is a **deployment/infrastructure issue**, not a code issue. The code in this repository is entirely correct for the new product.
