import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Collectible, Destination } from './destinations';
import { makeTerrain, type Terrain } from './terrain';
import { makeAvatar, animateWalk, poseJump, poseSit, poseRide, OUTFITS, FEMALE_OUTFITS, SKINS, type Avatar } from './avatar';
import { store } from './store';
import { buildLandmark, scatterDecor, makePickup } from './landmarks';
import { makeVehicle, VEHICLE_COLORS, FUEL_RANGE, BOOST_MULT, type Vehicle, type VehicleKind } from './vehicles';
import { makePetrolStation } from './landmarks';
import { Sfx } from './audio';
import { bakeStatic } from './bake';
import { makeQuestDef, makeGift, makeBeacon, makeArrow, GIFT_TOTAL, type QuestKind, type QuestState } from './quests';
import { makeDog, makeCat, makeBird, makeBus, makePoliceJeep, type Animal, type Bird, type Traffic } from './life';

export interface WorldEvents {
  onPoints(total: number): void;
  onCollect(item: Collectible): void;
  onOnline(n: number): void;
  onNearest(name: string | null, dist: number): void;
  onPrompt(text: string | null, driving: boolean): void;
  onLift(text: string | null): void;
  onRun(on: boolean): void;
  onDash(d: { fuel: number; boost: number; boosting: boolean; kmh: number; canRefuel: boolean; refuelling: boolean } | null): void;
  onMuted(m: boolean): void;
  onQuest(q: QuestState | null): void;
  onFriends(n: number): void;
  onRank(rank: number, of: number): void;
}

const BOT_NAMES = [
  'Aarav (Kochi)', 'Mia (Berlin)', 'Kenji (Osaka)', 'Sofia (Lisbon)', 'Liam (Toronto)', 'Zara (Dubai)',
  'Mateo (Lima)', 'Ananya (Chennai)', 'Noah (Sydney)', 'Fatima (Cairo)', 'Luca (Milan)', 'Hana (Seoul)',
  'Diego (Bogotá)', 'Priya (Bengaluru)', 'Omar (Amman)', 'Yuki (Kyoto)', 'Elena (Athens)', 'Ravi (Mumbai)',
  'Meera (Kochi)', 'Aisha (Hyderabad)', 'Lakshmi (Bengaluru)', 'Emma (London)', 'Sana (Lahore)', 'Nila (Chennai)',
];
const FEMALE = new Set(['Mia', 'Sofia', 'Zara', 'Ananya', 'Fatima', 'Hana', 'Priya', 'Yuki', 'Elena', 'Meera', 'Aisha', 'Lakshmi', 'Emma', 'Sana', 'Nila']);
const TUKTUK_WORLDS = new Set(['city', 'kochi', 'bengaluru', 'taj-mahal', 'pyramids-of-giza']);

// Collision volume taken from a landmark mesh. Cones use a circle footprint, everything else its box.
interface Blocker { box: THREE.Box3; radius?: number; cx: number; cz: number }
const STEP_UP = 0.9;      // how high a ledge the player can step onto
const HEAD = 1.7;         // anything starting above this is overhead and ignored
const LOW_PLATFORM = 2.6; // boxes this thin are walkable surfaces, taller ones are walls

interface Critter { a: Animal; target: THREE.Vector3; wait: number; walking: number; phase: number }
interface Road { t: Traffic; route: THREE.Vector3[]; i: number; dir: number }

interface Bot { av: Avatar; label: CSS2DObject; name: string; female: boolean; target: THREE.Vector3; speed: number; wait: number; walking: number; riding: Vehicle | null; knocked: Knock | null; friend: boolean; asked: number; reply: { at: number; yes: boolean } | null }
// A pedestrian that has been hit: flies with `vel`, then lies on the ground for a moment before getting up.
interface Knock { vel: THREE.Vector3; airborne: boolean; down: number; spin: number }
interface Pickup { mesh: THREE.Mesh; label: CSS2DObject; item: Collectible; active: boolean; respawnAt: number; baseY: number; phase: number }

const WORLD_RADIUS = 240;
const VEHICLE_OFFSETS: [number, number][] = [[-7, 3], [7, 8], [-12, -6], [13, -2], [-4, -10], [4, -11]];
const GRAVITY = 24;
const WALK_SPEED = 9.5;
const JUMP_SPEED = 8.5;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class World {
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labels: CSS2DRenderer;
  private clock = new THREE.Clock();
  private terrain: Terrain;
  private player: Avatar;
  private bots: Bot[] = [];
  private pickups: Pickup[] = [];
  private vehicles: Vehicle[] = [];
  private critters: Critter[] = [];
  private birds: Bird[] = [];
  private roads: Road[] = [];
  private driving: Vehicle | null = null;
  private clouds: THREE.Group[] = [];
  private occluders: THREE.Object3D[] = [];
  private decor!: THREE.Group;
  private mobile = false;
  private sun!: THREE.DirectionalLight;
  private online = 0;
  private ev: WorldEvents;
  private lastRank = -1;
  private get labelRange() { return this.mobile ? 28 : 70; }
  private blockers: Blocker[] = [];
  private worldLabels: CSS2DObject[] = [];
  private train: { group: THREE.Group; stops: number[]; z: number; color: number; idx: number; dir: number; pause: number } | null = null;
  private ray = new THREE.Raycaster();
  private keys = new Set<string>();
  private yaw = 0; private pitch = 0.2; private dist = 10; private camDist = 10;
  private look: { id: number; x: number; y: number } | null = null;
  private stick: { id: number; ox: number; oy: number; dx: number; dy: number } | null = null;
  private raf = 0;
  private points: number;
  private elapsed = 0;
  private lastOnline = 0;
  private lastNearest = 0;
  private airY = 0;      // height above ground while jumping
  private vy = 0;
  private wantJump = false;
  private wantToggleDrive = false;
  private lastPrompt = '';
  private lastLift = '';
  private wantLift = false;
  private passengers = new Map<Vehicle, Bot[]>();
  private minimap: { canvas: HTMLCanvasElement; base: HTMLCanvasElement; ctx: CanvasRenderingContext2D; last: number } | null = null;
  private firstFrame = true;
  private cleanup: (() => void)[] = [];
  private boardLabel!: CSS2DObject;

  constructor(
    private container: HTMLElement,
    private dest: Destination,
    ev: WorldEvents,
    playerName: string,
    startPoints: number,
  ) {
    this.points = startPoints;
    const inner = ev.onPoints.bind(ev);
    this.ev = { ...ev, onPoints: (n) => { inner(n); this.pushRank(); } };
    this.terrain = makeTerrain(dest.terrain);

    const w = container.clientWidth, h = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 600);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    // phones: fewer pixels and a smaller shadow map keep the frame rate smooth
    this.mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.mobile || w * h > 1.6e6 ? 1.5 : 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.className = 'gl';
    container.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.setSize(w, h);
    this.labels.domElement.className = 'labels';
    container.appendChild(this.labels.domElement);

    this.buildEnvironment();
    this.player = this.spawnPlayer(playerName);
    this.spawnBots();
    this.spawnPickups();
    this.spawnVehicles();
    this.spawnLife();
    this.bindInput();

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h); this.labels.setSize(w, h);
    };
    addEventListener('resize', onResize);
    this.cleanup.push(() => removeEventListener('resize', onResize));
  }

  // ---------- setup ----------
  private buildEnvironment() {
    const { theme } = this.dest;
    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.fog, 80, 320);

    this.scene.add(new THREE.HemisphereLight(theme.sky, theme.ground, 0.85));
    const sun = new THREE.DirectionalLight(theme.sun, 1.7);
    sun.position.set(70, 110, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -90; sc.right = sc.top = 90; sc.far = 400;   // a tighter box that follows the player: sharper and cheaper
    sun.shadow.bias = -0.0005;
    this.scene.add(sun, sun.target);
    this.sun = sun;

    // ground
    const size = 540, segs = 130;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.terrain.h(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 1, flatShading: true }));
    ground.receiveShadow = true;
    this.scene.add(ground);

    const water = this.dest.terrain.water;
    if (water) {
      const wm = new THREE.Mesh(
        new THREE.PlaneGeometry(1200, 1200),
        new THREE.MeshStandardMaterial({ color: water.color, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.9 }),
      );
      wm.rotation.x = -Math.PI / 2;
      wm.position.y = water.level;
      this.scene.add(wm);
    }

    const landmark = buildLandmark(this.dest, this.terrain);
    const [px0, pz0] = this.spawnPoint();
    const pump = this.pumpSpot();
    const avoid = [{ x: px0, z: pz0, r: 16 }, { x: pump.x, z: pump.z, r: 14 }, ...VEHICLE_OFFSETS.map(([ox, oz]) => ({ x: px0 + ox, z: pz0 + oz, r: 5 }))];
    const decor = scatterDecor(this.dest, this.terrain, avoid);
    this.scene.add(landmark, decor);
    this.occluders = [landmark]; // decor is one baked mesh; raycasting it every frame is too costly
    this.decor = decor;
    landmark.traverse((o) => { if (o instanceof CSS2DObject) this.worldLabels.push(o); });
    this.placePetrolStation(landmark);
    this.collectBlockers(landmark);
    bakeStatic(landmark);   // collision is captured above, so the visuals can be merged into a few draw calls
    if (landmark.userData.train) this.train = { ...landmark.userData.train, idx: 0, dir: 1, pause: 2 };

    // clouds
    const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 });
    for (let i = 0; i < (this.mobile ? 8 : 14); i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(rand(3, 6), 7, 5), cm);
        s.position.set(k * rand(3, 5), rand(-1, 1), rand(-2, 2));
        c.add(s);
      }
      c.position.set(rand(-220, 220), rand(55, 85), rand(-220, 220));
      this.clouds.push(c);
      this.scene.add(c);
    }

    // leaderboard signboard near spawn
    const sign = new THREE.Group();
    const post = new THREE.MeshStandardMaterial({ color: 0x5a3a2a });
    for (const x of [-3, 3]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), post); p.position.set(x, 3, 0); p.castShadow = true; sign.add(p); }
    const boardM = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 0.3), new THREE.MeshStandardMaterial({ color: 0x1e4d3a }));
    boardM.position.y = 5.5; boardM.castShadow = true; sign.add(boardM);
    const board = document.createElement('div');
    board.className = 'board';
    const leaders = BOT_NAMES.slice(0, 5).map((n, i) => `<li><span>${i + 1}. ${n.split(' (')[0]}</span><b>${(5 - i) * 4230 + 1900}</b></li>`).join('');
    board.innerHTML = `<h4>Top explorers</h4><ol>${leaders}</ol>`;
    const lbl = new CSS2DObject(board); lbl.position.set(0, 5.5, 0.3); sign.add(lbl);
    this.boardLabel = lbl;
    const [px, pz] = this.spawnPoint();
    const sx = px + 9, sz = pz - 5;
    sign.position.set(sx, this.terrain.h(sx, sz), sz);
    sign.rotation.y = Math.PI + 0.6;
    this.scene.add(sign);
  }

  private spawnPoint(): [number, number] {
    if (this.dest.spawn) return this.dest.spawn;
    const f = this.dest.terrain.flatRadius;
    return [0, Math.max(24, Math.min(f * 0.55, 60))];
  }

  private spawnPlayer(name: string) {
    const av = makeAvatar(OUTFITS[0]);
    const [sx, sz] = this.spawnPoint();
    av.group.position.set(sx, this.terrain.h(sx, sz), sz);
    av.group.rotation.y = Math.atan2(-sx, -sz);
    this.yaw = Math.atan2(sx, sz); // camera behind the player, landmark ahead
    const el = document.createElement('div');
    el.className = 'tag me';
    el.textContent = name;
    const label = new CSS2DObject(el); label.position.y = 2.7; av.group.add(label);
    this.scene.add(av.group);
    return av;
  }

  /** Build collision volumes from the landmark's own meshes so walls match what you see. */
  private collectBlockers(landmark: THREE.Object3D) {
    landmark.updateMatrixWorld(true);
    const size = new THREE.Vector3();
    landmark.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const geo = m.geometry as THREE.BufferGeometry & { parameters?: { openEnded?: boolean; radius?: number; radiusBottom?: number } };
      if (geo.type === 'CylinderGeometry' && geo.parameters?.openEnded) return;          // arena walls, shells
      if ((m.material as THREE.Material).transparent) return;                            // nets, glass
      const box = new THREE.Box3().setFromObject(m);
      box.getSize(size);
      if (size.y < 0.15 || box.min.y > 40) return;                                       // paint-thin slabs, things in the sky
      if (size.x < 1.2 && size.z < 1.2) return;                                          // poles, trunks, pillars: walk past them
      const c = box.getCenter(new THREE.Vector3());
      const radius = geo.type === 'ConeGeometry' ? (geo.parameters?.radius ?? size.x / 2) * m.scale.x * 0.8 : undefined;
      if (radius !== undefined && radius < 1.2) return;                                  // small trees
      this.blockers.push({ box: box.expandByScalar(0.3), radius, cx: c.x, cz: c.z });
    });
  }

  private hits(b: Blocker, x: number, z: number) {
    return b.radius !== undefined
      ? Math.hypot(x - b.cx, z - b.cz) < b.radius
      : x > b.box.min.x && x < b.box.max.x && z > b.box.min.z && z < b.box.max.z;
  }

  /** Can something standing at height `y` move to (x, z)? */
  private walkable(x: number, z: number, y = this.terrain.h(x, z)) {
    if (Math.hypot(x, z) >= WORLD_RADIUS || !this.terrain.onLand(x, z)) return false;
    for (const b of this.blockers) {
      if (!this.hits(b, x, z)) continue;
      const { min, max } = b.box;
      if (min.y > y + HEAD || max.y < y + 0.7) continue;                                 // overhead / underfoot
      if (max.y - min.y <= LOW_PLATFORM && min.y <= y + STEP_UP) continue;               // a ledge we can step onto
      return false;
    }
    return true;
  }

  /** Height to stand at: terrain, or the top of a low platform we've stepped onto. */
  private groundAt(x: number, z: number, y: number) {
    let g = this.terrain.h(x, z);
    for (const b of this.blockers) {
      const { min, max } = b.box;
      if (b.radius !== undefined || max.y - min.y > LOW_PLATFORM || min.y > y + STEP_UP || max.y <= g) continue;
      if (this.hits(b, x, z)) g = max.y;
    }
    return g;
  }

  /** Is a whole `r`-metre footprint around (x, z) free of walls? */
  private clearFor(x: number, z: number, r: number) {
    for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) if (!this.walkable(x + dx, z + dz)) return false;
    return true;
  }

  private randomLandPoint(min: number, max: number, clear = 0): THREE.Vector3 {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = rand(min, max);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (clear ? this.clearFor(x, z, clear) : this.walkable(x, z)) return new THREE.Vector3(x, this.terrain.h(x, z), z);
    }
    return new THREE.Vector3(0, this.terrain.h(0, 0), 0);
  }

  /** Where the petrol station goes: beside the first road (on the side away from the landmark), else near spawn. */
  private pumpSpot(): { x: number; z: number; heading: number } {
    if (this.dest.pump) { const [x, z, heading] = this.dest.pump; return { x, z, heading }; }
    if (this.dest.routes?.[0]) {
      const r = this.dest.routes[0], a = r[0], b = r[r.length - 1];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      const mx = a[0] + dx * 0.6, mz = a[1] + dz * 0.6;
      let nx = -dz / len, nz = dx / len;
      if (Math.hypot(mx + nx * 12, mz + nz * 12) < Math.hypot(mx - nx * 12, mz - nz * 12)) { nx = -nx; nz = -nz; }
      return { x: mx + nx * 12, z: mz + nz * 12, heading: Math.atan2(-nx, -nz) };
    }
    const [sx, sz] = this.spawnPoint();
    const x = sx + 24, z = sz - 14;
    return { x, z, heading: Math.atan2(sx - x, sz - z) };
  }

  private placePetrolStation(landmark: THREE.Group) {
    const { x, z, heading } = this.pumpSpot();
    const st = makePetrolStation(`${this.dest.place.split(' ·')[0]} Fuel`);
    st.position.set(x, this.terrain.h(x, z), z);
    st.rotation.y = heading;
    landmark.add(st);
    this.pumpPos = new THREE.Vector3(x, 0, z);
  }

  private spawnBots() {
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, 14);
    const friends = new Set(store.friends());
    let fi = 0, mi = 0;
    names.forEach((name, i) => {
      const short = name.split(' (')[0];
      const female = FEMALE.has(short);
      const outfit = female ? FEMALE_OUTFITS[fi++ % FEMALE_OUTFITS.length] : OUTFITS[++mi % OUTFITS.length];
      const av = makeAvatar({ ...outfit, skin: SKINS[i % SKINS.length] });
      const p = this.randomLandPoint(10, 90);
      av.group.position.copy(p);
      const el = document.createElement('div');
      el.className = 'tag';
      const friend = friends.has(short);
      const text = (friend ? '\u{1F91D} ' : '') + name;
      el.textContent = text;
      if (friend) el.classList.add('friend');
      const label = new CSS2DObject(el); label.position.y = 2.7; label.userData.orig = text; av.group.add(label);
      this.scene.add(av.group);
      this.bots.push({ av, label, name: short, female, target: this.randomLandPoint(10, 110), speed: rand(1.8, 3.4), wait: 0, walking: 0, riding: null, knocked: null, friend, asked: -99, reply: null });
    });
  }

  private spawnPickups() {
    const items = this.dest.collectibles;
    for (let i = 0; i < 12; i++) {
      const item = items[i % items.length];
      const mesh = makePickup(item.shape, item.color);
      const el = document.createElement('div');
      el.className = 'pill';
      el.innerHTML = `${item.name} <b>${item.points}</b>`;
      const label = new CSS2DObject(el); label.position.y = 1.3;
      mesh.add(label);
      this.scene.add(mesh);
      const p: Pickup = { mesh, label, item, active: true, respawnAt: 0, baseY: 0, phase: Math.random() * 6 };
      this.placePickup(p);
      this.pickups.push(p);
    }
  }

  private placePickup(p: Pickup) {
    const at = this.randomLandPoint(8, 120);
    p.baseY = at.y + 1;
    p.mesh.position.set(at.x, p.baseY, at.z);
    p.mesh.visible = true;
    p.active = true;
  }

  private spawnVehicles() {
    const [sx, sz] = this.spawnPoint();
    const kinds: VehicleKind[] = TUKTUK_WORLDS.has(this.dest.id) ? ['tuktuk', 'jeep', 'tuktuk', 'jeep', 'bike', 'cycle'] : ['jeep', 'jeep', 'jeep', 'tuktuk', 'bike', 'cycle'];
    kinds.forEach((kind, i) => {
      const [ox, oz] = VEHICLE_OFFSETS[i];
      let x = sx + ox, z = sz + oz;
      if (!this.clearFor(x, z, 3.2)) { const p = this.randomLandPoint(10, 40, 3.2); x = p.x; z = p.z; }
      const v = makeVehicle(kind, VEHICLE_COLORS[(i * 2 + this.dest.name.length) % VEHICLE_COLORS.length]);
      v.heading = rand(0, Math.PI * 2);
      v.group.position.set(x, 0, z);
      this.settleVehicle(v);
      this.scene.add(v.group);
      this.vehicles.push(v);
    });
  }

  private spawnLife() {
    // a few strays near the spawn
    const [sx, sz] = this.spawnPoint();
    const animals: Animal[] = [makeDog(0xc49a5a), makeDog(0xf0e6d8), makeCat(0x555555)];
    animals.forEach((a, i) => {
      const home = this.randomLandPoint(6, 30);
      a.group.position.set(home.x, home.y, home.z);
      this.scene.add(a.group);
      this.critters.push({ a, target: this.randomLandPoint(6, 45), wait: i, walking: 0, phase: i * 2 });
    });
    // birds circling over the spawn and over the landmark
    const water = !!this.dest.terrain.water;
    for (let i = 0; i < 8; i++) {
      const center = i < 4 ? new THREE.Vector3(sx, 0, sz) : new THREE.Vector3(0, 0, 0);
      center.y = this.terrain.h(center.x, center.z) + 18 + i * 1.5;
      const b = makeBird(water ? 0xf4f4f4 : 0x222222, center, 12 + i * 2);
      this.scene.add(b.group);
      this.birds.push(b);
    }
    // traffic on the world's roads
    for (const tr of this.dest.traffic ?? []) {
      const route = (this.dest.routes ?? [])[tr.route]?.map(([x, z]) => new THREE.Vector3(x, 0, z));
      if (!route || route.length < 2) continue;
      const t = tr.kind === 'police' ? makePoliceJeep() : makeBus(tr.color ?? 0xd94a3d, tr.label);
      const a = route[0], b = route[route.length - 1];
      const start = a.clone().lerp(b, tr.start ?? 0);
      t.group.position.set(start.x, this.terrain.h(start.x, start.z), start.z);
      this.scene.add(t.group);
      this.roads.push({ t, route, i: 0, dir: 1 });
    }
  }

  // ---------- input ----------
  private bindInput() {
    const el = this.renderer.domElement;
    const down = (e: KeyboardEvent) => {
      this.sfx.unlock();
      const k = e.key.toLowerCase();
      if (k === 'h' && !e.repeat && this.driving) this.sfx.horn();
      if (k === 'r' && !e.repeat) this.wantRefuel = true;
      if (k === 't' && !e.repeat) this.wantQuest = true;
      if (k === 'g' && !e.repeat) this.wantFriend = true;
      if (k === 'm' && !e.repeat) this.toggleMute();
      if (k === ' ') { e.preventDefault(); if (!e.repeat) this.wantJump = true; }
      if (k === 'e' && !e.repeat) this.wantToggleDrive = true;
      if (k === 'f' && !e.repeat) this.wantLift = true;
      this.keys.add(k);
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
    addEventListener('keydown', down); addEventListener('keyup', up);
    this.cleanup.push(() => { removeEventListener('keydown', down); removeEventListener('keyup', up); });

    const pd = (e: PointerEvent) => {
      this.sfx.unlock();
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic events have no capture */ }
      if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.55 && !this.stick) {
        this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 };
        this.showStick(e.clientX, e.clientY);
      } else if (!this.look) {
        this.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }
    };
    const pm = (e: PointerEvent) => {
      if (this.look && e.pointerId === this.look.id) {
        this.yaw -= (e.clientX - this.look.x) * 0.005;
        this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - this.look.y) * 0.004, 0.05, 1.25);
        this.look.x = e.clientX; this.look.y = e.clientY;
      } else if (this.stick && e.pointerId === this.stick.id) {
        const dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy;
        const len = Math.hypot(dx, dy), max = 50;
        const k = len > max ? max / len : 1;
        this.stick.dx = (dx * k) / max; this.stick.dy = (dy * k) / max;
        this.moveStick(this.stick.dx * max, this.stick.dy * max);
      }
    };
    const pu = (e: PointerEvent) => {
      if (this.look && e.pointerId === this.look.id) this.look = null;
      if (this.stick && e.pointerId === this.stick.id) { this.stick = null; this.hideStick(); }
    };
    // Mouse wheel = zoom. Touchpad two-finger swipe = look around, pinch (ctrl+wheel) = zoom.
    // Touchpads report small, continuous deltas (often with a horizontal component); wheels report big vertical steps.
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : 1; // lines -> pixels
      const dx = e.deltaX * k, dy = e.deltaY * k;
      const touchpad = !e.ctrlKey && (Math.abs(dx) > 0.5 || Math.abs(dy) < 40);
      if (e.ctrlKey || !touchpad) {
        this.dist = THREE.MathUtils.clamp(this.dist + dy * (e.ctrlKey ? 0.04 : 0.01), 4, 24);
      } else {
        this.yaw -= dx * 0.006;
        this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.004, 0.05, 1.25);
      }
    };
    el.addEventListener('pointerdown', pd);
    el.addEventListener('pointermove', pm);
    el.addEventListener('pointerup', pu);
    el.addEventListener('pointercancel', pu);
    el.addEventListener('wheel', wheel, { passive: false });
    this.cleanup.push(() => {
      el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm);
      el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); el.removeEventListener('wheel', wheel);
    });
  }

  /** On-screen buttons call these. */
  jump() { this.wantJump = true; }
  /** Zoom the camera in (negative) or out (positive). */
  zoom(delta: number) { this.dist = THREE.MathUtils.clamp(this.dist + delta, 4, 24); }
  /** Sticky run mode (touch button); Shift still works as hold-to-run. */
  toggleRun() { this.runMode = !this.runMode; this.ev.onRun(this.runMode); }
  setBoost(held: boolean) { this.boostHeld = held; }
  refuel() { this.wantRefuel = true; }
  startTask() { this.wantQuest = true; }
  befriend() { this.wantFriend = true; }
  private wantFriend = false;
  private lastFriendPrompt = '';
  private wantQuest = false;
  horn() { this.sfx.unlock(); this.sfx.horn(); }
  toggleMute() { this.sfx.unlock(); this.sfx.setMuted(!this.sfx.muted); this.ev.onMuted(this.sfx.muted); }
  private wantRefuel = false;
  private wasBoosting = false;
  // ---- quests
  private quest: {
    kind: QuestKind; title: string; desc: string; reward: number; total: number; endsAt: number; seconds: number;
    gifts: THREE.Group[]; got: number;
    stops: { name: string; pos: THREE.Vector3 }[]; stopIdx: number; beacon: THREE.Group | null;
    rider: Bot | null; arrow: THREE.Mesh | null; item: string | null; need: number;
    status: 'active' | 'done' | 'failed'; finishedAt: number; lastTick: number;
  } | null = null;
  private questCooldown = 4;   // seconds until a task is offered automatically
  private questSeq = 0;
  private lastQuestPush = 0;
  private runMode = false;
  readonly sfx = new Sfx();
  private pumpPos: THREE.Vector3 | null = null;
  private refuelling = false;
  private boostHeld = false;
  private lastDash = 0;
  private wasAirborne = false;
  toggleDrive() { this.wantToggleDrive = true; }
  lift() { this.wantLift = true; }
  attachMinimap(canvas: HTMLCanvasElement) { this.minimap = { canvas, base: this.drawMinimapBase(canvas.width), ctx: canvas.getContext('2d')!, last: 0 }; }

  private stickEl?: HTMLElement;
  private showStick(x: number, y: number) {
    if (!this.stickEl) {
      this.stickEl = document.createElement('div');
      this.stickEl.className = 'stick';
      this.stickEl.innerHTML = '<div class="knob"></div>';
      this.container.appendChild(this.stickEl);
    }
    this.stickEl.style.left = `${x}px`; this.stickEl.style.top = `${y}px`;
    this.stickEl.hidden = false;
    this.moveStick(0, 0);
  }
  private moveStick(dx: number, dy: number) {
    const knob = this.stickEl?.firstElementChild as HTMLElement | undefined;
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  private hideStick() { if (this.stickEl) this.stickEl.hidden = true; }

  // ---------- vehicles ----------
  private nearestVehicle(): Vehicle | null {
    const p = this.player.group.position;
    let best: Vehicle | null = null, bd = 4.5;
    for (const v of this.vehicles) {
      const d = v.group.position.distanceTo(p);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }

  /** Drop the vehicle onto the ground and tilt it to match the slope. */
  private settleVehicle(v: Vehicle) { this.settle(v.group, v.heading, v.spec.length, v.spec.width); }

  private settle(group: THREE.Object3D, heading: number, length: number, width: number) {
    const vp = group.position;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    vp.y = this.groundAt(vp.x, vp.z, vp.y);
    const L = length / 2, W = width / 2;
    const hf = this.terrain.h(vp.x + fx * L, vp.z + fz * L), hb = this.terrain.h(vp.x - fx * L, vp.z - fz * L);
    const rx = fz, rz = -fx;
    const hr = this.terrain.h(vp.x + rx * W, vp.z + rz * W), hl = this.terrain.h(vp.x - rx * W, vp.z - rz * W);
    group.rotation.set(-Math.atan2(hf - hb, length), heading, Math.atan2(hr - hl, width));
  }

  // ---------- lifts: pick up explorers while driving, drop them off for points ----------
  private nearestWalker(): Bot | null {
    if (!this.driving) return null;
    const vp = this.driving.group.position;
    let best: Bot | null = null, bd = 5;
    for (const b of this.bots) {
      if (b.riding || b.knocked) continue;
      const d = b.av.group.position.distanceTo(vp);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  private seatsFor(v: Vehicle): THREE.Vector3[] {
    switch (v.spec.kind) {
      case 'jeep': return [new THREE.Vector3(0.55, 1.05, -0.2), new THREE.Vector3(-0.55, 1.05, -1.3), new THREE.Vector3(0.55, 1.05, -1.3)];
      case 'tuktuk': return [new THREE.Vector3(-0.4, 1.15, -0.9), new THREE.Vector3(0.4, 1.15, -0.9)];
      case 'bike': return [new THREE.Vector3(0, 0.6, -0.75)];
      default: return [new THREE.Vector3(0, 0.55, -0.75)];
    }
  }

  private boardBot(v: Vehicle, b: Bot) {
    const list = this.passengers.get(v) ?? [];
    const seat = this.seatsFor(v)[list.length];
    if (!seat) return false;
    list.push(b); this.passengers.set(v, list);
    b.riding = v; b.walking = 0;
    this.scene.remove(b.av.group);
    v.group.add(b.av.group);
    b.av.group.position.copy(seat);
    b.av.group.rotation.set(0, 0, 0);
    if (v.spec.ride) poseRide(b.av); else poseSit(b.av);
    return true;
  }

  private dropPassengers(v: Vehicle) {
    const list = this.passengers.get(v) ?? [];
    list.forEach((b, i) => {
      v.group.remove(b.av.group);
      this.scene.add(b.av.group);
      const ang = v.heading + Math.PI / 2 + i * 0.6;
      const x = v.group.position.x + Math.sin(ang) * 3, z = v.group.position.z + Math.cos(ang) * 3;
      b.av.group.position.set(x, this.groundAt(x, z, v.group.position.y), z);
      b.av.group.rotation.set(0, v.heading, 0);
      b.av.armL.rotation.x = b.av.armR.rotation.x = 0;
      b.av.legL.rotation.z = b.av.legR.rotation.z = 0;
      b.riding = null; b.wait = 2; b.target = this.randomLandPoint(8, 120);
      this.questDropped(b, v);
      this.points += 30;
      this.ev.onCollect({ name: `Lift for ${b.name}`, points: 30, color: 0xe8c46a, shape: 'gem' });
    });
    this.ev.onPoints(this.points);
    this.passengers.set(v, []);
  }

  /** Vehicles hitting pedestrians: fling them, lose some speed, and cost points. */
  private runOverCheck(v: Vehicle, fx: number, fz: number) {
    if (Math.abs(v.speed) < 3) return;
    const vp = v.group.position, half = v.spec.length / 2 + 0.4, w = v.spec.width / 2 + 0.5;
    const rx = fz, rz = -fx;
    for (const b of this.bots) {
      if (b.riding || b.knocked) continue;
      const bp = b.av.group.position;
      const dx = bp.x - vp.x, dz = bp.z - vp.z;
      const along = dx * fx + dz * fz, side = dx * rx + dz * rz;
      if (Math.abs(along) > half || Math.abs(side) > w) continue;
      const dir = Math.sign(v.speed) || 1;
      const push = Math.min(Math.abs(v.speed), 24);
      b.knocked = {
        vel: new THREE.Vector3(fx * dir * push * 0.55 + rx * side * 2, 4 + push * 0.18, fz * dir * push * 0.55 + rz * side * 2),
        airborne: true, down: 0, spin: (Math.random() - 0.5) * 8,
      };
      b.walking = 0;
      b.label.element.textContent = `\u{1F635} ${b.label.userData.orig as string}`;
      v.speed *= 0.7;
      this.sfx.thud(); this.sfx.ouch();
      this.points = Math.max(0, this.points - 10);
      this.ev.onPoints(this.points);
      this.ev.onCollect({ name: `Hit ${b.name}! Careful`, points: -10, color: 0xd94a3d, shape: 'box' });
    }
  }

  private updateKnocked(b: Bot, dt: number) {
    const k = b.knocked!, g = b.av.group, bp = g.position;
    if (k.airborne) {
      k.vel.y -= GRAVITY * dt;
      const nx = bp.x + k.vel.x * dt, nz = bp.z + k.vel.z * dt;
      if (this.walkable(nx, nz, bp.y)) { bp.x = nx; bp.z = nz; } else { k.vel.x *= -0.3; k.vel.z *= -0.3; }
      bp.y += k.vel.y * dt;
      g.rotation.x += k.spin * dt;
      b.av.armL.rotation.x = b.av.armR.rotation.x = -2.4;
      b.av.legL.rotation.x = 0.6; b.av.legR.rotation.x = -0.4;
      const ground = this.groundAt(bp.x, bp.z, bp.y);
      if (bp.y <= ground && k.vel.y < 0) {
        bp.y = ground; k.airborne = false; k.vel.set(0, 0, 0);
        g.rotation.x = -Math.PI / 2; g.rotation.z = 0;   // flat on the back
        this.sfx.bump();
      }
    } else {
      k.down += dt;
      if (k.down > 3) {
        // get back up and walk it off
        g.rotation.x = 0;
        b.av.armL.rotation.x = b.av.armR.rotation.x = 0;
        b.knocked = null; b.wait = 0.5; b.target = this.randomLandPoint(8, 120);
        b.label.element.textContent = b.label.userData.orig as string;
      } else if (k.down > 2.4) g.rotation.x = -Math.PI / 2 * (1 - (k.down - 2.4) / 0.6);
    }
  }

  private enterVehicle(v: Vehicle) {
    this.driving = v;
    this.sfx.door();
    if (v.spec.fuel && v.fuel <= 0) this.sfx.sputter();
    this.airY = 0; this.vy = 0;
    this.scene.remove(this.player.group);
    v.group.add(this.player.group);
    this.player.group.position.copy(v.seat);
    this.player.group.rotation.set(0, 0, 0);
    if (v.spec.ride) poseRide(this.player); else poseSit(this.player);
  }

  private exitVehicle() {
    const v = this.driving!;
    if (this.passengers.get(v)?.length) this.dropPassengers(v);
    this.driving = null;
    v.speed = 0;
    this.refuelling = false; this.sfx.pumpState(false);
    for (const f of v.flames) f.visible = false;
    this.sfx.engineState(false, 0, false, false);
    this.sfx.door();
    v.group.remove(this.player.group);
    this.scene.add(this.player.group);
    // step out on the left side, fall back to any free spot around the vehicle
    const candidates = [Math.PI / 2, -Math.PI / 2, Math.PI, 0].map((a) => {
      const ang = v.heading + a;
      return new THREE.Vector3(v.group.position.x + Math.sin(ang) * (v.spec.width / 2 + 1.4), 0, v.group.position.z + Math.cos(ang) * (v.spec.width / 2 + 1.4));
    });
    const spot = candidates.find((c) => this.walkable(c.x, c.z)) ?? candidates[0];
    this.player.group.position.set(spot.x, this.terrain.h(spot.x, spot.z), spot.z);
    this.player.group.rotation.set(0, v.heading, 0);
    this.player.armL.rotation.x = this.player.armR.rotation.x = 0;
    this.player.legL.rotation.z = this.player.legR.rotation.z = 0;
  }

  // ---------- loop ----------
  start() {
    this.clock.start();
    this.pushRank();
    const tick = () => { this.raf = requestAnimationFrame(tick); this.update(); };
    tick();
  }

  private update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;
    const t = this.elapsed;
    const k = this.keys;

    // --- input vector
    let ix = 0, iz = 0;
    if (k.has('w') || k.has('arrowup')) iz += 1;
    if (k.has('s') || k.has('arrowdown')) iz -= 1;
    if (k.has('a') || k.has('arrowleft')) ix -= 1;
    if (k.has('d') || k.has('arrowright')) ix += 1;
    if (this.stick) { ix += this.stick.dx; iz -= this.stick.dy; }

    // --- enter / leave vehicles
    if (this.wantToggleDrive) {
      this.wantToggleDrive = false;
      if (this.driving) this.exitVehicle();
      else { const v = this.nearestVehicle(); if (v) this.enterVehicle(v); }
    }

    let focus: THREE.Vector3;       // what the camera looks at / what collects pickups
    let focusRadius = 1.5;

    if (this.driving) {
      const v = this.driving;
      const s = v.spec;
      const empty = s.fuel && v.fuel <= 0;
      const throttle = empty ? 0 : Math.min(1, Math.max(-1, iz));
      const boosting = !empty && (this.boostHeld || k.has('shift') || k.has('b')) && v.boost > 0 && throttle > 0;
      if (boosting && !this.wasBoosting) this.sfx.boost();
      this.wasBoosting = boosting;
      const maxSpeed = s.maxSpeed * (boosting ? BOOST_MULT : 1);
      const accel = s.accel * (boosting ? 2.2 : 1);
      if (throttle > 0) v.speed += accel * throttle * dt;
      else if (throttle < 0) v.speed += (v.speed > 0.5 ? -22 : s.accel * throttle * 0.6) * dt; // brake, then reverse
      else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), (empty ? 3 : 6) * dt);
      if (k.has(' ')) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 30 * dt);
      if (!boosting && v.speed > s.maxSpeed) v.speed -= Math.min(v.speed - s.maxSpeed, 10 * dt); // ease back after a boost
      v.speed = THREE.MathUtils.clamp(v.speed, -s.reverse, maxSpeed);
      // fuel burns with distance (boosting burns double); nitro drains while used and recharges slowly
      const wasEmpty = empty;
      if (s.fuel) v.fuel = Math.max(0, v.fuel - (Math.abs(v.speed) * dt * (boosting ? 2 : 1)) / FUEL_RANGE);
      if (!wasEmpty && v.fuel <= 0) this.sfx.sputter();
      v.boost = THREE.MathUtils.clamp(v.boost + (boosting ? -dt / 4 : dt / 12), 0, 1);
      for (const f of v.flames) { f.visible = boosting; if (boosting) f.scale.setScalar(0.8 + Math.random() * 0.5); }
      const steer = -Math.min(1, Math.max(-1, ix));
      v.heading += steer * s.turn * dt * THREE.MathUtils.clamp(v.speed / 8, -1, 1);

      const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
      const vp = v.group.position;
      const nx = vp.x + fx * v.speed * dt, nz = vp.z + fz * v.speed * dt;
      if (this.walkable(nx, nz, vp.y)) { vp.x = nx; vp.z = nz; }
      else { if (Math.abs(v.speed) > 4) this.sfx.bump(); v.speed *= -0.3; }
      this.settleVehicle(v);
      this.runOverCheck(v, fx, fz);
      for (const w of v.wheels) w.rotation.x += (v.speed * dt) / 0.5;

      // camera drifts in behind the vehicle unless the user is dragging
      if (!this.look) this.yaw += wrapAngle(v.heading + Math.PI - this.yaw) * Math.min(1, dt * 2.5);
      this.dist += (14 - this.dist) * Math.min(1, dt * 2);

      focus = vp.clone().add(new THREE.Vector3(0, 2.2, 0));
      focusRadius = 3;
      const speedKmh = Math.round(Math.abs(v.speed) * 3.6);
      this.prompt(empty ? `Out of petrol! Find the \u26FD pump` : this.mobile ? null : `${s.label} · W/S drive · A/D steer · Shift boost · H horn · E out`, true);

      // refuelling at the pump: stop within 9 m and press R (or the button)
      const atPump = s.fuel && !!this.pumpPos && Math.abs(v.speed) < 1.5 && Math.hypot(vp.x - this.pumpPos.x, vp.z - this.pumpPos.z) < 9;
      if (this.wantRefuel && atPump && v.fuel < 1) { this.refuelling = true; this.sfx.pumpState(true); }
      if (this.refuelling) {
        if (!atPump || v.fuel >= 1) { this.refuelling = false; this.sfx.pumpState(false); if (v.fuel >= 1) this.sfx.refuelDone(); }
        else v.fuel = Math.min(1, v.fuel + dt / 5);
      }
      this.sfx.engineState(true, Math.abs(v.speed) / s.maxSpeed, boosting, empty);
      this.camera.fov += ((boosting ? 74 : 60) - this.camera.fov) * Math.min(1, dt * 4);
      this.camera.updateProjectionMatrix();
      if (t - this.lastDash > 0.1) {
        this.lastDash = t;
        this.ev.onDash({ fuel: s.fuel ? v.fuel : -1, boost: v.boost, boosting, kmh: speedKmh, canRefuel: atPump && v.fuel < 0.999, refuelling: this.refuelling });
      }

      const aboard = this.passengers.get(v) ?? [];
      const walker = Math.abs(v.speed) < 4 && aboard.length < this.seatsFor(v).length ? this.nearestWalker() : null;
      if (this.wantLift) {
        if (walker) this.boardBot(v, walker);
        else if (aboard.length) this.dropPassengers(v);
      }
      this.liftPrompt(walker ? (this.mobile ? `Give ${walker.name} a lift?` : `Press F to give ${walker.name} a lift`) : aboard.length ? `${aboard.map((b) => b.name).join(', ')} aboard${this.mobile ? '' : ' · F to drop off (+30 each)'}` : null);
    } else {
      // --- walking
      const p = this.player.group.position;
      const len = Math.hypot(ix, iz);
      let moving = 0;
      if (len > 0.01) {
        ix /= Math.max(1, len); iz /= Math.max(1, len);
        const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
        const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
        const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix;
        const running = this.runMode || k.has('shift');
        const speed = running ? WALK_SPEED * 1.8 : WALK_SPEED;
        const nx = p.x + mx * speed * dt, nz = p.z + mz * speed * dt;
        const py = p.y - this.airY;
        if (this.walkable(nx, nz, py)) { p.x = nx; p.z = nz; }
        else if (this.walkable(nx, p.z, py)) p.x = nx;        // slide along walls
        else if (this.walkable(p.x, nz, py)) p.z = nz;
        this.player.group.rotation.y = Math.atan2(mx, mz);
        moving = Math.min(1, len) * (running ? 1.5 : 1);
        if (this.stick && !this.look && iz > 0.3) this.yaw += wrapAngle(Math.atan2(mx, mz) + Math.PI - this.yaw) * Math.min(1, dt * 1.2);
      }
      // --- jump
      if (this.wantJump && this.airY <= 0) { this.vy = JUMP_SPEED; this.sfx.jump(); }
      this.wantJump = false;
      if (this.airY > 0 || this.vy > 0) {
        this.vy -= GRAVITY * dt;
        this.airY = Math.max(0, this.airY + this.vy * dt);
        if (this.airY === 0) { this.vy = 0; if (this.wasAirborne) this.sfx.land(); }
      }
      this.wasAirborne = this.airY > 0;
      const ground = this.groundAt(p.x, p.z, p.y - this.airY);
      const drop = p.y - this.airY - ground;
      if (drop > 0.05 && this.airY <= 0) this.airY = drop;   // walked off a ledge: fall
      p.y = ground + this.airY;
      if (this.airY > 0) poseJump(this.player); else animateWalk(this.player, t, moving);

      focus = p.clone().add(new THREE.Vector3(0, 1.7, 0));
      if (this.lastDash !== -1) { this.lastDash = -1; this.ev.onDash(null); }
      if (Math.abs(this.camera.fov - 60) > 0.01) { this.camera.fov += (60 - this.camera.fov) * Math.min(1, dt * 4); this.camera.updateProjectionMatrix(); }
      const near = this.nearestVehicle();
      this.prompt(near ? (this.mobile ? `Ride the ${near.spec.label}?` : `Press E to drive the ${near.spec.label}`) : null, false);
      // friend requests: walk up to an explorer and press G
      const who = this.nearestStranger(p);
      if (this.wantFriend && who) this.askFriend(who, t);
      this.liftPrompt(who ? (this.mobile ? `Add ${who.name} as a friend?` : `Press G to send ${who.name} a friend request`) : null);
    }
    this.wantLift = false;
    this.wantRefuel = false;
    this.wantFriend = false;

    // --- camera
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp);
    // pull the camera in front of trees / buildings that block the view
    this.ray.set(focus, dir);
    this.ray.far = this.dist;
    const hit = this.ray.intersectObjects(this.occluders, true)[0];
    const wantDist = hit ? Math.max(2.5, hit.distance - 0.6) : this.dist;
    this.camDist += (wantDist - this.camDist) * Math.min(1, dt * (wantDist < this.camDist ? 14 : 3));
    const cam = dir.multiplyScalar(this.camDist).add(focus);
    cam.y = Math.max(cam.y, this.terrain.h(cam.x, cam.z) + 1);
    if (this.firstFrame) { this.camera.position.copy(cam); this.firstFrame = false; }
    else this.camera.position.lerp(cam, 1 - Math.pow(0.001, dt));
    this.camera.lookAt(focus);
    this.sun.position.set(focus.x + 70, focus.y + 110, focus.z + 50);
    this.sun.target.position.copy(focus);

    // --- bots wander
    for (const b of this.bots) {
      if (b.riding) { b.label.visible = true; continue; }
      const bp = b.av.group.position;
      if (b.reply) {
        // turn to face the player, then answer
        const pp = this.player.group.position;
        b.av.group.rotation.y += wrapAngle(Math.atan2(pp.x - bp.x, pp.z - bp.z) - b.av.group.rotation.y) * Math.min(1, dt * 6);
        b.av.armR.rotation.x = -2.6 + Math.sin(t * 8) * 0.3;   // wave
        if (t >= b.reply.at) this.answerFriend(b);
      }
      if (b.knocked) { this.updateKnocked(b, dt); b.label.visible = bp.distanceToSquared(focus) < this.labelRange * this.labelRange; continue; }
      if (b.wait > 0) { b.wait -= dt; b.walking = Math.max(0, b.walking - dt * 3); }
      else {
        const dx = b.target.x - bp.x, dz = b.target.z - bp.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.6) { b.wait = rand(1, 4); b.target = this.randomLandPoint(8, 120); }
        else {
          const nx = bp.x + (dx / d) * b.speed * dt, nz = bp.z + (dz / d) * b.speed * dt;
          if (this.walkable(nx, nz, bp.y)) { bp.x = nx; bp.z = nz; } else b.target = this.randomLandPoint(8, 120);
          b.av.group.rotation.y += wrapAngle(Math.atan2(dx, dz) - b.av.group.rotation.y) * Math.min(1, dt * 6);
          b.walking = Math.min(1, b.walking + dt * 3);
        }
      }
      bp.y = this.groundAt(bp.x, bp.z, bp.y);
      animateWalk(b.av, t * (b.speed / 3), b.walking * 0.8);
      b.label.visible = bp.distanceToSquared(focus) < this.labelRange * this.labelRange;
    }

    // --- pickups
    let nearest: Pickup | null = null, nd = Infinity;
    for (const pk of this.pickups) {
      if (!pk.active) {
        if (t > pk.respawnAt) this.placePickup(pk);
        continue;
      }
      pk.mesh.position.y = pk.baseY + Math.sin(t * 2 + pk.phase) * 0.2;
      pk.mesh.rotation.y += dt * 1.5;
      const d = Math.hypot(pk.mesh.position.x - focus.x, pk.mesh.position.z - focus.z);
      pk.label.visible = d < this.labelRange * 0.6;
      if (d < nd) { nd = d; nearest = pk; }
      if (d < focusRadius && this.airY < 1.2) {
        pk.active = false; pk.mesh.visible = false; pk.respawnAt = t + 12;
        this.points += pk.item.points;
        this.ev.onPoints(this.points);
        this.ev.onCollect(pk.item);
        this.sfx.collect(pk.item.points);
        this.questCollected(pk.item.name);
      }
    }
    if (t - this.lastNearest > 0.4) {
      this.lastNearest = t;
      this.ev.onNearest(nearest ? nearest.item.name : null, nd);
    }
    this.boardLabel.visible = this.boardLabel.parent!.position.distanceToSquared(focus) < 30 * 30;

    // --- strays wander, birds circle, traffic runs its routes
    for (const c of this.critters) {
      const a = c.a, cp = a.group.position;
      if (c.wait > 0) { c.wait -= dt; c.walking = Math.max(0, c.walking - dt * 4); }
      else {
        const dx = c.target.x - cp.x, dz = c.target.z - cp.z, d = Math.hypot(dx, dz);
        if (d < 0.5) { c.wait = rand(2, 6); c.target = this.randomLandPoint(6, 45); }
        else {
          const nx = cp.x + (dx / d) * a.speed * dt, nz = cp.z + (dz / d) * a.speed * dt;
          if (this.walkable(nx, nz, cp.y)) { cp.x = nx; cp.z = nz; } else c.target = this.randomLandPoint(6, 45);
          a.group.rotation.y += wrapAngle(Math.atan2(dx, dz) - a.group.rotation.y) * Math.min(1, dt * 5);
          c.walking = Math.min(1, c.walking + dt * 4);
        }
      }
      cp.y = this.groundAt(cp.x, cp.z, cp.y);
      const sw = Math.sin(t * 12 + c.phase) * 0.7 * c.walking;
      a.legs.forEach((l, i) => { l.rotation.x = i % 3 === 0 ? sw : -sw; });
      a.tail.rotation.y = Math.sin(t * 7 + c.phase) * 0.5;
    }
    for (const b of this.birds) {
      b.angle += b.speed * dt;
      b.group.position.set(b.center.x + Math.cos(b.angle) * b.radius, b.center.y + Math.sin(t * 0.8 + b.phase) * 2, b.center.z + Math.sin(b.angle) * b.radius);
      b.group.rotation.y = -b.angle;
      const flap = Math.sin(t * 9 + b.phase) * 0.6;
      b.wingL.rotation.z = -flap; b.wingR.rotation.z = flap;
    }
    for (const r of this.roads) {
      const gp = r.t.group.position;
      const next = r.route[r.i + r.dir];
      const dx = next.x - gp.x, dz = next.z - gp.z, d = Math.hypot(dx, dz);
      const step = r.t.speed * dt;
      if (d <= step) {
        r.i += r.dir;
        if (r.i === r.route.length - 1 || r.i === 0) r.dir *= -1;
      } else {
        gp.x += (dx / d) * step; gp.z += (dz / d) * step;
        r.t.group.rotation.y += wrapAngle(Math.atan2(dx, dz) - r.t.group.rotation.y) * Math.min(1, dt * 4);
      }
      this.settle(r.t.group, r.t.group.rotation.y, r.t.length, 2.6);
      for (const w of r.t.wheels) w.rotation.x += step / 0.5;
      if (r.t.light) { const on = Math.floor(t * 4) % 2 === 0; (r.t.light[0].material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 1.5 : 0.1; (r.t.light[1].material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 0.1 : 1.5; }
    }

    // --- world labels + metro train
    const wp = new THREE.Vector3();
    const lr = this.mobile ? 0.5 : 1;
    for (const l of this.worldLabels) l.visible = l.getWorldPosition(wp).distanceToSquared(focus) < ((l.userData.range as number) * lr) ** 2;
    if (this.train) {
      const tr = this.train;
      if (tr.pause > 0) tr.pause -= dt;
      else {
        const target = tr.stops[tr.idx + tr.dir];
        const x = tr.group.position.x;
        const step = 9 * dt;
        if (Math.abs(target - x) <= step) {
          tr.group.position.x = target;
          tr.idx += tr.dir;
          tr.pause = 3;
          if (tr.idx === tr.stops.length - 1) tr.dir = -1;
          else if (tr.idx === 0) tr.dir = 1;
        } else tr.group.position.x += Math.sign(target - x) * step;
      }
    }

    // --- ambience
    for (const c of this.clouds) { c.position.x += dt * 1.2; if (c.position.x > 240) c.position.x = -240; }
    if (t - this.lastOnline > 6) {
      this.lastOnline = t;
      this.online = this.dest.explorers + Math.round(Math.random() * 40 - 20);
      this.ev.onOnline(this.online);
      this.pushRank();
    }

    this.updateQuest(focus, focusRadius, dt, t);
    this.drawMinimap(focus, t);
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  private liftPrompt(text: string | null) {
    if (text === this.lastLift) return;
    this.lastLift = text ?? '';
    this.ev.onLift(text);
  }

  // ---------- minimap ----------
  private static MAP_SPAN = 500; // world units across the map

  private drawMinimapBase(size: number) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const span = World.MAP_SPAN, px = size / span;
    const water = this.dest.terrain.water;
    const img = ctx.createImageData(size, size);
    const land = new THREE.Color(this.dest.theme.ground), sea = new THREE.Color(water?.color ?? 0x3a7fb0);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const x = (i / size - 0.5) * span, z = (j / size - 0.5) * span;
      const h = this.terrain.h(x, z);
      const k = (j * size + i) * 4;
      let col: THREE.Color;
      if (Math.hypot(x, z) > WORLD_RADIUS) col = sea.clone().multiplyScalar(0.8);
      else if (water && h < water.level) col = sea;
      else col = land.clone().multiplyScalar(0.8 + Math.min(0.5, Math.max(-0.2, h * 0.02)));
      img.data[k] = col.r * 255; img.data[k + 1] = col.g * 255; img.data[k + 2] = col.b * 255; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const P = (x: number, z: number) => [size / 2 + x * px, size / 2 + z * px] as const;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5f5f5f'; ctx.lineWidth = 3;
    for (const route of this.dest.routes ?? []) {
      ctx.beginPath();
      route.forEach(([x, z], i) => { const [a, b] = P(x, z); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); });
      ctx.stroke();
    }
    if (this.train) {
      const st = this.train.stops, [a, b] = P(st[0], this.train.z), [c2, d] = P(st[st.length - 1], this.train.z);
      ctx.strokeStyle = '#' + this.train.color.toString(16).padStart(6, '0'); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke();
      ctx.fillStyle = '#fff';
      for (const x of st) { const [e, f] = P(x, this.train.z); ctx.beginPath(); ctx.arc(e, f, 2, 0, 7); ctx.fill(); }
    }
    ctx.fillStyle = '#e8c46a';
    const wp = new THREE.Vector3();
    for (const l of this.worldLabels) {
      if (!(l.element as HTMLElement).classList.contains('place')) continue;
      l.getWorldPosition(wp);
      const [a, b] = P(wp.x, wp.z);
      ctx.beginPath(); ctx.arc(a, b, 3, 0, 7); ctx.fill();
    }
    return c;
  }

  private drawMinimap(focus: THREE.Vector3, t: number) {
    const m = this.minimap;
    if (!m || t - m.last < 0.1) return;
    m.last = t;
    const { ctx, canvas, base } = m;
    const size = canvas.width, px = size / World.MAP_SPAN;
    const P = (x: number, z: number) => [size / 2 + x * px, size / 2 + z * px] as const;
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (const b of this.bots) { if (b.riding) continue; const [a, c] = P(b.av.group.position.x, b.av.group.position.z); ctx.beginPath(); ctx.arc(a, c, 1.6, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#f27d3a';
    for (const r of this.roads) { const [a, c] = P(r.t.group.position.x, r.t.group.position.z); ctx.fillRect(a - 2, c - 2, 4, 4); }
    // quest markers: fuzzy zones for hidden gifts, a ring for the next checkpoint / rider
    const q = this.quest;
    if (q && q.status === 'active') {
      if (q.kind === 'hunt') {
        for (const gf of q.gifts) {
          if (!gf.visible) continue;
          const [a, c] = P(gf.userData.hx as number, gf.userData.hz as number);
          ctx.fillStyle = 'rgba(255, 215, 90, .28)'; ctx.beginPath(); ctx.arc(a, c, 22 * px, 0, 7); ctx.fill();
          ctx.strokeStyle = 'rgba(255, 215, 90, .8)'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      const target = q.kind === 'race' ? q.stops[q.stopIdx]?.pos : q.kind === 'taxi' ? (q.rider?.riding ? q.stops[0].pos : q.rider?.av.group.position) : null;
      if (target) {
        const [a, c] = P(target.x, target.z);
        const pulse = 4 + Math.sin(t * 5) * 1.5;
        ctx.strokeStyle = '#ff4fd8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(a, c, pulse, 0, 7); ctx.stroke();
        ctx.fillStyle = '#ff4fd8'; ctx.beginPath(); ctx.arc(a, c, 2, 0, 7); ctx.fill();
      }
    }
    ctx.fillStyle = '#3fb7d9';
    for (const v of this.vehicles) { if (v === this.driving) continue; const [a, c] = P(v.group.position.x, v.group.position.z); ctx.fillRect(a - 2, c - 2, 4, 4); }
    // player arrow
    const heading = this.driving ? this.driving.heading : this.player.group.rotation.y;
    const [a, c] = P(focus.x, focus.z);
    ctx.save(); ctx.translate(a, c); ctx.rotate(-heading);
    ctx.fillStyle = '#e8c46a'; ctx.strokeStyle = '#17332b'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // ---------- friends ----------
  private nearestStranger(p: THREE.Vector3): Bot | null {
    let best: Bot | null = null, bd = 4;
    for (const b of this.bots) {
      if (b.friend || b.riding || b.knocked || b.reply || this.elapsed - b.asked < 20) continue;
      const d = b.av.group.position.distanceTo(p);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  private askFriend(b: Bot, t: number) {
    b.asked = t;
    b.reply = { at: t + 1.6 + Math.random() * 1.2, yes: Math.random() < 0.8 };
    b.wait = 9999; b.walking = 0;
    this.sfx.checkpoint();
    this.ev.onCollect({ name: `Friend request sent to ${b.name}…`, points: 0, color: 0x3fb7d9, shape: 'gem' });
  }

  private answerFriend(b: Bot) {
    const yes = b.reply!.yes;
    b.reply = null; b.wait = 1.5;
    b.av.armR.rotation.x = 0;
    if (yes) {
      b.friend = true;
      store.addFriend(b.name);
      const text = `\u{1F91D} ${b.label.userData.orig as string}`;
      b.label.userData.orig = text; b.label.element.textContent = text; b.label.element.classList.add('friend');
      this.points += 25; this.ev.onPoints(this.points);
      this.ev.onCollect({ name: `${b.name} accepted! You're friends now`, points: 25, color: 0xe75480, shape: 'gem' });
      this.ev.onFriends(store.friends().length);
      this.sfx.questDone();
    } else {
      this.ev.onCollect({ name: `${b.name}: "maybe later 🙂"`, points: 0, color: 0x999999, shape: 'box' });
      this.sfx.ouch();
    }
  }

  // ---------- quests ----------
  private placeNames(): { name: string; pos: THREE.Vector3 }[] {
    const out: { name: string; pos: THREE.Vector3 }[] = [];
    const wp = new THREE.Vector3();
    for (const l of this.worldLabels) {
      const el = l.element as HTMLElement;
      if (!el.classList.contains('place')) continue;
      l.getWorldPosition(wp);
      out.push({ name: el.textContent!.replace(/^[^\p{L}\p{N}]+\s*/u, '').split(' · ')[0], pos: new THREE.Vector3(wp.x, 0, wp.z) });
    }
    return out;
  }

  private startQuest() {
    this.clearQuest();
    const kinds: QuestKind[] = ['hunt', 'race', 'taxi', 'collect'];
    const kind = kinds[this.questSeq++ % kinds.length];
    const t = this.elapsed;
    const focus = this.driving ? this.driving.group.position : this.player.group.position;
    const q = {
      kind, title: '', desc: '', reward: 0, total: 0, endsAt: 0, seconds: 1, gifts: [] as THREE.Group[], got: 0,
      stops: [] as { name: string; pos: THREE.Vector3 }[], stopIdx: 0, beacon: null as THREE.Group | null,
      rider: null as Bot | null, arrow: null as THREE.Mesh | null, item: null as string | null, need: 0,
      status: 'active' as const, finishedAt: 0, lastTick: 0,
    };
    const places = this.placeNames().filter((p) => p.pos.distanceTo(focus) > 35);
    let def;
    if (kind === 'hunt') {
      for (let i = 0; i < GIFT_TOTAL; i++) {
        // tucked away: pick a spot 30–130 m out, then nudge it next to the nearest tree/wall so it isn't in plain view
        let p = this.randomLandPoint(30, 130);
        for (let k = 0; k < 8 && Math.hypot(p.x - focus.x, p.z - focus.z) < 30; k++) p = this.randomLandPoint(30, 130);
        const gift = makeGift();
        gift.position.set(p.x, this.groundAt(p.x, p.z, p.y), p.z);
        gift.rotation.y = Math.random() * 6;
        // fuzzy hint centre for the map, offset up to 12 m so the circle doesn't give it away
        const a = Math.random() * Math.PI * 2, r = Math.random() * 12;
        gift.userData.hx = p.x + Math.cos(a) * r; gift.userData.hz = p.z + Math.sin(a) * r;
        const el = document.createElement('div'); el.className = 'pill gift'; el.textContent = '\u{1F4B0} \u20B9500';
        const label = new CSS2DObject(el); label.position.y = 1.8; label.visible = false; gift.add(label);
        this.scene.add(gift);
        q.gifts.push(gift);
      }
      q.total = GIFT_TOTAL;
      def = makeQuestDef('hunt', {});
    } else if (kind === 'race' && places.length >= 3) {
      const pick = [...places].sort(() => Math.random() - 0.5).slice(0, 3);
      q.stops = pick; q.total = 3;
      def = makeQuestDef('race', { stops: pick.map((p) => p.name) });
      this.setBeacon(q, pick[0].pos, 0x3fb7d9);
    } else if (kind === 'taxi' && places.length >= 1) {
      const rider = this.bots.filter((b) => !b.riding && !b.knocked).sort((a, b) => a.av.group.position.distanceTo(focus) - b.av.group.position.distanceTo(focus))[2] ?? this.bots[0];
      const dest = places[Math.floor(Math.random() * places.length)];
      q.rider = rider; q.stops = [dest]; q.total = 2;
      rider.wait = 9999; rider.walking = 0;               // they wait for you
      q.arrow = makeArrow(0xff4fd8); q.arrow.position.y = 3.6; rider.av.group.add(q.arrow);
      def = makeQuestDef('taxi', { rider: rider.name, place: dest.name });
    } else {
      const item = this.dest.collectibles[Math.floor(Math.random() * this.dest.collectibles.length)];
      q.item = item.name; q.need = 4; q.total = 4;
      def = makeQuestDef('collect', { item: item.name, count: 4 });
    }
    q.title = def.title; q.desc = def.desc; q.reward = def.reward; q.seconds = def.seconds; q.endsAt = t + def.seconds;
    this.quest = q;
    this.sfx.questStart();
    this.pushQuest(t, def.seconds);
  }

  private setBeacon(q: NonNullable<World['quest']>, pos: THREE.Vector3, color: number) {
    if (q.beacon) this.scene.remove(q.beacon);
    q.beacon = makeBeacon(color);
    q.beacon.position.set(pos.x, this.terrain.h(pos.x, pos.z), pos.z);
    this.scene.add(q.beacon);
  }

  private clearQuest() {
    const q = this.quest;
    if (!q) return;
    for (const g of q.gifts) this.scene.remove(g);
    if (q.beacon) this.scene.remove(q.beacon);
    if (q.arrow) q.arrow.parent?.remove(q.arrow);
    if (q.rider && q.rider.wait > 1000) q.rider.wait = 1;
    this.quest = null;
  }

  private finishQuest(ok: boolean) {
    const q = this.quest;
    if (!q || q.status !== 'active') return;
    q.status = ok ? 'done' : 'failed';
    q.finishedAt = this.elapsed;
    if (ok) {
      const bonus = Math.round(q.reward * Math.max(0, q.endsAt - this.elapsed) / q.seconds);
      const total = q.reward + bonus;   // finishing fast pays up to double
      this.points += total;
      this.ev.onPoints(this.points);
      this.ev.onCollect({ name: `${q.title} complete!`, points: total, color: 0xf2c31b, shape: 'gem' });
      this.sfx.questDone();
    } else {
      this.ev.onCollect({ name: `Time's up · ${q.title}`, points: 0, color: 0xd94a3d, shape: 'box' });
      this.sfx.questFail();
    }
    if (q.beacon) { this.scene.remove(q.beacon); q.beacon = null; }
    if (q.arrow) { q.arrow.parent?.remove(q.arrow); q.arrow = null; }
    if (q.rider && q.rider.wait > 1000) q.rider.wait = 1;
    for (const g of q.gifts) this.scene.remove(g);
    q.gifts = [];
    this.questCooldown = 10;
    this.pushQuest(this.elapsed, 0);
  }

  private questCollected(name: string) {
    const q = this.quest;
    if (q?.status === 'active' && q.kind === 'collect' && name === q.item) {
      q.got++;
      this.sfx.checkpoint();
      if (q.got >= q.need) this.finishQuest(true);
    }
  }

  private questDropped(b: Bot, v: Vehicle) {
    const q = this.quest;
    if (q?.status === 'active' && q.kind === 'taxi' && b === q.rider) {
      const d = v.group.position.distanceTo(q.stops[0].pos);
      if (d < 16) this.finishQuest(true);
      else this.ev.onCollect({ name: `${b.name} wanted ${q.stops[0].name}!`, points: 0, color: 0xd94a3d, shape: 'box' });
    }
  }

  private updateQuest(focus: THREE.Vector3, radius: number, dt: number, t: number) {
    if (this.wantQuest) { this.wantQuest = false; if (!this.quest || this.quest.status !== 'active') this.startQuest(); }
    const q = this.quest;
    if (!q || q.status !== 'active') {
      this.questCooldown -= dt;
      if (this.questCooldown <= 0) this.startQuest();
      return;
    }
    const left = q.endsAt - t;
    if (left <= 0) { this.finishQuest(false); return; }
    if (left < 10 && Math.floor(left) !== Math.floor(left + dt)) this.sfx.tick();

    if (q.kind === 'hunt') {
      for (const g of q.gifts) {
        if (!g.visible) continue;
        g.rotation.y += dt;
        const d = Math.hypot(g.position.x - focus.x, g.position.z - focus.z);
        (g.children.find((c) => c instanceof CSS2DObject) as CSS2DObject).visible = d < 18;
        if (d < radius + 0.6) {
          g.visible = false; q.got++;
          this.points += 20; this.ev.onPoints(this.points);
          this.ev.onCollect({ name: `\u20B9500 found · ${q.got} of ${q.total}`, points: 20, color: 0xf2c31b, shape: 'box' });
          this.sfx.checkpoint();
          if (q.got >= q.total) this.finishQuest(true);
        }
      }
    } else if (q.kind === 'race') {
      const stop = q.stops[q.stopIdx];
      if (q.beacon) (q.beacon.userData.ring as THREE.Mesh).scale.setScalar(1 + Math.sin(t * 4) * 0.15);
      if (Math.hypot(stop.pos.x - focus.x, stop.pos.z - focus.z) < 14) {
        q.stopIdx++;
        this.sfx.checkpoint();
        if (q.stopIdx >= q.stops.length) this.finishQuest(true);
        else { this.setBeacon(q, q.stops[q.stopIdx].pos, 0x3fb7d9); this.ev.onCollect({ name: `Checkpoint · next: ${q.stops[q.stopIdx].name}`, points: 0, color: 0x3fb7d9, shape: 'gem' }); }
      }
    } else if (q.kind === 'taxi' && q.rider) {
      if (q.arrow) q.arrow.position.y = 3.6 + Math.sin(t * 5) * 0.3;
      if (q.rider.riding && !q.beacon) this.setBeacon(q, q.stops[0].pos, 0xff4fd8);
      if (q.rider.knocked) { this.finishQuest(false); return; }
    }
    if (t - this.lastQuestPush > 0.25) this.pushQuest(t, left);
  }

  private pushQuest(t: number, left: number) {
    this.lastQuestPush = t;
    const q = this.quest;
    if (!q) { this.ev.onQuest(null); return; }
    let progress = '', hint: string | null = null;
    const from = this.driving ? this.driving.group.position : this.player.group.position;
    if (q.status !== 'active') {
      this.ev.onQuest({ status: q.status, title: q.title, desc: q.desc, progress: q.status === 'done' ? 'Nice one!' : 'Better luck next time', remaining: 0, total: q.seconds, reward: q.reward, hint: null });
      return;
    }
    const dist = (p: THREE.Vector3) => `${Math.round(Math.hypot(p.x - from.x, p.z - from.z))} m`;
    if (q.kind === 'hunt') progress = `${q.got} / ${q.total} bundles`;
    else if (q.kind === 'race') { progress = `${q.stopIdx} / ${q.total} checkpoints`; const s = q.stops[q.stopIdx]; if (s) hint = `${s.name} · ${dist(s.pos)}`; }
    else if (q.kind === 'taxi' && q.rider) { progress = q.rider.riding ? 'Passenger aboard' : `Pick up ${q.rider.name}`; hint = q.rider.riding ? `${q.stops[0].name} · ${dist(q.stops[0].pos)}` : `${q.rider.name} · ${dist(q.rider.av.group.position)}`; }
    else progress = `${q.got} / ${q.need} ${q.item}`;
    this.ev.onQuest({ status: q.status, title: q.title, desc: q.desc, progress, remaining: Math.max(0, left), total: q.seconds, reward: q.reward, hint });
  }

  /** Where you stand among everyone in the city right now (a smooth curve over points). */
  private pushRank() {
    const online = this.online || this.dest.explorers;
    const rank = 1 + Math.floor((online - 1) * Math.exp(-this.points / 2500));
    if (rank === this.lastRank) return;
    this.lastRank = rank;
    this.ev.onRank(rank, online);
  }

  private prompt(text: string | null, driving: boolean) {
    const key = `${driving}|${text ?? ''}`;
    if (key === this.lastPrompt) return;
    this.lastPrompt = key;
    this.ev.onPrompt(text, driving);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.sfx.dispose();
    for (const c of this.cleanup) c();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
    });
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
