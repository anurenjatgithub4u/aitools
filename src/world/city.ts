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
  for (let z = -150; z <= 150; z += 30) g.add(at(box(40, 0.3, 31, 0xf0dcb0), 190, h(190, z) + 0.1, z));       // sand
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
  for (let z = -140; z <= 140; z += 20) palm(g, 172 + (z % 40 ? 3 : -3), h(172, z), z, 0.9 + ((z / 20) % 3) * 0.2);
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
  g.add(at(cyl(37, 37, 0.4, 0x5fa64f, 48), stx, sty + 0.2, stz));
  for (let i = 0; i < 10; i++) g.add(at(box(PW / 10, 0.06, PD, i % 2 ? 0x6fb35e : 0x67ab57), stx - PW / 2 + (i + 0.5) * (PW / 10), sty + 0.42, stz));   // mown stripes
  const line = (w: number, d: number, x: number, z: number) => g.add(at(box(w, 0.05, d, 0xffffff), stx + x, sty + 0.47, stz + z));
  line(PW, 0.25, 0, -PD / 2); line(PW, 0.25, 0, PD / 2); line(0.25, PD, -PW / 2, 0); line(0.25, PD, PW / 2, 0); line(0.25, PD, 0, 0);
  for (const s of [-1, 1]) {
    line(0.25, 21, s * (PW / 2 - 8.8), 0); line(8.8, 0.25, s * (PW / 2 - 4.4), -10.5); line(8.8, 0.25, s * (PW / 2 - 4.4), 10.5);   // penalty area
    line(0.25, 9.7, s * (PW / 2 - 3), 0); line(3, 0.25, s * (PW / 2 - 1.5), -4.85); line(3, 0.25, s * (PW / 2 - 1.5), 4.85);         // goal area
    g.add(at(cyl(0.25, 0.25, 0.05, 0xffffff, 10), stx + s * (PW / 2 - 5.9), sty + 0.47, stz));                                        // penalty spot
  }
  g.add(rot(at(mesh(new THREE.RingGeometry(4.9, 5.15, 40), 0xffffff, { side: THREE.DoubleSide }), stx, sty + 0.47, stz), 'x', -Math.PI / 2));
  g.add(at(cyl(0.3, 0.3, 0.05, 0xffffff, 10), stx, sty + 0.47, stz));
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
  const ctrl: [number, number][] = [
    [-70, 34], [-20, 34], [30, 34], [62, 30], [78, 12], [76, -10], [60, -24],      // pit straight → Sunset sweeper
    [42, -16], [30, -30], [12, -34],                                                // Neon chicane
    [-30, -34], [-60, -34], [-82, -26], [-90, -6], [-86, 14], [-80, 30],            // back straight → Palm hairpin
  ];
  const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => V(scx + x * 0.9, 0, scz + z)), true, 'catmullrom', 0.6);
  const N = 300;
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
    if (i % 5 === 0) keep(ax, az, 13);
  }
  // boost pads: glowing chevrons on the straights; driving over one gives a burst of speed
  const pads: [number, number, number][] = [];
  for (const idx of [16, 46, 172, 200]) {   // pit straight ×2, back straight ×2 (samples are uniform in spline t: ~18.75 per control segment)
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
  for (const [tx, tz] of [[scx - 92, scz - 6], [scx - 90, scz + 12], [scx + 20, scz - 24], [scx + 45, scz - 8], [scx + 78, scz + 2]]) for (let k = 0; k < 6; k++) g.add(at(cyl(0.8, 0.8, 0.7, k % 2 ? 0x222222 : 0xf4f4f4, 10), tx + (k % 3) * 1.7, h(tx, tz) + 0.35 + Math.floor(k / 3) * 0.7, tz));
  g.add(at(mesh(new THREE.BoxGeometry(10, 0.2, 10), 0x6d6d6d), scx - 20, h(scx - 20, scz) + 0.1, scz)); shop('Pit lane', scx - 20, 8, scz + 20);
  place('FindurAI Speedway', scx, 14, scz, 170);
  keep(scx - 20, scz + 20, 26); keep(scx - 4, scz + 50, 48); keep(scx - 20, scz, 8);
  g.userData.circuit = { pts, width: TW, pads };
  road(-60, 135, -60, 160);

  // ================= main roads =================
  road(15, -100, 15, 86); road(15, 60, -60, 60);
  g.userData.clear = clear;
}
