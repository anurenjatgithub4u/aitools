import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Collectible, Destination } from './destinations';
import { makeTerrain, type Terrain } from './terrain';
import { makeAvatar, animateWalk, poseJump, poseSit, OUTFITS, SKINS, type Avatar } from './avatar';
import { buildLandmark, scatterDecor, makePickup } from './landmarks';
import { makeVehicle, VEHICLE_COLORS, type Vehicle, type VehicleKind } from './vehicles';
import { makeDog, makeCat, makeBird, makeBus, makePoliceJeep, type Animal, type Bird, type Traffic } from './life';

export interface WorldEvents {
  onPoints(total: number): void;
  onCollect(item: Collectible): void;
  onOnline(n: number): void;
  onNearest(name: string | null, dist: number): void;
  onPrompt(text: string | null, driving: boolean): void;
  onLift(text: string | null): void;
  onRun(on: boolean): void;
}

const BOT_NAMES = [
  'Aarav (Kochi)', 'Mia (Berlin)', 'Kenji (Osaka)', 'Sofia (Lisbon)', 'Liam (Toronto)', 'Zara (Dubai)',
  'Mateo (Lima)', 'Ananya (Chennai)', 'Noah (Sydney)', 'Fatima (Cairo)', 'Luca (Milan)', 'Hana (Seoul)',
  'Diego (Bogotá)', 'Priya (Bengaluru)', 'Omar (Amman)', 'Yuki (Kyoto)', 'Elena (Athens)', 'Ravi (Mumbai)',
];
const TUKTUK_WORLDS = new Set(['kochi', 'bengaluru', 'taj-mahal', 'pyramids-of-giza']);

// Collision volume taken from a landmark mesh. Cones use a circle footprint, everything else its box.
interface Blocker { box: THREE.Box3; radius?: number; cx: number; cz: number }
const STEP_UP = 0.9;      // how high a ledge the player can step onto
const HEAD = 1.7;         // anything starting above this is overhead and ignored
const LOW_PLATFORM = 2.6; // boxes this thin are walkable surfaces, taller ones are walls

interface Critter { a: Animal; target: THREE.Vector3; wait: number; walking: number; phase: number }
interface Road { t: Traffic; route: THREE.Vector3[]; i: number; dir: number; label: CSS2DObject }

interface Bot { av: Avatar; label: CSS2DObject; name: string; target: THREE.Vector3; speed: number; wait: number; walking: number; riding: Vehicle | null }
interface Pickup { mesh: THREE.Mesh; label: CSS2DObject; item: Collectible; active: boolean; respawnAt: number; baseY: number; phase: number }

const WORLD_RADIUS = 190;
const VEHICLE_OFFSETS: [number, number][] = [[-7, 3], [7, 8], [-12, -6], [13, -2]];
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
    private ev: WorldEvents,
    playerName: string,
    startPoints: number,
  ) {
    this.points = startPoints;
    this.terrain = makeTerrain(dest.terrain);

    const w = container.clientWidth, h = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 600);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    // phones: fewer pixels and a smaller shadow map keep the frame rate smooth
    this.mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.mobile ? 1.5 : 2));
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
    this.scene.fog = new THREE.Fog(theme.fog, 70, 260);

    this.scene.add(new THREE.HemisphereLight(theme.sky, theme.ground, 0.85));
    const sun = new THREE.DirectionalLight(theme.sun, 1.7);
    sun.position.set(70, 110, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -140; sc.right = sc.top = 140; sc.far = 400;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // ground
    const size = 440, segs = 110;
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
    const avoid = [{ x: px0, z: pz0, r: 16 }, ...VEHICLE_OFFSETS.map(([ox, oz]) => ({ x: px0 + ox, z: pz0 + oz, r: 5 }))];
    const decor = scatterDecor(this.dest, this.terrain, avoid);
    this.scene.add(landmark, decor);
    this.occluders = [landmark]; // decor is one baked mesh; raycasting it every frame is too costly
    this.decor = decor;
    landmark.traverse((o) => { if (o instanceof CSS2DObject) this.worldLabels.push(o); });
    this.collectBlockers(landmark);
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

  private randomLandPoint(min: number, max: number): THREE.Vector3 {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = rand(min, max);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (this.walkable(x, z)) return new THREE.Vector3(x, this.terrain.h(x, z), z);
    }
    return new THREE.Vector3(0, this.terrain.h(0, 0), 0);
  }

  private spawnBots() {
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, 12);
    names.forEach((name, i) => {
      const av = makeAvatar({ ...OUTFITS[(i + 1) % OUTFITS.length], skin: SKINS[i % SKINS.length] });
      const p = this.randomLandPoint(10, 90);
      av.group.position.copy(p);
      const el = document.createElement('div');
      el.className = 'tag';
      el.textContent = name;
      const label = new CSS2DObject(el); label.position.y = 2.7; av.group.add(label);
      this.scene.add(av.group);
      this.bots.push({ av, label, name: name.split(' (')[0], target: this.randomLandPoint(10, 110), speed: rand(1.8, 3.4), wait: 0, walking: 0, riding: null });
    });
  }

  private spawnPickups() {
    const items = this.dest.collectibles;
    for (let i = 0; i < 28; i++) {
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
    const kinds: VehicleKind[] = TUKTUK_WORLDS.has(this.dest.id) ? ['tuktuk', 'jeep', 'tuktuk', 'jeep'] : ['jeep', 'jeep', 'jeep', 'tuktuk'];
    kinds.forEach((kind, i) => {
      const [ox, oz] = VEHICLE_OFFSETS[i];
      let x = sx + ox, z = sz + oz;
      if (!this.walkable(x, z)) { const p = this.randomLandPoint(10, 40); x = p.x; z = p.z; }
      const v = makeVehicle(kind, VEHICLE_COLORS[(i * 2 + this.dest.name.length) % VEHICLE_COLORS.length]);
      v.heading = rand(0, Math.PI * 2);
      v.group.position.set(x, 0, z);
      this.settleVehicle(v);
      const el = document.createElement('div');
      el.className = 'pill vehicle';
      el.textContent = `🚗 ${v.spec.label}`;
      const label = new CSS2DObject(el); label.position.y = 3.2; v.group.add(label);
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
      const el = document.createElement('div');
      el.className = 'pill vehicle';
      el.textContent = t.label;
      const label = new CSS2DObject(el); label.position.y = 4; t.group.add(label);
      this.scene.add(t.group);
      this.roads.push({ t, route, i: 0, dir: 1, label });
    }
  }

  // ---------- input ----------
  private bindInput() {
    const el = this.renderer.domElement;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); if (!e.repeat) this.wantJump = true; }
      if (k === 'e' && !e.repeat) this.wantToggleDrive = true;
      if (k === 'f' && !e.repeat) this.wantLift = true;
      this.keys.add(k);
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
    addEventListener('keydown', down); addEventListener('keyup', up);
    this.cleanup.push(() => { removeEventListener('keydown', down); removeEventListener('keyup', up); });

    const pd = (e: PointerEvent) => {
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
  private runMode = false;
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
      if (b.riding) continue;
      const d = b.av.group.position.distanceTo(vp);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  private seatsFor(v: Vehicle): THREE.Vector3[] {
    return v.spec.kind === 'jeep'
      ? [new THREE.Vector3(0.55, 1.05, -0.2), new THREE.Vector3(-0.55, 1.05, -1.3), new THREE.Vector3(0.55, 1.05, -1.3)]
      : [new THREE.Vector3(-0.4, 1.15, -0.9), new THREE.Vector3(0.4, 1.15, -0.9)];
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
    poseSit(b.av);
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
      b.riding = null; b.wait = 2; b.target = this.randomLandPoint(8, 120);
      this.points += 30;
      this.ev.onCollect({ name: `Lift for ${b.name}`, points: 30, color: 0xe8c46a, shape: 'gem' });
    });
    this.ev.onPoints(this.points);
    this.passengers.set(v, []);
  }

  private enterVehicle(v: Vehicle) {
    this.driving = v;
    this.airY = 0; this.vy = 0;
    this.scene.remove(this.player.group);
    v.group.add(this.player.group);
    this.player.group.position.copy(v.seat);
    this.player.group.rotation.set(0, 0, 0);
    poseSit(this.player);
  }

  private exitVehicle() {
    const v = this.driving!;
    if (this.passengers.get(v)?.length) this.dropPassengers(v);
    this.driving = null;
    v.speed = 0;
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
  }

  // ---------- loop ----------
  start() {
    this.clock.start();
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
      const throttle = Math.min(1, Math.max(-1, iz));
      if (throttle > 0) v.speed += s.accel * throttle * dt;
      else if (throttle < 0) v.speed += (v.speed > 0.5 ? -22 : s.accel * throttle * 0.6) * dt; // brake, then reverse
      else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 6 * dt);
      if (k.has(' ')) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 30 * dt);
      v.speed = THREE.MathUtils.clamp(v.speed, -s.reverse, s.maxSpeed);
      const steer = -Math.min(1, Math.max(-1, ix));
      v.heading += steer * s.turn * dt * THREE.MathUtils.clamp(v.speed / 8, -1, 1);

      const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
      const vp = v.group.position;
      const nx = vp.x + fx * v.speed * dt, nz = vp.z + fz * v.speed * dt;
      if (this.walkable(nx, nz, vp.y)) { vp.x = nx; vp.z = nz; } else v.speed *= -0.3;
      this.settleVehicle(v);
      for (const w of v.wheels) w.rotation.x += (v.speed * dt) / 0.5;

      // camera drifts in behind the vehicle unless the user is dragging
      if (!this.look) this.yaw += wrapAngle(v.heading + Math.PI - this.yaw) * Math.min(1, dt * 2.5);
      this.dist += (14 - this.dist) * Math.min(1, dt * 2);

      focus = vp.clone().add(new THREE.Vector3(0, 2.2, 0));
      focusRadius = 3;
      const speedKmh = Math.round(Math.abs(v.speed) * 3.6);
      this.prompt(`${s.label} · ${speedKmh} km/h · W/S drive · A/D steer · E to get out`, true);

      const aboard = this.passengers.get(v) ?? [];
      const walker = Math.abs(v.speed) < 4 && aboard.length < this.seatsFor(v).length ? this.nearestWalker() : null;
      if (this.wantLift) {
        if (walker) this.boardBot(v, walker);
        else if (aboard.length) this.dropPassengers(v);
      }
      this.liftPrompt(walker ? `Press F to give ${walker.name} a lift` : aboard.length ? `${aboard.map((b) => b.name).join(', ')} aboard · F to drop off (+30 each)` : null);
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
      if (this.wantJump && this.airY <= 0) this.vy = JUMP_SPEED;
      this.wantJump = false;
      if (this.airY > 0 || this.vy > 0) {
        this.vy -= GRAVITY * dt;
        this.airY = Math.max(0, this.airY + this.vy * dt);
        if (this.airY === 0) this.vy = 0;
      }
      const ground = this.groundAt(p.x, p.z, p.y - this.airY);
      const drop = p.y - this.airY - ground;
      if (drop > 0.05 && this.airY <= 0) this.airY = drop;   // walked off a ledge: fall
      p.y = ground + this.airY;
      if (this.airY > 0) poseJump(this.player); else animateWalk(this.player, t, moving);

      focus = p.clone().add(new THREE.Vector3(0, 1.7, 0));
      const near = this.nearestVehicle();
      this.prompt(near ? `Press E to drive the ${near.spec.label}` : null, false);
      this.liftPrompt(null);
    }
    this.wantLift = false;

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

    // --- bots wander
    for (const b of this.bots) {
      if (b.riding) { b.label.visible = true; continue; }
      const bp = b.av.group.position;
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
      b.label.visible = bp.distanceToSquared(focus) < 70 * 70;
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
      pk.label.visible = d < 45;
      if (d < nd) { nd = d; nearest = pk; }
      if (d < focusRadius && this.airY < 1.2) {
        pk.active = false; pk.mesh.visible = false; pk.respawnAt = t + 12;
        this.points += pk.item.points;
        this.ev.onPoints(this.points);
        this.ev.onCollect(pk.item);
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
      r.label.visible = gp.distanceToSquared(focus) < 60 * 60;
    }

    // --- world labels + metro train
    const wp = new THREE.Vector3();
    for (const l of this.worldLabels) l.visible = l.getWorldPosition(wp).distanceToSquared(focus) < (l.userData.range as number) ** 2;
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
      this.ev.onOnline(this.dest.explorers + Math.round(Math.random() * 40 - 20));
    }

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
  private static MAP_SPAN = 400; // world units across the map

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

  private prompt(text: string | null, driving: boolean) {
    const key = `${driving}|${text ?? ''}`;
    if (key === this.lastPrompt) return;
    this.lastPrompt = key;
    this.ev.onPrompt(text, driving);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
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
