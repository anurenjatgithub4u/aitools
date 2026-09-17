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
}

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
  const h = (x: number, z: number) => {
    let y = raw(x, z);
    for (const f of flats) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r + f.blend) y += (f.y - y) * (1 - smooth((d - f.r) / f.blend));
    }
    return y;
  };
  const onLand = (x: number, z: number) => !p.water || h(x, z) > p.water.level - 0.35;
  return { profile: p, h, onLand, inLand };
}
