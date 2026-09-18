// Procedural low-poly terrain shared by the ground mesh, the player, bots and landmarks
// so that everything sits exactly on the surface.

export interface TerrainProfile {
  amp: number;            // hill amplitude
  flatRadius: number;     // radius around origin flattened for the landmark (negative = never flatten)
  base?: number;          // constant height offset
  peak?: { h: number; r: number; plateau: number }; // central mountain with flat top
  island?: number;        // beyond this radius the land sinks into the sea
  rim?: number;           // beyond this radius hills rise to wall the city in
  coast?: number;         // east of this x the land slopes into the sea (no rim hills on that side)
  flats?: { x: number; z: number; r: number; blend: number }[];   // level pads (stadium, pitch…) eased into the hills around them
  lands?: { cx: number; cz: number; r: number; base: number; amp?: number; hills?: { x: number; z: number; r: number; h: number }[] }[];   // further islands: rolling land inside r, sinking into the sea beyond it
  water?: { level: number; color: number };
}

export interface Terrain {
  profile: TerrainProfile;
  h(x: number, z: number): number;
  onLand(x: number, z: number): boolean;
  inLand(x: number, z: number): boolean;   // inside one of the extra landmasses (no rim hills, no city-limits)
  /** Smooth the ground along a path (a road, the race track): flat across `width`, gently graded along it,
   *  eased into the hills over `blend`. Call before anything is placed on it. */
  addStrip(path: [number, number][], width: number, blend: number, closed?: boolean): void;
}

interface StripSample { x: number; z: number; y: number }
interface Strip { s: StripSample[]; hw: number; blend: number; closed: boolean }
const CELL = 10;   // spatial hash for strip lookups

const smooth = (t: number) => {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
};

function noise(x: number, z: number) {
  return (
    Math.sin(x * 0.045) * Math.cos(z * 0.05) +
    0.5 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.4) +
    0.25 * Math.sin(x * 0.23 + 3.1) * Math.cos(z * 0.21 + 2.2)
  );
}

export function makeTerrain(p: TerrainProfile): Terrain {
  const inLand = (x: number, z: number) => (p.lands ?? []).some((l) => Math.hypot(x - l.cx, z - l.cz) < l.r + 30);
  const raw = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    let y = (p.base ?? 0) + noise(x, z) * p.amp * smooth((r - p.flatRadius) / 25);
    if (p.peak) y += p.peak.h * (1 - smooth((r - p.peak.plateau) / (p.peak.r - p.peak.plateau)));
    if (p.island !== undefined) y -= Math.max(0, r - p.island) * 0.5;
    if (p.coast !== undefined) y -= Math.max(0, x - p.coast) * 0.45;
    const seaSide = p.coast !== undefined && x > p.coast - 90;
    if (p.rim !== undefined && r > p.rim && !seaSide && !inLand(x, z)) y += (r - p.rim) ** 2 * 0.06 + noise(x * 3, z * 3) * (r - p.rim) * 0.4;
    for (const l of p.lands ?? []) {
      const d = Math.hypot(x - l.cx, z - l.cz);
      if (d > l.r + 60) continue;
      let ly = l.base + noise(x + 500, z - 300) * (l.amp ?? p.amp) - Math.max(0, d - l.r) * 0.5;
      for (const hl of l.hills ?? []) { const hd = Math.hypot(x - hl.x, z - hl.z) / hl.r; ly += hl.h * Math.exp(-hd * hd); }
      y = Math.max(y, ly);
    }
    return y;
  };
  const flats = (p.flats ?? []).map((f) => ({ ...f, y: raw(f.x, f.z) }));
  const base = (x: number, z: number) => {
    let y = raw(x, z);
    for (const f of flats) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r + f.blend) y += (f.y - y) * (1 - smooth((d - f.r) / f.blend));
    }
    return y;
  };
  // strips: roads and the track. Samples every ~3 m along the path with heights low-passed along it,
  // indexed in a grid so h() only looks at the few segments nearby.
  const strips: Strip[] = [];
  const grid = new Map<string, [Strip, number][]>();
  const key = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
  const addStrip = (path: [number, number][], width: number, blend: number, closed = false) => {
    const pts = closed ? [...path, path[0]] : path;
    const s: StripSample[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3));
      for (let k = 0; k < n; k++) { const u = k / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u; s.push({ x, z, y: base(x, z) }); }
    }
    if (!closed) { const [lx, lz] = pts[pts.length - 1]; s.push({ x: lx, z: lz, y: base(lx, lz) }); }
    // low-pass the profile along the path (σ ≈ 24 m) so grades are gentle and there are no bumps
    const rawY = s.map((q) => q.y), R = 8;
    for (let i = 0; i < s.length; i++) {
      let sum = 0, wsum = 0;
      for (let k = -3 * R; k <= 3 * R; k++) {
        let j = i + k;
        if (closed) j = ((j % s.length) + s.length) % s.length; else j = Math.min(s.length - 1, Math.max(0, j));
        const w = Math.exp(-(k * k) / (2 * R * R)); sum += rawY[j] * w; wsum += w;
      }
      s[i].y = sum / wsum;
    }
    const strip: Strip = { s, hw: width / 2, blend, closed };
    strips.push(strip);
    const reach = Math.ceil((strip.hw + blend + 3) / CELL);
    for (let i = 0; i < s.length; i++) {
      const cx = Math.floor(s[i].x / CELL), cz = Math.floor(s[i].z / CELL);
      for (let dx = -reach; dx <= reach; dx++) for (let dz = -reach; dz <= reach; dz++) { const k = `${cx + dx},${cz + dz}`; let list = grid.get(k); if (!list) grid.set(k, (list = [])); list.push([strip, i]); }
    }
  };
  const h = (x: number, z: number) => {
    let y = base(x, z);
    const near = grid.get(key(x, z));
    if (!near) return y;
    // nearest point on each strip nearby, then a weighted blend of their heights (so junctions meet, not step)
    const best = new Map<Strip, { d: number; y: number }>();
    for (const [strip, i] of near) {   // distance to the segment after sample i (and the one before it, so seams are covered)
      const s = strip.s, n = s.length;
      for (const j of [i, i - 1]) {
        const a = s[strip.closed ? ((j % n) + n) % n : j], b = s[strip.closed ? (((j + 1) % n) + n) % n : j + 1];
        if (!a || !b) continue;
        const dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz || 1;
        const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len2));
        const px = a.x + dx * u, pz = a.z + dz * u, d = Math.hypot(x - px, z - pz);
        const cur = best.get(strip);
        if (!cur || d < cur.d) best.set(strip, { d, y: a.y + (b.y - a.y) * u });
      }
    }
    let W = 0, sum = 0;
    for (const [strip, { d, y: sy }] of best) { const w = 1 - smooth((d - strip.hw) / strip.blend); if (w > 0) { W += w; sum += w * sy; } }
    if (W > 0) y += (sum / W - y) * Math.min(1, W);
    return y;
  };
  const onLand = (x: number, z: number) => !p.water || h(x, z) > p.water.level - 0.35;
  return { profile: p, h, onLand, inLand, addStrip };
}
