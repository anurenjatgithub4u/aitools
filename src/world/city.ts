import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// FindurAI City — an imaginary hangout city. Downtown plaza + café row, Neon Lane (bars, pubs,
// a club), Sunrise High + FindurAI College, Central Park with a lake, Sunset Beach with a pier,
// the stadium and skate park, Food-truck park and the Palm Grove homes. Everything is built from
// primitives so it bakes into a handful of draw calls. Faces: +Z is south on the map.

type H = (x: number, z: number) => number;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const M = (c: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...extra });
function mesh(geo: THREE.BufferGeometry, c: number, extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  const m = new THREE.Mesh(geo, M(c, extra)); m.castShadow = true; m.receiveShadow = true; return m;
}
const box = (w: number, h: number, d: number, c: number) => mesh(new THREE.BoxGeometry(w, h, d), c);
const cyl = (rt: number, rb: number, h: number, c: number, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c);
const sph = (r: number, c: number, seg = 12) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2)), c);
const cone = (r: number, h: number, c: number, seg = 4) => mesh(new THREE.ConeGeometry(r, h, seg), c);
const dome = (r: number, c: number) => mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), c);
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };
const rot = <T extends THREE.Object3D>(o: T, axis: 'x' | 'y' | 'z', a: number) => { o.rotation[axis] = a; return o; };
const glow = (w: number, h: number, d: number, c: number) => mesh(new THREE.BoxGeometry(w, h, d), c, { emissive: c, emissiveIntensity: 0.9 });
const glass = 0x9fd3e8;
function bar(a: THREE.Vector3, b: THREE.Vector3, r: number, c: number) {
  const m = mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 6), c);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
function label(text: string, cls: string, range = 110) {
  const el = document.createElement('div'); el.className = cls; el.textContent = text;
  const o = new CSS2DObject(el); o.userData.range = range; return o;
}
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------- reusable props ----------
function roundTree(g: THREE.Group, x: number, y: number, z: number, s: number, leaf = 0x4f9a3e) {
  g.add(at(cyl(0.22 * s, 0.32 * s, 2.6 * s, 0x6b4a2a, 7), x, y + 1.3 * s, z));
  const r = rng(Math.floor(x * 31 + z * 17));
  for (let i = 0; i < 4; i++) { const b = mesh(new THREE.IcosahedronGeometry(1.5 * s * (0.6 + r() * 0.5), 1), new THREE.Color(leaf).offsetHSL(0, 0, (r() - 0.5) * 0.1).getHex()); b.position.set(x + (r() - 0.5) * 2 * s, y + 3.3 * s + (r() - 0.5) * s, z + (r() - 0.5) * 2 * s); g.add(b); }
}
function palm(g: THREE.Group, x: number, y: number, z: number, s: number) {
  let px = x, py = y;
  for (let i = 0; i < 5; i++) { const lean = 0.04 + i * 0.06, seg = cyl(0.18 * s, 0.22 * s, 1.5 * s, 0x8a6a4a, 7); seg.position.set(px + Math.sin(lean) * 0.7 * s, py + Math.cos(lean) * 0.7 * s, z); seg.rotation.z = -lean; g.add(seg); px += Math.sin(lean) * 1.35 * s; py += Math.cos(lean) * 1.35 * s; }
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const f = box(3.2 * s, 0.08 * s, 0.7 * s, 0x3f9a3f); f.position.set(px + Math.cos(a) * 1.4 * s, py - 0.2 * s, z + Math.sin(a) * 1.4 * s); f.rotation.y = -a; f.rotation.z = -0.5; g.add(f); }
  g.add(at(sph(0.25 * s, 0x6b8f3a, 6), px, py - 0.3 * s, z));
}
function bench(g: THREE.Group, x: number, y: number, z: number, ry: number) {
  const b = new THREE.Group();
  b.add(at(box(2, 0.12, 0.6, 0x8a5a2b), 0, 0.5, 0)); b.add(at(box(2, 0.6, 0.1, 0x8a5a2b), 0, 0.85, -0.3));
  for (const dx of [-0.8, 0.8]) b.add(at(box(0.1, 0.5, 0.5, 0x333333), dx, 0.25, 0));
  b.position.set(x, y, z); b.rotation.y = ry; g.add(b);
}
function lamp(g: THREE.Group, x: number, y: number, z: number) {
  g.add(at(cyl(0.08, 0.12, 4.5, 0x555555, 6), x, y + 2.25, z));
  g.add(at(glow(0.5, 0.35, 0.5, 0xfff2a8), x, y + 4.6, z));
}
function umbrella(g: THREE.Group, x: number, y: number, z: number, c: number) {
  g.add(at(cyl(0.05, 0.05, 2.4, 0xdddddd, 6), x, y + 1.2, z));
  g.add(at(cone(1.6, 0.7, c, 8), x, y + 2.6, z));
}
function stringLights(g: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, n: number) {
  g.add(bar(a, b, 0.02, 0x333333));
  for (let i = 1; i < n; i++) { const t = i / n; g.add(at(glow(0.16, 0.22, 0.16, [0xfff2a8, 0xff7a7a, 0x7ad7ff, 0xa6ff7a][i % 4]), a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - 0.25 - Math.sin(t * Math.PI) * 0.5, a.z + (b.z - a.z) * t)); }
}
function house(g: THREE.Group, x: number, y: number, z: number, ry: number, wall: number, roof: number) {
  const hs = new THREE.Group();
  hs.add(at(box(8, 4.5, 7, wall), 0, 2.25, 0));
  hs.add(rot(at(cone(6.2, 2.6, roof, 4), 0, 5.8, 0), 'y', Math.PI / 4));
  hs.add(at(box(1.2, 2.2, 0.15, 0x3a2418), 0, 1.1, 3.55));
  for (const dx of [-2.6, 2.6]) hs.add(at(box(1.4, 1.2, 0.1, glass), dx, 2.6, 3.55));
  hs.add(at(box(0.8, 1.6, 0.8, 0x8a5a2b), 2.5, 6.4, -1.5));
  hs.position.set(x, y, z); hs.rotation.y = ry; g.add(hs);
}

export interface Clear { x: number; z: number; r: number }

export function buildCity(g: THREE.Group, h: H) {
  const clear: Clear[] = [];
  const keep = (x: number, z: number, r: number) => clear.push({ x, z, r });
  const road = (x0: number, z0: number, x1: number, z1: number) => {
    ((g.userData.roads ??= []) as [number, number][][]).push([[x0, z0], [x1, z1]]);
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 8);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const a = V(x0 + (x1 - x0) * t0, 0, z0 + (z1 - z0) * t0), b = V(x0 + (x1 - x0) * t1, 0, z0 + (z1 - z0) * t1);
      a.y = h(a.x, a.z) + 0.12; b.y = h(b.x, b.z) + 0.12;
      const seg = mesh(new THREE.BoxGeometry(7, 0.16, a.distanceTo(b) + 0.4), 0x5f5f5f);
      seg.position.copy(a).add(b).multiplyScalar(0.5); seg.lookAt(b); g.add(seg);
      const dash = mesh(new THREE.BoxGeometry(0.3, 0.18, 2.5), 0xf4f4f4); dash.position.copy(seg.position); dash.rotation.copy(seg.rotation); g.add(dash);
      keep(a.x, a.z, 6);
    }
  };
  const place = (name: string, x: number, y: number, z: number, range = 130) => g.add(at(label(name, 'place', range), x, h(x, z) + y, z));
  const shop = (name: string, x: number, y: number, z: number) => g.add(at(label(name, 'shop', 70), x, h(x, z) + y, z));

  // ================= DOWNTOWN PLAZA (0,0) =================
  g.add(at(cyl(30, 30, 0.3, 0xd9cfbc, 40), 0, h(0, 0) + 0.15, 0));
  g.add(at(cyl(6, 6.5, 1, 0x9fb5c9, 24), 0, h(0, 0) + 0.8, 0));                               // fountain basin
  g.add(at(cyl(5.4, 5.4, 0.3, 0x4fa9d6, 24), 0, h(0, 0) + 1.35, 0));
  g.add(at(cyl(0.6, 0.9, 3, 0x9fb5c9, 10), 0, h(0, 0) + 2.8, 0));
  g.add(at(cyl(2.2, 2.2, 0.3, 0x4fa9d6, 16), 0, h(0, 0) + 4.3, 0));
  g.add(at(mesh(new THREE.ConeGeometry(0.4, 3, 8), 0x9fd3e8, { transparent: true, opacity: 0.7 }), 0, h(0, 0) + 5.9, 0));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; bench(g, Math.cos(a) * 14, h(0, 0) + 0.3, Math.sin(a) * 14, -a + Math.PI / 2); if (i % 2) lamp(g, Math.cos(a) * 24, h(0, 0) + 0.3, Math.sin(a) * 24); }
  g.add(at(box(14, 8, 0.6, 0x1a1a1a), 0, h(0, -32) + 8, -32));                                // big screen
  g.add(at(glow(13, 7, 0.2, 0x3fb7d9), 0, h(0, -32) + 8, -31.6));
  for (const x of [-6, 6]) g.add(at(cyl(0.4, 0.4, 5, 0x555555, 8), x, h(0, -32) + 2.5, -32));
  place('Downtown Plaza', 0, 9, 0);
  keep(0, 0, 34); keep(0, -32, 10);

  // café row south of the plaza
  const cafes: [string, number, number][] = [['Bean There Café', -30, 0xd94a3d], ['Chai Corner', -15, 0xf27d3a], ['Waffle Wonders', 0, 0xf2c31b], ['Gelato Bar', 15, 0x3fb7d9], ['Pizza Point', 30, 0x2fa66a]];
  for (const [name, x, c] of cafes) {
    const z = 64, y = h(x, z);
    g.add(at(box(12, 6, 10, 0xf4ede0), x, y + 3, z));
    g.add(at(box(12.4, 0.5, 10.4, c), x, y + 6.2, z));
    g.add(at(box(10, 2.4, 0.1, glass), x, y + 3, z - 5.05));
    g.add(rot(at(box(11, 0.12, 3.5, c), x, y + 4.4, z - 6.6), 'x', 0.25));                   // awning
    for (const dx of [-3.5, 0, 3.5]) { g.add(at(cyl(0.9, 0.9, 0.1, 0xffffff, 10), x + dx, y + 0.9, z - 9)); g.add(at(cyl(0.08, 0.08, 0.9, 0x555555, 6), x + dx, y + 0.45, z - 9)); umbrella(g, x + dx, y, z - 9, c); }
    shop(name, x, 8.2, z);
    keep(x, z, 9); keep(x, z - 9, 5);
  }
  place('Café Row', 0, 12, 64);

  // cinema (west) and mall (east)
  const cx = -52, cz = 4, cy = h(cx, cz);
  g.add(at(box(26, 14, 22, 0x8a3a5c), cx, cy + 7, cz));
  g.add(at(box(27, 3, 1, 0x1a1a1a), cx, cy + 12, cz + 11.5));
  g.add(at(glow(24, 2, 0.3, 0xf2c31b), cx, cy + 12, cz + 12));
  for (let i = 0; i < 12; i++) g.add(at(glow(0.4, 0.4, 0.4, i % 2 ? 0xff7a7a : 0xfff2a8), cx - 12 + i * 2.2, cy + 13.8, cz + 12.2));
  g.add(at(box(6, 4, 0.3, 0x1a1a1a), cx, cy + 2, cz + 11.2));
  shop('Starlight Cinema', cx, 16, cz);
  keep(cx, cz, 18);
  const mx = 58, mz = -4, my = h(mx, mz);
  g.add(at(mesh(new THREE.BoxGeometry(34, 16, 26), glass, { transparent: true, opacity: 0.55 }), mx, my + 8, mz));
  for (let y = 4; y < 16; y += 4) g.add(at(box(34.4, 0.3, 26.4, 0xd8d8d8), mx, my + y, mz));
  g.add(at(box(35, 1.5, 27, 0x2a2a2a), mx, my + 16.5, mz));
  g.add(at(glow(12, 2.4, 0.4, 0xd94a3d), mx, my + 13, mz + 13.4));
  g.add(at(box(8, 4, 0.3, 0x1a1a1a), mx, my + 2, mz + 13.2));
  shop('City Mall', mx, 20, mz);
  keep(mx, mz, 22);

  // ================= NEON LANE — bars, pubs, club (z = -78) =================
  const bars: [string, number, number, 'pub' | 'bar' | 'club' | 'karaoke' | 'roof'][] = [
    ['The Tipsy Turtle Pub', -112, 0x8a5a2b, 'pub'], ['Whiskey & Wings', -90, 0xb0308a, 'bar'], ['Bass Drop Club', -66, 0x1a1a3a, 'club'],
    ['Karaoke Kingdom', -42, 0x6a3fb0, 'karaoke'], ['Skyline Rooftop Bar', -18, 0x2c3e6b, 'roof'], ['Mojito Shack', 6, 0x2fa66a, 'bar'],
  ];
  for (const [name, x, c, kind] of bars) {
    const z = -78, y = h(x, z), tall = kind === 'roof' ? 16 : kind === 'club' ? 11 : 8;
    g.add(at(box(18, tall, 14, c), x, y + tall / 2, z));
    g.add(at(box(18.4, 0.5, 14.4, 0x2a2a2a), x, y + tall + 0.2, z));
    g.add(at(box(6, 2.6, 0.2, 0x1a1a1a), x, y + 1.3, z + 7.1));                                // door
    if (kind !== 'club') for (const dx of [-5, 5]) g.add(at(box(4, 2.2, 0.1, 0xfff2a8), x + dx, y + 3.2, z + 7.1));
    const neon = [0xff4fd8, 0x3fb7d9, 0xf2c31b, 0x7aff7a, 0xff7a7a][Math.abs(x) % 5];
    g.add(at(glow(12, 1.2, 0.3, neon), x, y + tall - 1.6, z + 7.3));                           // neon sign strip
    g.add(rot(at(box(14, 0.12, 3.2, neon), x, y + 5.2, z + 8.5), 'x', 0.3));                    // awning
    stringLights(g, V(x - 9, y + 5.5, z + 9.5), V(x + 9, y + 5.5, z + 9.5), 9);
    for (const dx of [-6, -2, 2, 6]) { g.add(at(cyl(0.5, 0.5, 0.1, 0x333333, 8), x + dx, y + 1.0, z + 11)); g.add(at(cyl(0.06, 0.06, 1, 0x555555, 6), x + dx, y + 0.5, z + 11)); }
    if (kind === 'club') {
      for (let i = 0; i < 4; i++) g.add(rot(at(mesh(new THREE.CylinderGeometry(0.2, 1.4, 22, 8, 1, true), [0xff4fd8, 0x3fb7d9, 0x7aff7a, 0xf2c31b][i], { emissive: [0xff4fd8, 0x3fb7d9, 0x7aff7a, 0xf2c31b][i], emissiveIntensity: 0.8, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), x - 6 + i * 4, y + tall + 10, z), 'z', (i - 1.5) * 0.25));
      for (let i = 0; i < 16; i++) g.add(at(glow(2.6, 0.1, 2.6, [0xff4fd8, 0x3fb7d9, 0xf2c31b, 0x7aff7a][i % 4]), x - 6 + (i % 4) * 4, y + 0.3, z + 14 + Math.floor(i / 4) * 3)); // dance floor outside
    }
    if (kind === 'roof') { for (const dx of [-6, 0, 6]) { umbrella(g, x + dx, y + tall + 0.4, z, 0xf2c31b); g.add(at(cyl(0.8, 0.8, 0.1, 0xffffff, 10), x + dx, y + tall + 1.2, z)); } g.add(at(box(18.4, 1, 0.3, 0x9fd3e8), x, y + tall + 0.9, z + 7.2)); g.add(at(box(0.3, 1, 14.4, 0x9fd3e8), x + 9.1, y + tall + 0.9, z)); }
    if (kind === 'pub') { g.add(at(cyl(1.2, 1.2, 2, 0x8a5a2b, 12), x + 11, y + 1, z + 9)); g.add(at(cyl(1.2, 1.2, 2, 0x8a5a2b, 12), x + 11, y + 1, z + 12)); }
    shop(name, x, tall + 3, z);
    keep(x, z, 14); keep(x, z + 12, 8);
  }
  place('Neon Lane · nightlife', -50, 22, -78, 150);
  road(-125, -62, 20, -62);

  // ================= CAMPUS (north) =================
  // Sunrise High School
  const sx = 70, sz = -160, sy = h(sx, sz);
  g.add(at(box(40, 8, 12, 0xf2c94c), sx, sy + 4, sz));
  for (const dx of [-14, 14]) g.add(at(box(12, 8, 22, 0xf2c94c), sx + dx, sy + 4, sz + 8));
  g.add(at(box(41, 0.6, 13, 0xd94a3d), sx, sy + 8.3, sz));
  for (let i = -3; i <= 3; i++) g.add(at(box(3, 2, 0.1, glass), sx + i * 5, sy + 4.5, sz + 6.05));
  g.add(at(cyl(0.08, 0.08, 12, 0xdddddd, 6), sx - 24, sy + 6, sz + 22)); g.add(at(box(3, 2, 0.05, 0xff9933), sx - 22.5, sy + 11, sz + 22));   // flag
  // playground + court
  const px = sx - 10, pz = sz + 36, py = h(px, pz);
  g.add(at(box(24, 0.2, 18, 0xe8d3a8), px, py + 0.1, pz));
  for (const dx of [-8, -4]) { g.add(bar(V(px + dx, py, pz - 5), V(px + dx, py + 3.2, pz - 5), 0.1, 0x3fb7d9)); g.add(bar(V(px + dx, py + 3.2, pz - 5), V(px + dx + 2, py + 1.2, pz - 5), 0.03, 0x555555)); }
  g.add(bar(V(px - 8, py + 3.2, pz - 5), V(px - 4, py + 3.2, pz - 5), 0.1, 0x3fb7d9));
  g.add(rot(at(box(1.2, 0.2, 6, 0xf27d3a), px + 4, py + 1.6, pz - 4), 'x', -0.5)); g.add(at(box(1.6, 3, 1.6, 0xf27d3a), px + 4, py + 1.5, pz - 7.5));   // slide
  g.add(rot(at(box(5, 0.2, 0.5, 0x2fa66a), px + 8, py + 0.8, pz + 4), 'z', 0.25)); g.add(at(box(0.3, 0.8, 0.3, 0x555555), px + 8, py + 0.4, pz + 4)); // seesaw
  const bx = sx + 22, bz = sz + 36, by = h(bx, bz);
  g.add(at(box(16, 0.2, 28, 0x3f6f9f), bx, by + 0.1, bz));
  for (const dz of [-12, 12]) { g.add(at(cyl(0.12, 0.12, 4, 0x555555, 6), bx, by + 2, bz + dz)); g.add(at(box(1.6, 1, 0.1, 0xffffff), bx, by + 3.6, bz + dz)); g.add(rot(at(mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 12), 0xf27d3a), bx, by + 3.1, bz + dz + (dz < 0 ? 0.5 : -0.5)), 'x', Math.PI / 2)); }
  place('Sunrise High School', sx, 13, sz);
  keep(sx, sz, 30); keep(px, pz, 15); keep(bx, bz, 16);
  // FindurAI College
  const cox = -80, coz = -175, coy = h(cox, coz);
  g.add(at(box(56, 12, 18, 0xe8dcc8), cox, coy + 6, coz));
  g.add(at(box(58, 0.8, 20, 0xa8503a), cox, coy + 12.4, coz));
  for (let i = -5; i <= 5; i++) g.add(at(cyl(0.6, 0.7, 10, 0xfaf3e6, 10), cox + i * 5, coy + 5, coz + 10));
  g.add(at(box(58, 1.5, 4, 0xfaf3e6), cox, coy + 10.8, coz + 10));
  g.add(at(box(8, 22, 8, 0xe8dcc8), cox, coy + 11, coz - 4));                                   // clock tower
  g.add(rot(at(cone(6, 5, 0xa8503a, 4), cox, coy + 24.5, coz - 4), 'y', Math.PI / 4));
  for (const [dx, dz, ry] of [[0, 4.1, 0], [4.1, 0, Math.PI / 2]] as const) g.add(rot(at(cyl(1.6, 1.6, 0.2, 0xffffff, 20), cox + dx, coy + 18, coz - 4 + dz), ry ? 'z' : 'x', Math.PI / 2));
  g.add(at(dome(7, 0xa8503a), cox + 40, coy + 8, coz + 20)); g.add(at(cyl(7, 7, 8, 0xe8dcc8, 20), cox + 40, coy + 4, coz + 20));  // library
  g.add(at(box(40, 0.2, 26, 0x86c46b), cox, coy + 0.12, coz + 30));                             // quad lawn
  for (const dx of [-14, 0, 14]) bench(g, cox + dx, coy + 0.2, coz + 42, Math.PI);
  place('FindurAI College', cox, 30, coz);
  shop('Library', cox + 40, 16, coz + 20);
  keep(cox, coz, 40); keep(cox + 40, coz + 20, 10);
  road(15, -100, 15, -215); road(15, -140, -80, -140); road(15, -125, 70, -125);

  // ================= CENTRAL PARK (west) =================
  const lx = -175, lz = 40, ly = h(lx, lz);
  g.add(at(cyl(34, 34, 0.3, 0x4a97c8, 40), lx, ly + 0.15, lz));
  g.add(at(cyl(5, 6, 1.4, 0x86c46b, 12), lx + 8, ly + 0.6, lz - 6)); roundTree(g, lx + 8, ly + 1.2, lz - 6, 0.9);   // islet
  const gz = new THREE.Group();                                                                  // gazebo
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; gz.add(at(cyl(0.2, 0.2, 4, 0xfaf3e6, 8), Math.cos(a) * 3.4, 2, Math.sin(a) * 3.4)); }
  gz.add(at(cyl(3.8, 3.8, 0.4, 0xd9cfbc, 8), 0, 0.2, 0)); gz.add(at(cone(4.6, 2.2, 0xa8503a, 8), 0, 5, 0));
  gz.position.set(lx + 42, ly, lz + 30); g.add(gz);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.add(rot(at(box(2.4, 0.15, 6, 0xc9b99a), lx + Math.cos(a) * 44, h(lx + Math.cos(a) * 44, lz + Math.sin(a) * 44) + 0.12, lz + Math.sin(a) * 44), 'y', -a)); } // jogging loop
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; bench(g, lx + Math.cos(a) * 39, h(lx + Math.cos(a) * 39, lz + Math.sin(a) * 39) + 0.2, lz + Math.sin(a) * 39, -a - Math.PI / 2); }
  const rr = rng(5);
  for (let i = 0; i < 28; i++) { const a = rr() * Math.PI * 2, d = 38 + rr() * 30; const tx = lx + Math.cos(a) * d, tz = lz + Math.sin(a) * d; roundTree(g, tx, h(tx, tz), tz, 0.9 + rr() * 0.7, [0x4f9a3e, 0x5fa54a, 0xe98cb4][i % 3]); }
  g.add(at(box(2.4, 1.8, 1.4, 0xffffff), lx + 30, ly + 0.9, lz - 40)); umbrella(g, lx + 30, ly, lz - 40, 0xff7ab8); shop('Ice-cream cart', lx + 30, 4, lz - 40);
  place('Central Park', lx, 8, lz);
  keep(lx, lz, 37); keep(lx + 42, lz + 30, 7);
  road(-60, 60, -125, 60);

  // ================= SUNSET BEACH (east coast) =================
  for (let z = -150; z <= 150; z += 30) { if (z === -90) { g.add(at(box(40, 0.3, 12, 0xf0dcb0), 190, h(190, z) + 0.1, -99)); g.add(at(box(40, 0.3, 3, 0xf0dcb0), 190, h(190, z) + 0.1, -76.5)); continue; } g.add(at(box(40, 0.3, 31, 0xf0dcb0), 190, h(190, z) + 0.1, z)); }   // sand (with a cut for the bridge approach)
  const lg = 200, lgz = -30;
  g.add(at(box(4, 4, 4, 0xffffff), lg, h(lg, lgz) + 6, lgz)); g.add(rot(at(cone(3.4, 1.8, 0xd94a3d, 4), lg, h(lg, lgz) + 9, lgz), 'y', Math.PI / 4));
  for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) g.add(at(cyl(0.15, 0.15, 4, 0x8a6a4a, 6), lg + dx, h(lg, lgz) + 2, lgz + dz));
  for (const [name, z, c] of [['Coconut Shack', -70, 0xf2c31b], ['Surf & Turf Grill', 20, 0xd94a3d], ['Sunset Lounge', 90, 0xff7ab8]] as const) {
    const x = 182, y = h(x, z);
    g.add(at(box(9, 4, 7, 0xd8c49a), x, y + 2, z)); g.add(rot(at(cone(7.5, 2.5, 0x8a7a4a, 4), x, y + 5, z), 'y', Math.PI / 4));
    g.add(at(box(7, 1.6, 0.1, 0x3a2418), x, y + 2.4, z + 3.55));
    for (const dz of [-4, 0, 4]) { umbrella(g, x + 10, y, z + dz, c); g.add(at(box(2.2, 0.06, 1, [0xff7ab8, 0x3fb7d9, 0xf2c31b][Math.abs(dz) % 3]), x + 12, y + 0.1, z + dz)); }
    shop(name, x, 7.5, z); keep(x, z, 8);
  }
  g.add(at(cyl(0.08, 0.08, 3, 0xdddddd, 6), 196, h(196, 60) + 1.5, 55)); g.add(at(cyl(0.08, 0.08, 3, 0xdddddd, 6), 196, h(196, 60) + 1.5, 65)); g.add(at(mesh(new THREE.BoxGeometry(0.05, 1, 10), 0xffffff, { transparent: true, opacity: 0.5 }), 196, h(196, 60) + 2.4, 60)); // volleyball net
  for (let x = 204; x <= 262; x += 6) for (const dz of [-2.5, 2.5]) g.add(bar(V(x, -3, 40 + dz), V(x, 2.2, 40 + dz), 0.22, 0x6b4a2a));   // pier
  g.add(at(box(62, 0.4, 7, 0x8a6a4a), 233, 2.3, 40)); g.add(at(box(0.15, 1, 62, 0x6b4a2a), 233 - 31, 2.9, 43.5)); g.add(at(box(62, 1, 0.15, 0x6b4a2a), 233, 2.9, 43.5)); g.add(at(box(62, 1, 0.15, 0x6b4a2a), 233, 2.9, 36.5));
  g.add(at(box(8, 5, 8, 0xffffff), 262, 4.8, 40)); g.add(rot(at(cone(6.5, 3, 0xd94a3d, 4), 262, 8.8, 40), 'y', Math.PI / 4)); lamp(g, 233, 2.5, 44);
  for (const [bx2, bz2, ry] of [[230, 80, 0.6], [245, -20, -0.8], [222, 110, 1.4]] as const) { const bt = new THREE.Group(); bt.add(at(box(2.2, 0.8, 6, 0xffffff), 0, 0.4, 0)); bt.add(at(box(1.8, 0.4, 3, 0x3fb7d9), 0, 0.9, -0.5)); bt.add(at(cyl(0.06, 0.06, 5, 0xdddddd, 6), 0, 3, 0.5)); bt.add(at(mesh(new THREE.ConeGeometry(1.6, 4, 3), 0xffffff), 0.6, 3.2, 0.5)); bt.position.set(bx2, 0.3, bz2); bt.rotation.y = ry; g.add(bt); }
  for (let z = -140; z <= 140; z += 20) if (Math.abs(z + 85) > 10) palm(g, 172 + (z % 40 ? 3 : -3), h(172, z), z, 0.9 + ((z / 20) % 3) * 0.2);
  place('Sunset Beach', 195, 10, 0, 160); shop('Pier', 233, 8, 40);
  for (let z = -150; z <= 150; z += 25) keep(190, z, 26);
  road(15, 60, 165, 60); road(165, 60, 165, -120); road(165, 60, 165, 140);

  // ================= STADIUM + SKATE PARK (south) =================
  const stx = 70, stz = 200, sty = h(stx, stz);
  const PW = 56, PD = 36, GOAL = 4.4;   // pitch size + half goal width; exported for the football match
  // open cylinders must be seen from inside too, so they stay out of the bake (which is single-sided)
  const shell = (radius: number, hgt: number, y: number, c: number) => { const m = at(mesh(new THREE.CylinderGeometry(radius, radius, hgt, 48, 1, true), c, { side: THREE.DoubleSide }), stx, y, stz); m.userData.animated = true; g.add(m); };
  shell(40, 9, sty + 4.5, 0xd9d4c8);
  for (let r = 0; r < 3; r++) shell(40 - r * 1.6, 0.9, sty + 6.5 - r * 1.3, r % 2 ? 0x2c3e6b : 0x3f8fd6);   // tiers of seats
  { const base = at(cyl(37, 37, 0.4, 0x5fa64f, 48), stx, sty - 0.15, stz); base.userData.noCollide = true; g.add(base); }
  for (let i = 0; i < 10; i++) g.add(at(box(PW / 10, 0.06, PD, i % 2 ? 0x6fb35e : 0x67ab57), stx - PW / 2 + (i + 0.5) * (PW / 10), sty + 0.04, stz));   // mown stripes
  const line = (w: number, d: number, x: number, z: number) => g.add(at(box(w, 0.05, d, 0xffffff), stx + x, sty + 0.09, stz + z));
  line(PW, 0.25, 0, -PD / 2); line(PW, 0.25, 0, PD / 2); line(0.25, PD, -PW / 2, 0); line(0.25, PD, PW / 2, 0); line(0.25, PD, 0, 0);
  for (const s of [-1, 1]) {
    line(0.25, 21, s * (PW / 2 - 8.8), 0); line(8.8, 0.25, s * (PW / 2 - 4.4), -10.5); line(8.8, 0.25, s * (PW / 2 - 4.4), 10.5);   // penalty area
    line(0.25, 9.7, s * (PW / 2 - 3), 0); line(3, 0.25, s * (PW / 2 - 1.5), -4.85); line(3, 0.25, s * (PW / 2 - 1.5), 4.85);         // goal area
    g.add(at(cyl(0.25, 0.25, 0.05, 0xffffff, 10), stx + s * (PW / 2 - 5.9), sty + 0.09, stz));                                        // penalty spot
  }
  g.add(rot(at(mesh(new THREE.RingGeometry(4.9, 5.15, 40), 0xffffff, { side: THREE.DoubleSide }), stx, sty + 0.1, stz), 'x', -Math.PI / 2));
  g.add(at(cyl(0.3, 0.3, 0.05, 0xffffff, 10), stx, sty + 0.09, stz));
  // goals: white frame with back stanchions and a real net (transparent, so it never blocks anyone)
  const netTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d')!; ctx.clearRect(0, 0, 128, 128); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 128; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const netMat = (w: number, hgt: number) => { const m = new THREE.MeshStandardMaterial({ map: netTex.clone(), transparent: true, opacity: 0.85, alphaTest: 0.2, side: THREE.DoubleSide, roughness: 1 }); m.map!.repeat.set(w * 2, hgt * 2); m.map!.needsUpdate = true; return m; };
  const GH = 2.8, GD = 2.2;
  for (const s of [-1, 1]) {
    const gx = stx + s * PW / 2;
    for (const dz of [-GOAL, GOAL]) { g.add(at(cyl(0.14, 0.14, GH, 0xffffff, 10), gx, sty + GH / 2, stz + dz)); g.add(at(cyl(0.08, 0.08, 1.9, 0xdddddd, 8), gx + s * GD, sty + 0.95, stz + dz)); }
    g.add(at(box(0.28, 0.28, GOAL * 2 + 0.28, 0xffffff), gx, sty + GH, stz));
    g.add(at(box(0.16, 0.16, GOAL * 2 + 0.16, 0xdddddd), gx + s * GD, sty + 1.9, stz));
    for (const dz of [-GOAL, GOAL]) { const b = box(0.1, 0.1, Math.hypot(GD, GH - 1.9) + 0.1, 0xdddddd); b.position.set(gx + s * GD / 2, sty + (GH + 1.9) / 2, stz + dz); b.rotation.y = Math.PI / 2; b.rotation.x = -s * Math.atan2(GH - 1.9, GD); g.add(b); }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(GOAL * 2, 1.9), netMat(GOAL * 2, 1.9)); back.position.set(gx + s * GD, sty + 0.95, stz); back.rotation.y = Math.PI / 2; g.add(back);
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(GD, GH - 1.9), GOAL * 2), netMat(GD, GOAL * 2)); roof.position.set(gx + s * GD / 2, sty + (GH + 1.9) / 2, stz); roof.rotation.set(-Math.PI / 2, 0, -s * Math.atan2(GH - 1.9, GD) - Math.PI / 2, 'YXZ'); g.add(roof);
    for (const dz of [-GOAL, GOAL]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), netMat(GD, GH)); side.position.set(gx + s * GD / 2, sty + GH / 2, stz + dz); g.add(side); }
  }
  g.userData.pitch = { x: stx, z: stz, w: PW, d: PD, goal: GOAL, goalH: GH };
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i / 4) * Math.PI * 2, fx = stx + Math.cos(a) * 44, fz = stz + Math.sin(a) * 44; g.add(at(cyl(0.3, 0.4, 26, 0x888888, 8), fx, sty + 13, fz)); g.add(at(glow(4, 2.5, 0.4, 0xfff2a8), fx, sty + 26, fz)); }
  for (const a of [0.3, 2.9]) { const ex = stx + Math.cos(a) * 40, ez = stz + Math.sin(a) * 40; g.add(rot(at(box(6, 4, 1.2, 0x333333), ex, sty + 2, ez), 'y', -a)); }   // entrance gates (open wall gaps are fine: the wall never blocks)
  place('City Stadium', stx, 14, stz);
  keep(stx, stz, 48);
  const skx = 120, skz = 120, sky = h(skx, skz);
  g.add(at(box(34, 0.3, 26, 0xb8b8b8), skx, sky + 0.15, skz));
  for (const dx of [-11, 11]) g.add(rot(at(box(8, 0.3, 8, 0x999999), skx + dx, sky + 1.6, skz), 'z', dx < 0 ? -0.4 : 0.4));   // ramps
  g.add(at(box(6, 1.2, 1.2, 0x999999), skx, sky + 0.6, skz + 6)); g.add(bar(V(skx - 3, sky + 1.5, skz - 6), V(skx + 3, sky + 1.5, skz - 6), 0.08, 0x555555));
  place('Skate Park', skx, 6, skz);
  keep(skx, skz, 20);
  road(15, 86, 15, 150); road(15, 150, 120, 100); road(15, 150, 70, 160);

  // ================= FOOD-TRUCK PARK (east of downtown) =================
  const fx = 95, fz = 46;
  for (let i = 0; i < 4; i++) {
    const x = fx + (i - 1.5) * 12, y = h(x, fz), c = [0xd94a3d, 0xf2c31b, 0x3fb7d9, 0x6a3fb0][i];
    g.add(at(box(8, 3.4, 4, c), x, y + 2.4, fz)); g.add(at(box(8.2, 0.4, 4.2, 0xffffff), x, y + 4.3, fz)); g.add(rot(at(box(6, 0.1, 2.4, 0xffffff), x, y + 3.9, fz + 3.2), 'x', 0.6));
    for (const dx of [-2.4, 2.4]) { const w = cyl(0.55, 0.55, 0.4, 0x222222, 12); w.rotation.z = Math.PI / 2; g.add(at(w, x + dx, y + 0.55, fz + 2)); }
    g.add(at(cyl(0.7, 0.7, 0.1, 0xffffff, 10), x, y + 0.9, fz + 8)); umbrella(g, x, y, fz + 8, c);
    shop(['Taco Truck', 'Biryani Box', 'Burger Bus', 'Momo Van'][i], x, 6.2, fz);
  }
  stringLights(g, V(fx - 22, h(fx, fz) + 5, fz + 12), V(fx + 22, h(fx, fz) + 5, fz + 12), 14);
  place('Food-truck Park', fx, 10, fz);
  keep(fx, fz, 26);

  // ================= PALM GROVE HOMES (south-west) =================
  const hr = rng(9);
  for (let i = 0; i < 14; i++) {
    const x = -150 + (i % 5) * 20, z = 96 + Math.floor(i / 5) * 22, y = h(x, z);
    house(g, x, y, z, hr() * 0.4 - 0.2, [0xf4e8d0, 0xe8dcc8, 0xf0d9c0, 0xd8e8f0][i % 4], [0xa8503a, 0x8a5a2b, 0x2f6fd1, 0x3fa66a][i % 4]);
    keep(x, z, 7);
  }
  road(-60, 60, -60, 135); road(-60, 135, -160, 135);
  place('Palm Grove Homes', -110, 12, 118);

  // ================= FINDURAI SPEEDWAY (south-west) =================
  // A GP-style circuit: pit straight past the grandstand, a fast sweeper, a chicane, a long back
  // straight and a hairpin. Centre line is a closed Catmull-Rom spline through the control points.
  const scx = -62, scz = 192, TW = 14;
  // world-space control points: the old GP loop in the north, then a long run south into the valley and back
  const ctrl: [number, number][] = [
    [-125, 226], [-80, 226], [-35, 226], [-6, 222], [8, 204], [6, 184], [-8, 170],   // pit straight → Sunset sweeper
    [-24, 178], [-35, 165], [-51, 158],                                              // Neon chicane
    [-90, 158], [-116, 158], [-140, 170],                                            // back straight
    [-156, 195], [-168, 240], [-176, 300], [-172, 355],                              // Valley straight (south)
    [-152, 400], [-112, 422], [-66, 412], [-34, 380],                                // Big Bend
    [-24, 335], [-38, 300],                                                          // Return run
    [-64, 280], [-92, 268], [-116, 256],                                             // Esses
    [-140, 248], [-148, 234],                                                        // Grandstand hairpin
  ];
  const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => V(x, 0, z)), true, 'catmullrom', 0.6);
  const N = 480;
  const pts: [number, number][] = curve.getPoints(N - 1).slice(0, N).map((p) => [p.x, p.z]);
  for (let i = 0; i < N; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % N];
    const a = V(ax, h(ax, az) + 0.14, az), b = V(bx, h(bx, bz) + 0.14, bz);
    const seg = mesh(new THREE.BoxGeometry(TW, 0.2, a.distanceTo(b) + 0.6), 0x4a4a4a);
    seg.position.copy(a).add(b).multiplyScalar(0.5); seg.lookAt(b); g.add(seg);
    const dir = b.clone().sub(a).normalize(), nx = -dir.z, nz = dir.x;
    for (const side of [-1, 1]) {
      const kerb = mesh(new THREE.BoxGeometry(1.4, 0.24, a.distanceTo(b) + 0.6), i % 2 ? 0xd94a3d : 0xf4f4f4);
      kerb.position.copy(seg.position).add(V(nx * side * (TW / 2 + 0.6), 0.02, nz * side * (TW / 2 + 0.6))); kerb.rotation.copy(seg.rotation); g.add(kerb);
    }
    if (i % 10 === 0) { const dash = mesh(new THREE.BoxGeometry(0.3, 0.22, 2.5), 0xf4f4f4); dash.position.copy(seg.position); dash.rotation.copy(seg.rotation); g.add(dash); }
    if (i % 24 === 12) {   // a big painted chevron pointing the way round
      for (const sd of [-1, 1]) { const wing = mesh(new THREE.BoxGeometry(0.5, 0.23, 3.2), 0xf2c31b); wing.position.copy(seg.position).add(V(nx * sd * 1.3, 0.01, nz * sd * 1.3)); wing.rotation.copy(seg.rotation); wing.rotateY(sd * 0.6); g.add(wing); }
    }
    if (i % 5 === 0) keep(ax, az, 13);
  }
  // boost pads: glowing chevrons on the straights; driving over one gives a burst of speed
  const pads: [number, number, number][] = [];
  const segIdx = (seg: number, f = 0.5) => Math.round(((seg + f) / ctrl.length) * N) % N;   // sample index at a fraction of a control segment
  for (const idx of [segIdx(0, 0.4), segIdx(1, 0.4), segIdx(10, 0.3), segIdx(14, 0.2), segIdx(15, 0.3), segIdx(21, 0.3)]) {   // pit straight ×2, back straight, Valley ×2, Return
    const [px, pz] = pts[idx], [qx, qz] = pts[(idx + 2) % N], dir = V(qx - px, 0, qz - pz).normalize(), ang = Math.atan2(dir.x, dir.z);
    for (let k = 0; k < 3; k++) {
      const pad = glow(6, 0.12, 2.2, 0x3fd36f); pad.position.set(px + dir.x * k * 3, h(px, pz) + 0.3, pz + dir.z * k * 3); pad.rotation.y = ang; g.add(pad);
      const chev = mesh(new THREE.BoxGeometry(2.4, 0.14, 0.9), 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }); chev.position.set(px + dir.x * (k * 3 + 0.6), h(px, pz) + 0.38, pz + dir.z * (k * 3 + 0.6)); chev.rotation.y = ang; g.add(chev);
    }
    pads.push([px + dir.x * 3, pz + dir.z * 3, ang]);
  }
  // start / finish: chequered strip + gantry
  const [s0x, s0z] = pts[0], [s1x, s1z] = pts[1], sdir = V(s1x - s0x, 0, s1z - s0z).normalize(), snx = -sdir.z, snz = sdir.x, sy0 = h(s0x, s0z);
  for (let k = -6; k < 6; k++) for (let r = 0; r < 2; r++) { const c = mesh(new THREE.BoxGeometry(1.1, 0.26, 1.1), (k + r) % 2 ? 0x111111 : 0xffffff); c.position.set(s0x + snx * k * 1.1 + sdir.x * r * 1.1, sy0 + 0.16, s0z + snz * k * 1.1 + sdir.z * r * 1.1); c.rotation.y = Math.atan2(sdir.x, sdir.z); g.add(c); }
  for (const side of [-1, 1]) g.add(at(box(0.8, 9, 0.8, 0x333333), s0x + snx * side * 9.5, sy0 + 4.5, s0z + snz * side * 9.5));
  const beam = box(20, 1.4, 1.6, 0x333333); beam.position.set(s0x, sy0 + 9.2, s0z); beam.rotation.y = Math.atan2(sdir.x, sdir.z) + Math.PI / 2; g.add(beam);
  for (let k = -3; k <= 3; k++) g.add(at(glow(0.9, 0.5, 0.9, k % 2 ? 0xd94a3d : 0x3fd36f), s0x + snx * k * 2.4, sy0 + 8.2, s0z + snz * k * 2.4));
  const banner = glow(12, 1.2, 0.2, 0xf2c31b); banner.position.set(s0x, sy0 + 10.6, s0z); banner.rotation.y = beam.rotation.y; g.add(banner);
  // grandstand outside the pit straight, pit garages inside it, tyre walls at the hairpin and chicane
  for (let i = 0; i < 9; i++) { const x = scx - 40 + i * 9, z = scz + 44, y = h(x, z); for (let r = 0; r < 4; r++) g.add(at(box(9, 1.2, 2, r % 2 ? 0x2c3e6b : 0x3f8fd6), x, y + 0.6 + r * 1.2, z + r * 2)); }
  g.add(at(box(84, 0.6, 10, 0xd9d4c8), scx - 4, h(scx, scz + 50) + 6.2, scz + 50));
  for (const dx of [-40, -20, 0, 20, 36]) g.add(at(cyl(0.3, 0.3, 6, 0x555555, 8), scx + dx, h(scx, scz + 50) + 3, scz + 54));
  g.add(at(box(44, 5, 9, 0xe8e2d6), scx - 20, h(scx, scz + 20) + 2.5, scz + 20)); g.add(at(box(45, 0.5, 10, 0xd94a3d), scx - 20, h(scx, scz + 20) + 5.2, scz + 20));
  for (let i = -3; i <= 3; i++) g.add(at(box(4.5, 3.4, 0.2, 0x333333), scx - 20 + i * 6, h(scx, scz + 20) + 1.7, scz + 24.6));
  for (const [tx, tz] of [[-160, 244], [-30, 168], [12, 196], [-158, 400], [-100, 430], [-20, 372], [-18, 320], [-100, 280]]) for (let k = 0; k < 6; k++) g.add(at(cyl(0.8, 0.8, 0.7, k % 2 ? 0x222222 : 0xf4f4f4, 10), tx + (k % 3) * 1.7, h(tx, tz) + 0.35 + Math.floor(k / 3) * 0.7, tz));
  g.add(at(mesh(new THREE.BoxGeometry(10, 0.2, 10), 0x6d6d6d), scx - 20, h(scx - 20, scz) + 0.1, scz)); shop('Pit lane', scx - 20, 8, scz + 20);
  place('FindurAI Speedway', scx, 14, scz, 170); place('Big Bend', -110, 12, 415, 200); shop('Valley straight', -176, 8, 300);
  // the valley south of the city: pines along the track, none on it
  { const r = rng(11); let placed = 0, tries = 0;
    while (placed < 140 && tries++ < 2500) {
      const a = r() * Math.PI * 2, d = 20 + r() * 128, x = -105 + Math.cos(a) * d, z = 330 + Math.sin(a) * d;
      if (Math.hypot(x, z) < 262 || h(x, z) < 0.6 || pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 16)) continue;
      if (clear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
      const s = 0.9 + r() * 0.9; g.add(at(cyl(0.2 * s, 0.3 * s, 2 * s, 0x6b4a2a, 6), x, h(x, z) + s, z)); g.add(at(cone(1.5 * s, 4.5 * s, r() < 0.5 ? 0x2f6b3a : 0x3a7a45, 6), x, h(x, z) + 2 * s + 2.2 * s, z)); placed++;
    }
  }
  keep(scx - 20, scz + 20, 26); keep(scx - 4, scz + 50, 48); keep(scx - 20, scz, 8);
  g.userData.circuit = { pts, width: TW, pads };
  road(-60, 135, -60, 160);

  // ================= HARBOUR BRIDGE (across the strait) =================
  const BZ = -85, BX0 = 210, BX1 = 300, DECK = 8.4, BW = 13, ROADW = 9;   // deck width incl. walkways / road width
  const ORANGE = 0xb8412b, STEEL = 0x3b3f44, CONCRETE = 0x9a9a94;
  const noCol = <T extends THREE.Object3D>(o: T) => { o.userData.noCollide = true; return o; };
  const hidden = <T extends THREE.Object3D>(o: T) => { o.visible = false; return o; };
  const railing = (x0: number, x1: number, y0: number, y1: number, zz: number, sd: number, wall: boolean) => {
    const L = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0), xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
    for (const ry of [0.45, 1.0]) g.add(rot(at(noCol(box(L, 0.07, 0.07, 0xe8ecef)), xm, ym + ry, zz), 'z', ang));
    for (let x = x0; x <= x1 + 0.01; x += 2.5) g.add(at(noCol(box(0.1, 1.1, 0.1, STEEL)), x, y0 + (y1 - y0) * ((x - x0) / (x1 - x0 || 1)) + 0.55, zz));
    if (wall) g.add(rot(at(hidden(box(L + 0.2, 3, 0.3, 0xffffff)), xm, ym + 1.5, zz + sd * 0.1), 'z', ang));
  };
  // a ramp is a smooth slab to look at (no collision) over a staircase of thin invisible steps to stand on
  const ramp = (xa: number, xb: number) => {
    const ya = h(xa, BZ) + 0.15, yb = DECK, n = 16, dir = Math.sign(xb - xa);
    for (let i = 0; i < n; i++) {
      const x0 = xa + (xb - xa) * (i / n), x1 = xa + (xb - xa) * ((i + 1) / n), top = ya + (yb - ya) * ((i + 1) / n), xm = (x0 + x1) / 2, len = Math.abs(x1 - x0);
      g.add(hidden(at(box(len + 0.3, 0.5, BW - 0.4, 0x5f5f5f), xm, top - 0.25, BZ)));
      const y0 = ya + (yb - ya) * (i / n), y1 = top;
      for (const sd of [-1, 1]) {
        const zz = BZ + sd * (BW / 2 - 0.1);
        if (top - h(xm, BZ + sd * (BW / 2 + 2)) < 1.3) { g.add(at(noCol(box(len - 0.4, 0.5, 0.3, 0xd94a3d)), xm, top + 0.25, zz)); g.add(at(noCol(box(len - 0.4, 0.5, 0.3, 0xffffff)), xm, top + 0.25, zz + sd * 0.31)); continue; }   // low end: a red/white kerb you can step over
        railing(Math.min(x0, x1), Math.max(x0, x1), dir > 0 ? y0 : y1, dir > 0 ? y1 : y0, zz, sd, true);
      }
    }
    const L = Math.hypot(xb - xa, yb - ya), ang = Math.atan2(yb - ya, xb - xa), xm = (xa + xb) / 2, ym = (ya + yb) / 2;   // +x end of the box rises toward xb
    g.add(rot(at(noCol(box(L, 0.9, BW, 0x4a4a4a)), xm, ym - 0.45, BZ), 'z', ang));                                        // slab
    g.add(rot(at(noCol(box(L, 0.04, ROADW, 0x5a5a5a)), xm, ym + 0.02, BZ), 'z', ang));                                    // road surface
    for (const sd of [-1, 1]) { g.add(rot(at(noCol(box(L, 0.05, 0.2, 0xf4f4f4)), xm, ym + 0.05, BZ + sd * (ROADW / 2 - 0.2)), 'z', ang)); g.add(rot(at(noCol(box(L, 0.06, (BW - ROADW) / 2 - 0.3, 0xb9b3a8)), xm, ym + 0.05, BZ + sd * (BW / 2 - (BW - ROADW) / 4 - 0.15)), 'z', ang)); }   // edge lines + walkways
    for (let i = 1; i < n; i += 2) g.add(rot(at(noCol(box(2.4, 0.07, 0.3, 0xf4f4f4)), xa + (xb - xa) * (i / n), ya + (yb - ya) * (i / n) + 0.06, BZ), 'z', ang));
    // flared apron at the foot so you can roll on from any angle
    for (let k = 0; k < 2; k++) g.add(at(noCol(box(3, 0.14, BW + 4 + k * 4, 0x5a5a5a)), xa - dir * (1.5 + k * 3), ya - 0.08 - k * 0.03, BZ));
    keep(xm, BZ, Math.abs(xb - xa) / 2 + 6);
    // entrance portal: two pillars, a beam and a lit sign
    const px = xa + dir * 6, py = h(px, BZ);
    for (const sd of [-1, 1]) g.add(at(box(1, 7.5, 1, ORANGE), px, py + 3.75, BZ + sd * (BW / 2 + 1.2)));
    g.add(at(box(1, 1.2, BW + 3.4, ORANGE), px, py + 7.4, BZ));
    g.add(at(glow(0.3, 0.8, BW + 1, 0xfff2a8), px, py + 6.6, BZ));
  };
  ramp(166, BX0); ramp(344, BX1);
  // deck: asphalt with walkways, edge lines, centre dashes, kerbs, railings, lamps
  g.add(at(box(BX1 - BX0 + 0.6, 0.9, BW, 0x4a4a4a), (BX0 + BX1) / 2, DECK - 0.45, BZ));
  g.add(at(noCol(box(BX1 - BX0, 0.04, ROADW, 0x5a5a5a)), (BX0 + BX1) / 2, DECK + 0.02, BZ));
  for (let x = BX0 + 3; x < BX1; x += 6) g.add(at(noCol(box(2.5, 0.07, 0.3, 0xf4f4f4)), x, DECK + 0.06, BZ));
  for (const sd of [-1, 1]) {
    g.add(at(noCol(box(BX1 - BX0, 0.05, 0.2, 0xf4f4f4)), (BX0 + BX1) / 2, DECK + 0.05, BZ + sd * (ROADW / 2 - 0.2)));
    g.add(at(noCol(box(BX1 - BX0, 0.06, (BW - ROADW) / 2 - 0.3, 0xb9b3a8)), (BX0 + BX1) / 2, DECK + 0.05, BZ + sd * (BW / 2 - (BW - ROADW) / 4 - 0.15)));
    g.add(at(noCol(box(BX1 - BX0, 0.22, 0.25, 0xd0d0d0)), (BX0 + BX1) / 2, DECK + 0.11, BZ + sd * (ROADW / 2 + 0.1)));   // kerb
    railing(BX0, BX1, DECK, DECK, BZ + sd * (BW / 2 - 0.1), sd, true);
    for (let x = BX0 + 8; x < BX1; x += 16) lamp(g, x + (sd > 0 ? 8 : 0), DECK, BZ + sd * (BW / 2 - 0.5));
  }
  // structure under the deck: two girders and cross beams
  for (const sd of [-1, 1]) g.add(at(box(BX1 - BX0, 1.2, 0.5, STEEL), (BX0 + BX1) / 2, DECK - 1.5, BZ + sd * 4));
  for (let x = BX0 + 5; x < BX1; x += 10) g.add(at(box(0.4, 0.8, BW - 1, STEEL), x, DECK - 1.3, BZ));
  // towers: portal frames of two tapered legs, three cross beams, beacons on top
  const TX = [235, 275], TOP = 30, SAG = DECK + 3.5;
  for (const tx of TX) {
    for (const sd of [-1, 1]) {
      const lz = BZ + sd * (BW / 2 + 1.7);
      g.add(at(box(2.6, 12, 2.6, ORANGE), tx, 0, lz)); g.add(at(box(2.1, 14, 2.1, ORANGE), tx, 13, lz)); g.add(at(box(1.7, 12, 1.7, ORANGE), tx, 25, lz));
      g.add(at(glow(0.5, 0.5, 0.5, 0xff4040), tx, TOP + 1.3, lz));
    }
    for (const y of [TOP - 0.6, 21, 13.5]) g.add(at(box(1.5, 1.4, BW + 5.5, ORANGE), tx, y, BZ));   // lowest beam clears traffic
    for (const sd of [-1, 1]) g.add(rot(at(box(0.5, 9.5, 0.5, ORANGE), tx, 15, BZ + sd * 2.6), 'x', sd * 0.62));   // X bracing
    g.add(at(cyl(4, 4.8, 12, CONCRETE, 12), tx, -4, BZ)); g.add(at(cyl(4.4, 4.4, 0.8, CONCRETE, 12), tx, 2.4, BZ));
  }
  for (const x of [222, 288]) { g.add(at(cyl(1.4, 1.8, 16, CONCRETE, 10), x, 0, BZ)); g.add(at(box(3.5, 1, BW - 1, CONCRETE), x, DECK - 2.4, BZ)); }
  // main cables with hangers, anchored in concrete blocks at each end
  const cableY = (x: number) => x <= TX[0] ? DECK + 1.2 + (TOP - DECK - 1.2) * ((x - BX0) / (TX[0] - BX0)) : x >= TX[1] ? TOP - (TOP - DECK - 1.2) * ((x - TX[1]) / (BX1 - TX[1])) : SAG + (TOP - SAG) * ((x - 255) / 20) ** 2;
  for (const sd of [-1, 1]) {
    const zz = BZ + sd * (BW / 2 + 1.7);
    for (let x = BX0 - 6; x < BX1 + 6; x += 2.5) g.add(bar(V(x, x < BX0 ? DECK + 1.2 - (BX0 - x) * 0.6 : x > BX1 ? DECK + 1.2 - (x - BX1) * 0.6 : cableY(x), zz), V(x + 2.5, x + 2.5 < BX0 ? DECK + 1.2 - (BX0 - x - 2.5) * 0.6 : x + 2.5 > BX1 ? DECK + 1.2 - (x + 2.5 - BX1) * 0.6 : cableY(x + 2.5), zz), 0.16, STEEL));
    for (let x = BX0 + 4; x < BX1; x += 4) if (Math.abs(x - TX[0]) > 2 && Math.abs(x - TX[1]) > 2) g.add(bar(V(x, cableY(x), zz), V(x, DECK + 1.05, zz - sd * 1.6), 0.045, 0x6a6f75));
    for (const ax of [BX0 - 7, BX1 + 7]) g.add(at(box(3, 4, 2.4, CONCRETE), ax, DECK - 3.2, zz));   // anchor blocks
  }
  road(165, BZ, 168, BZ);
  ((g.userData.roads ??= []) as [number, number][][]).push([[168, BZ], [344, BZ]]);   // the bridge on the map
  place('Harbour Bridge', 255, DECK + 22, BZ, 260);
  keep(255, BZ, 48);

  // ================= EASTSIDE (the island across the water) =================
  road(340, BZ, 470, BZ); road(470, BZ, 470, 100); road(470, 100, 340, 100); road(340, 100, 340, BZ); road(470, 0, 494, 0);
  // Harbour Town: a row of cottages, a café, and a marina on the south shore
  for (let i = 0; i < 6; i++) { const x = 352 + i * 15, z = BZ - 16; house(g, x, h(x, z), z, 0, [0xf4e1c1, 0xd6e6f2, 0xf2d0d0, 0xe4f0d0, 0xf7e7b0, 0xe0d6f2][i], [0xa33b2c, 0x2c3e6b, 0x6b4a2a, 0x2f6b4a, 0xa33b2c, 0x2c3e6b][i]); keep(x, z, 7); lamp(g, x + 7, h(x + 7, z + 9), z + 9); }
  for (let i = 0; i < 4; i++) { const x = 360 + i * 18, z = BZ + 16; house(g, x, h(x, z), z, Math.PI, [0xe6f0f7, 0xf7f0e0, 0xdfe9d6, 0xf3dfe6][i], [0x6b4a2a, 0x2c3e6b, 0xa33b2c, 0x2f6b4a][i]); keep(x, z, 7); }
  { const x = 440, z = BZ - 14, y = h(x, z); g.add(at(box(12, 4.2, 8, 0xf2c31b), x, y + 2.1, z)); g.add(at(box(12.6, 0.4, 8.6, 0x3a2418), x, y + 4.4, z)); g.add(at(box(9, 1.4, 0.15, 0x3a2418), x, y + 2.6, z + 4.1)); for (const dx of [-4, 0, 4]) umbrella(g, x + dx, y, z + 7, 0xd94a3d); shop('Harbour Café', x, 6.4, z); keep(x, z, 9); }
  for (let z = -120; z >= -150; z -= 5) for (const dx of [-2.5, 2.5]) g.add(bar(V(400 + dx, -4, z), V(400 + dx, 2.4, z), 0.22, 0x6b4a2a));
  g.add(at(box(7, 0.4, 34, 0x8a6a4a), 400, 2.5, -135)); g.add(at(box(0.15, 1, 34, 0x6b4a2a), 396.6, 3.1, -135)); g.add(at(box(0.15, 1, 34, 0x6b4a2a), 403.4, 3.1, -135));
  for (const [bx2, bz2, ry] of [[390, -140, 0.4], [411, -146, -0.5], [388, -152, 1.2]] as const) { const bt = new THREE.Group(); bt.add(at(box(2.2, 0.8, 6, 0xffffff), 0, 0.4, 0)); bt.add(at(box(1.8, 0.4, 3, [0xd94a3d, 0x3fb7d9, 0xf2c31b][Math.abs(Math.round(ry * 2)) % 3]), 0, 0.9, -0.5)); bt.add(at(cyl(0.06, 0.06, 5, 0xdddddd, 6), 0, 3, 0.5)); bt.add(at(mesh(new THREE.ConeGeometry(1.6, 4, 3), 0xffffff), 0.6, 3.2, 0.5)); bt.position.set(bx2, 0.3, bz2); bt.rotation.y = ry; g.add(bt); }
  place('Harbour Town', 395, 12, -100, 200); shop('Marina', 400, 8, -125);
  keep(400, -135, 8);
  // Windmill Hill: three windmills and a lookout on the island's highest point
  for (const [wx, wz] of [[420, -30], [406, -18], [432, -14]]) {
    const y = h(wx, wz);
    g.add(at(cyl(1.6, 2.4, 14, 0xf4f0e6, 10), wx, y + 7, wz)); g.add(at(cone(2.4, 2.2, 0x6b4a2a, 10), wx, y + 15, wz));
    g.add(at(cyl(0.35, 0.35, 2.2, 0x6b4a2a, 8), wx, y + 12.5, wz + 2.2));
    for (let k = 0; k < 4; k++) { const bl = box(0.7, 10, 0.15, 0xeeeeee); bl.position.set(wx, y + 12.5, wz + 3.2); bl.rotation.z = (k * Math.PI) / 2 + 0.35; bl.geometry.translate(0, 5, 0); g.add(bl); for (let q = 1; q < 5; q++) { const sl = box(0.05, 1.6, 0.05, 0x6b4a2a); sl.geometry.translate(0, 2 + q * 1.7, 0); sl.position.copy(bl.position); sl.rotation.z = bl.rotation.z; sl.position.z += 0.1; g.add(sl); } }
    keep(wx, wz, 5);
  }
  { const x = 418, z = -42, y = h(x, z); g.add(at(box(10, 0.4, 10, 0xd9d4c8), x, y + 0.2, z)); for (const [dx, dz] of [[-5, 0], [5, 0], [0, -5], [0, 5]]) g.add(at(noCol(box(dx ? 0.15 : 10, 1, dz ? 0.15 : 10, 0x8a8a8a)), x + dx, y + 0.9, z + dz)); bench(g, x - 2, y + 0.4, z, Math.PI / 2); bench(g, x + 2, y + 0.4, z, -Math.PI / 2); g.add(at(cyl(0.1, 0.1, 1.4, 0x555555, 6), x, y + 1.1, z + 3)); g.add(at(box(0.9, 0.5, 0.5, 0x333333), x, y + 1.9, z + 3)); }
  place('Windmill Hill', 420, 22, -30, 240);
  // Lakeside Camp: tents, a campfire and canoes by the water
  { const cx = 352, cz = 62;
    for (const [dx, dz, c] of [[-8, -6, 0xd94a3d], [8, -8, 0x3fb7d9], [-6, 8, 0xf2c31b], [9, 6, 0x6a3fb0], [0, -14, 0x2fa66a]] as const) { const x = cx + dx, z = cz + dz, y = h(x, z); g.add(rot(at(cone(3, 2.8, c, 4), x, y + 1.4, z), 'y', Math.PI / 4)); g.add(at(box(1.2, 1.6, 0.1, 0x222222), x, y + 0.8, z + 2.1)); keep(x, z, 4); }
    const y = h(cx, cz); for (let k = 0; k < 8; k++) g.add(at(cyl(0.35, 0.35, 0.5, 0x777777, 6), cx + Math.cos(k * 0.785) * 1.4, y + 0.25, cz + Math.sin(k * 0.785) * 1.4)); for (let k = 0; k < 3; k++) g.add(rot(at(cyl(0.18, 0.18, 1.8, 0x6b4a2a, 6), cx, y + 0.3, cz), 'z', 1.2 + k * 2.1)); g.add(at(glow(0.9, 0.9, 0.9, 0xff8a3a), cx, y + 0.9, cz));
    bench(g, cx - 3, y, cz + 3, 0.6); bench(g, cx + 3, y, cz + 3, -0.6);
    for (const [bx2, bz2] of [[372, 52], [376, 66]]) { const b = new THREE.Group(); b.add(at(box(1, 0.5, 4.2, 0xd94a3d), 0, 0.25, 0)); b.add(at(box(0.8, 0.2, 3.4, 0x8a6a4a), 0, 0.55, 0)); b.position.set(bx2, h(bx2, bz2) + 0.1, bz2); b.rotation.y = 0.3; g.add(b); }
    place('Lakeside Camp', cx, 9, cz, 190); shop('Mirror Lake', 380, 5, 60);
    keep(cx, cz, 18);
  }
  // Orchard + barn along the south road
  { for (let r = 0; r < 3; r++) for (let x = 396; x <= 444; x += 6) roundTree(g, x, h(x, 112 + r * 8), 112 + r * 8, 0.6, r % 2 ? 0x5fae4a : 0x7cbf4a);
    const x = 456, z = 116, y = h(x, z); g.add(at(box(12, 5, 9, 0xa33b2c), x, y + 2.5, z)); g.add(rot(at(cone(8.5, 3.2, 0x6b4a2a, 4), x, y + 6.6, z), 'y', Math.PI / 4)); g.add(at(box(3, 3.4, 0.2, 0x3a2418), x, y + 1.7, z - 4.6)); g.add(at(box(0.3, 0.3, 4, 0x8a5a2b), x - 8, y + 0.6, z - 2)); g.add(at(box(0.3, 0.3, 4, 0x8a5a2b), x - 8, y + 1.1, z - 2));
    place('Sunny Orchard', 424, 8, 120, 170); keep(456, 116, 9); }
  // Lighthouse Point on the eastern cliff
  { const x = 500, z = 0, y = h(x, z);
    for (let k = 0; k < 6; k++) g.add(at(cyl(2.6 - k * 0.15, 2.75 - k * 0.15, 3.6, k % 2 ? 0xd94a3d : 0xffffff, 14), x, y + 1.8 + k * 3.6, z));
    g.add(at(cyl(2.4, 2.4, 0.5, 0x333333, 14), x, y + 21.9, z)); g.add(at(glow(2.6, 2.4, 2.6, 0xfff2a8), x, y + 23.4, z)); g.add(at(cone(2.2, 1.8, 0xd94a3d, 14), x, y + 25.5, z));
    house(g, x - 10, h(x - 10, z + 6), z + 6, Math.PI / 2, 0xffffff, 0xd94a3d); keep(x - 10, z + 6, 7);
    for (const [dx, dz] of [[6, -6], [8, 4], [-3, -9]]) g.add(at(sph(1.6, 0x8a8a8a, 7), x + dx, h(x + dx, z + dz) + 0.6, z + dz));
    place('Lighthouse Point', x, 30, z, 300); keep(x, z, 5); }
  // woods across the island: pines on the hill, round trees elsewhere, none on roads or the lake
  { const r = rng(7);
    const roadsE = (g.userData.roads as [number, number][][]).filter((rd) => rd[0][0] > 330);
    const nearRoad = (x: number, z: number) => roadsE.some(([[ax, az], [bx, bz]]) => { const l2 = (bx - ax) ** 2 + (bz - az) ** 2, t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / l2)); return Math.hypot(x - (ax + (bx - ax) * t), z - (az + (bz - az) * t)) < 8; });
    let placed = 0, tries = 0;
    while (placed < 170 && tries++ < 2000) {
      const a = r() * Math.PI * 2, d = 20 + r() * 108, x = 400 + Math.cos(a) * d, z = Math.sin(a) * d;
      if (h(x, z) < 0.6 || nearRoad(x, z) || Math.hypot(x - 380, z - 60) < 26 || Math.hypot(x - 255, z - BZ) < 60 || Math.hypot(x - 425, z - 35) < 46) continue;
      if (clear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
      const hill = Math.hypot(x - 420, z + 30) < 42;
      if (hill) { const s = 0.9 + r() * 0.8; g.add(at(cyl(0.2 * s, 0.3 * s, 2 * s, 0x6b4a2a, 6), x, h(x, z) + s, z)); g.add(at(cone(1.5 * s, 4.5 * s, 0x2f6b3a, 6), x, h(x, z) + 2 * s + 2.2 * s, z)); }
      else roundTree(g, x, h(x, z), z, 0.8 + r() * 0.7, r() < 0.5 ? 0x4f9a3e : 0x6aa84f);
      placed++;
    }
  }
  // ================= FINDURAI CRICKET GROUND (Eastside, inside the loop) =================
  {
    const cx = 425, cz = 35, cy = h(cx, cz), R = 34;
    { const oval = at(cyl(R, R, 0.3, 0x6fb35e, 56), cx, cy - 0.1, cz); oval.userData.noCollide = true; g.add(oval); }
    for (let i = 0; i < 12; i++) { const ring = at(cyl(R - i * 2.8, R - i * 2.8, 0.05, i % 2 ? 0x67ab57 : 0x74bb62, 56), cx, cy + 0.02 + i * 0.002, cz); ring.userData.noCollide = true; g.add(ring); }   // mown rings
    g.add(rot(at(mesh(new THREE.RingGeometry(R - 0.5, R, 64), 0xffffff, { side: THREE.DoubleSide }), cx, cy + 0.1, cz), 'x', -Math.PI / 2));   // boundary rope
    g.add(at(box(24, 0.06, 3.2, 0xd8c49a), cx, cy + 0.08, cz));                                                                              // the strip
    for (const s of [-1, 1]) { g.add(at(box(0.06, 0.07, 3.2, 0xffffff), cx + s * 10, cy + 0.12, cz)); g.add(at(box(0.06, 0.07, 3.2, 0xffffff), cx + s * 8.8, cy + 0.12, cz)); }   // creases
    for (const s of [-1, 1]) {
      const stumps = new THREE.Group(); stumps.position.set(cx + s * 10, cy, cz); stumps.name = s < 0 ? 'stumps-bat' : 'stumps-bowl';
      for (const dz of [-0.11, 0, 0.11]) { const st = at(cyl(0.025, 0.025, 0.72, 0xf4e6c8, 6), 0, 0.36, dz); st.userData.noCollide = true; stumps.add(st); }
      const bail = at(box(0.02, 0.02, 0.3, 0xf4e6c8), 0, 0.74, 0); bail.userData.noCollide = true; stumps.add(bail);
      stumps.userData.animated = true; g.add(stumps);
      g.add(at(box(0.6, 6, 10, 0xffffff), cx + s * 45, h(cx + s * 45, cz) + 3, cz));                                                          // sightscreens
    }
    { const px = cx - 6, pz = cz + R + 10, py = h(px, pz); g.add(at(box(22, 4.4, 8, 0xf4f0e6), px, py + 2.2, pz)); g.add(at(box(23, 0.5, 9, 0x2c3e6b), px, py + 4.6, pz)); for (let i = -2; i <= 2; i++) g.add(at(box(2.6, 2.2, 0.2, 0x4a6b8a), px + i * 4.4, py + 2, pz - 4.1)); for (let i = -2; i <= 2; i++) g.add(at(cyl(0.12, 0.12, 4.2, 0xffffff, 6), px + i * 5, py + 2.1, pz - 6)); g.add(at(box(22, 0.3, 6, 0xf4f0e6), px, py + 4.2, pz - 3)); keep(px, pz, 14); shop('Pavilion', px, 6.5, pz); }
    { const sx = cx + 20, sz = cz + R + 8, sy = h(sx, sz); g.add(at(box(8, 4, 0.6, 0x1e2a24), sx, sy + 4, sz)); for (const dx of [-3, 3]) g.add(at(cyl(0.15, 0.15, 4, 0x555555, 6), sx + dx, sy + 2, sz)); g.add(at(glow(7, 0.5, 0.1, 0xf2c31b), sx, sy + 5.5, sz - 0.35)); keep(sx, sz, 5); }   // scoreboard
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i / 4) * Math.PI * 2, fx = cx + Math.cos(a) * (R + 6), fz = cz + Math.sin(a) * (R + 6); g.add(at(cyl(0.3, 0.4, 22, 0x888888, 8), fx, h(fx, fz) + 11, fz)); g.add(at(glow(3.4, 2.2, 0.4, 0xfff2a8), fx, h(fx, fz) + 22, fz)); }
    place('FindurAI Cricket Ground', cx, 16, cz, 240);
    keep(cx, cz, R + 10);
    g.userData.cricket = { x: cx, z: cz, r: R, len: 20 };
  }
  g.userData.parked = [[348, BZ + 8, Math.PI / 2, 'jeep'], [354, BZ + 8, Math.PI / 2, 'bike'], [500 - 18, 8, 0, 'jeep'], [447, 76, Math.PI / 2, 'jeep']];

  // ================= DATE SPOTS: benches, a candle-lit table, the Ferris wheel, a boat, and apartments =================
  // A spot is { id, kind, x, z, ry (which way you face when seated), seats: [dx, dz][] } — the world reads these.
  const spots: { id: string; kind: string; label: string; x: number; z: number; y: number; ry: number; seats: [number, number][] }[] = [];
  const spot = (id: string, kind: string, label: string, x: number, z: number, y: number, ry: number, seats: [number, number][]) => spots.push({ id, kind, label, x, z, y, ry, seats });
  // pier bench at the end of the pier, facing the sea
  bench(g, 256, 2.5, 40, -Math.PI / 2); spot('pier', 'pier', 'Sit on the pier bench', 256, 40, 2.5, -Math.PI / 2, [[0, -0.5], [0, 0.5]]);
  // candle-lit table for two on the sand
  { const x = 200, z = 108, y = h(x, z);
    g.add(at(cyl(0.7, 0.7, 0.08, 0xffffff, 12), x, y + 0.82, z)); g.add(at(cyl(0.08, 0.1, 0.8, 0x8a6a4a, 8), x, y + 0.4, z));
    g.add(at(cyl(0.05, 0.05, 0.25, 0xf4f0e6, 6), x, y + 0.98, z)); g.add(at(glow(0.12, 0.16, 0.12, 0xffb347), x, y + 1.18, z));
    for (const dz of [-1.1, 1.1]) { g.add(at(cyl(0.35, 0.35, 0.08, 0x8a6a4a, 10), x, y + 0.5, z + dz)); for (const [ax, az] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) g.add(at(cyl(0.03, 0.03, 0.5, 0x555555, 5), x + ax, y + 0.25, z + dz + az)); }
    for (let k = 0; k < 8; k++) g.add(at(glow(0.1, 0.1, 0.1, 0xffe08a), x + Math.cos(k * 0.785) * 2.4, y + 0.15, z + Math.sin(k * 0.785) * 2.4));   // tealights in the sand
    spot('candle', 'candle', 'Share a candle-lit table by the sea', x, z, y, -Math.PI / 2, [[0, -1.1], [0, 1.1]]); keep(x, z, 4); }
  // sunset bench at Lighthouse Point, facing the open sea
  { const x = 494, z = 8, y = h(x, z); bench(g, x, y, z, -Math.PI / 2); spot('sunset', 'sunset', 'Watch the sunset', x, z, y, -Math.PI / 2, [[0, -0.5], [0, 0.5]]); keep(x, z, 3); }
  // campfire bench at Lakeside Camp (built earlier at 349, 65): a log to share
  { const x = 349, z = 65, y = h(x, z); const log = rot(at(cyl(0.3, 0.3, 2.4, 0x6b4a2a, 8), x, y + 0.3, z), 'x', Math.PI / 2); g.add(log); spot('camp', 'camp', 'Sit by the campfire', x, z, y, Math.PI / 2, [[0, -0.6], [0, 0.6]]); }
  // Ferris wheel on the sand: hub, spokes, rim and eight gondolas that stay upright (animated, so it is not baked)
  { const wx = 196, wz = 136, wy = h(wx, wz), R = 9, HUB = R + 2.4;
    for (const sd of [-1, 1]) { g.add(rot(at(box(0.7, HUB * 1.1, 0.7, 0xd94a3d), wx + sd * 1.8, wy + HUB / 2, wz + 2.2), 'x', -0.2)); g.add(rot(at(box(0.7, HUB * 1.1, 0.7, 0xd94a3d), wx + sd * 1.8, wy + HUB / 2, wz - 2.2), 'x', 0.2)); }
    g.add(at(box(6, 0.8, 6, 0x555555), wx, wy + 0.4, wz)); keep(wx, wz, 13);
    const wheel = new THREE.Group(); wheel.position.set(wx, wy + HUB, wz); wheel.name = 'ferris'; wheel.userData.animated = true;
    wheel.add(rot(at(cyl(0.9, 0.9, 4.6, 0x333333, 12), 0, 0, 0), 'x', Math.PI / 2));   // hub axle
    for (const sd of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.14, 8, 40), new THREE.MeshStandardMaterial({ color: 0xf2c31b })); rim.position.z = sd * 1.8; wheel.add(rim);
      for (let k = 0; k < 8; k++) { const sp = box(0.14, R * 2, 0.14, 0xeeeeee); sp.position.z = sd * 1.8; sp.rotation.z = (k * Math.PI) / 8; wheel.add(sp); }
      for (let k = 0; k < 16; k++) { const l = glow(0.3, 0.3, 0.3, [0xff7ab8, 0x7ad7ff, 0xfff2a8, 0xa6ff7a][k % 4]); l.position.set(Math.cos((k * Math.PI) / 8) * R, Math.sin((k * Math.PI) / 8) * R, sd * 1.8); wheel.add(l); }
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, pivot = new THREE.Group(); pivot.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); pivot.name = `gondola${k}`; wheel.add(pivot);
      const car = new THREE.Group(); car.name = 'car'; pivot.add(car);
      car.add(at(box(2.2, 0.15, 3.2, [0xd94a3d, 0x3fb7d9, 0xf2c31b, 0x2fa66a][k % 4]), 0, -1.6, 0));                 // floor
      car.add(at(box(2.2, 1.0, 0.1, [0xd94a3d, 0x3fb7d9, 0xf2c31b, 0x2fa66a][k % 4]), 0, -1.1, 1.55)); car.add(at(box(2.2, 1.0, 0.1, [0xd94a3d, 0x3fb7d9, 0xf2c31b, 0x2fa66a][k % 4]), 0, -1.1, -1.55));
      car.add(at(box(0.1, 1.0, 3.2, [0xd94a3d, 0x3fb7d9, 0xf2c31b, 0x2fa66a][k % 4]), 1.05, -1.1, 0)); car.add(at(box(0.1, 1.0, 3.2, [0xd94a3d, 0x3fb7d9, 0xf2c31b, 0x2fa66a][k % 4]), -1.05, -1.1, 0));
      car.add(at(box(0.08, 1.7, 0.08, 0x555555), 0, -0.85, 0)); car.add(at(box(2.5, 0.1, 3.5, 0xffffff), 0, 0, 0));   // hanger + roof
    }
    g.add(wheel);
    spot('wheel', 'wheel', 'Ride the Ferris wheel', wx + 4.5, wz, wy, -Math.PI / 2, [[0, -0.6], [0, 0.6]]);
    place('Sunset Wheel', wx, HUB + R + 4, wz, 200);
  }
  // the date boat, moored at the marina; it is moved by the world during a ride
  { const b = new THREE.Group(); b.name = 'dateboat'; b.userData.animated = true; b.position.set(406, 0.3, -152);
    b.add(at(box(2.4, 0.9, 6.5, 0xf4f0e6), 0, 0.45, 0)); b.add(at(box(2.0, 0.4, 3.2, 0x3fb7d9), 0, 1.0, 0.4)); b.add(at(box(2.5, 0.12, 1.6, 0x8a6a4a), 0, 1.0, -2.2));
    for (const dz of [-0.6, 0.6]) b.add(at(box(0.7, 0.45, 0.7, 0x2c3e6b), 0, 1.15, dz + 0.4));   // two seats
    b.add(at(glow(0.2, 0.2, 0.2, 0xfff2a8), 0, 1.6, 3.0)); g.add(b);
    spot('boat', 'boat', 'Take the boat out', 403, -150, 2.5, Math.PI, [[0, -0.6], [0, 0.6]]);
  }
  // six little apartments out over the water: a private room each (yours is picked by your id)
  for (let k = 0; k < 6; k++) {
    const ax = 300 + k * 22, az = 400, ay = 6;
    const wallC = [0xf4e1c1, 0xd6e6f2, 0xf2d0d0, 0xe4f0d0, 0xf7e7b0, 0xe0d6f2][k];
    g.add(at(box(14, 1, 12, 0x9a9a94), ax, ay - 0.5, az));                                      // slab
    g.add(at(box(13, 0.06, 11, 0xd8c49a), ax, ay + 0.03, az));                                   // floor
    g.add(at(box(6, 0.04, 4, 0xa33b2c), ax - 1, ay + 0.07, az + 1));                             // rug
    for (const [w, d, dx, dz] of [[14, 0.3, 0, -6], [14, 0.3, 0, 6], [0.3, 12, -7, 0], [0.3, 12, 7, 0]] as const) g.add(at(box(w, 3.2, d, wallC), ax + dx, ay + 1.6, az + dz));
    g.add(at(box(14.4, 0.3, 12.4, 0x6b4a2a), ax, ay + 3.3, az));                                  // roof
    g.add(at(glow(5, 2, 0.12, 0x9fd3e8), ax, ay + 1.8, az - 5.8));                               // picture window (sky)
    g.add(at(box(3.6, 0.5, 1.2, 0x2c3e6b), ax - 2, ay + 0.45, az - 3)); g.add(at(box(3.6, 0.7, 0.35, 0x2c3e6b), ax - 2, ay + 1.05, az - 3.45));   // sofa
    for (const dx of [-1.7, 1.7]) g.add(at(box(0.4, 0.7, 1.2, 0x2c3e6b), ax - 2 + dx, ay + 0.6, az - 3));
    g.add(at(box(1.6, 0.05, 0.8, 0x8a6a4a), ax - 2, ay + 0.5, az - 1.2)); for (const [dx, dz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) g.add(at(cyl(0.03, 0.03, 0.5, 0x555555, 5), ax - 2 + dx, ay + 0.25, az - 1.2 + dz));   // coffee table
    g.add(at(box(2.4, 1.4, 0.1, 0x111111), ax - 2, ay + 1.4, az + 5.7)); g.add(at(glow(2.2, 1.2, 0.05, 0x3fb7d9), ax - 2, ay + 1.4, az + 5.62));   // TV
    g.add(at(box(2.2, 0.5, 3.4, 0xf4f4f4), ax + 4.5, ay + 0.35, az + 3)); g.add(at(box(2.2, 0.25, 1, 0xe75480), ax + 4.5, ay + 0.72, az + 1.7));   // bed
    g.add(at(box(0.6, 0.6, 0.6, 0x8a6a4a), ax + 4.5, ay + 0.3, az - 0.5)); g.add(at(glow(0.4, 0.5, 0.4, 0xffe08a), ax + 4.5, ay + 1.0, az - 0.5));   // lamp
    g.add(at(cyl(0.3, 0.25, 0.5, 0xc9502f, 8), ax + 5.5, ay + 0.25, az - 4.5)); g.add(at(sph(0.7, 0x4f9a3e, 8), ax + 5.5, ay + 1.1, az - 4.5));   // plant
    stringLights(g, V(ax - 6.5, ay + 2.9, az - 5.5), V(ax + 6.5, ay + 2.9, az - 5.5), 10);
    g.add(at(box(1.2, 2.4, 0.15, 0x3a2418), ax + 6.85, ay + 1.2, az + 3));                        // door (decorative: E leaves)
    spot(`apt${k}`, 'sofa', 'Sit on the sofa', ax - 2, az - 3, ay, 0, [[-0.7, 0], [0.7, 0]]);
  }
  g.userData.spots = spots;
  g.userData.apartments = [0, 1, 2, 3, 4, 5].map((k) => [300 + k * 22, 400, 6]);

  // ================= main roads =================
  road(15, -100, 15, 86); road(15, 60, -60, 60);
  g.userData.clear = clear;
}
