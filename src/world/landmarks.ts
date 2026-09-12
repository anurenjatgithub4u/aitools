import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DecorKind, Destination } from './destinations';
import type { Terrain } from './terrain';

type H = (x: number, z: number) => number;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------- primitive helpers (low-poly, flat shaded) ----------
const M = (c: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...extra });

function mesh(geo: THREE.BufferGeometry, c: number, extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  const m = new THREE.Mesh(geo, M(c, extra));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const box = (w: number, h: number, d: number, c: number) => mesh(new THREE.BoxGeometry(w, h, d), c);
const cyl = (rt: number, rb: number, h: number, c: number, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c);
const sph = (r: number, c: number, seg = 12) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2)), c);
const cone = (r: number, h: number, c: number, seg = 4) => mesh(new THREE.ConeGeometry(r, h, seg), c);
const dome = (r: number, c: number) => mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), c);
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };
const rot = <T extends THREE.Object3D>(o: T, axis: 'x' | 'y' | 'z', a: number) => { o.rotation[axis] = a; return o; };

function bar(a: THREE.Vector3, b: THREE.Vector3, r: number, c: number) {
  const len = a.distanceTo(b);
  const m = mesh(new THREE.CylinderGeometry(r, r, len, 6), c);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

// floating text label in the world (name boards, station signs); hidden beyond `range` units
function label(text: string, cls: string, range = 110) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  const o = new CSS2DObject(el);
  o.userData.range = range;
  return o;
}

// seeded random so every visit to a world looks the same
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ---------- landmarks ----------
function tajMahal(g: THREE.Group) {
  const white = 0xf5f1e8, red = 0xb7573f;
  g.add(at(box(44, 1.6, 44, white), 0, 0.8, 0));
  g.add(at(box(18, 11, 18, white), 0, 7.1, 0));
  for (const [x, z] of [[-9, 0], [9, 0], [0, -9], [0, 9]]) g.add(at(box(6, 12, 6, white), x, 7.6, z));
  g.add(at(cyl(5, 5.4, 2.5, white), 0, 13.8, 0));
  g.add(at(dome(5.6, white), 0, 14.8, 0));
  g.add(at(cyl(0.15, 0.15, 3, 0xd9b23a, 6), 0, 21.5, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(at(cyl(1.7, 1.7, 1.6, white), sx * 6.2, 13.3, sz * 6.2));
    g.add(at(dome(2, white), sx * 6.2, 14, sz * 6.2));
    // minarets
    g.add(at(cyl(0.9, 1.3, 24, white, 12), sx * 19, 13.6, sz * 19));
    g.add(at(dome(1.5, white), sx * 19, 25.6, sz * 19));
  }
  // reflecting pool + garden paths
  g.add(at(box(7, 0.4, 70, 0x4fa9d6), 0, 0.25, 58));
  for (const x of [-6, 6]) g.add(at(box(2.5, 0.3, 70, red), x, 0.2, 58));
  for (let i = 0; i < 12; i++) for (const x of [-9, 9]) g.add(cypressTree(x, 0, 28 + i * 5.2, 1));
  // great gate (walk through the arch)
  for (const x of [-11, 11]) g.add(at(box(10, 13, 8, red), x, 6.5, 100));
  g.add(at(box(32, 4, 8, red), 0, 15, 100));
  g.add(at(box(32, 0.8, 9, white), 0, 17.3, 100));
  for (const x of [-11, 11]) g.add(at(dome(2.2, white), x, 17.6, 100));
}

function eiffel(g: THREE.Group) {
  const iron = 0x7a4a26;
  const tiers = [
    { y0: 0, s0: 10, y1: 22, s1: 4.8, r: 1.1 },
    { y0: 22, s0: 4.8, y1: 42, s1: 2.1, r: 0.7 },
    { y0: 42, s0: 2.1, y1: 66, s1: 0.8, r: 0.5 },
  ];
  for (const t of tiers) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(bar(V(sx * t.s0, t.y0, sz * t.s0), V(sx * t.s1, t.y1, sz * t.s1), t.r, iron));
    for (let y = t.y0 + 5; y < t.y1; y += 6) {
      const s = t.s0 + (t.s1 - t.s0) * ((y - t.y0) / (t.y1 - t.y0));
      g.add(bar(V(-s, y, s), V(s, y, s), 0.25, iron));
      g.add(bar(V(-s, y, -s), V(s, y, -s), 0.25, iron));
      g.add(bar(V(s, y, -s), V(s, y, s), 0.25, iron));
      g.add(bar(V(-s, y, -s), V(-s, y, s), 0.25, iron));
    }
    g.add(at(box(t.s1 * 2 + 3, 1.2, t.s1 * 2 + 3, iron), 0, t.y1, 0));
  }
  // first floor arches
  for (const sz of [-1, 1]) g.add(bar(V(-8, 12, sz * 8), V(8, 12, sz * 8), 0.5, iron));
  for (const sx of [-1, 1]) g.add(bar(V(sx * 8, 12, -8), V(sx * 8, 12, 8), 0.5, iron));
  g.add(at(cyl(0.3, 0.7, 10, iron, 8), 0, 71, 0));
  g.add(at(cyl(0.08, 0.08, 10, 0x444444, 6), 0, 81, 0));
  // Champ de Mars lawn
  g.add(at(box(34, 0.25, 90, 0x9ccf6f), 0, 0.12, 60));
  for (let i = 0; i < 9; i++) for (const x of [-20, 20]) g.add(roundTree(x, 0, 22 + i * 9, 1.3, 0x4f8f3d));
}

function pyramids(g: THREE.Group) {
  const sand = 0xd7b47a;
  const p1 = at(cone(30, 24, sand), 0, 12, 0); p1.rotation.y = Math.PI / 4; g.add(p1);
  const p2 = at(cone(22, 17, sand), -48, 8.5, -34); p2.rotation.y = Math.PI / 4; g.add(p2);
  const p3 = at(cone(14, 11, sand), 44, 5.5, -44); p3.rotation.y = Math.PI / 4; g.add(p3);
  // Sphinx
  const s = new THREE.Group();
  s.add(at(box(12, 4, 5, 0xc9a06a), 0, 2, 0));
  s.add(at(box(4, 5, 4, 0xc9a06a), 5, 5.5, 0));
  s.add(at(box(4.6, 1.2, 4.6, 0xc9a06a), 5, 8.3, 0));
  s.add(at(box(3, 2, 3, 0xd8b37a), -6, 3.5, 0));
  at(s, 34, 0, 30); s.rotation.y = -0.4; g.add(s);
}










function kochi(g: THREE.Group, h: H) {
  const white = 0xf6f3ec, tile = 0xa8503a, wood = 0x6b4a2a, cream = 0xf1e6cf;
  // gabled roof: a box rotated 45 degrees whose lower half hides inside the walls
  const gable = (w: number, len: number, c: number, ridge: 'x' | 'z' = 'z') => {
    const r = ridge === 'z' ? box(w, w, len, c) : box(len, w, w, c);
    if (ridge === 'z') r.rotation.z = Math.PI / 4; else r.rotation.x = Math.PI / 4;
    return r;
  };

  // Santa Cruz Basilica - twin-spired Gothic church
  g.add(at(box(12, 10, 24, white), 0, 5, -22));
  g.add(at(gable(8.6, 25, tile), 0, 10, -22));
  for (const x of [-5, 5]) {
    g.add(at(box(4, 20, 4, white), x, 10, -9));
    g.add(at(cone(2.8, 6, tile), x, 23, -9));
    g.add(at(cyl(0.12, 0.12, 2, 0xd9b23a, 6), x, 27, -9));
  }
  g.add(rot(at(cyl(1.6, 1.6, 0.3, 0x3f6fd1, 16), 0, 9, -8.9), 'x', Math.PI / 2)); // rose window
  g.add(at(box(2.6, 4.5, 0.4, wood), 0, 2.25, -8.9));

  // St. Francis Church - Vasco da Gama was first buried here
  g.add(at(box(8, 6, 14, white), 25, 3, -38));
  g.add(at(gable(5.8, 15, tile), 25, 6, -38));
  g.add(at(box(9, 8, 1.2, white), 25, 4, -31));
  g.add(at(box(1.6, 2.6, 0.4, wood), 25, 1.3, -30.3));

  // Mattancherry (Dutch) Palace - long, low, tiled
  g.add(at(box(30, 6, 14, cream), 42, 3, 42));
  g.add(at(gable(10, 32, tile, 'x'), 42, 6, 42));
  for (let i = 0; i < 7; i++) g.add(at(cyl(0.3, 0.3, 6, wood, 8), 29 + i * 4.3, 3, 49.5));
  g.add(at(box(32, 0.3, 4, tile), 42, 6.2, 50));

  // Paradesi Synagogue clock tower (Jew Town)
  g.add(at(box(5, 14, 5, white), 57, 7, 60));
  g.add(rot(at(cone(3.8, 4, tile), 57, 16, 60), 'y', Math.PI / 4));
  for (const [dx, dz, ry] of [[0, 2.6, 0], [2.6, 0, Math.PI / 2]]) {
    const clock = at(cyl(1.1, 1.1, 0.2, 0xffffff, 16), 57 + dx, 11, 60 + dz);
    clock.rotation.set(Math.PI / 2, 0, ry); g.add(clock);
  }
  g.add(at(box(12, 4, 6, white), 57, 2, 66));                        // synagogue hall
  g.add(at(gable(4.2, 12, tile, 'x'), 57, 4, 66));

  // Chinese fishing nets (cheena vala) along the Fort Kochi shore
  for (const z of [-40, -20, 0, 20, 40]) {
    const x0 = -106, y0 = 3;
    for (const [dx, dz] of [[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5]]) g.add(bar(V(x0 + dx, h(x0 + dx, z + dz) - 1, z + dz), V(x0 + dx, y0, z + dz), 0.18, wood));
    g.add(at(box(6, 0.25, 4, wood), x0, y0, z));
    const tip = V(x0 - 15, 10, z);
    g.add(bar(V(x0 + 2, y0, z), tip, 0.22, wood));                      // lever
    g.add(bar(V(x0, y0 + 0.5, z - 1.2), V(x0 - 4, y0 + 8, z), 0.12, wood)); // props
    g.add(bar(V(x0, y0 + 0.5, z + 1.2), V(x0 - 4, y0 + 8, z), 0.12, wood));
    for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) g.add(bar(tip, V(tip.x + dx, 1.2, z + dz), 0.06, 0x3a2a1a));
    const net = mesh(new THREE.BoxGeometry(10, 0.06, 10), 0x3a2a1a, { transparent: true, opacity: 0.55 });
    net.position.set(tip.x, 1.2, z); g.add(net);
    for (let i = 0; i < 3; i++) g.add(bar(V(x0 + 3, y0, z), V(x0 + 4 + i * 0.8, y0 - 2, z - 1 + i), 0.05, 0x3a2a1a));
    for (let i = 0; i < 3; i++) g.add(at(sph(0.45, 0x777777, 6), x0 + 4 + i * 0.8, y0 - 2.2, z - 1 + i)); // counterweights
  }
  // Vasco da Gama Square - fish stalls with palm thatch
  for (const z of [-10, 4, 18]) {
    g.add(at(box(3, 2.2, 3, 0xd8c49a), -60, h(-60, z) + 1.1, z));
    g.add(rot(at(cone(2.8, 1.6, 0x8a7a4a, 4), -60, h(-60, z) + 2.9, z), 'y', Math.PI / 4));
  }

  metroLine(g, h, 95, [['Aluva', -45], ['Kalamassery', -16], ['Edapally', 13], ['Kaloor', 42], ['MG Road', 71], ['Vyttila', 100]], 0x2b7bc9, 0x8bc34a);

  // roads, following the ground
  road(g, h, 15, -45, 15, 88);          // Fort Kochi -> Ernakulam
  road(g, h, -60, 70, 78, 70);          // east-west link (stops before the shore)
  road(g, h, 15, 20, 42, 52);           // towards Mattancherry

  // Fort Kochi boat jetty + ferry to Vypin
  for (let x = -82; x >= -104; x -= 4) for (const dz of [-1.5, 1.5]) g.add(bar(V(x, -1, -70 + dz), V(x, 1.6, -70 + dz), 0.15, wood));
  g.add(at(box(26, 0.3, 4, wood), -93, 1.6, -70));
  g.add(at(box(3, 2.4, 3, 0xd8c49a), -84, h(-84, -66) + 1.2, -66));                    // ticket booth
  g.add(rot(at(cone(2.6, 1.2, tile, 4), -84, h(-84, -66) + 3, -66), 'y', Math.PI / 4));
  const ferry = new THREE.Group();
  ferry.add(at(box(5, 1.6, 14, 0xf4f4f4), 0, 0.6, 0));
  ferry.add(at(box(5.2, 0.4, 14.2, 0x2f6fd1), 0, 1.5, 0));
  ferry.add(at(box(4.4, 2.2, 8, 0xf4f4f4), 0, 2.6, -1));
  ferry.add(at(box(4.6, 0.2, 9, 0x2f6fd1), 0, 3.8, -1));
  for (let i = 0; i < 4; i++) for (const dx of [-2.21, 2.21]) ferry.add(at(box(0.05, 1, 1.4, 0x9fd3e8), dx, 2.6, -4 + i * 2));
  ferry.position.set(-109, 0, -75); ferry.rotation.y = 0.3; g.add(ferry);

  // LuLu Mall - glass front, big sign
  g.add(at(box(36, 12, 22, 0xe8e2d6), -20, h(-20, 60) + 6, 48));
  g.add(at(mesh(new THREE.BoxGeometry(32, 8, 0.4), 0x9fd3e8, { transparent: true, opacity: 0.6 }), -20, h(-20, 60) + 5, 59.3));
  g.add(at(box(36.5, 1.5, 23, 0x2a2a2a), -20, h(-20, 60) + 12.5, 48));
  g.add(at(box(10, 2.4, 0.4, 0xd94a3d), -20, h(-20, 60) + 10.2, 59.4));
  for (let i = 0; i < 6; i++) g.add(at(box(1.8, 0.4, 3.6, [0xffffff, 0xd94a3d, 0x2f6fd1][i % 3]), -34 + i * 5.5, h(-34 + i * 5.5, 64) + 0.4, 64)); // parked cars

  // Vyttila Mobility Hub - KSRTC bus
  const bus = new THREE.Group();
  bus.add(at(box(3, 3, 11, 0xd94a3d), 0, 2, 0));
  bus.add(at(box(3.05, 0.6, 11.05, 0xf2c31b), 0, 1.3, 0));
  bus.add(at(box(3.05, 0.9, 11.05, 0x9fd3e8), 0, 2.6, 0));
  for (const z of [-3.5, 3.5]) for (const x of [-1.4, 1.4]) { const wh = cyl(0.55, 0.55, 0.4, 0x222222, 12); wh.rotation.z = Math.PI / 2; bus.add(at(wh, x, 0.55, z)); }
  bus.position.set(78, h(78, 74), 76); bus.rotation.y = -0.3; g.add(bus);
  g.add(at(box(8, 0.3, 4, 0xc9c4b8), 84, h(84, 80) + 4, 80));                          // bus shelter
  for (const dx of [-3.5, 3.5]) g.add(at(box(0.25, 4, 0.25, 0x555555), 84 + dx, h(84, 80) + 2, 81.5));

  // place-name boards
  const places: [string, number, number, number][] = [
    ['Fort Kochi Beach \u00b7 Chinese Fishing Nets', -100, 6, 0],
    ['Vasco da Gama Square', -60, 5, 4],
    ['Fort Kochi Boat Jetty', -90, 5, -70],
    ['Santa Cruz Basilica', 0, 30, -9],
    ['St. Francis Church', 25, 11, -31],
    ['Mattancherry Palace', 42, 13, 50],
    ['Jew Town \u00b7 Paradesi Synagogue', 57, 20, 60],
    ['Marine Drive \u00b7 Rainbow Bridge', 103, 9, 0],
    ['LuLu Mall', -20, 16, 54],
    ['Vyttila Mobility Hub', 84, 8, 80],
  ];
  for (const [name, x, y, z] of places) g.add(at(label(name, 'place', 120), x, h(x, z) + y, z));

  // Marine Drive walkway + Rainbow Bridge
  g.add(at(box(6, 0.25, 120, 0xc9b99a), 103, h(103, 0) + 0.15, 0));
  for (let z = -50; z <= 50; z += 12) { g.add(at(cyl(0.12, 0.12, 4, 0x555555, 6), 106, h(106, z) + 2, z)); g.add(at(sph(0.35, 0xfff2a8, 6), 106, h(106, z) + 4.2, z)); }
  const rainbow = [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa];
  for (const x of [101, 105]) for (let i = 0; i < 12; i++) {
    const t0 = i / 12, t1 = (i + 1) / 12;
    const a = V(x, h(x, 0) + 1 + Math.sin(t0 * Math.PI) * 5, -12 + t0 * 24), b = V(x, h(x, 0) + 1 + Math.sin(t1 * Math.PI) * 5, -12 + t1 * 24);
    g.add(bar(a, b, 0.25, rainbow[i % rainbow.length]));
  }
  g.add(at(box(5, 0.3, 24, 0x8a8a8a), 103, h(103, 0) + 0.9, 0));

  // Kettuvallam houseboats drifting on the backwaters
  const boat = new THREE.Group();
  boat.add(at(box(4, 1.2, 16, 0x5a3a2a), 0, 0.4, 0));
  boat.add(at(box(3.4, 3, 10, 0xc9a86a), 0, 2.4, -1));
  const canopy = mesh(new THREE.CylinderGeometry(2.2, 2.2, 10.5, 12, 1, false, 0, Math.PI), 0xd9c08a, { side: THREE.DoubleSide });
  canopy.rotation.set(Math.PI / 2, 0, Math.PI / 2); canopy.position.set(0, 3.6, -1); boat.add(canopy);
  boat.add(at(box(1.6, 0.4, 2.5, 0x5a3a2a), 0, 1.1, 6.5));
  boat.position.set(122, 0, -45); boat.rotation.y = -0.5; g.add(boat);
  const boat2 = boat.clone(); boat2.position.set(-40, 0, 128); boat2.rotation.y = 1.2; g.add(boat2);
}

// Elevated metro: viaduct along the x axis at `z`, named stations, and a train the world animates.
function metroLine(g: THREE.Group, h: H, z: number, stops: [string, number][], color: number, stripe: number) {
  const x0 = stops[0][1] - 11, x1 = stops[stops.length - 1][1] + 12;
  for (let x = x0; x <= x1; x += 12) g.add(at(cyl(1.1, 1.4, 13, 0xb9b4a8, 10), x, h(x, z) + 6.5, z));
  g.add(at(box(x1 - x0 + 8, 1.4, 6, 0xc9c4b8), (x0 + x1) / 2, 13.2, z));
  for (const dz of [-1.2, 1.2]) g.add(at(box(x1 - x0 + 8, 0.15, 0.2, 0x555555), (x0 + x1) / 2, 14, z + dz));
  for (const [name, x] of stops) {
    g.add(at(box(14, 0.6, 4, 0xd9d4c8), x, 14.2, z + 4.5));
    g.add(at(box(14, 0.6, 4, 0xd9d4c8), x, 14.2, z - 4.5));
    for (const dx of [-6, 6]) for (const dz of [-5.5, 5.5]) g.add(at(box(0.3, 5, 0.3, color), x + dx, 17, z + dz));
    g.add(at(box(16, 0.35, 14, color), x, 19.6, z));
    g.add(at(box(3, 13, 4, 0xd9d4c8), x, 6.5, z + 8.5));
    g.add(at(box(3.6, 1.2, 0.3, color), x, 21, z + 7));
    g.add(at(label(`\u{1F687} ${name}`, 'sign metro', 140), x, 22.6, z + 7));
  }
  const train = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    train.add(at(box(11, 3, 2.8, color), i * 11.6 - 11.6, 1.6, 0));
    train.add(at(box(11.2, 0.9, 2.9, 0xf4f4f4), i * 11.6 - 11.6, 1.9, 0));
    train.add(at(box(11.2, 0.4, 2.9, stripe), i * 11.6 - 11.6, 0.7, 0));
    for (let k = 0; k < 4; k++) for (const dz of [-1.46, 1.46]) train.add(at(box(1.6, 1, 0.05, 0x9fd3e8), i * 11.6 - 11.6 - 4 + k * 2.6, 2.2, dz));
  }
  train.add(at(box(0.6, 2.4, 2.4, 0xf2c31b), 17.5, 1.6, 0));
  train.position.set(stops[0][1], 14, z);
  train.userData.animated = true;
  g.add(train);
  g.userData.train = { group: train, stops: stops.map((st) => st[1]), z, color };
}

// Tarmac strip with lane dashes that follows the ground.
function road(g: THREE.Group, h: H, x0: number, z0: number, x1: number, z1: number) {
  const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 8);
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const a = V(x0 + (x1 - x0) * t0, 0, z0 + (z1 - z0) * t0), b = V(x0 + (x1 - x0) * t1, 0, z0 + (z1 - z0) * t1);
    a.y = h(a.x, a.z) + 0.12; b.y = h(b.x, b.z) + 0.12;
    const seg = mesh(new THREE.BoxGeometry(6, 0.16, a.distanceTo(b) + 0.4), 0x5f5f5f);
    seg.position.copy(a).add(b).multiplyScalar(0.5);
    seg.lookAt(b);
    g.add(seg);
    const dash = mesh(new THREE.BoxGeometry(0.3, 0.18, 2.5), 0xf4f4f4);
    dash.position.copy(seg.position); dash.rotation.copy(seg.rotation); g.add(dash);
  }
}

function bengaluru(g: THREE.Group, h: H) {
  const granite = 0xd9cfc0, red = 0xa8503a, glass = 0x9fd3e8;
  const gable = (w: number, len: number, c: number) => { const r = box(len, w, w, c); r.rotation.x = Math.PI / 4; return r; };
  const carCol = [0xffffff, 0xd94a3d, 0x2f6fd1, 0xf2c31b, 0x333333, 0x3fa66a];

  // Vidhana Soudha - the granite seat of the state legislature
  g.add(at(box(44, 3, 28, granite), 0, 1.5, -25));
  for (let i = 0; i < 4; i++) g.add(at(box(20 - i * 1.5, 0.5, 6 - i * 0.6, granite), 0, 3.2 + i * 0.5, -8 + i * 1.2)); // steps
  g.add(at(box(38, 14, 22, granite), 0, 10, -25));
  for (let i = 0; i < 9; i++) g.add(at(cyl(0.7, 0.7, 12, 0xe8e0d0, 10), -16 + i * 4, 10, -13.5));
  g.add(at(box(40, 1.6, 24, 0xe8e0d0), 0, 17.8, -25));
  g.add(at(cyl(5.5, 6, 4, 0xe8e0d0, 16), 0, 20.5, -25));
  g.add(at(dome(6, 0xe8e0d0), 0, 22.5, -25));
  g.add(at(cyl(0.2, 0.2, 3, 0xd9b23a, 6), 0, 29.5, -25));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { g.add(at(cyl(2, 2.2, 3, 0xe8e0d0, 12), sx * 15, 20, -25 + sz * 8)); g.add(at(dome(2.3, 0xe8e0d0), sx * 15, 21.5, -25 + sz * 8)); }

  // Cubbon Park bandstand
  const bx = -45, bz = 10, by = h(bx, bz);
  g.add(at(cyl(6.5, 6.5, 0.8, 0xc9b99a, 16), bx, by + 0.4, bz));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(at(cyl(0.25, 0.25, 4.5, 0xf4f4f4, 8), bx + Math.cos(a) * 5.5, by + 3, bz + Math.sin(a) * 5.5)); }
  g.add(at(cone(7, 2.6, red, 8), bx, by + 6.5, bz));

  // Lalbagh Glass House + Lalbagh rock
  const lx = 50, lz = 45, ly = h(lx, lz);
  g.add(at(box(26, 0.6, 16, 0xc9b99a), lx, ly + 0.3, lz));
  g.add(at(mesh(new THREE.BoxGeometry(24, 7, 14), glass, { transparent: true, opacity: 0.45 }), lx, ly + 4, lz));
  g.add(at(mesh(new THREE.BoxGeometry(10, 11, 10), glass, { transparent: true, opacity: 0.45 }), lx, ly + 6, lz));
  for (const dx of [-12, -6, 0, 6, 12]) for (const dz of [-7, 7]) g.add(at(box(0.25, 7, 0.25, 0xf4f4f4), lx + dx, ly + 4, lz + dz));
  g.add(at(box(24.4, 0.3, 14.4, 0xf4f4f4), lx, ly + 7.6, lz));
  g.add(at(box(10.4, 0.3, 10.4, 0xf4f4f4), lx, ly + 11.6, lz));
  const rock = mesh(new THREE.DodecahedronGeometry(9, 0), 0x8a8478); rock.scale.set(1.3, 0.55, 1.1); rock.position.set(70, h(70, 60) + 3, 60); g.add(rock);
  g.add(at(box(3, 4, 3, 0xf4f4f4), 70, h(70, 60) + 10, 60));                             // Kempegowda tower on the rock
  g.add(at(cone(2.2, 2, red, 4), 70, h(70, 60) + 13, 60));

  // Bangalore Palace - Tudor-style with battlemented towers
  const px = -50, pz = -60, py = h(px, pz);
  g.add(at(box(26, 10, 14, 0xd8c49a), px, py + 5, pz));
  g.add(at(gable(6, 27, red), px, py + 10, pz));
  for (const dx of [-14, 14]) {
    g.add(at(box(7, 18, 7, 0xc9b58a), px + dx, py + 9, pz + 4));
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) g.add(at(box(1.2, 1.2, 1.2, 0xc9b58a), px + dx + s * 2.9, py + 18.6, pz + 4 + (i - 1.5) * 2));
  }
  for (let i = 0; i < 5; i++) g.add(at(box(1.4, 2.4, 0.2, 0x3a2418), px - 8 + i * 4, py + 4, pz + 7.1));

  // Bull Temple - Nandi under a gopuram
  const tx = 60, tz = -40, ty = h(tx, tz);
  g.add(at(box(14, 5, 14, 0xc9a86a), tx, ty + 2.5, tz));
  for (let i = 0; i < 5; i++) g.add(at(box(12 - i * 2, 2, 12 - i * 2, i % 2 ? 0xd9b23a : 0xa8503a), tx, ty + 6 + i * 2, tz));
  g.add(at(box(2, 3, 0.4, 0x3a2418), tx, ty + 1.5, tz + 7.1));
  const nandi = new THREE.Group();
  nandi.add(at(box(2.6, 1.6, 4.5, 0x2a2a2a), 0, 1.4, 0));
  nandi.add(at(box(1.4, 1.3, 1.6, 0x2a2a2a), 0, 2.2, 2.6));
  nandi.add(at(box(0.9, 0.9, 0.9, 0x2a2a2a), 0, 2.9, 0.4));                                // hump
  for (const s of [-1, 1]) g.add(at(box(0.15, 0.6, 0.15, 0xe8e0d0), tx + 12 + s * 0.6, ty + 3.3, tz + 3.2));
  for (const x of [-0.9, 0.9]) for (const z of [-1.5, 1.5]) nandi.add(at(box(0.4, 1, 0.4, 0x2a2a2a), x, 0.5, z));
  nandi.position.set(tx + 12, ty, tz); nandi.rotation.y = -Math.PI / 2; g.add(nandi);

  // Namma Metro (purple line) above MG Road
  metroLine(g, h, 80, [['Majestic', -50], ['Cubbon Park', -20], ['MG Road', 10], ['Trinity', 40], ['Indiranagar', 70], ['Baiyappanahalli', 100]], 0x7b3fa0, 0xf4f4f4);
  road(g, h, -56, 80, 104, 80);          // MG Road
  road(g, h, 15, -60, 15, 86);           // north-south spine
  road(g, h, 15, -20, -40, -60);         // towards the palace

  // UB City towers
  for (const [x, z, hh] of [[86, 12, 42], [96, 28, 34], [80, 30, 26]]) {
    g.add(at(mesh(new THREE.BoxGeometry(10, hh, 10), glass, { transparent: true, opacity: 0.55 }), x, h(x, z) + hh / 2, z));
    for (let y = 4; y < hh; y += 4) g.add(at(box(10.2, 0.3, 10.2, 0x333333), x, h(x, z) + y, z));
    g.add(at(box(6, 1.5, 6, 0x333333), x, h(x, z) + hh + 0.7, z));
  }

  // M. Chinnaswamy Stadium - floodlights and a ring of stands
  const sx = -20, sz = 60, sy = h(sx, sz);
  g.add(at(mesh(new THREE.CylinderGeometry(22, 22, 8, 32, 1, true), 0xd9d4c8, { side: THREE.DoubleSide }), sx, sy + 4, sz));
  g.add(at(cyl(15, 15, 0.4, 0x6fb35e, 32), sx, sy + 0.2, sz));
  g.add(at(box(2.5, 0.2, 20, 0xd8c49a), sx, sy + 0.45, sz));                              // pitch
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    const fx = sx + Math.cos(a) * 25, fz = sz + Math.sin(a) * 25;
    g.add(at(cyl(0.3, 0.4, 24, 0x888888, 8), fx, sy + 12, fz));
    g.add(at(box(4, 2.5, 0.4, 0xfff2a8), fx, sy + 24, fz));
  }

  // Ulsoor Lake with an islet
  const ux = -75, uz = 40, uy = h(ux, uz);
  g.add(at(cyl(24, 24, 0.3, 0x4a97c8, 32), ux, uy + 0.2, uz));
  g.add(at(cyl(4, 5, 1, 0x74b064, 10), ux + 6, uy + 0.6, uz - 5));
  g.add(at(cyl(0.3, 0.4, 3, 0x6b4a2a, 7), ux + 6, uy + 2.5, uz - 5));
  g.add(at(sph(2, 0x4f9a3e, 7), ux + 6, uy + 5, uz - 5));

  // Silk Board Junction - the famous traffic jam at the east end of MG Road
  for (let i = 0; i < 14; i++) {
    const x = 72 + (i % 7) * 4.6, lane = i < 7 ? -1.6 : 1.6, z = 80 + lane;
    const car = at(box(2, 1.3, 3.6, carCol[i % carCol.length]), x, h(x, z) + 0.8, z);
    car.rotation.y = lane < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(car);
    g.add(at(box(1.7, 0.7, 2, glass), x, h(x, z) + 1.7, z));
  }
  g.add(at(box(0.3, 6, 0.3, 0x888888), 104, h(104, 76) + 3, 76));
  g.add(at(box(0.8, 2.4, 0.8, 0x333333), 104, h(104, 76) + 6.5, 76));
  g.add(at(box(0.5, 0.5, 0.2, 0xd92b2b), 104, h(104, 76) + 7.2, 76.5));


  // ---- more of the real city, further out ----
  // a shop: box with awning, door, and a name board (used along MG Road, Brigade Road, Church Street)
  const shop = (name: string, x: number, z: number, w: number, c: number, awn: number, rotY = 0) => {
    const y = h(x, z);
    const s = new THREE.Group();
    s.add(at(box(w, 4.5, 6, c), 0, 2.25, 0));
    s.add(at(box(w * 0.8, 1.8, 0.06, glass), 0, 1.6, 3.04));                        // shop window
    s.add(at(box(1.2, 2.4, 0.1, 0x3a2418), w * 0.35, 1.2, 3.05));                   // door
    s.add(rot(at(box(w + 0.4, 0.12, 1.6, awn), 0, 3.1, 3.7), 'x', 0.25));            // awning
    s.add(at(box(w, 0.8, 0.2, 0x2a2a2a), 0, 4.1, 3.1));                             // fascia
    s.add(at(label(name, 'shop', 70), 0, 5.4, 3));
    s.position.set(x, y, z); s.rotation.y = rotY;
    g.add(s);
  };
  // Brigade Road / Church Street strip: the famous stores, just south of MG Road
  const strip: [string, number, number][] = [
    ["Koshy's", 0x8a5a2b, 0xd94a3d], ['Blossom Book House', 0x6a3fb0, 0xf2c31b], ['Corner House', 0xd94a3d, 0xffffff],
    ['Higginbothams', 0x2f6fd1, 0xffffff], ['Café Coffee Day', 0x8a2a2a, 0xf2c31b], ['Nilgiris', 0x2fa66a, 0xffffff],
    ['Church Street Social', 0x333333, 0xf27d3a], ['Bangalore Central', 0xf4f4f4, 0xd94a3d],
  ];
  strip.forEach(([name, c, awn], i) => shop(name, -44 + i * 15, 64, 12, c, awn, Math.PI));
  // Indiranagar 100 Feet Road: pubs and cafés east of Trinity
  shop('Toit Brewpub', 60, 96, 14, 0x6b4a2a, 0xf2c31b);
  shop("Truffles", 78, 96, 12, 0xd94a3d, 0xffffff);
  shop('Third Wave Coffee', 96, 96, 12, 0x2a2a2a, 0x3fb7d9);
  // Basavanagudi (by the Bull Temple): Vidyarthi Bhavan; Lalbagh Road: MTR
  shop('Vidyarthi Bhavan', 42, -40, 12, 0xd8c49a, 0x2fa66a, Math.PI / 2);
  shop('MTR · Mavalli Tiffin Rooms', 30, 55, 12, 0xf4f4f4, 0xd94a3d, -Math.PI / 2);

  // High Court (Attara Kacheri) - red building facing Vidhana Soudha across the lawn
  const hx = -38, hz = -2, hy = h(hx, hz);
  g.add(at(box(22, 8, 10, red), hx, hy + 4, hz));
  for (let i = 0; i < 7; i++) g.add(at(cyl(0.45, 0.45, 7, 0xf0d9c0, 8), hx - 9 + i * 3, hy + 4, hz + 5.5));
  g.add(at(box(23, 0.8, 12, 0xf0d9c0), hx, hy + 8.4, hz));

  // Majestic: KSR City Railway Station + Kempegowda bus stand (west end of the metro)
  const kx = -110, kz = 80, ky = h(kx, kz);
  g.add(at(box(40, 7, 12, 0xe8dcc8), kx, ky + 3.5, kz - 10));
  g.add(at(box(42, 0.8, 14, red), kx, ky + 7.4, kz - 10));
  g.add(at(box(6, 4, 0.3, 0x2b6fd9), kx, ky + 9.5, kz - 4));
  g.add(at(label('KSR Bengaluru City Railway Station', 'place', 130), kx, ky + 12, kz - 4));
  for (let i = 0; i < 2; i++) g.add(at(box(44, 0.5, 3, 0xbdbdbd), kx, ky + 0.8, kz + 2 + i * 6));    // platforms
  for (const dz of [5, 11]) for (const dx of [-1.4, 1.4]) g.add(at(box(46, 0.15, 0.2, 0x555555), kx, ky + 0.15, kz + dz + dx));
  for (let i = 0; i < 4; i++) {                                                                     // a parked train
    g.add(at(box(9, 3, 2.6, i ? 0x2b6fd9 : 0xd94a3d), kx - 15 + i * 9.5, ky + 1.8, kz + 5));
    g.add(at(box(9.1, 0.8, 2.7, 0xf4f4f4), kx - 15 + i * 9.5, ky + 2.3, kz + 5));
  }
  g.add(at(cyl(16, 16, 0.4, 0x6d6d6d, 24), kx + 5, ky + 0.2, kz + 30));                          // bus stand circle
  g.add(at(cyl(16.5, 16.5, 1, 0xd9d4c8, 24), kx + 5, ky + 6, kz + 30));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(at(cyl(0.3, 0.3, 6, 0x888888, 8), kx + 5 + Math.cos(a) * 14, ky + 3, kz + 30 + Math.sin(a) * 14)); }
  g.add(at(label('Kempegowda Bus Station · Majestic', 'place', 120), kx + 5, ky + 9, kz + 30));

  // ISKCON Temple, Rajajinagar - white with gold gopurams, up on its hill
  const ix = -125, iz = -95, iy = h(ix, iz);
  g.add(at(box(30, 6, 24, 0xf4f4f4), ix, iy + 3, iz));
  g.add(at(box(22, 8, 16, 0xf4f4f4), ix, iy + 10, iz));
  for (const [dx, dz, hh] of [[0, 0, 12], [-9, 6, 8], [9, 6, 8]]) {
    for (let i = 0; i < 4; i++) g.add(at(box(6 - i * 1.2, hh / 4, 6 - i * 1.2, 0xd9b23a), ix + dx, iy + 14 + i * hh / 4, iz + dz));
    g.add(at(cone(1.2, 2, 0xd9b23a, 8), ix + dx, iy + 15 + hh, iz + dz));
  }
  for (let i = 0; i < 8; i++) g.add(at(box(14 - i, 0.5, 3, 0xe8e0d0), ix, iy + 0.5 + i * 0.7, iz + 14 + i * 1.2));   // steps
  g.add(at(label('ISKCON Temple · Rajajinagar', 'place', 130), ix, iy + 32, iz));

  // Sankey Tank - lake in Malleshwaram
  const nx = -120, nz = -30, ny = h(nx, nz);
  g.add(at(cyl(20, 20, 0.3, 0x4a97c8, 28), nx, ny + 0.2, nz));
  g.add(at(box(2, 0.3, 42, 0xc9b99a), nx + 22, ny + 0.3, nz));
  g.add(at(label('Sankey Tank · Malleshwaram', 'place', 120), nx, ny + 5, nz));

  // Tipu Sultan's Summer Palace and KR Market, south-west of the centre
  const tpx = -70, tpz = 118, tpy = h(tpx, tpz);
  g.add(at(box(22, 1.2, 14, 0xc9b99a), tpx, tpy + 0.6, tpz));
  g.add(at(box(18, 7, 10, 0x6b4a2a), tpx, tpy + 4.5, tpz));
  for (let i = 0; i < 7; i++) for (const dz of [-5.2, 5.2]) g.add(at(box(0.5, 6, 0.5, 0x8a6a4a), tpx - 8 + i * 2.7, tpy + 4, tpz + dz));
  for (let i = 0; i < 6; i++) g.add(at(box(2, 2.4, 0.15, 0x3a2418), tpx - 7 + i * 2.8, tpy + 6.5, tpz + 5.3));   // arches
  g.add(at(box(19, 0.6, 11.5, 0xa8503a), tpx, tpy + 8.3, tpz));
  g.add(at(label("Tipu Sultan's Summer Palace", 'place', 120), tpx, tpy + 12, tpz));
  const mx = -30, mz = 125, my = h(mx, mz);
  const flower = [0xf2c31b, 0xe74c6f, 0xf27d3a, 0xffffff, 0xb0308a];
  for (let i = 0; i < 12; i++) {
    const x = mx - 14 + (i % 6) * 5.6, z = mz + (i < 6 ? -4 : 4);
    g.add(at(box(3.5, 1, 2.5, 0xd8c49a), x, my + 0.5, z));
    g.add(at(sph(1.1, flower[i % flower.length], 7), x, my + 1.6, z));
    g.add(rot(at(cone(2.6, 1.4, [0xd94a3d, 0x2f6fd1][i % 2], 4), x, my + 3.5, z), 'y', Math.PI / 4));
    g.add(at(cyl(0.08, 0.08, 3, 0x555555, 6), x, my + 1.5, z + 1.4));
  }
  g.add(at(label('KR Market · flower market', 'place', 110), mx, my + 6, mz));

  // Koramangala: Forum Mall; Electronic City: Infosys campus (the "Silicon Valley" bit)
  const fx = 115, fz = 128, fy = h(fx, fz);
  g.add(at(box(34, 12, 26, 0xe8e2d6), fx, fy + 6, fz));
  g.add(at(mesh(new THREE.BoxGeometry(30, 8, 0.4), glass, { transparent: true, opacity: 0.6 }), fx, fy + 5, fz - 13.2));
  g.add(at(box(9, 2.4, 0.4, 0x2f6fd1), fx, fy + 10.5, fz - 13.3));
  g.add(at(label('Forum Mall · Koramangala', 'place', 120), fx, fy + 16, fz - 12));
  const ex = 40, ez = 150, ey = h(ex, ez);
  for (const [dx, dz, hh] of [[-14, 0, 20], [0, -8, 26], [14, 0, 20], [0, 10, 14]]) {
    g.add(at(mesh(new THREE.BoxGeometry(11, hh, 11), glass, { transparent: true, opacity: 0.55 }), ex + dx, ey + hh / 2, ez + dz));
    for (let y = 4; y < hh; y += 4) g.add(at(box(11.2, 0.3, 11.2, 0xf4f4f4), ex + dx, ey + y, ez + dz));
  }
  g.add(at(cyl(6, 6, 0.6, 0x4a97c8, 20), ex, ey + 0.3, ez + 1));                                   // campus pond
  g.add(at(box(8, 2, 0.5, 0x1f5fd0), ex, ey + 2, ez - 16));
  g.add(at(label('Infosys · Electronic City', 'place', 130), ex, ey + 30, ez - 8));

  // Kempegowda International Airport, far north-east: terminal, tower, runway and a plane
  const ax = 100, az = -140, ay = h(ax, az);
  g.add(at(box(50, 8, 14, 0xe8e2d6), ax, ay + 4, az + 10));
  g.add(at(mesh(new THREE.BoxGeometry(48, 5, 0.4), glass, { transparent: true, opacity: 0.6 }), ax, ay + 4, az + 17.2));
  g.add(at(box(52, 1.2, 16, 0x555555), ax, ay + 8.6, az + 10));
  g.add(at(cyl(1.4, 1.8, 22, 0xbdbdbd, 10), ax - 32, ay + 11, az + 14));                           // control tower
  g.add(at(cyl(4, 3, 4, glass, 10), ax - 32, ay + 24, az + 14));
  g.add(at(box(90, 0.25, 12, 0x4a4a4a), ax, ay + 0.15, az - 14));                                  // runway
  for (let i = 0; i < 9; i++) g.add(at(box(4, 0.3, 0.6, 0xf4f4f4), ax - 40 + i * 10, ay + 0.2, az - 14));
  const plane = new THREE.Group();
  plane.add(rot(at(cyl(1.6, 1.6, 22, 0xf4f4f4, 12), 0, 2.6, 0), 'x', Math.PI / 2));
  plane.add(rot(at(cone(1.6, 4, 0xf4f4f4, 12), 0, 2.6, 13), 'x', Math.PI / 2));
  plane.add(at(box(24, 0.3, 4, 0xdddddd), 0, 2.2, 0));                                             // wings
  plane.add(at(box(8, 0.3, 2.4, 0xdddddd), 0, 3, -10));
  plane.add(at(box(0.3, 5, 3.5, 0xd94a3d), 0, 5, -10));                                            // tail fin
  for (const x of [-6, 6]) plane.add(rot(at(cyl(0.9, 0.9, 3, 0x555555, 10), x, 1.4, 1), 'x', Math.PI / 2));
  plane.position.set(ax, ay + 0.3, az - 14); plane.rotation.y = Math.PI / 2; g.add(plane);
  g.add(at(label('Kempegowda International Airport', 'place', 150), ax, ay + 16, az + 10));

  // ---- outer ring ----
  // Whitefield: ITPL tech park, east
  const wx = 200, wz = -20, wy = h(wx, wz);
  for (const [dx, dz, hh] of [[-16, -10, 30], [0, -14, 38], [16, -8, 28], [-10, 10, 22], [12, 12, 26]]) {
    g.add(at(mesh(new THREE.BoxGeometry(12, hh, 12), glass, { transparent: true, opacity: 0.55 }), wx + dx, wy + hh / 2, wz + dz));
    for (let y = 4; y < hh; y += 4) g.add(at(box(12.2, 0.3, 12.2, 0xd8d8d8), wx + dx, wy + y, wz + dz));
  }
  g.add(at(box(40, 0.25, 40, 0x6d6d6d), wx, wy + 0.12, wz));
  g.add(at(label('Whitefield · ITPL Tech Park', 'place', 140), wx, wy + 44, wz - 14));

  // Jayanagar 4th Block: quiet grid of houses, south-west
  const jx = -150, jz = 150, jy = h(jx, jz);
  const tiles = [0xa8503a, 0x8a5a2b, 0x2f6fd1, 0x3fa66a];
  for (let i = 0; i < 12; i++) {
    const x = jx - 24 + (i % 4) * 16, z = jz - 12 + Math.floor(i / 4) * 16, y = h(x, z);
    g.add(at(box(8, 5, 8, [0xf4e8d0, 0xe8dcc8, 0xf0d9c0][i % 3]), x, y + 2.5, z));
    g.add(rot(at(cone(6.2, 3, tiles[i % 4], 4), x, y + 6.5, z), 'y', Math.PI / 4));
    g.add(at(box(1.2, 2.2, 0.15, 0x3a2418), x, y + 1.1, z + 4.05));
  }
  g.add(at(box(40, 0.2, 3, 0x6d6d6d), jx - 4, jy + 0.12, jz - 4));
  g.add(at(label('Jayanagar 4th Block', 'place', 130), jx, jy + 12, jz + 4));

  // Hebbal Lake with the flyover curling past it, north
  const hbx = 40, hbz = -195, hby = h(hbx, hbz);
  g.add(at(cyl(24, 24, 0.3, 0x4a97c8, 32), hbx, hby + 0.2, hbz));
  for (let i = 0; i < 12; i++) {
    const a = -0.4 + i * 0.16, px = hbx + 40 + Math.cos(a) * 34, pz = hbz + Math.sin(a) * 34;
    g.add(at(cyl(0.8, 1, 8, 0xb9b4a8, 8), px, h(px, pz) + 4, pz));
  }
  for (let i = 0; i < 11; i++) {
    const a0 = -0.4 + i * 0.16, a1 = a0 + 0.16;
    const p0 = V(hbx + 40 + Math.cos(a0) * 34, h(hbx, hbz) + 8, hbz + Math.sin(a0) * 34), p1 = V(hbx + 40 + Math.cos(a1) * 34, h(hbx, hbz) + 8, hbz + Math.sin(a1) * 34);
    const seg = box(p0.distanceTo(p1) + 0.4, 0.8, 6, 0x6d6d6d);
    seg.position.copy(p0).add(p1).multiplyScalar(0.5); seg.lookAt(p1); seg.rotateY(Math.PI / 2); g.add(seg);
  }
  g.add(at(label('Hebbal Lake · Flyover', 'place', 130), hbx, hby + 8, hbz));

  // Bannerghatta National Park gate, far south, with a couple of elephants
  const bgx = -100, bgz = 210, bgy = h(bgx, bgz);
  for (const dx of [-6, 6]) g.add(at(box(2.5, 9, 2.5, 0x8a6a4a), bgx + dx, bgy + 4.5, bgz));
  g.add(at(box(15, 2, 2.6, 0x6b4a2a), bgx, bgy + 9.5, bgz));
  g.add(at(box(11, 1.2, 0.3, 0x2fa66a), bgx, bgy + 7.5, bgz + 1.3));
  for (const [ex, ez, ry] of [[bgx - 16, bgz - 10, 0.6], [bgx + 18, bgz - 6, -1.2]]) {
    const e = new THREE.Group();
    e.add(at(box(4, 3, 6, 0x7d7d7d), 0, 3, 0));
    e.add(at(box(3, 2.6, 2.6, 0x7d7d7d), 0, 3.6, 4));
    e.add(rot(at(cyl(0.35, 0.5, 3.4, 0x7d7d7d, 8), 0, 2.2, 5.4), 'x', 0.5));                // trunk
    for (const s of [-1, 1]) e.add(at(box(0.3, 2, 1.8, 0x8f8f8f), s * 1.7, 3.8, 4));           // ears
    for (const lx of [-1.3, 1.3]) for (const lz of [-2, 2]) e.add(at(cyl(0.55, 0.6, 3, 0x7d7d7d, 8), lx, 1.5, lz));
    e.position.set(ex, h(ex, ez), ez); e.rotation.y = ry; g.add(e);
  }
  g.add(at(label('Bannerghatta National Park', 'place', 130), bgx, bgy + 14, bgz));

  road(g, h, 104, 80, 200, -20);       // Whitefield Road
  road(g, h, -30, 125, -150, 150);     // to Jayanagar
  road(g, h, 100, -120, 40, -185);     // Hebbal ring
  road(g, h, -60, 110, -100, 205);     // Bannerghatta Road

  // extra roads: to Majestic, to the airport, to ISKCON, down to Electronic City and Koramangala
  road(g, h, -56, 80, -130, 80);
  road(g, h, 15, -60, 100, -120);
  road(g, h, -40, -60, -110, -85);
  road(g, h, 15, 86, 40, 132);
  road(g, h, 40, 132, 115, 115);
  road(g, h, -30, 86, -60, 110);

  // place-name boards
  const places: [string, number, number, number][] = [
    ['Vidhana Soudha', 0, 31, -12], ['High Court · Attara Kacheri', -38, 12, -2], ['Brigade Road · Church Street', 8, 8, 64], ['Indiranagar 100 Feet Road', 78, 8, 96], ['Cubbon Park \u00b7 Bandstand', -45, 9, 10], ['Lalbagh Botanical Garden \u00b7 Glass House', 50, 14, 45],
    ['Lalbagh Rock \u00b7 Kempegowda Tower', 70, 17, 60], ['Bangalore Palace', -50, 22, -52], ['Bull Temple \u00b7 Nandi', 60, 18, -33],
    ['UB City', 86, 46, 12], ['M. Chinnaswamy Stadium', -20, 12, 60], ['Ulsoor Lake', -75, 4, 40], ['Silk Board Junction \u00b7 traffic jam', 88, 7, 80],
    ['MG Road', 10, 6, 74],
  ];
  for (const [name, x, y, z] of places) g.add(at(label(name, 'place', 120), x, h(x, z) + y, z));
}

// ---------- decor ----------
// Crown made of a few overlapping low-poly blobs with slight colour variation per blob.
function crown(t: THREE.Group, r: number, cx: number, cy: number, cz: number, leaf: number, n: number, flat = 1, seed = 1) {
  const rnd = rng(Math.floor(cx * 31 + cz * 17 + seed * 101));
  const base = new THREE.Color(leaf);
  for (let i = 0; i < n; i++) {
    const c = base.clone().offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.12);
    const blob = mesh(new THREE.IcosahedronGeometry(r * (0.55 + rnd() * 0.5), 1), c.getHex());
    blob.scale.y = flat;
    blob.position.set(cx + (rnd() - 0.5) * r * 1.4, cy + (rnd() - 0.5) * r * 0.9 * flat, cz + (rnd() - 0.5) * r * 1.4);
    blob.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    t.add(blob);
  }
}
function trunk(t: THREE.Group, h: number, r: number, c = 0x6b4a2a) {
  t.add(at(cyl(r * 0.6, r, h, c, 7), 0, h / 2, 0));
  // a couple of branches
  t.add(bar(V(0, h * 0.6, 0), V(r * 5, h * 0.95, r * 2), r * 0.35, c));
  t.add(bar(V(0, h * 0.7, 0), V(-r * 4, h * 1.05, -r * 3), r * 0.3, c));
}
function roundTree(x: number, y: number, z: number, s: number, leaf = 0x4f9a3e) {
  const t = new THREE.Group();
  trunk(t, 2.6 * s, 0.3 * s);
  crown(t, 1.5 * s, 0, 3.4 * s, 0, leaf, 5, 0.9, 1);
  return at(t, x, y, z);
}
// wide, flat-topped canopy (rain tree / banyan) - the classic Bengaluru avenue tree
function rainTree(x: number, y: number, z: number, s: number, leaf = 0x4f9a3e) {
  const t = new THREE.Group();
  trunk(t, 3.4 * s, 0.38 * s, 0x5a3f28);
  crown(t, 2.4 * s, 0, 4.4 * s, 0, leaf, 7, 0.55, 2);
  return at(t, x, y, z);
}
function pineTree(x: number, y: number, z: number, s: number, leaf = 0x2f6b3a) {
  const t = new THREE.Group();
  t.add(at(cyl(0.16 * s, 0.3 * s, 2.2 * s, 0x5a3a2a, 6), 0, 1.1 * s, 0));
  const c = new THREE.Color(leaf);
  for (let i = 0; i < 4; i++) {
    const r = (2.1 - i * 0.45) * s, h = 2.2 * s;
    const layer = at(cone(r, h, c.clone().offsetHSL(0, 0, i * 0.03).getHex(), 7), 0, (2.2 + i * 1.3) * s, 0);
    layer.rotation.y = i * 0.4;
    t.add(layer);
  }
  return at(t, x, y, z);
}
function cypressTree(x: number, y: number, z: number, s: number) {
  const t = new THREE.Group();
  t.add(at(cyl(0.15 * s, 0.2 * s, 1 * s, 0x5a3a2a, 6), 0, 0.5 * s, 0));
  t.add(at(cone(0.9 * s, 4 * s, 0x2f5f3a, 6), 0, 3 * s, 0));
  t.add(at(cone(0.6 * s, 3 * s, 0x376b42, 6), 0, 5.5 * s, 0));
  return at(t, x, y, z);
}
// curved trunk from short segments, fronds that arch and droop, a bunch of coconuts
function palmTree(x: number, y: number, z: number, s: number) {
  const t = new THREE.Group();
  const segs = 5, segH = 1.35 * s;
  let px = 0, py = 0;
  for (let i = 0; i < segs; i++) {
    const lean = 0.04 + i * 0.06;                                        // gentle curve
    const seg = cyl((0.2 - i * 0.012) * s, (0.22 - i * 0.012) * s, segH + 0.25, 0x8a6a4a, 7);
    seg.position.set(px + Math.sin(lean) * segH * 0.5, py + Math.cos(lean) * segH * 0.5, 0);
    seg.rotation.z = -lean;
    t.add(seg);
    px += Math.sin(lean) * segH; py += Math.cos(lean) * segH;
  }
  const top = V(px, py, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    let p = top.clone(), dir = V(Math.cos(a), 0.55, Math.sin(a)).normalize();
    for (let k = 0; k < 4; k++) {
      const len = 1.1 * s;
      const q = p.clone().add(dir.clone().multiplyScalar(len));
      const f = box(len + 0.1, 0.06 * s, (0.75 - k * 0.15) * s, k < 2 ? 0x3f9a3f : 0x4faa48);
      f.position.copy(p).add(q).multiplyScalar(0.5);
      f.lookAt(q); f.rotateY(Math.PI / 2);
      t.add(f);
      p = q;
      dir = V(dir.x, dir.y - 0.45, dir.z).normalize();               // droop
    }
  }
  for (let i = 0; i < 3; i++) t.add(at(sph(0.22 * s, 0x6b8f3a, 6), top.x + Math.cos(i * 2) * 0.3 * s, top.y - 0.3 * s, Math.sin(i * 2) * 0.3 * s));
  return at(t, x, y, z);
}
function cactus(x: number, y: number, z: number, s: number) {
  const t = new THREE.Group();
  t.add(at(cyl(0.45 * s, 0.5 * s, 3 * s, 0x4f8a3f, 8), 0, 1.5 * s, 0));
  t.add(at(cyl(0.25 * s, 0.25 * s, 1.4 * s, 0x4f8a3f, 6), 0.9 * s, 2 * s, 0));
  t.add(rot(at(cyl(0.25 * s, 0.25 * s, 0.9 * s, 0x4f8a3f, 6), 0.9 * s, 1.3 * s, 0), 'z', Math.PI / 2));
  return at(t, x, y, z);
}
function rock(x: number, y: number, z: number, s: number, c: number) {
  const r = mesh(new THREE.DodecahedronGeometry(1.2 * s, 0), c);
  r.scale.y = 0.6; r.rotation.y = x;
  return at(r, x, y + 0.2 * s, z);
}
function bush(x: number, y: number, z: number, s: number, c = 0x5fa54a) {
  const t = new THREE.Group();
  crown(t, 0.7 * s, 0, 0.45 * s, 0, c, 3, 0.8, 3);
  return at(t, x, y, z);
}

const DECOR: Record<DecorKind, (x: number, y: number, z: number, s: number, d: Destination) => THREE.Object3D> = {
  tree: (x, y, z, s) => roundTree(x, y, z, s),
  rain: (x, y, z, s) => rainTree(x, y, z, s),
  cherry: (x, y, z, s) => roundTree(x, y, z, s, 0xe98cb4),
  pine: (x, y, z, s) => pineTree(x, y, z, s),
  cypress: (x, y, z, s) => cypressTree(x, y, z, s),
  palm: (x, y, z, s) => palmTree(x, y, z, s),
  cactus: (x, y, z, s) => cactus(x, y, z, s),
  rock: (x, y, z, s, d) => rock(x, y, z, s, d.id === 'pyramids-of-giza' ? 0xb98a63 : 0x8f8a80),
  bush: (x, y, z, s) => bush(x, y, z, s),
};

export interface Avoid { x: number; z: number; r: number }

// Bake a group of many small coloured meshes into one vertex-coloured mesh (one draw call).
function bake(group: THREE.Group): THREE.Mesh {
  group.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const geo = m.geometry.toNonIndexed();
    geo.applyMatrix4(m.matrixWorld);
    const col = (m.material as THREE.MeshStandardMaterial).color;
    const n = geo.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'color') geo.deleteAttribute(name);
    parts.push(geo);
  });
  const merged = mergeGeometries(parts, false)!;
  merged.computeVertexNormals();
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function scatterDecor(dest: Destination, terrain: Terrain, avoid: Avoid[] = [], seed = 42): THREE.Group {
  const g = new THREE.Group();
  const r = rng(seed);
  const inner = Math.max(dest.terrain.flatRadius, 0) + 6;
  const keepClear = dest.id === 'great-wall' || dest.id === 'kyoto-fushimi' ? 8 : inner; // wall/gates need trees nearby
  for (const d of dest.decor) {
    let placed = 0, tries = 0;
    while (placed < d.count && tries++ < d.count * 12) {
      const a = r() * Math.PI * 2;
      const rad = keepClear + r() * (235 - keepClear);
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (!terrain.onLand(x, z)) continue;
      if (avoid.some((a) => Math.hypot(x - a.x, z - a.z) < a.r)) continue;
      if (dest.solids?.some((s) => Math.hypot(x - s[0], z - s[1]) < s[2] + 2)) continue;         // keep monuments clear
      if ((dest.id === 'bengaluru' || dest.id === 'city') && (Math.abs(z - 80) < 12 || (Math.abs(x - 15) < 5 && z > -62 && z < 88)
        || Math.hypot(x - 88, z - 80) < 22 || Math.hypot(x + 75, z - 40) < 26
        || (Math.abs(z - 64) < 6 && x > -52 && x < 70) || (Math.abs(z - 96) < 6 && x > 52 && x < 104)      // shop strips
        || (Math.abs(z - 80) < 5 && x < -56) || Math.hypot(x + 110, z - 80) < 30 || Math.hypot(x + 105, z - 110) < 20
        || Math.hypot(x + 125, z + 95) < 24 || Math.hypot(x + 120, z + 30) < 24 || Math.hypot(x + 70, z - 118) < 16
        || Math.hypot(x + 30, z - 125) < 20 || Math.hypot(x - 115, z - 128) < 22 || Math.hypot(x - 40, z - 150) < 26
        || (x > 50 && z < -110) || Math.abs((z + 60) - (x - 15) * (-60 / 85)) < 6 && x > 15 && x < 100 && z < -55
        || Math.hypot(x - 28, z - 110) < 8 || Math.hypot(x - 78, z - 123) < 8 || Math.hypot(x + 45, z - 98) < 8
        || Math.hypot(x - 200, z + 20) < 34 || Math.hypot(x + 150, z - 150) < 40 || Math.hypot(x - 40, z + 195) < 30 || Math.hypot(x + 100, z - 210) < 26
        || Math.abs((z - 80) - (x - 104) * (-100 / 96)) < 6 && x > 104 || Math.abs((z - 125) - (x + 30) * (25 / -120)) < 6 && x < -30 && x > -150
        || Math.abs((z + 120) - (x - 100) * (-65 / -60)) < 6 && x < 100 && x > 40 || Math.abs((z - 110) - (x + 60) * (95 / -40)) < 6 && x < -60 && x > -100)) continue;  // districts and roads
      if (dest.id === 'kochi' && (Math.abs(z - 95) < 12 || x < -95 || (x > 98 && Math.abs(z) < 62)
        || (Math.abs(x - 15) < 5 && z > -45 && z < 88) || (Math.abs(z - 70) < 5 && x > -60 && x < 100)
        || (Math.abs(x - 20) < 24 && z > 44 && z < 82) || (x > 70 && z > 65))) continue;                // metro, shore, roads, mall, bus hub
      if (dest.id === 'taj-mahal' && Math.abs(x) < 14 && z > 20 && z < 110) continue;           // pool
      g.add(DECOR[d.kind](x, terrain.h(x, z), z, 0.8 + r() * 0.8, dest));
      placed++;
    }
  }
  const baked = new THREE.Group();
  baked.add(bake(g));
  return baked;
}

export function buildLandmark(dest: Destination, terrain: Terrain): THREE.Group {
  const g = new THREE.Group();
  const h = terrain.h;
  switch (dest.id) {
    case 'taj-mahal': tajMahal(g); break;
    case 'eiffel-tower': eiffel(g); break;
    case 'pyramids-of-giza': pyramids(g); break;
    case 'kochi': kochi(g, h); break;
    case 'city':
    case 'bengaluru': bengaluru(g, h); break;
  }
  return g;
}

// Small floating item the player can walk over
// Petrol station: canopy on pillars, two pump islands, a shop and a tall price sign. Faces +Z.
export function makePetrolStation(name: string): THREE.Group {
  const g = new THREE.Group();
  const red = 0xd94a3d, white = 0xf4f4f4, dark = 0x2a2a2a;
  g.add(at(box(16, 0.2, 12, 0x6d6d6d), 0, 0.1, 0));                             // forecourt
  for (const x of [-6, 6]) for (const z of [-4, 4]) g.add(at(cyl(0.3, 0.3, 5.5, white, 8), x, 2.85, z));
  g.add(at(box(17, 0.6, 13, white), 0, 5.8, 0));                                  // canopy
  g.add(at(box(17.2, 0.5, 13.2, red), 0, 6.35, 0));
  g.add(at(box(17.2, 0.25, 13.2, 0x2f6fd1), 0, 6.7, 0));
  for (const x of [-3, 3]) {
    g.add(at(box(1.6, 0.3, 4.5, 0xbdbdbd), x, 0.35, 0));                          // island
    for (const z of [-1.2, 1.2]) {
      g.add(at(box(0.9, 1.8, 0.6, white), x, 1.4, z));
      g.add(at(box(0.7, 0.5, 0.05, 0x1b1b1b), x, 1.9, z + 0.31));               // display
      g.add(at(box(0.9, 0.35, 0.62, red), x, 2.45, z));
      g.add(at(box(0.12, 0.7, 0.12, dark), x + 0.55, 1.2, z + 0.2));            // nozzle + hose
      g.add(at(box(0.06, 0.06, 1.2, dark), x + 0.58, 0.9, z - 0.1));
    }
  }
  g.add(at(box(6, 3.2, 4, white), 7.5, 1.6, -7));                                // shop
  g.add(at(box(5, 1.6, 0.06, 0x9fd3e8), 7.5, 1.5, -4.96));
  g.add(at(box(6.2, 0.4, 4.2, red), 7.5, 3.4, -7));
  g.add(at(cyl(0.2, 0.25, 9, dark, 8), -10, 4.5, -5));                            // price sign
  g.add(at(box(3.2, 2.2, 0.3, red), -10, 9.5, -5));
  g.add(at(box(2.8, 1.5, 0.05, white), -10, 9.5, -4.82));
  g.add(at(box(2.8, 0.9, 0.3, 0x1b1b1b), -10, 7.9, -5));
  g.add(at(label(`⛽ ${name}`, 'place', 140), 0, 8.4, 0));
  return g;
}

export function makePickup(shape: string, color: number): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  switch (shape) {
    case 'box': geo = new THREE.BoxGeometry(0.8, 0.8, 0.8); break;
    case 'gem': geo = new THREE.OctahedronGeometry(0.6, 0); break;
    case 'ring': geo = new THREE.TorusGeometry(0.45, 0.18, 8, 14); break;
    case 'cone': geo = new THREE.ConeGeometry(0.5, 0.9, 8); break;
    default: geo = new THREE.SphereGeometry(0.5, 10, 8);
  }
  const m = mesh(geo, color, { emissive: color, emissiveIntensity: 0.15 });
  return m;
}
