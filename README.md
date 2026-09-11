# Wander — walk the world's wonders

A "Little Kerala"-style browser world for real places. Pick a destination on the landing page,
step into a low-poly version of it, wander with other explorers, drive a tuk-tuk or jeep, ride
under the metro, and collect local treats for points.

Worlds: **Kochi**, **Bengaluru**, Taj Mahal, Eiffel Tower, Pyramids of Giza.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to out/ (deploys to Vercel or any static host)
```

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | W A S D / arrows, Shift to run | left half of screen = joystick |
| Look / zoom | drag / scroll | right half = drag |
| Jump | Space | Jump button |
| Drive / get out | E next to a vehicle | Drive button |
| Driving | W/S accelerate & brake, A/D steer, Space handbrake | joystick |

## Layout

- `src/app/` — Next.js pages: landing (`page.tsx`), `world/[id]` (static page + client `world-view.tsx`).
- `src/world/destinations.ts` — the worlds: theme, terrain, decor, collectibles, spawn, roads and traffic.
- `src/world/landmarks.ts` — landmark builders (`kochi()`, `bengaluru()`, …), shared `metroLine()` / `road()` helpers, decor.
- `src/world/world.ts` — Three.js scene, camera, input, mesh-based collision, bots, pickups, vehicles, traffic, animals, birds.
- `src/world/avatar.ts`, `vehicles.ts`, `life.ts` — models. `hud.ts` — in-world HUD. `store.ts` — localStorage progress.

## Adding a world

1. Add an entry to `DESTINATIONS` (id, theme, terrain profile, collectibles, optional `spawn`, `routes`, `traffic`, `solids` for keeping trees away).
2. Add a builder in `landmarks.ts` and wire it in `buildLandmark()`. Use `metroLine()` for a metro with named stops and `label()` for place-name boards.

## Not yet

Other explorers are simulated bots — real multiplayer needs a presence server (WebSocket / Colyseus / Supabase Realtime).
