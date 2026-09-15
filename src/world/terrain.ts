// Procedural low-poly terrain shared by the ground mesh, the player, bots and landmarks
// so that everything sits exactly on the surface.

export interface TerrainProfile {
  amp: number;            // hill amplitude
  flatRadius: number;     // radius around origin flattened for the landmark (negative = never flatten)
  base?: number;          // constant height offset
  peak?: { h: number; r: number; plateau: number }; // central mountain with flat top
  island?: number;        // beyond this radius the land sinks into the sea
  rim?: number;           // beyond this radius hills rise to wall the city in
  water?: { level: number; color: number };
}

export interface Terrain {
  profile: TerrainProfile;
  h(x: number, z: number): number;
  onLand(x: number, z: number): boolean;
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
  const h = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    let y = (p.base ?? 0) + noise(x, z) * p.amp * smooth((r - p.flatRadius) / 25);
    if (p.peak) y += p.peak.h * (1 - smooth((r - p.peak.plateau) / (p.peak.r - p.peak.plateau)));
    if (p.island !== undefined) y -= Math.max(0, r - p.island) * 0.5;
    if (p.rim !== undefined && r > p.rim) y += (r - p.rim) ** 2 * 0.06 + noise(x * 3, z * 3) * (r - p.rim) * 0.4;
    return y;
  };
  const onLand = (x: number, z: number) => !p.water || h(x, z) > p.water.level - 0.35;
  return { profile: p, h, onLand };
}
