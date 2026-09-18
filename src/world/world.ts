import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Collectible, Destination } from './destinations';
import { makeTerrain, type Terrain } from './terrain';
import { makeAvatar, animateWalk, poseJump, poseSit, poseRide, OUTFITS, FEMALE_OUTFITS, SKINS, type Avatar, type AvatarStyle } from './avatar';
import { store } from './store';
import { buildLandmark, scatterDecor, makePickup } from './landmarks';
import { makeVehicle, VEHICLE_COLORS, FUEL_RANGE, BOOST_MULT, type Vehicle, type VehicleKind } from './vehicles';
import { makePetrolStation } from './landmarks';
import { Sfx } from './audio';
import { reply as chatReply, HELLO_WHEN_NEAR, HANGOUT_LINES, RACE_TRASH, RACE_GG, DATE_LINES, GIFT_THANKS, POOL_TALK } from './chat';
import { createPool, POOL, POOL_COLORS, POOL_POCKETS, isStripe, type PoolGame } from './poolEngine';
import { createCarrom, CARROM, type CarromGame } from './carromEngine';
import { bakeStatic } from './bake';
import { makeQuestDef, makeGift, makeBeacon, makeArrow, GIFT_TOTAL, type QuestKind, type QuestState } from './quests';
import { makeDog, makeCat, makeBird, makeBus, makePoliceJeep, type Animal, type Bird, type Traffic } from './life';
import { createTransport, type Transport, type NetMsg, type Gender } from './net';

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
  onHurt(): void;
  onHearts(): void;
  onPick(p: { title: string; sub?: string; options: string[] } | null, choose?: (i: number) => void): void;
  onMode(action: { icon: string; label: string; button?: boolean; arrows?: boolean; pace?: boolean } | null): void;
  onMeet(m: { name: string; friend: boolean; real: boolean } | null): void;
  onChat(from: string, text: string, mine: boolean): void;
  onFriendRequest(req: { id: string; name: string } | null): void;
  onNet(status: 'connecting' | 'online' | 'offline', kind: 'ws' | 'local'): void;
  onGame(kind: GameKind, opponent: string): void;
}
export type GameKind = 'pool' | 'chess' | 'ludo' | 'carrom' | 'race' | 'football' | 'cricket';
export type MeetAction = 'friend' | 'hangout' | 'chat' | 'race' | 'hunt' | 'zombies' | 'gift' | 'casino' | GameKind;

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

// An in-world circuit race on the FindurAI Speedway: your car plus three AI cars, three laps.
interface RaceCar { car: Vehicle; bot: Bot | null; name: string; idx: number; lap: number; prog: number; done: number; skill: number; lane: number; you: boolean; nitroUntil: number; nitroAt: number }
// Football at City Stadium: you + a team-mate against two rivals, one ball, two goals, 90 seconds.
interface Footballer { bot: Bot | null; team: 0 | 1; home: THREE.Vector3; slot: [number, number]; gk: boolean; kicked: number; bib: THREE.Mesh }
interface MatchState { side: Footballer[]; ball: THREE.Mesh; vel: THREE.Vector3; score: [number, number]; endAt: number; pause: number; over: boolean; opp: string; mates: string; rivals: string; started: number; lastKick: Footballer | null }
// formation slots relative to the centre spot for the side attacking +x (mirrored for the other side): captain, keeper, two backs, a winger
const FORMATION: [number, number][] = [[-6, 0], [-25, 0], [-16, -9], [-16, 9], [-6, 12]];
const MATCH_SECONDS = 90;
// Cricket: the bowler runs in, you time the shot. 12 balls, 3 wickets, beat the target.
type CricketPhase = 'ready' | 'runup' | 'flight' | 'hit' | 'result' | 'over';
interface CricketState { phase: CricketPhase; t0: number; ball: THREE.Mesh; vel: THREE.Vector3; opp: Bot; fielders: { bot: Bot; home: THREE.Vector3 }[]; chaser: Bot | null; runs: number; wkts: number; balls: number; total: number; target: number; bat: THREE.Group; swingAt: number; note: string; hit: boolean; airborne: boolean; bounced: boolean; line: number; flightT: number; stumps: THREE.Object3D | null; last: string; innings: 1 | 2; first: number; released: number; quality: number; decided: boolean; maxWkts: number; aim: number; pace: 0 | 1 | 2 }
// Zombie night: waves of the undead shamble toward the player; punch them, crush them with a car, don't get bitten.
type ZombieKind = 'walker' | 'runner' | 'crawler' | 'brute' | 'headless' | 'hopper' | 'bloater';
interface Zombie { av: Avatar; kind: ZombieKind; hp: number; speed: number; dying: number; hitAt: number; groan: number; head: THREE.Object3D | null; limp: boolean; tilt: number; sway: number; arms: number; twitchAt: number; runner: boolean; hop: { t0: number; fx: number; fz: number; tx: number; tz: number } | null; hopAt: number; belly: THREE.Mesh | null }
interface ZombieState { list: Zombie[]; wave: number; hp: number; kills: number; breather: number; punchAt: number; fade: number; ending: boolean; blasts: { mesh: THREE.Mesh; t0: number }[]; nextSpawn: number }
// Who they were before: office worker, chef, cop, patient, jogger, builder, bride, nurse, student, party girl…
interface ZombieLook { style: AvatarStyle; prop?: 'tie' | 'chef' | 'gown' | 'hivis' | 'veil' | 'nursecap' | 'tiara' | 'apron' | 'party' | 'bandage' }
const ZOMBIE_SKINS = [0x8fbf6a, 0x9ccc7a, 0x7fb060, 0xa6d38a, 0x8f9a8a, 0x9d8fb0, 0xb7c9a0, 0x7f8f6a];
const ZOMBIE_LOOKS: ZombieLook[] = [
  { style: { shirt: 0xd8d8d8, pants: 0x2b2b2b, hair: 0x1a1a1a, hat: 'none' }, prop: 'tie' },              // office
  { style: { shirt: 0xf0f0f0, pants: 0x3a3a3a, hair: 0x3a2a1a, hat: 'none' }, prop: 'chef' },
  { style: { shirt: 0x2c3e6b, pants: 0x1f2a44, hair: 0x2a2a2a, hat: 'cap' } },                              // cop
  { style: { shirt: 0xd8e2f0, pants: 0xd8e2f0, hair: 0x555555, hat: 'none' }, prop: 'gown' },              // patient
  { style: { shirt: 0x3fb7d9, pants: 0x1a1a1a, hair: 0x6b4a2a, hat: 'none' }, prop: 'bandage' },           // jogger
  { style: { shirt: 0xf2c31b, pants: 0x4a4a4a, hair: 0x1a1a1a, hat: 'none' }, prop: 'hivis' },             // builder
  { style: { shirt: 0x4a5a3a, pants: 0x3a3330, hair: 0x1a1a1a, hat: 'none' } },                             // just a guy
  { style: { shirt: 0xf6f2ea, pants: 0xf6f2ea, hair: 0x3a2a1a, hat: 'none', female: true }, prop: 'veil' },   // bride
  { style: { shirt: 0xe6f2f6, pants: 0x3fb7d9, hair: 0x1a1a1a, hat: 'none', female: true }, prop: 'nursecap' },
  { style: { shirt: 0xffffff, pants: 0x6b1f3a, hair: 0x1a1a1a, hat: 'none', female: true } },              // student
  { style: { shirt: 0xe75480, pants: 0xe75480, hair: 0x6b4a2a, hat: 'none', female: true }, prop: 'party' },
  { style: { shirt: 0xf4f4f4, pants: 0x2b2b2b, hair: 0x2a2a2a, hat: 'none', female: true }, prop: 'tie' },   // office
  { style: { shirt: 0xff7ab8, pants: 0x2b2b2b, hair: 0xb5651d, hat: 'none', female: true }, prop: 'bandage' },
  { style: { shirt: 0x9d8fb0, pants: 0x3a3330, hair: 0x555555, hat: 'none', female: true }, prop: 'apron' },   // grandma from the bakery
];
const dirty = (c: number) => new THREE.Color(c).multiplyScalar(0.55 + Math.random() * 0.25).offsetHSL(0, -0.2, 0).getHex();
const zmesh = (geo: THREE.BufferGeometry, c: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...extra }));
const put = (m: THREE.Mesh, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };
/** Rot, wounds and whatever they were wearing when it happened. */
function dressZombie(av: Avatar, look: ZombieLook, head: THREE.Object3D | null) {
  const body = av.body, skin = av.group.userData.skin as number;
  if (head) {
    for (const sx of [-1, 1]) head.add(put(zmesh(new THREE.BoxGeometry(0.15, 0.14, 0.02), 0x1a1210), sx * 0.13, 0.33, 0.295));   // sunken sockets
    head.add(put(zmesh(new THREE.BoxGeometry(0.34, 0.12, 0.28), skin), 0, 0.06, 0.06, 0.55));                                      // jaw hanging open
    head.add(put(zmesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), 0x5a0d0d), 0.04, 0.13, 0.31));                                       // blood at the mouth
    if (Math.random() < 0.5) head.add(put(zmesh(new THREE.BoxGeometry(0.16, 0.12, 0.03), 0xe8e0c8), rand(-0.2, 0.2), rand(0.35, 0.55), 0.29));   // skull showing
  }
  // torn hem and wounds
  for (let k = 0; k < 3; k++) body.add(put(zmesh(new THREE.BoxGeometry(0.1, rand(0.2, 0.4), 0.02), dirty(look.style.shirt)), rand(-0.3, 0.3), -0.1, 0.23 + k * 0.005, 0, 0, rand(-0.3, 0.3)));
  for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) body.add(put(zmesh(new THREE.BoxGeometry(rand(0.1, 0.25), rand(0.1, 0.25), 0.03), 0x5a0d0d), rand(-0.3, 0.3), rand(0.1, 0.75), 0.23));
  if (Math.random() < 0.4) (Math.random() < 0.5 ? av.legL : av.legR).add(put(zmesh(new THREE.BoxGeometry(0.12, 0.2, 0.05), 0xe8e0c8), rand(-0.05, 0.05), -0.4, 0.15));   // bone through the trouser
  const r = Math.random();
  if (r < 0.25) av.armL.visible = false;                                                                                                        // lost an arm
  else if (r < 0.45) { av.armR.scale.y = 0.55; av.armR.add(put(zmesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), 0x5a0d0d), 0, -0.72, 0)); }        // or a hand
  switch (look.prop) {
    case 'tie': body.add(put(zmesh(new THREE.BoxGeometry(0.07, 0.42, 0.02), 0x8a1a1a), 0.02, 0.5, 0.235)); break;
    case 'chef': if (head) head.add(put(zmesh(new THREE.CylinderGeometry(0.28, 0.22, 0.5, 10), 0xf4f4f4), 0, 0.82, 0, 0, 0, rand(-0.3, 0.3))); body.add(put(zmesh(new THREE.BoxGeometry(0.6, 0.5, 0.03), 0xf0f0f0), 0, 0.05, 0.235)); break;
    case 'gown': body.add(put(zmesh(new THREE.BoxGeometry(0.8, 0.14, 0.03), 0xb8c8dc), 0, 0.62, 0.235)); body.add(put(zmesh(new THREE.BoxGeometry(0.16, 0.5, 0.02), 0xf4f4f4), 0.28, 0.4, 0.24)); break;
    case 'hivis': for (const y of [0.3, 0.55]) body.add(put(zmesh(new THREE.BoxGeometry(0.8, 0.07, 0.02), 0xdedede, { emissive: 0xaaaaaa, emissiveIntensity: 0.6 }), 0, y, 0.24)); if (head) head.add(put(zmesh(new THREE.ConeGeometry(0.42, 0.95, 8), 0xff7a1a), 0, 0.95, 0, 0, 0, rand(-0.4, 0.4))); break;
    case 'veil': if (head) { head.add(put(zmesh(new THREE.PlaneGeometry(0.9, 1.3), 0xffffff, { transparent: true, opacity: 0.45, side: THREE.DoubleSide }), 0, 0.1, -0.32, 0.15)); head.add(put(zmesh(new THREE.TorusGeometry(0.28, 0.03, 6, 16), 0xe8d59a, { emissive: 0x6a5a20, emissiveIntensity: 0.5 }), 0, 0.6, 0, Math.PI / 2)); } body.add(put(zmesh(new THREE.SphereGeometry(0.12, 8, 6), 0xf4c6cc), 0.28, 0.3, 0.26)); break;   // + a bouquet
    case 'nursecap': if (head) { head.add(put(zmesh(new THREE.BoxGeometry(0.34, 0.14, 0.26), 0xffffff), 0, 0.66, 0.02)); head.add(put(zmesh(new THREE.BoxGeometry(0.12, 0.04, 0.03), 0xd94a3d), 0, 0.7, 0.16)); head.add(put(zmesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), 0xd94a3d), 0, 0.7, 0.16)); } break;
    case 'party': for (let k = 0; k < 10; k++) body.add(put(zmesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), [0xfff2a8, 0x7ad7ff, 0xa6ff7a][k % 3], { emissive: 0x666666, emissiveIntensity: 0.8 }), rand(-0.34, 0.34), rand(0.05, 0.8), 0.235)); break;
    case 'apron': body.add(put(zmesh(new THREE.BoxGeometry(0.62, 0.7, 0.03), 0xe8e8e0), 0, 0.15, 0.235)); break;
    case 'bandage': if (head) head.add(put(zmesh(new THREE.BoxGeometry(0.64, 0.12, 0.62), 0xf0ead8), 0, rand(0.2, 0.45), 0, rand(-0.2, 0.2), 0, rand(-0.2, 0.2))); break;
    case 'tiara': break;
  }
}
// Date spots: benches, a candle table, the Ferris wheel, the boat. Read from the city.
interface Spot { id: string; kind: string; label: string; x: number; z: number; y: number; ry: number; seats: [number, number][]; face?: boolean }
// The Neon Palace: dance floor, lasers and two real pool tables.
interface Casino { x: number; z: number; w: number; d: number; floor: { x: number; z: number; w: number; d: number }; tables: { x: number; z: number; ry: number; y: number }[]; carrom: { x: number; z: number; y: number }[] }
interface CarromState { game: CarromGame; board: { x: number; z: number; y: number }; opp: Bot; coins: THREE.Mesh[]; strikerMesh: THREE.Mesh; aimLine: THREE.Mesh; phase: 'slide' | 'aim' | 'power'; aim: number; power: number; over: boolean; endAt: number; status: string; botAim: { until: number } | null; lastHud: number }
const CARROM_SCALE = 1.0 / CARROM.W;   // board units → metres (a 1 m board)
interface Dancer { av: Avatar; phase: number; style: number }
interface PoolState { game: PoolGame; table: Casino['tables'][number]; opp: Bot; meshes: THREE.Mesh[]; cueStick: THREE.Mesh; aimLine: THREE.Mesh; aim: number; power: number; charging: boolean; status: string; over: boolean; endAt: number; botAim: { angle: number; until: number } | null; lastHud: number }
const POOL_SCALE = 2.9 / POOL.W;   // table units → metres
interface DateState { spot: Spot; partner: Bot | null; t0: number; nextLine: number; gondola: THREE.Object3D | null; boatA: number; rewarded: boolean; giftAt: number }
const GIFTS: { e: string; n: string }[] = [{ e: '🌹', n: 'Rose' }, { e: '🍦', n: 'Ice cream' }, { e: '☕', n: 'Chai' }, { e: '🧸', n: 'Teddy' }, { e: '🍫', n: 'Chocolate' }, { e: '💌', n: 'Love note' }];
const RIDE_SECONDS = 60;
interface RaceState { cars: RaceCar[]; countdown: number; laps: number; finished: number; over: boolean; t0: number; endAt: number; opp: string; guide: THREE.Mesh[]; wrongWay: number }

interface Bot { av: Avatar; label: CSS2DObject; name: string; female: boolean; target: THREE.Vector3; speed: number; wait: number; walking: number; riding: Vehicle | null; knocked: Knock | null; playing?: boolean; friend: boolean; asked: number; reply: { at: number; yes: boolean } | null; greeted: number; bubbleUntil: number; remote?: Remote }
// A real player elsewhere on the network: we get their state a few times a second and glide between updates.
interface Remote { id: string; tx: number; tz: number; ry: number; w: number; j: number; v: string; h: number; lastSeen: number; car: Vehicle | null }
const NET_RATE = 1 / 8;
// A pedestrian that has been hit: flies with `vel`, then lies on the ground for a moment before getting up.
interface Knock { vel: THREE.Vector3; airborne: boolean; down: number; spin: number }
interface Pickup { mesh: THREE.Mesh; label: CSS2DObject; item: Collectible; active: boolean; respawnAt: number; baseY: number; phase: number }

const WORLD_RADIUS = 560;
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
  private player!: Avatar;
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
  private circuit: { pts: THREE.Vector3[]; width: number; pads: { x: number; z: number; ang: number; cool: number }[] } | null = null;
  private padBurst = 0;   // seconds of boost-pad speed left
  private race: RaceState | null = null;
  private field: { x: number; z: number; w: number; d: number; goal: number; goalH: number } | null = null;
  private match: MatchState | null = null;
  private zombies: ZombieState | null = null;
  private cricket: CricketState | null = null;
  private oval: { x: number; z: number; r: number; len: number } | null = null;
  private wantKick = false;
  private batDir = 0;   // ◀ ▶ held: shuffle across the crease (batting) or aim the line (bowling)
  private paceKey = false;
  private lastCricketHud = 0;
  private hemi!: THREE.HemisphereLight;
  private daylight = { sky: 0, fog: 0, sun: 0, sunI: 1.7, hemiI: 0.85, near: 90, far: 360 };
  private lastZombieHud = 0;
  private landmarkData: Record<string, unknown> = {};
  private landmarkRoot: THREE.Object3D | null = null;
  private lastMatchHud = 0;
  private raceLock = false;
  private lastRaceHud = 0;
  private meet: Bot | null = null;
  private lastMeet = '';
  private hangout: { bot: Bot; until: number; nextLine: number } | null = null;
  private spots: Spot[] = [];
  private date: DateState | null = null;
  private wheel: THREE.Group | null = null;
  private dateBoat: THREE.Group | null = null;
  private giftAt = new Map<string, number>();
  private sunsetK = 0;
  private casino: Casino | null = null;
  private dancers: Dancer[] = [];
  private dancing: { partner: Bot | null; t0: number; rewarded: boolean; nextLine: number } | null = null;
  private pool: PoolState | null = null;
  private carrom: CarromState | null = null;
  private clubK = 0;
  private inClub = false;
  private pending: { at: number; bot: Bot; text: string }[] = [];
  private playerName = 'Explorer';
  private selfId = '';
  private gender: Gender = 'm';
  private net: Transport | null = null;
  private lastNetSend = 0;
  private lastOnlineCount = -1;
  private pendingRequests = new Map<string, string>();   // id -> name of people who asked to be friends
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
    identity?: { id: string; gender: Gender },
  ) {
    this.points = startPoints;
    this.playerName = playerName;
    this.selfId = identity?.id ?? store.id();
    this.gender = identity?.gender ?? (store.gender() ?? 'm');
    const inner = ev.onPoints.bind(ev);
    this.ev = { ...ev, onPoints: (n) => { inner(n); this.pushRank(); } };
    this.terrain = makeTerrain(dest.terrain);

    const w = container.clientWidth, h = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 900);

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

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h); this.labels.setSize(w, h);
    };
    addEventListener('resize', onResize);
    this.cleanup.push(() => removeEventListener('resize', onResize));
  }

  /** Build the city in stages, yielding to the browser between them so the splash can keep painting progress. */
  async build(onProgress?: (fraction: number, label: string) => void) {
    const steps: [string, () => void][] = [
      ['Laying out the streets…', () => this.buildEnvironment()],
      ['Waking up the explorers…', () => { this.player = this.spawnPlayer(this.playerName); this.spawnBots(); this.spawnDancers(); }],
      ['Hiding the treats…', () => { this.spawnPickups(); this.spawnVehicles(); }],
      ['Letting the dogs out…', () => { this.spawnLife(); this.bindInput(); }],
      ['Connecting to the city…', () => this.connect()],
    ];
    for (let i = 0; i < steps.length; i++) {
      onProgress?.(i / steps.length, steps[i][0]);
      await new Promise((r) => setTimeout(r, 30));   // let the progress text paint
      steps[i][1]();
    }
    onProgress?.(1, 'Ready');
  }

  // ---------- realtime: real people in the same city ----------
  private connect() {
    const net = createTransport(this.dest.id, { id: this.selfId, name: this.playerName, gender: this.gender });
    this.net = net;
    net.onStatus((s) => { this.ev.onNet(s, net.kind); if (s === 'online') net.send({ t: 'hi', id: this.selfId, n: this.playerName, g: this.gender }); });
    net.onMessage((m) => this.onNet(m));
    net.send({ t: 'hi', id: this.selfId, n: this.playerName, g: this.gender });
    const tick = setInterval(() => { if (this.player) net.send(this.statePacket()); }, NET_RATE * 1000);
    this.cleanup.push(() => clearInterval(tick));
    this.countOnline();
    const bye = () => net.send({ t: 'bye', id: this.selfId });
    addEventListener('pagehide', bye);
    this.cleanup.push(() => { bye(); removeEventListener('pagehide', bye); net.close(); });
  }

  private statePacket(): NetMsg {
    const v = this.driving;
    const p = v ? v.group.position : this.player.group.position;
    return { t: 's', id: this.selfId, n: this.playerName, g: this.gender, x: +p.x.toFixed(2), z: +p.z.toFixed(2), ry: +this.player.group.rotation.y.toFixed(2), w: +this.moveAmount.toFixed(2), j: +this.airY.toFixed(2), v: v ? v.spec.kind : '', h: v ? +v.heading.toFixed(2) : 0, ts: Date.now() };
  }

  private onNet(m: NetMsg) {
    if ('id' in m && m.id === this.selfId) return;
    switch (m.t) {
      case 'who': for (const p of m.peers) if (p.id !== this.selfId) this.onNet(p); break;
      case 'hi': {
        // someone new: answer with our state, and show them at the spawn until their first packet arrives
        this.net?.send(this.statePacket());
        if (!this.bots.some((x) => x.remote?.id === m.id)) { const [sx, sz] = this.spawnPoint(); this.upsertPeer({ t: 's', id: m.id, n: m.n, g: m.g, x: sx, z: sz, ry: 0, w: 0, j: 0, v: '', h: 0, ts: Date.now() }); }
        break;
      }
      case 's': this.upsertPeer(m); break;
      case 'bye': { const b = this.bots.find((x) => x.remote?.id === m.id); if (b) this.removePeer(b); break; }
      case 'c': {
        const b = this.bots.find((x) => x.remote?.id === m.id);
        this.ev.onChat(m.n, m.text, false);
        if (b) { b.bubbleUntil = this.elapsed + 4.5; b.label.element.textContent = `${b.name}: ${m.text}`; b.label.element.classList.add('talk'); b.label.visible = true; }
        break;
      }
      case 'f': if (m.to === this.selfId) { this.pendingRequests.set(m.id, m.n); this.ev.onFriendRequest({ id: m.id, name: m.n }); this.sfx.checkpoint(); } break;
      case 'g': if (m.to === this.selfId) {
        store.receiveGift(m.n, m.gift);
        this.points += 5; this.ev.onPoints(this.points);
        this.ev.onCollect({ name: `${m.n} sent you ${m.gift}`, points: 5, color: 0xe75480, shape: 'gem' });
        this.ev.onHearts(); this.sfx.questDone();
        const b = this.bots.find((x) => x.remote?.id === m.id); if (b) this.showGift(b, m.gift);
      } break;
      case 'inv': if (m.to === this.selfId) {
        const label = m.kind === 'casino' ? `${m.n} is heading to the Neon Palace — come?` : `${m.n} wants you to join them: ${this.spots.find((s) => s.id === m.kind)?.label ?? 'a date spot'}`;
        this.ev.onPick({ title: label, sub: 'You will be taken there.', options: ['Go 💖', 'Not now'] }, (i) => { if (i === 0) { if (this.driving) this.exitVehicle(); this.player.group.position.set(m.x, this.groundAt(m.x, m.z, this.terrain.h(m.x, m.z)), m.z); this.airY = 0; } });
        this.sfx.checkpoint();
      } break;
      case 'fa': if (m.to === this.selfId) {
        const b = this.bots.find((x) => x.remote?.id === m.id);
        store.addFriend(m.n);
        if (b) this.markFriend(b);
        this.points += 25; this.ev.onPoints(this.points);
        this.ev.onCollect({ name: `${m.n} accepted! You're friends now`, points: 25, color: 0xe75480, shape: 'gem' });
        this.ev.onFriends(store.friends().length);
        this.sfx.questDone();
      } break;
    }
  }

  private upsertPeer(m: Extract<NetMsg, { t: 's' }>) {
    let b = this.bots.find((x) => x.remote?.id === m.id);
    if (!b) {
      const hash = [...m.id].reduce((a, c) => a + c.charCodeAt(0), 0);
      const av = makeAvatar({ ...(m.g === 'f' ? FEMALE_OUTFITS[hash % FEMALE_OUTFITS.length] : OUTFITS[hash % OUTFITS.length]), skin: SKINS[hash % SKINS.length] });
      av.group.position.set(m.x, this.groundAt(m.x, m.z, 0), m.z);
      const friend = store.friends().includes(m.n);
      const el = document.createElement('div');
      el.className = 'tag peer' + (friend ? ' friend' : '');
      const text = (friend ? '\u{1F91D} ' : '') + m.n;
      el.textContent = text;
      const label = new CSS2DObject(el); label.position.y = 2.7; label.userData.orig = text; av.group.add(label);
      this.scene.add(av.group);
      b = { av, label, name: m.n, female: m.g === 'f', target: new THREE.Vector3(), speed: 0, wait: 0, walking: 0, riding: null, knocked: null, friend, asked: -99, reply: null, greeted: -99, bubbleUntil: 0,
        remote: { id: m.id, tx: m.x, tz: m.z, ry: m.ry, w: m.w, j: m.j, v: '', h: m.h, lastSeen: Date.now(), car: null } };
      this.bots.push(b);
      this.ev.onCollect({ name: `${m.n} joined the city`, points: 0, color: 0x3fb7d9, shape: 'gem' });
      this.sfx.collect(0);
    }
    const r = b.remote!;
    r.tx = m.x; r.tz = m.z; r.ry = m.ry; r.w = m.w; r.j = m.j; r.h = m.h; r.lastSeen = Date.now();
    if (m.v !== r.v) this.setPeerVehicle(b, m.v as VehicleKind | '');
    this.countOnline();
  }

  private setPeerVehicle(b: Bot, kind: VehicleKind | '') {
    const r = b.remote!;
    if (r.car) { r.car.group.remove(b.av.group); this.scene.remove(r.car.group); this.scene.add(b.av.group); b.av.group.position.set(r.tx, this.groundAt(r.tx, r.tz, 0), r.tz); r.car = null; }
    r.v = kind;
    if (!kind) { b.av.armL.rotation.x = b.av.armR.rotation.x = 0; b.av.legL.rotation.z = b.av.legR.rotation.z = 0; return; }
    const car = makeVehicle(kind, VEHICLE_COLORS[[...r.id].reduce((a, c) => a + c.charCodeAt(0), 0) % VEHICLE_COLORS.length]);
    car.group.position.set(r.tx, this.groundAt(r.tx, r.tz, 0), r.tz);
    car.heading = r.h;
    this.scene.remove(b.av.group);
    car.group.add(b.av.group);
    b.av.group.position.copy(car.seat); b.av.group.rotation.set(0, 0, 0);
    if (car.spec.ride) poseRide(b.av); else poseSit(b.av);
    this.scene.add(car.group);
    r.car = car;
  }

  private removePeer(b: Bot) {
    const r = b.remote!;
    if (r.car) { this.scene.remove(r.car.group); } else this.scene.remove(b.av.group);
    this.bots.splice(this.bots.indexOf(b), 1);
    if (this.meet === b) { this.meet = null; this.lastMeet = ''; this.ev.onMeet(null); }
    if (this.hangout?.bot === b) this.hangout = null;
    this.ev.onCollect({ name: `${b.name} left the city`, points: 0, color: 0x999999, shape: 'box' });
    this.countOnline();
  }

  private countOnline() {
    const n = 1 + this.bots.filter((b) => b.remote).length;
    if (n !== this.lastOnlineCount) { this.lastOnlineCount = n; this.online = n; this.ev.onOnline(n); this.pushRank(); }
  }

  /** Move a real player's avatar toward their last reported position. */
  private updatePeer(b: Bot, dt: number, t: number) {
    const r = b.remote!;
    if (Date.now() - r.lastSeen > 15000) { this.removePeer(b); return; }
    const k = Math.min(1, dt * 9);
    if (r.car) {
      const vp = r.car.group.position;
      vp.x += (r.tx - vp.x) * k; vp.z += (r.tz - vp.z) * k;
      r.car.heading += wrapAngle(r.h - r.car.heading) * k;
      this.settleVehicle(r.car);
      const sp = Math.hypot(r.tx - vp.x, r.tz - vp.z);
      for (const w of r.car.wheels) w.rotation.x += sp * dt * 4;
    } else {
      const bp = b.av.group.position;
      bp.x += (r.tx - bp.x) * k; bp.z += (r.tz - bp.z) * k;
      bp.y = this.groundAt(bp.x, bp.z, bp.y) + r.j;
      b.av.group.rotation.y += wrapAngle(r.ry - b.av.group.rotation.y) * k;
      const far = Math.hypot(r.tx - bp.x, r.tz - bp.z);
      if (far > 12) { bp.x = r.tx; bp.z = r.tz; }             // teleport if we fell way behind
      if (r.j > 0.05) poseJump(b.av); else animateWalk(b.av, t, r.w);
    }
    if (b.bubbleUntil && t > b.bubbleUntil) { b.bubbleUntil = 0; b.label.element.textContent = b.label.userData.orig as string; b.label.element.classList.remove('talk'); }
    b.label.visible = true;
  }

  private markFriend(b: Bot) {
    b.friend = true;
    const text = `\u{1F91D} ${(b.label.userData.orig as string).replace(/^\u{1F91D} /u, '')}`;
    b.label.userData.orig = text; b.label.element.textContent = text; b.label.element.classList.add('friend');
  }

  /** Accept / decline a friend request from a real player. */
  answerRequest(id: string, yes: boolean) {
    const name = this.pendingRequests.get(id);
    this.pendingRequests.delete(id);
    this.ev.onFriendRequest(null);
    if (!name || !yes) return;
    store.addFriend(name);
    const b = this.bots.find((x) => x.remote?.id === id);
    if (b) this.markFriend(b);
    this.net?.send({ t: 'fa', id: this.selfId, to: id, n: this.playerName });
    this.points += 25; this.ev.onPoints(this.points);
    this.ev.onCollect({ name: `You and ${name} are friends now`, points: 25, color: 0xe75480, shape: 'gem' });
    this.ev.onFriends(store.friends().length);
    this.sfx.questDone();
  }

  // ---------- setup ----------
  private buildEnvironment() {
    const { theme } = this.dest;
    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.fog, 90, 360);

    this.hemi = new THREE.HemisphereLight(theme.sky, theme.ground, 0.85);
    this.scene.add(this.hemi);
    this.daylight = { sky: theme.sky, fog: theme.fog, sun: theme.sun, sunI: 1.7, hemiI: 0.85, near: 90, far: 360 };
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
    const size = 1240, segs = 230;
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
        new THREE.PlaneGeometry(1800, 1800),
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
    const decor = scatterDecor(this.dest, this.terrain, [...avoid, ...((landmark.userData.clear ?? []) as { x: number; z: number; r: number }[])]);
    this.scene.add(landmark, decor);
    this.occluders = [landmark]; // decor is one baked mesh; raycasting it every frame is too costly
    this.decor = decor;
    landmark.traverse((o) => { if (o instanceof CSS2DObject) this.worldLabels.push(o); });
    this.placePetrolStation(landmark);
    this.roadLines = [...(landmark.userData.roads ?? []), ...(this.dest.routes ?? [])];
    this.landmarkData = landmark.userData;
    this.spots = (landmark.userData.spots ?? []) as Spot[];
    this.wheel = (landmark.getObjectByName('ferris') as THREE.Group | undefined) ?? null;
    this.dateBoat = (landmark.getObjectByName('dateboat') as THREE.Group | undefined) ?? null;
    this.casino = (landmark.userData.casino as Casino | undefined) ?? null;
    this.landmarkRoot = landmark;
    if (landmark.userData.cricket) this.oval = { ...(landmark.userData.cricket as { x: number; z: number; r: number; len: number }) };
    if (landmark.userData.pitch) { const p = landmark.userData.pitch as { x: number; z: number; w: number; d: number; goal: number; goalH: number }; this.field = { ...p }; }
    if (landmark.userData.circuit) { const c = landmark.userData.circuit as { pts: [number, number][]; width: number; pads: [number, number, number][] }; this.circuit = { pts: c.pts.map(([x, z]) => new THREE.Vector3(x, this.terrain.h(x, z), z)), width: c.width, pads: c.pads.map(([x, z, ang]) => ({ x, z, ang, cool: 0 })) }; }
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
    const av = makeAvatar(this.gender === 'f' ? FEMALE_OUTFITS[0] : OUTFITS[0]);
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
      if (!m.isMesh || m.userData.noCollide) return;
      const geo = m.geometry as THREE.BufferGeometry & { parameters?: { openEnded?: boolean; radius?: number; radiusBottom?: number } };
      if (geo.type === 'CylinderGeometry' && geo.parameters?.openEnded) return;          // arena walls, shells
      if ((m.material as THREE.Material).transparent) return;                            // nets, glass
      const box = new THREE.Box3().setFromObject(m);
      box.getSize(size);
      if (size.y < 0.15 || box.min.y > 40) return;                                       // paint-thin slabs, things in the sky
      if (size.x < 0.6 && size.z < 0.6) return;                                          // lamp posts, trunks: walk past them
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

  /** A vehicle's four corners (and centre) must all be free. */
  private vehicleFits(x: number, z: number, heading: number, length: number, width: number, y: number) {
    const fx = Math.sin(heading), fz = Math.cos(heading), rx = fz, rz = -fx;
    const L = length / 2 - 0.15, W = width / 2 - 0.05;
    if (!this.walkable(x, z, y) || this.hitsVehicle(x, z)) return false;
    for (const [a, b] of [[L, W], [L, -W], [-L, W], [-L, -W]]) { const cx = x + fx * a + rx * b, cz = z + fz * a + rz * b; if (!this.walkable(cx, cz, y) || this.hitsVehicle(cx, cz)) return false; }
    return true;
  }

  /** Is (x, z) inside the footprint of a parked vehicle or a bus? (The one you are driving does not count.) */
  private hitsVehicle(x: number, z: number, margin = 0.45): { pos: THREE.Vector3; heading: number; speed: number; bus: boolean } | null {
    const inside = (pos: THREE.Vector3, heading: number, length: number, width: number) => {
      const dx = x - pos.x, dz = z - pos.z, fx = Math.sin(heading), fz = Math.cos(heading);
      const along = dx * fx + dz * fz, across = dx * fz - dz * fx;
      return Math.abs(along) < length / 2 + margin && Math.abs(across) < width / 2 + margin;
    };
    for (const v of this.vehicles) if (v !== this.driving && inside(v.group.position, v.heading, v.spec.length, v.spec.width)) return { pos: v.group.position, heading: v.heading, speed: v.speed, bus: false };
    for (const r of this.roads) if (inside(r.t.group.position, r.t.group.rotation.y, r.t.length, 2.6)) return { pos: r.t.group.position, heading: r.t.group.rotation.y, speed: r.t.speed, bus: true };
    return null;
  }

  /** Can something standing at height `y` move to (x, z)? */
  private walkable(x: number, z: number, y = this.terrain.h(x, z)) {
    if (Math.hypot(x, z) >= WORLD_RADIUS) return false;
    let platform = false;   // standing on a deck, pier or ramp: fine even over water or a steep slope
    for (const b of this.blockers) {
      if (!this.hits(b, x, z)) continue;
      const { min, max } = b.box;
      const low = max.y - min.y <= LOW_PLATFORM;
      if (min.y > y + HEAD || max.y < y + 0.7) { if (low && max.y <= y + STEP_UP && max.y >= y - 1.5) platform = true; continue; }   // overhead / underfoot
      if (low && min.y <= y + STEP_UP) { platform = true; continue; }                     // a ledge we can step onto
      return false;
    }
    if (platform) return true;
    if (!this.terrain.onLand(x, z)) return false;
    if (this.dest.terrain.rim && this.terrain.h(x, z) - y > 1.1) return false;             // hillside too steep
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
      this.bots.push({ av, label, name: short, female, target: this.randomLandPoint(10, 110), speed: rand(1.8, 3.4), wait: 0, walking: 0, riding: null, knocked: null, friend, asked: -99, reply: null, greeted: -99, bubbleUntil: 0 });
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
    for (const [x, z, heading, kind] of (this.landmarkData.parked ?? []) as [number, number, number, VehicleKind][]) {
      const v = makeVehicle(kind, VEHICLE_COLORS[(x + z) % VEHICLE_COLORS.length]);
      v.heading = heading; v.group.position.set(x, 0, z); this.settleVehicle(v); this.scene.add(v.group); this.vehicles.push(v);
    }
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
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      this.sfx.unlock();
      const k = e.key.toLowerCase();
      if (k === 'h' && !e.repeat && this.driving) this.sfx.horn();
      if (k === 'r' && !e.repeat) this.wantRefuel = true;
      if (k === 't' && !e.repeat) this.wantQuest = true;
      if (k === 'g' && !e.repeat) this.wantFriend = true;
      if (k === 'm' && !e.repeat) this.toggleMute();
      if (k === ' ') { e.preventDefault(); if (!e.repeat) this.wantJump = true; }
      if (k === 'e' && !e.repeat) this.wantToggleDrive = true;
      if (k === 'z' && !e.repeat) this.toggleZombies();
      if (k === 'f' && !e.repeat) this.wantLift = true;
      this.keys.add(k);
    };
    const up = (e: KeyboardEvent) => { if ((e.target as HTMLElement | null)?.tagName === 'INPUT') { this.keys.clear(); return; } this.keys.delete(e.key.toLowerCase()); };
    addEventListener('keydown', down); addEventListener('keyup', up);
    this.cleanup.push(() => { removeEventListener('keydown', down); removeEventListener('keyup', up); });

    const pd = (e: PointerEvent) => {
      this.sfx.unlock();
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic events have no capture */ }
      const pad = this.stickEl && !this.stickEl.hidden ? this.stickEl.getBoundingClientRect() : null;
      const onPad = !!pad && Math.hypot(e.clientX - (pad.left + pad.width / 2), e.clientY - (pad.top + pad.height / 2)) < pad.width * 0.9;
      if (e.pointerType === 'touch' && !this.stick && (onPad || (!pad && e.clientX < innerWidth * 0.55))) {
        // fixed pad: steer relative to its centre, not to where the finger landed
        const ox = pad ? pad.left + pad.width / 2 : e.clientX, oy = pad ? pad.top + pad.height / 2 : e.clientY;
        this.stick = { id: e.pointerId, ox, oy, dx: 0, dy: 0 };
        if (!pad) this.showStick(ox, oy);
        this.stickEl?.classList.add('active');
        (this.pm as (e: PointerEvent) => void)(e);
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
      if (this.stick && e.pointerId === this.stick.id) { this.stick = null; this.stickEl?.classList.remove('active'); if (this.mobile) this.moveStick(0, 0); else this.hideStick(); }
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
    this.pm = pm;
    if (this.mobile) { this.showStick(0, 0); this.stickEl!.classList.add('fixed'); this.stickEl!.style.left = ''; this.stickEl!.style.top = ''; }
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
  private moveAmount = 0;
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
    opp: Bot | null; oppVehicle: Vehicle | null; oppIdx: number; oppGot: number; oppNext: number;
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
  private knock: THREE.Vector3 | null = null;   // sent flying by a bus
  private lastHit = -10;
  toggleDrive() { this.wantToggleDrive = true; }
  lift() { this.wantLift = true; }
  attachMinimap(canvas: HTMLCanvasElement) { this.minimap = { canvas, base: this.drawMinimapBase(canvas.width, false), ctx: canvas.getContext('2d')!, last: 0 }; }
  /** Full-screen map: bigger canvas with place names. Returns a stop function. */
  attachBigMap(canvas: HTMLCanvasElement) {
    const base = this.drawMinimapBase(canvas.width, false);
    const ctx = canvas.getContext('2d')!;
    this.bigMap = { canvas, base, ctx, last: 0 };
    return () => { this.bigMap = null; };
  }
  private roadLines: [number, number][][] = [];
  private bigMap: { canvas: HTMLCanvasElement; base: HTMLCanvasElement; ctx: CanvasRenderingContext2D; last: number } | null = null;

  private stickEl?: HTMLElement;
  private pm: ((e: PointerEvent) => void) | null = null;
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
    const hf = this.groundAt(vp.x + fx * L, vp.z + fz * L, vp.y), hb = this.groundAt(vp.x - fx * L, vp.z - fz * L, vp.y);
    const rx = fz, rz = -fx;
    const hr = this.groundAt(vp.x + rx * W, vp.z + rz * W, vp.y), hl = this.groundAt(vp.x - rx * W, vp.z - rz * W, vp.y);
    group.rotation.set(-Math.atan2(hf - hb, length), heading, Math.atan2(hr - hl, width));
  }

  // ---------- lifts: pick up explorers while driving, drop them off for points ----------
  private nearestWalker(): Bot | null {
    if (!this.driving) return null;
    const vp = this.driving.group.position;
    let best: Bot | null = null, bd = 5;
    for (const b of this.bots) {
      if (b.riding || b.knocked || b.playing) continue;
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
      if (b.riding || b.knocked || b.playing) continue;
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
    if (this.cricket) { ix = 0; iz = 0; }   // you are at the crease: A/D or ◀ ▶ shuffle sideways (see tickCricket)
    if (this.date) { ix = 0; iz = 0; if (this.wantJump) { this.wantJump = false; this.endDate(); } }   // seated: Space / Jump stands up
    if (this.dancing) { ix = 0; iz = 0; if (this.wantJump) { this.wantJump = false; this.stopDancing(); } }
    if (this.pool) { ix = 0; iz = 0; if (this.wantKick || this.wantJump) { this.wantKick = false; this.wantJump = false; this.poolButton(); } }
    if (this.carrom) { ix = 0; iz = 0; if (this.wantKick || this.wantJump) { this.wantKick = false; this.wantJump = false; this.carromButton(); } }
    if (this.wantKick) { this.wantKick = false; if (this.match && !this.match.over) this.shoot(); else if (this.cricket) this.swing(); else if (this.zombies && !this.zombies.ending) this.punch(); }

    // --- enter / leave vehicles
    if (this.wantToggleDrive) {
      this.wantToggleDrive = false;
      if (this.driving) this.exitVehicle();
      else if (this.date) this.endDate();
      else if (this.dancing) this.stopDancing();
      else if (this.pool || this.carrom) { /* use Shoot / Flick */ }
      else { const v = this.nearestVehicle(); const sp = this.nearestSpot(); const pt = this.nearestPoolTable(); const cb = this.nearestCarrom(); if (pt) this.startPool(pt); else if (cb) this.startCarrom(cb); else if (this.onDanceFloor()) this.startDancing(); else if (sp) this.startDate(sp); else if (v) this.enterVehicle(v); else if (this.onPitch() && !this.match) this.startFootball(); else if (this.onStrip() && !this.cricket) this.startCricket(); }
    }

    let focus: THREE.Vector3;       // what the camera looks at / what collects pickups
    let focusRadius = 1.5;

    if (this.driving) {
      const v = this.driving;
      const s = v.spec;
      const empty = s.fuel && v.fuel <= 0;
      const throttle = empty || this.raceLock ? 0 : Math.min(1, Math.max(-1, iz));
      const boosting = !empty && (this.boostHeld || k.has('shift') || k.has('b')) && v.boost > 0 && throttle > 0;
      if (boosting && !this.wasBoosting) this.sfx.boost();
      this.wasBoosting = boosting;
      if (this.circuit) for (const pad of this.circuit.pads) {
        pad.cool = Math.max(0, pad.cool - dt);
        if (pad.cool === 0 && Math.abs(v.group.position.x - pad.x) < 4.5 && Math.abs(v.group.position.z - pad.z) < 4.5) {
          pad.cool = 2; this.padBurst = 2.2; v.boost = 1; v.speed = Math.max(v.speed, s.maxSpeed * 0.9) + 6;
          this.sfx.boost(); this.ev.onCollect({ name: 'Boost pad!', points: 0, color: 0x3fd36f, shape: 'gem' });
        }
      }
      this.padBurst = Math.max(0, this.padBurst - dt);
      const maxSpeed = s.maxSpeed * (boosting ? BOOST_MULT : this.padBurst > 0 ? 1.45 : 1);
      const accel = s.accel * (boosting ? 2.2 : 1);
      if (throttle > 0) v.speed += accel * throttle * dt;
      else if (throttle < 0) v.speed += (v.speed > 0.5 ? -22 : s.accel * throttle * 0.6) * dt; // brake, then reverse
      else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), (empty ? 3 : 6) * dt);
      if (k.has(' ')) v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 30 * dt);
      if (!boosting && this.padBurst <= 0 && v.speed > s.maxSpeed) v.speed -= Math.min(v.speed - s.maxSpeed, 10 * dt); // ease back after a boost
      v.speed = THREE.MathUtils.clamp(v.speed, -s.reverse, maxSpeed);
      // fuel burns with distance (boosting burns double); nitro drains while used and recharges slowly
      const wasEmpty = empty;
      if (s.fuel) v.fuel = Math.max(0, v.fuel - (Math.abs(v.speed) * dt * (boosting ? 2 : 1)) / FUEL_RANGE);
      if (!wasEmpty && v.fuel <= 0) this.sfx.sputter();
      v.boost = THREE.MathUtils.clamp(v.boost + (boosting ? -dt / 4 : dt / 12), 0, 1);
      for (const f of v.flames) { f.visible = boosting || this.padBurst > 0; if (f.visible) f.scale.setScalar(0.8 + Math.random() * 0.5); }
      const steer = -Math.min(1, Math.max(-1, ix));
      v.heading += steer * s.turn * dt * THREE.MathUtils.clamp(v.speed / 8, -1, 1);

      const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
      const vp = v.group.position;
      const nx = vp.x + fx * v.speed * dt, nz = vp.z + fz * v.speed * dt;
      const wedged = !this.vehicleFits(vp.x, vp.z, v.heading, s.length, s.width, vp.y);
      if ((wedged && Math.hypot(nx, nz) < WORLD_RADIUS && this.terrain.onLand(nx, nz)) || this.vehicleFits(nx, nz, v.heading, s.length, s.width, vp.y)) { vp.x = nx; vp.z = nz; }
      else { if (Math.abs(v.speed) > 4) this.sfx.bump(); v.speed *= -0.3; }
      for (const r of this.roads) {   // a bus does not brake for you either
        const bp = r.t.group.position, dx = vp.x - bp.x, dz = vp.z - bp.z, d = Math.hypot(dx, dz);
        if (d < r.t.length / 2 + s.length / 2 && d > 0 && t - this.lastHit > 1.2) {
          this.lastHit = t;
          const push = (r.t.length / 2 + s.length / 2 - d) + 1.2, nx2 = vp.x + (dx / d) * push, nz2 = vp.z + (dz / d) * push;
          if (this.vehicleFits(nx2, nz2, v.heading, s.length, s.width, vp.y)) { vp.x = nx2; vp.z = nz2; }
          v.speed *= 0.4; this.sfx.thud(); this.ev.onHurt();
          this.ev.onCollect({ name: 'Bus! That will leave a dent', points: 0, color: 0xd94a3d, shape: 'box' });
        }
      }
      this.settleVehicle(v);
      if (this.race && !this.race.over && this.trackDist(vp) > this.circuit!.width / 2 + 1.5) v.speed = Math.min(v.speed, s.maxSpeed * 0.4);   // on the grass
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
      if (this.lastMeet) { this.lastMeet = ''; this.meet = null; this.ev.onMeet(null); }
      this.liftPrompt(walker ? (this.mobile ? `Give ${walker.name} a lift?` : `Press F to give ${walker.name} a lift`) : aboard.length ? `${aboard.map((b) => b.name).join(', ')} aboard${this.mobile ? '' : ' · F to drop off (+30 each)'}` : this.rimHint(vp));
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
        const speed = running ? WALK_SPEED * (this.zombies && !this.zombies.ending ? 1.3 : 1.8) : WALK_SPEED;   // you cannot outrun the night for long
        const nx = p.x + mx * speed * dt, nz = p.z + mz * speed * dt;
        const py = p.y - this.airY;
        // never get stuck: if we are already inside a wall (stepped onto something odd), any move out is allowed
        const free = !this.walkable(p.x, p.z, py) && Math.hypot(nx, nz) < WORLD_RADIUS && this.terrain.onLand(nx, nz);
        const ok = (ax: number, az: number) => this.walkable(ax, az, py) && !this.hitsVehicle(ax, az);
        if (free || ok(nx, nz)) { p.x = nx; p.z = nz; }
        else if (ok(nx, p.z)) p.x = nx;        // slide along walls
        else if (ok(p.x, nz)) p.z = nz;
        else if (this.hitsVehicle(nx, nz)) this.sfx.bump();
        this.player.group.rotation.y = Math.atan2(mx, mz);
        moving = Math.min(1, len) * (running ? 1.5 : 1);
        if (this.stick && !this.look && iz > 0.3) this.yaw += wrapAngle(Math.atan2(mx, mz) + Math.PI - this.yaw) * Math.min(1, dt * 1.2);
      }
      this.moveAmount = moving;
      // --- run over by a bus: it does not stop for you
      if (this.knock) {
        p.x += this.knock.x * dt; p.z += this.knock.z * dt;
        this.knock.multiplyScalar(Math.max(0, 1 - 2.5 * dt));
        if (this.knock.length() < 0.6 && this.airY <= 0) this.knock = null;
        this.player.group.rotation.y += dt * 9;   // tumbling
      } else if (this.airY <= 0) {
        const hit = this.hitsVehicle(p.x, p.z, 0.2);
        if (hit && hit.bus && t - this.lastHit > 2.5) {
          this.lastHit = t;
          const fx = Math.sin(hit.heading), fz = Math.cos(hit.heading), side = Math.sign((p.x - hit.pos.x) * fz - (p.z - hit.pos.z) * fx) || 1;
          this.knock = new THREE.Vector3(fx * 9 + fz * side * 5, 0, fz * 9 - fx * side * 5);
          this.vy = 6.5; this.airY = 0.01;
          this.points = Math.max(0, this.points - 20); this.ev.onPoints(this.points);
          this.sfx.thud(); this.sfx.ouch(); this.ev.onHurt();
          this.ev.onCollect({ name: 'Hit by the bus! Look both ways', points: -20, color: 0xd94a3d, shape: 'box' });
        }
      }
      // --- jump
      if (this.wantJump && this.airY <= 0 && !this.knock) { if (!(this.match && !this.match.over && this.shoot()) && !(this.cricket && this.swing()) && !(this.zombies && this.punch())) { this.vy = JUMP_SPEED; this.sfx.jump(); } }
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
      if (this.airY > 0 || this.knock) poseJump(this.player); else animateWalk(this.player, t, moving);
      if (this.date) poseSit(this.player);
      if (this.dancing) this.dancePose(this.player, t, 0, 1);
      if (this.carrom) { poseSit(this.player); this.player.armR.rotation.x = -1.4; this.player.armL.rotation.x = -0.8; this.player.body.rotation.x = 0.4; }
      if (this.pool) { this.player.armR.rotation.x = -1.2; this.player.armL.rotation.x = -1.0; this.player.armR.rotation.z = -0.3; this.player.armL.rotation.z = 0.5; this.player.body.rotation.x = 0.35; }
      if (this.zombies && t - this.zombies.punchAt < 0.22) this.player.armR.rotation.x = -1.7;

      focus = this.pool ? new THREE.Vector3(this.pool.table.x, this.pool.table.y + 0.4, this.pool.table.z) : this.carrom ? new THREE.Vector3(this.carrom.board.x, this.carrom.board.y + 0.2, this.carrom.board.z) : p.clone().add(new THREE.Vector3(0, 1.7, 0));
      if (this.lastDash !== -1) { this.lastDash = -1; this.ev.onDash(null); }
      if (Math.abs(this.camera.fov - 60) > 0.01) { this.camera.fov += (60 - this.camera.fov) * Math.min(1, dt * 4); this.camera.updateProjectionMatrix(); }
      const near = this.nearestVehicle();
      const sp = this.date || this.dancing || this.pool ? null : this.nearestSpot();
      const ptab = this.date || this.dancing || this.pool || this.carrom ? null : this.nearestPoolTable();
      const cboard = this.date || this.dancing || this.pool || this.carrom || ptab ? null : this.nearestCarrom();
      if (this.pool || this.carrom) this.prompt(null, false);
      else if (cboard && !this.inMode()) { const pt = this.datePartner(); this.prompt(`${this.mobile ? 'Tap Drive' : 'Press E'} · Play carrom${pt ? ` with ${pt.name}` : ''}`, false); }
      else if (this.dancing) this.prompt(`${this.mobile ? 'Tap Jump' : 'Press E or Space'} to stop dancing`, false);
      else if (ptab && !this.inMode()) { const pt = this.datePartner(); this.prompt(`${this.mobile ? 'Tap Drive' : 'Press E'} · Rack up 8-ball${pt ? ` with ${pt.name}` : ''}`, false); }
      else if (this.onDanceFloor() && !this.inMode()) { const pt = this.datePartner(); this.prompt(`${this.mobile ? 'Tap Drive' : 'Press E'} · Dance${pt ? ` with ${pt.name}` : ''}`, false); }
      else if (this.date) this.prompt(this.date.spot.kind === 'wheel' || this.date.spot.kind === 'boat' ? `${this.date.spot.kind === 'wheel' ? '🎡' : '🚤'} ${Math.max(0, Math.ceil(RIDE_SECONDS - (t - this.date.t0)))} s · ${this.mobile ? 'Jump' : 'E'} to get off early` : `${this.mobile ? 'Tap Drive or Jump' : 'Press E or Space'} to stand up`, false);
      else if (sp && !this.inMode()) { const pt = this.datePartner(); this.prompt(`${this.mobile ? 'Tap Drive' : 'Press E'} · ${sp.label}${pt ? ` with ${pt.name}` : ''}`, false); }
      else if (this.match && !this.match.over) this.prompt(this.mobile ? '⚽ Run into the ball to dribble · Jump button shoots' : '⚽ Run into the ball to dribble · Space shoots', false);
      else if (this.zombies && !this.zombies.ending) this.prompt(this.mobile ? '🧟 Jump button punches · cars crush them · Z ends the night' : '🧟 Space punches the zombie in front · cars crush them · Z ends the night', false);
      else if (!near && this.onPitch() && !this.match) this.prompt(this.mobile ? '⚽ Tap Drive to kick off a football match' : '⚽ Press E to kick off a football match', false);
      else if (this.cricket) this.prompt(this.cricket.phase === 'over' ? null : this.cricket.innings === 2 ? (this.mobile ? '🏏 Tap Bowl at the top of your action' : '🏏 Space / Bowl at the top of your action') : this.mobile ? '🏏 Tap Bat as the ball reaches you' : '🏏 Space / Bat as the ball reaches you', false);
      else if (!near && this.onStrip() && !this.cricket) this.prompt(this.mobile ? '🏏 Tap Drive to start a match' : '🏏 Press E to start a cricket match', false);
      else this.prompt(near ? (this.mobile ? `Ride the ${near.spec.label}?` : `Press E to drive the ${near.spec.label}`) : null, false);
      // friend requests: walk up to an explorer and press G
      this.meet = this.nearestPerson(p);
      if (this.meet && !this.meet.reply) {
        // they stop and turn to you while the menu is open
        this.meet.wait = Math.max(this.meet.wait, 0.6);
        const mp = this.meet.av.group.position;
        this.meet.av.group.rotation.y += wrapAngle(Math.atan2(p.x - mp.x, p.z - mp.z) - this.meet.av.group.rotation.y) * Math.min(1, dt * 5);
      }
      if (this.wantFriend && this.meet && !this.meet.friend) this.askFriend(this.meet, t);
      const key = this.meet ? `${this.meet.name}|${this.meet.friend}` : '';
      if (key !== this.lastMeet) {
        this.lastMeet = key;
        this.ev.onMeet(this.meet ? { name: this.meet.name, friend: this.meet.friend, real: !!this.meet.remote } : null);
        // they notice you sometimes
        if (this.meet && !this.meet.remote && t - this.meet.greeted > 45 && Math.random() < 0.5) { this.meet.greeted = t; this.botSays(this.meet, HELLO_WHEN_NEAR[Math.floor(Math.random() * HELLO_WHEN_NEAR.length)], 0.6); }
      }
      this.liftPrompt(this.rimHint(p));
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
    for (const b of [...this.bots]) {
      if (b.remote) { this.updatePeer(b, dt, t); continue; }
      if (b.riding || b.playing) { b.label.visible = true; continue; }
      const bp = b.av.group.position;
      if (b.bubbleUntil && t > b.bubbleUntil) { b.bubbleUntil = 0; b.label.element.textContent = b.label.userData.orig as string; b.label.element.classList.remove('talk'); }
      if (this.hangout?.bot === b && !b.knocked) {
        // tag along a couple of metres behind the player
        const pp = this.player.group.position;
        const d = Math.hypot(pp.x - bp.x, pp.z - bp.z);
        b.target.set(pp.x, pp.y, pp.z); b.wait = 0;
        if (d < 2.5) { b.walking = Math.max(0, b.walking - dt * 3); animateWalk(b.av, t, b.walking * 0.8); b.label.visible = true; continue; }
        b.speed = this.runMode || this.keys.has('shift') ? 6.5 : 4;
      }
      if (b.reply) {
        // turn to face the player, then answer
        const pp = this.player.group.position;
        b.av.group.rotation.y += wrapAngle(Math.atan2(pp.x - bp.x, pp.z - bp.z) - b.av.group.rotation.y) * Math.min(1, dt * 6);
        b.av.armR.rotation.x = -2.6 + Math.sin(t * 8) * 0.3;   // wave
        if (t >= b.reply.at) this.answerFriend(b);
      }
      if (b.knocked) { this.updateKnocked(b, dt); b.label.visible = !this.inMode() && bp.distanceToSquared(focus) < this.labelRange * this.labelRange; continue; }
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
      b.label.visible = !this.inMode() && bp.distanceToSquared(focus) < this.labelRange * this.labelRange;
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

    // --- chat replies that are due, hangout timer
    for (let i = this.pending.length - 1; i >= 0; i--) if (t >= this.pending[i].at) { const m = this.pending.splice(i, 1)[0]; this.botSays(m.bot, m.text, 0); }
    if (this.hangout) {
      const hg = this.hangout;
      if (t > hg.until || hg.bot.knocked || hg.bot.riding) { this.endHangout(); }
      else if (t > hg.nextLine && !this.date) { hg.nextLine = t + 9 + Math.random() * 8; this.botSays(hg.bot, HANGOUT_LINES[Math.floor(Math.random() * HANGOUT_LINES.length)], 0); }
    }

    if (this.race) this.tickRace(dt, t);
    this.tickClub(dt, t);
    if (this.pool) this.tickPool(dt, t);
    if (this.carrom) this.tickCarrom(dt, t);
    if (this.wheel) { this.wheel.rotation.z += dt * (Math.PI * 2 / 40); for (const c of this.wheel.children) if (c.name.startsWith('gondola')) c.rotation.z = -this.wheel.rotation.z; }
    if (this.date) this.tickDate(dt, t);
    this.sunsetK = Math.max(0, Math.min(1, this.sunsetK + ((this.date?.spot.kind === 'sunset') ? dt / 4 : -dt / 4)));
    if (this.sunsetK > 0 && !(this.zombies && !this.zombies.ending)) this.applySunset(this.sunsetK);
    if (this.match) this.tickFootball(dt, t);
    if (this.cricket) this.tickCricket(dt, t);
    if (this.zombies) this.tickZombies(dt, t);

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
      this.countOnline();
      this.pushRank();
    }

    this.updateQuest(focus, focusRadius, dt, t);
    if (this.driving) this.moveAmount = 0;
    this.drawMinimap(focus, t);
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  private rimHint(p: THREE.Vector3) {
    const rim = this.dest.terrain.rim;
    const seaSide = this.dest.terrain.coast !== undefined && p.x > this.dest.terrain.coast - 90;
    return rim && !seaSide && !this.terrain.inLand(p.x, p.z) && Math.hypot(p.x, p.z) > rim - 10 ? 'City limits — the hills are too steep. Turn back!' : null;
  }

  private liftPrompt(text: string | null) {
    if (text === this.lastLift) return;
    this.lastLift = text ?? '';
    this.ev.onLift(text);
  }

  // ---------- minimap ----------
  private static MAP_SPAN = 960; // world units across the map
  private static MAP_CX = 110;   // the map is centred between the city and Eastside

  private drawMinimapBase(size: number, labels: boolean) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const span = World.MAP_SPAN, px = size / span;
    const water = this.dest.terrain.water;
    const img = ctx.createImageData(size, size);
    const land = new THREE.Color(0xb9d99a), sea = new THREE.Color(water?.color ?? 0x3a7fb0), hill = new THREE.Color(0x7fa86a), outside = new THREE.Color(0x2b4a3a);
    const rim = this.dest.terrain.rim ?? WORLD_RADIUS;
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const x = (i / size - 0.5) * span + World.MAP_CX, z = (j / size - 0.5) * span;
      const h = this.terrain.h(x, z);
      const k = (j * size + i) * 4;
      const r = Math.hypot(x, z);
      let col: THREE.Color;
      const seaSide = this.dest.terrain.coast !== undefined && x > this.dest.terrain.coast - 90;
      if (water && h < water.level) col = sea.clone().multiplyScalar(r > WORLD_RADIUS ? 0.7 : 1);
      else if (r > WORLD_RADIUS) col = outside;
      else if (r > rim && !seaSide) col = hill.clone().lerp(outside, (r - rim) / (WORLD_RADIUS - rim));
      else col = land.clone().multiplyScalar(0.92 + Math.min(0.2, Math.max(-0.1, h * 0.01)));
      img.data[k] = col.r * 255; img.data[k + 1] = col.g * 255; img.data[k + 2] = col.b * 255; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const P = (x: number, z: number) => [size / 2 + (x - World.MAP_CX) * px, size / 2 + z * px] as const;
    // building footprints
    ctx.fillStyle = 'rgba(90, 80, 70, .55)';
    for (const b of this.blockers) {
      if (b.radius !== undefined || b.box.max.y - b.box.min.y < 2.5) continue;
      const [a, c] = P(b.box.min.x, b.box.min.z);
      ctx.fillRect(a, c, (b.box.max.x - b.box.min.x) * px, (b.box.max.z - b.box.min.z) * px);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const drawRoads = (color: string, w: number) => {
      ctx.strokeStyle = color; ctx.lineWidth = w;
      for (const route of this.roadLines) {
        ctx.beginPath();
        route.forEach(([x, z], i) => { const [a, b] = P(x, z); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); });
        ctx.stroke();
      }
    };
    drawRoads('#f4f1ea', Math.max(3, 7 * px));
    drawRoads('#6d6d6d', Math.max(1.6, 4.5 * px));
    if (this.circuit) {   // the Speedway: tarmac loop with a red/white kerb halo and a start-line dot
      const c = this.circuit.pts;
      const loop = () => { ctx.beginPath(); c.forEach((q, i) => { const [a, b] = P(q.x, q.z); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); }); ctx.closePath(); ctx.stroke(); };
      ctx.strokeStyle = '#d94a3d'; ctx.lineWidth = Math.max(4, (this.circuit.width + 3) * px); loop();
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = Math.max(2.4, this.circuit.width * px); loop();
      const [sx, sz] = P(c[0].x, c[0].z); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sz, Math.max(2, 3 * px), 0, 7); ctx.fill();
    }
    if (this.train) {
      const st = this.train.stops, [a, b] = P(st[0], this.train.z), [c2, d] = P(st[st.length - 1], this.train.z);
      ctx.strokeStyle = '#' + this.train.color.toString(16).padStart(6, '0'); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke();
      ctx.fillStyle = '#fff';
      for (const x of st) { const [e, f] = P(x, this.train.z); ctx.beginPath(); ctx.arc(e, f, 2, 0, 7); ctx.fill(); }
    }
    if (this.casino) { const [a, b] = P(this.casino.x, this.casino.z); ctx.fillStyle = '#ff4fd8'; ctx.beginPath(); ctx.arc(a, b, labels ? 7 : 4, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${labels ? 10 : 6}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('🎰', a, b + (labels ? 3.5 : 2)); }
    if (this.wheel) { const [a, b] = P(this.wheel.position.x, this.wheel.position.z); ctx.fillStyle = '#f2c31b'; ctx.beginPath(); ctx.arc(a, b, labels ? 7 : 4, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `bold ${labels ? 10 : 6}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('🎡', a, b + (labels ? 3.5 : 2)); }
    if (this.pumpPos) { const [a, b] = P(this.pumpPos.x, this.pumpPos.z); ctx.fillStyle = '#d94a3d'; ctx.beginPath(); ctx.arc(a, b, labels ? 6 : 3, 0, 7); ctx.fill(); if (labels) { ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⛽', a, b + 3); } }
    const wp = new THREE.Vector3();
    const named: { x: number; y: number; text: string }[] = [];
    for (const l of this.worldLabels) {
      const el = l.element as HTMLElement;
      const isPlace = el.classList.contains('place'), isStop = el.classList.contains('metro');
      if (!isPlace && !isStop) continue;
      l.getWorldPosition(wp);
      const [a, b] = P(wp.x, wp.z);
      ctx.fillStyle = isPlace ? '#e8c46a' : '#2b7bc9'; ctx.strokeStyle = '#17332b'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(a, b, isPlace ? (labels ? 4 : 2.5) : (labels ? 3 : 1.5), 0, 7); ctx.fill(); ctx.stroke();
      if (labels && isPlace) named.push({ x: a, y: b, text: el.textContent!.replace(/^\S+\s/, (m) => (/[A-Za-z]/.test(m) ? m : '')).split(' · ')[0] });
    }
    if (labels) {
      ctx.font = '600 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const used: [number, number, number, number][] = [];
      for (const n of named) {
        const w = ctx.measureText(n.text).width + 8, h = 15;
        let x = n.x + 7, y = n.y;
        // dodge overlaps by trying a few offsets
        for (const [dx, dy] of [[0, 0], [0, -14], [0, 14], [-w - 14, 0], [0, -28], [0, 28]]) {
          const bx = x + dx, by = y + dy - h / 2;
          if (!used.some(([ux, uy, uw, uh]) => bx < ux + uw && bx + w > ux && by < uy + uh && by + h > uy)) { x = bx; y = y + dy; used.push([bx, by, w, h]); break; }
        }
        ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(x, y - h / 2, w, h);
        ctx.fillStyle = '#17332b'; ctx.fillText(n.text, x + 4, y + 0.5);
      }
    }
    return c;
  }

  private drawMinimap(focus: THREE.Vector3, t: number) {
    if (this.minimap) this.drawMapInto(this.minimap, focus, t, false);
    if (this.bigMap) this.drawMapInto(this.bigMap, focus, t, true);
  }

  private drawMapInto(m: { canvas: HTMLCanvasElement; base: HTMLCanvasElement; ctx: CanvasRenderingContext2D; last: number }, focus: THREE.Vector3, t: number, big: boolean) {
    if (t - m.last < 0.1) return;
    m.last = t;
    const { ctx, canvas, base } = m;
    const k = big ? 2.2 : 1, zoom = big ? 1 : 2.4;
    const size = canvas.width, px = (size / World.MAP_SPAN) * zoom;
    const cx = big ? World.MAP_CX : focus.x, cz = big ? 0 : focus.z;
    const P = (x: number, z: number) => [size / 2 + (x - cx) * px, size / 2 + (z - cz) * px] as const;
    const bpx = size / World.MAP_SPAN, win = size / zoom;
    ctx.fillStyle = '#0e1a14'; ctx.fillRect(0, 0, size, size);
    ctx.drawImage(base, size / 2 + (cx - World.MAP_CX) * bpx - win / 2, size / 2 + cz * bpx - win / 2, win, win, 0, 0, size, size);
    for (const b of this.bots) { if (b.riding) continue; const [a, c] = P(b.av.group.position.x, b.av.group.position.z); ctx.fillStyle = b.friend ? '#e75480' : 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(a, c, 1.8 * k, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#f27d3a';
    for (const r of this.roads) { const [a, c] = P(r.t.group.position.x, r.t.group.position.z); ctx.fillRect(a - 2 * k, c - 2 * k, 4 * k, 4 * k); }
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
    for (const v of this.vehicles) { if (v === this.driving) continue; const [a, c] = P(v.group.position.x, v.group.position.z); ctx.fillRect(a - 2 * k, c - 2 * k, 4 * k, 4 * k); }
    // player arrow
    const heading = this.driving ? this.driving.heading : this.player.group.rotation.y;
    const [a, c] = P(focus.x, focus.z);
    ctx.save(); ctx.translate(a, c);
    // view cone + pulse so you can find yourself at a glance
    ctx.rotate(-this.yaw + Math.PI);
    ctx.fillStyle = 'rgba(232, 196, 106, .22)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 26 * k, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); ctx.closePath(); ctx.fill();
    ctx.rotate(this.yaw - Math.PI - heading);
    ctx.strokeStyle = 'rgba(232, 196, 106, .7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, (9 + Math.sin(t * 4) * 3) * k, 0, 7); ctx.stroke();
    ctx.fillStyle = '#e8c46a'; ctx.strokeStyle = '#17332b'; ctx.lineWidth = 1.5;
    ctx.scale(k, k); ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (big) { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', size / 2, 16); ctx.fillText('S', size / 2, size - 8); ctx.fillText('E', size - 12, size / 2 + 4); ctx.fillText('W', 12, size / 2 + 4); }
  }

  // ---------- circuit race ----------
  private trackDist(p: THREE.Vector3) {
    const pts = this.circuit!.pts; let best = Infinity;
    for (let i = 0; i < pts.length; i += 2) { const d = (pts[i].x - p.x) ** 2 + (pts[i].z - p.z) ** 2; if (d < best) best = d; }
    return Math.sqrt(best);
  }
  private nearestIdx(p: THREE.Vector3, from: number) {
    const pts = this.circuit!.pts, N = pts.length; let best = from, bd = Infinity;
    for (let k = -8; k <= 14; k++) { const i = (from + k + N) % N; const d = (pts[i].x - p.x) ** 2 + (pts[i].z - p.z) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  }

  /** Put everyone on the grid at the Speedway and count down. */
  private onPitch() {
    const p = this.field; if (!p) return false;
    const q = this.player.group.position;
    return Math.abs(q.x - p.x) < p.w / 2 + 3 && Math.abs(q.z - p.z) < p.d / 2 + 3;
  }

  /** Kick off five-a-side football at City Stadium; `opp` (if given) captains the other side. */
  startFootball(opp?: Bot) {
    const pt = this.field;
    if (!pt || this.match || this.race) return;
    if (this.driving) this.exitVehicle();
    const pool = this.bots.filter((x) => !x.remote && !x.riding && !x.knocked && !x.playing && x !== opp && this.hangout?.bot !== x);
    if (opp && !opp.remote && !opp.riding && !opp.knocked) pool.unshift(opp);
    const n = Math.min(5, Math.floor((pool.length + 1) / 2));   // players per side, you included
    if (n < 2) { this.ev.onCollect({ name: 'Not enough people around for a match', points: 0, color: 0x999999, shape: 'box' }); return; }
    const rivals = pool.slice(0, n), mates = pool.slice(n, 2 * n - 1);
    const y = this.terrain.h(pt.x, pt.z);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, roughness: 0.5 }));
    for (let i = 0; i < 6; i++) { const patch = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshStandardMaterial({ color: 0x111111 })); const a = i * 1.05, b = (i % 2 ? 0.7 : -0.7); patch.position.set(Math.cos(a) * Math.cos(b) * 0.4, Math.sin(b) * 0.4, Math.sin(a) * Math.cos(b) * 0.4); ball.add(patch); }
    ball.castShadow = true;
    this.scene.add(ball);
    const bib = (team: 0 | 1, av: Avatar) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.62, 0.56), new THREE.MeshStandardMaterial({ color: team === 0 ? 0x3f8fd6 : 0xd94a3d, transparent: true, opacity: 0.6, roughness: 0.9 })); m.position.set(0, 0.45, 0); av.body.add(m); return m; };
    const mk = (bot: Bot | null, team: 0 | 1, i: number): Footballer => {
      const [sx, sz] = FORMATION[i], x = team === 0 ? sx : -sx;
      return { bot, team, home: new THREE.Vector3(pt.x + x, y, pt.z + sz), slot: [x, sz], gk: i === 1, kicked: -1, bib: bib(team, bot ? bot.av : this.player) };
    };
    const side: Footballer[] = [mk(null, 0, 0), ...mates.map((b, i) => mk(b, 0, i + 1)), ...rivals.map((b, i) => mk(b, 1, i))];
    for (const f of side) if (f.bot) { f.bot.playing = true; f.bot.wait = 0; f.bot.knocked = null; f.bot.label.visible = true; }
    if (this.hangout) this.endHangout();
    this.match = { side, ball, vel: new THREE.Vector3(), score: [0, 0], endAt: this.elapsed + MATCH_SECONDS + 3, pause: 3, over: false, opp: rivals[0].name, mates: mates.map((b) => b.name).join(', '), rivals: rivals.map((b) => b.name).join(', '), started: this.elapsed, lastKick: null };
    this.resetKickoff();
    this.ev.onMode({ icon: '⚽', label: 'Kick' });
    this.yaw = -Math.PI / 2;   // look down the pitch toward the goal you attack (+x)
    this.clearQuest();
    this.questCooldown = 8;
    this.sfx.questStart();
    this.ev.onCollect({ name: `Kick-off! ${n}-a-side vs ${rivals[0].name}'s team`, points: 0, color: 0x2fa66a, shape: 'gem' });
    this.botSays(mates[0], "Blue bibs are with you — pass it! ⚽", 1.2);
  }

  private resetKickoff() {
    const m = this.match!, pt = this.field!;
    m.ball.position.set(pt.x, this.terrain.h(pt.x, pt.z) + 0.52, pt.z); m.vel.set(0, 0, 0); m.lastKick = null;
    for (const f of m.side) {
      const g = f.bot ? f.bot.av.group : this.player.group;
      g.position.set(f.home.x, this.groundAt(f.home.x, f.home.z, f.home.y), f.home.z);
      g.rotation.y = f.team === 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    this.airY = 0; this.vy = 0;
  }

  /** Space during a match: shoot if the ball is within reach. Aim-assisted toward the goal, harder while running. */
  private shoot(): boolean {
    const m = this.match!, pt = this.field!, p = this.player.group.position, b = m.ball.position;
    if (Math.hypot(b.x - p.x, b.z - p.z) > 2.4) return false;
    const ry = this.player.group.rotation.y;
    let dx = Math.sin(ry), dz = Math.cos(ry);
    const gx = pt.x + pt.w / 2, gzc = pt.z, gdx = gx - b.x, gdz = gzc - b.z, gd = Math.hypot(gdx, gdz);
    if (gd < 30 && dx * gdx / gd + dz * gdz / gd > 0.75) {   // facing roughly at the goal: nudge the shot toward it
      const az = gzc + (Math.random() - 0.5) * pt.goal * 1.2 - b.z, al = Math.hypot(gdx, az);
      dx = dx * 0.45 + (gdx / al) * 0.55; dz = dz * 0.45 + (az / al) * 0.55;
      const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    }
    const running = this.runMode || this.keys.has('shift');
    const power = running ? 24 : 19;
    m.vel.set(dx * power, gd < 14 ? 4 : 5.5, dz * power);
    m.side[0].kicked = this.elapsed; m.lastKick = m.side[0];
    this.sfx.bump();
    return true;
  }

  private tickFootball(dt: number, t: number) {
    const m = this.match!, pt = this.field!, ball = m.ball.position, v = m.vel, R = 0.45;
    if (m.over) { if (t > m.endAt) this.endFootball(); return; }
    const pp = this.driving ? this.driving.group.position : this.player.group.position;
    if (Math.hypot(pp.x - pt.x, pp.z - pt.z) > 50 || this.driving) {   // wandered off (or drove off): match abandoned
      this.ev.onCollect({ name: 'You left the pitch — match abandoned', points: 0, color: 0x999999, shape: 'box' });
      this.endFootball(); return;
    }
    if (m.pause > 0) m.pause -= dt;
    const live = m.pause <= 0;
    const hw = pt.w / 2, hd = pt.d / 2;

    // --- ball physics: gravity, bounce, rolling friction, walls, goals
    v.y -= GRAVITY * 0.7 * dt;
    ball.addScaledVector(v, dt);
    const gy = this.terrain.h(ball.x, ball.z) + 0.07 + R;   // on top of the turf
    if (ball.y < gy) { ball.y = gy; v.y = Math.abs(v.y) < 1.5 ? 0 : -v.y * 0.45; }
    const onGround = ball.y <= gy + 0.02;
    const fr = onGround ? 0.8 : 0.12;
    v.x -= v.x * Math.min(1, fr * dt); v.z -= v.z * Math.min(1, fr * dt);
    if (Math.abs(ball.z - pt.z) > hd - R) { ball.z = pt.z + Math.sign(ball.z - pt.z) * (hd - R); v.z *= -0.55; }
    if (Math.abs(ball.x - pt.x) > hw - R) {
      const inGoal = Math.abs(ball.z - pt.z) < pt.goal && ball.y < gy - R + pt.goalH;
      if (inGoal && live) {
        const scorer: 0 | 1 = ball.x > pt.x ? 0 : 1;   // the +x goal belongs to the rivals
        m.score[scorer]++;
        m.pause = 2.8;
        this.sfx.questDone();
        const own = m.lastKick && m.lastKick.team !== scorer;
        const who = m.lastKick ? (m.lastKick.bot ? m.lastKick.bot.name : 'You') : '';
        this.ev.onCollect({ name: scorer === 0 ? `GOAL! ${own ? `${who} (own goal)` : who} · You ${m.score[0]} - ${m.score[1]}` : `${who} scores${own ? ' (own goal)' : ''} · ${m.score[0]} - ${m.score[1]}`, points: scorer === 0 ? 50 : 0, color: scorer === 0 ? 0x2fa66a : 0xd94a3d, shape: 'gem' });
        if (scorer === 0) { this.points += 50; this.ev.onPoints(this.points); }
        const talker = m.side.find((f) => f.bot && f.team === scorer && !f.gk)?.bot; if (talker) this.botSays(talker, scorer === 0 ? 'What a strike! ⚽🔥' : 'Get in! 😎', 0.6);
        setTimeout(() => { if (this.match === m && !m.over) this.resetKickoff(); }, 2400);
        ball.x = pt.x + Math.sign(ball.x - pt.x) * (hw + 1.2); v.set(0, 0, 0);
      } else if (!inGoal) { ball.x = pt.x + Math.sign(ball.x - pt.x) * (hw - R); v.x *= -0.55; }
    }
    m.ball.rotation.x += v.z * dt / R; m.ball.rotation.z -= v.x * dt / R;

    // --- close control: the ball sticks to the feet of whoever is dribbling; fast balls bounce off bodies
    const control = (g: THREE.Object3D, speed: number, who: Footballer, moving: boolean) => {
      const d = Math.hypot(ball.x - g.position.x, ball.z - g.position.z);
      if (d > 1.7 || ball.y > gy + 1.0 || t - who.kicked < 0.35) return;
      const dx = Math.sin(g.rotation.y), dz = Math.cos(g.rotation.y);
      if (moving) {
        // keep the ball a stride ahead, matching pace
        const tx = g.position.x + dx * 1.15, tz = g.position.z + dz * 1.15;
        v.x = (tx - ball.x) * 9 + dx * speed; v.z = (tz - ball.z) * 9 + dz * speed;
        const cap = speed * 1.6 + 2, sp = Math.hypot(v.x, v.z); if (sp > cap) { v.x *= cap / sp; v.z *= cap / sp; }
        v.y = Math.min(v.y, 0);
      } else if (m.lastKick === who || d < 1.0) { const sp = Math.hypot(v.x, v.z); if (sp > 3) { v.x *= 3 / sp; v.z *= 3 / sp; } v.x *= Math.max(0, 1 - 8 * dt); v.z *= Math.max(0, 1 - 8 * dt); }   // trap it at the feet
      m.lastKick = who;
    };
    const block = (g: THREE.Object3D, who: Footballer) => {
      const dx = ball.x - g.position.x, dz = ball.z - g.position.z, d = Math.hypot(dx, dz), sp = Math.hypot(v.x, v.z);
      if (d > 0.75 || d === 0 || sp < 7 || ball.y > gy + 1.5 || m.lastKick === who) return;
      const nx = dx / d, nz = dz / d, dot = v.x * nx + v.z * nz;
      if (dot < 0) { v.x -= 1.5 * dot * nx; v.z -= 1.5 * dot * nz; v.x *= 0.5; v.z *= 0.5; m.lastKick = who; this.sfx.bump(); }
    };
    const me = m.side[0];
    if (live) { block(this.player.group, me); control(this.player.group, this.moveAmount > 1 ? WALK_SPEED * 1.8 : WALK_SPEED, me, this.moveAmount > 0); }

    // --- AI: keeper holds the line, the closest outfielder chases, the rest keep their formation shape around the ball
    for (const team of [0, 1] as const) {
      const goalX = pt.x + (team === 0 ? hw : -hw), ownGoalX = pt.x - (team === 0 ? hw : -hw);
      const fs = m.side.filter((f) => f.team === team && f.bot);
      const dist = (f: Footballer) => f.bot!.av.group.position.distanceTo(ball);
      const out = fs.filter((f) => !f.gk);
      const chaser = out.length ? out.reduce((a, b) => (dist(a) < dist(b) ? a : b)) : null;
      for (const f of fs) {
        const b = f.bot!, bp = b.av.group.position;
        let tx: number, tz: number;
        if (!live) { tx = f.home.x; tz = f.home.z; }
        else if (f.gk) { tx = ownGoalX + (team === 0 ? 2.5 : -2.5); tz = pt.z + Math.max(-pt.goal - 0.5, Math.min(pt.goal + 0.5, (ball.z - pt.z) * 0.8)); }
        else if (f === chaser) { tx = ball.x - Math.sign(goalX - ball.x) * 0.9; tz = ball.z; }
        else { tx = pt.x + f.slot[0] + (ball.x - pt.x) * 0.45; tz = pt.z + f.slot[1] + (ball.z - pt.z) * 0.35; }
        tx = Math.max(pt.x - hw + 1, Math.min(pt.x + hw - 1, tx)); tz = Math.max(pt.z - hd + 1, Math.min(pt.z + hd - 1, tz));
        const dx = tx - bp.x, dz = tz - bp.z, d = Math.hypot(dx, dz);
        const speed = f === chaser ? (team === 1 ? 7.4 : 6.8) : f.gk ? 6 : 5.5;
        if (d > 0.4) { const sd = Math.min(d, speed * dt); bp.x += (dx / d) * sd; bp.z += (dz / d) * sd; b.av.group.rotation.y += wrapAngle(Math.atan2(dx, dz) - b.av.group.rotation.y) * Math.min(1, dt * 8); b.walking = Math.min(1, b.walking + dt * 4); }
        else b.walking = Math.max(0, b.walking - dt * 4);
        // spread out: never stand inside a team-mate
        for (const o of fs) { if (o === f) continue; const op = o.bot!.av.group.position, ox = bp.x - op.x, oz = bp.z - op.z, od = Math.hypot(ox, oz); if (od < 1.6 && od > 0) { bp.x += (ox / od) * (1.6 - od) * 0.5; bp.z += (oz / od) * (1.6 - od) * 0.5; } }
        bp.y = this.groundAt(bp.x, bp.z, bp.y);
        animateWalk(b.av, t * 2.2, b.walking);
        b.label.visible = true;
        if (!live) continue;
        block(b.av.group, f);
        const bd = Math.hypot(ball.x - bp.x, ball.z - bp.z);
        if (bd < 1.3 && t - f.kicked > 0.7) {
          const toGoal = Math.abs(goalX - ball.x);
          const dir = team === 0 ? 1 : -1;
          let ax: number, az: number, power: number, lift: number;
          const open = out.filter((o) => o !== f && (o.bot!.av.group.position.x - ball.x) * dir > 4 && o.bot!.av.group.position.distanceTo(ball) < 22);
          if (f.gk) { ax = goalX - ball.x; az = (Math.random() - 0.5) * 24; power = 16; lift = 4; }                                                   // keeper: hoof it clear
          else if (toGoal < 16) { ax = goalX - ball.x; az = pt.z + (Math.random() - 0.5) * pt.goal * 3 - ball.z; power = 17; lift = 3.5; }              // strike (a little wild)
          else if (open.length && Math.random() < 0.7) { const o = open[Math.floor(Math.random() * open.length)].bot!.av.group.position; ax = o.x + dir * 2 - ball.x; az = o.z - ball.z; power = Math.max(8, Math.min(15, Math.hypot(ax, az) * 0.8)); lift = 1.5; }   // pass
          else { ax = goalX - ball.x; az = (Math.random() - 0.5) * 8; power = 7.5; lift = 0.8; }                                                     // push it on
          const al = Math.hypot(ax, az);
          v.set((ax / al) * power, lift, (az / al) * power);
          f.kicked = t; m.lastKick = f;
          this.sfx.bump();
          if (Math.random() < 0.1) this.botSays(b, f.gk ? 'Cleared! 🧤' : team === 0 ? 'Yours! 🙌' : 'Coming through! 💨', 0);
        } else if (f === chaser) control(b.av.group, speed, f, d > 0.4);
      }
    }

    // --- clock, HUD, full time
    const left = Math.max(0, m.endAt - t);
    if (t - this.lastMatchHud > 0.25) {
      this.lastMatchHud = t;
      const mm = Math.floor(left / 60), ss = Math.floor(left % 60).toString().padStart(2, '0');
      this.ev.onQuest({ status: 'active', title: `⚽ You ${m.score[0]} - ${m.score[1]} ${m.opp}'s team`, desc: `Blue: ${this.playerName}, ${m.mates}
Red: ${m.rivals}`, progress: this.mobile ? 'Run into the ball · Kick shoots' : 'Run into the ball to dribble · Space shoots (harder while running)', remaining: left, total: MATCH_SECONDS, reward: 300, hint: null, timeText: `${mm}:${ss}` });
    }
    if (left <= 0 || m.score[0] >= 5 || m.score[1] >= 5) {
      m.over = true; m.endAt = t + 3;
      const win = m.score[0] === m.score[1] ? null : m.score[0] > m.score[1];
      this.ev.onQuest({ status: win === false ? 'failed' : 'done', title: `Full time · ${m.score[0]} - ${m.score[1]}`, desc: win === null ? 'A draw — rematch?' : win ? 'You win the match!' : `${m.opp}'s team take it`, progress: '', remaining: 0, total: MATCH_SECONDS, reward: 300, hint: null });
      this.gameResult('football', win, m.opp);
    }
  }

  private endFootball() {
    const m = this.match; if (!m) return;
    this.match = null;
    this.ev.onMode(null);
    this.scene.remove(m.ball);
    for (const f of m.side) { f.bib.removeFromParent(); if (f.bot) { f.bot.playing = false; f.bot.wait = rand(1, 3); f.bot.target = this.randomLandPoint(8, 120); f.bot.speed = rand(1.8, 3.4); } }
    this.ev.onQuest(null);
    this.questCooldown = 10;
  }

  // ---------- cricket ----------
  kick() { this.wantKick = true; }
  batMove(dir: number) { this.batDir = Math.sign(dir); }
  /** Bowling speed: slow / medium / fast (cycles). */
  cyclePace() { const c = this.cricket; if (!c || c.innings !== 2 || c.phase === 'flight' || c.phase === 'hit') return; c.pace = ((c.pace + 1) % 3) as 0 | 1 | 2; this.ev.onCollect({ name: ['🐢 Slow ball — more bounce, harder to time', '🎯 Medium pace', '⚡ Fast — beats the bat, but loose ones fly'][c.pace], points: 0, color: 0x3fb7d9, shape: 'gem' }); }

  /** In a game, race or zombie night: the HUD and the world drop everything that is not the game. */
  private inMode() { return !!(this.match || this.cricket || this.race || this.pool || this.carrom || (this.zombies && !this.zombies.ending)); }

  private onStrip() {
    const o = this.oval; if (!o) return false;
    const q = this.player.group.position;
    return Math.abs(q.x - o.x) < o.len / 2 + 4 && Math.abs(q.z - o.z) < 4;
  }

  /** A two-innings match at the cricket ground: you bat first, then `opp` (or a passer-by) chases while you bowl. */
  startCricket(opp?: Bot, balls?: number) {
    const o = this.oval;
    if (!o || this.cricket || this.match || this.race) return;
    if (balls === undefined) {   // ask how long a match first
      this.ev.onPick({ title: 'How many overs?', sub: 'Each side bats the same. Wickets: 2 for a single over, 3 up to two, 5 beyond that.', options: ['1 over', '2 overs', '3 overs', '5 overs'] }, (i) => this.startCricket(opp, [6, 12, 18, 30][i]));
      return;
    }
    if (this.driving) this.exitVehicle();
    const pool = this.bots.filter((x) => !x.remote && !x.riding && !x.knocked && !x.playing && x !== opp && this.hangout?.bot !== x);
    const rival = opp && !opp.remote && !opp.riding && !opp.knocked ? opp : pool.shift();
    if (!rival) return;
    const fielders = pool.slice(0, 6).map((bot, i) => {
      const a = [-2.2, -1.2, -0.5, 0.5, 1.2, 2.2][i], r = i === 2 || i === 3 ? 22 : 27;   // a ring around the batting end
      return { bot, home: new THREE.Vector3(o.x - 10 + Math.cos(a) * r, 0, o.z + Math.sin(a) * r) };
    });
    for (const f of [{ bot: rival }, ...fielders]) { f.bot.playing = true; f.bot.wait = 0; f.bot.knocked = null; }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshStandardMaterial({ color: 0xe0392b, emissive: 0x5a0a0a, roughness: 0.5 }));
    ball.visible = false; this.scene.add(ball);
    const stumps = this.scene.getObjectByName('stumps-bat') ?? null;
    this.cricket = { phase: 'ready', t0: this.elapsed + 1, ball, vel: new THREE.Vector3(), opp: rival, fielders, chaser: null, runs: 0, wkts: 0, balls: 0, total: balls, target: 0, bat: this.makeBat(), swingAt: -1, note: '', hit: false, airborne: false, bounced: false, line: 0, flightT: 1, stumps, last: '', innings: 1, first: 0, released: -1, quality: 0.5, decided: false, maxWkts: balls <= 6 ? 2 : balls <= 12 ? 3 : 5, aim: 0, pace: 1 };
    for (const f of fielders) { f.home.y = this.terrain.h(f.home.x, f.home.z); f.bot.av.group.position.copy(f.home); f.bot.av.group.rotation.y = Math.atan2(o.x - 10 - f.home.x, o.z - f.home.z); }
    this.setCreases();
    this.clearQuest();
    this.questCooldown = 8;
    this.sfx.questStart();
    this.ev.onMode({ icon: '🏏', label: 'Bat', arrows: true });
    this.ev.onCollect({ name: `You bat first · ${balls / 6} over${balls > 6 ? 's' : ''}, ${this.cricket.maxWkts} wickets · then ${rival.name} chases`, points: 0, color: 0x2fa66a, shape: 'gem' });
    this.botSays(rival, 'Watch the ball, not me 😏', 1.5);
  }

  /** Batting animation: side-on stance with the bat tapped down, backlift as the ball comes, downswing, follow-through, recover. */
  private batPose(av: Avatar, c: CricketState, t: number, you: boolean) {
    const ease = (k: number) => k * k * (3 - 2 * k);
    const sT = t - c.swingAt;
    // where the swing is: 0 = stance, 1 = top of the backlift, 2 = contact, 3 = follow-through
    let lift = 0, swing = 0, follow = 0;
    if (sT >= 0 && sT < 1.0) {
      if (sT < 0.13) { swing = ease(sT / 0.13); lift = 1; }
      else if (sT < 0.5) { swing = 1; follow = ease((sT - 0.13) / 0.37); lift = 1; }
      else { swing = 1 - ease((sT - 0.5) / 0.5); follow = 1 - ease((sT - 0.5) / 0.5); lift = 0; }
    } else if (c.phase === 'flight' && !c.hit) {
      const u = Math.min(1, (t - c.t0) / c.flightT); lift = ease(Math.min(1, u / 0.55));   // backlift as the ball comes down
    } else if (c.phase === 'runup') { lift = 0; }
    const stanceArmX = -0.75, backX = 0.9, contactX = -1.75, throughX = -2.6;
    let armX = stanceArmX + (backX - stanceArmX) * lift;
    if (swing > 0) armX = backX + (contactX - backX) * swing;
    if (follow > 0) armX = contactX + (throughX - contactX) * follow;
    av.armR.rotation.x = armX; av.armL.rotation.x = armX + 0.15;
    av.armR.rotation.z = -0.4 + follow * 0.6; av.armL.rotation.z = 0.4 + lift * 0.3 - follow * 0.2;
    // side-on stance, knees bent; the body turns into the shot and unwinds
    av.group.rotation.y = Math.PI / 2 - 0.85 + swing * 1.3 + follow * 0.6;
    av.body.rotation.y = -0.2 + lift * -0.3 + swing * 0.5 + follow * 0.6;
    av.body.rotation.x = 0.18 + lift * 0.08 - follow * 0.1;
    av.body.position.y = 0.78 + (1 - lift) * 0.02 + follow * 0.05;
    av.legL.rotation.x = -0.25 + swing * 0.3 - follow * 0.2; av.legR.rotation.x = -0.15 - swing * 0.25 + follow * 0.35;
    av.legL.rotation.z = 0.18; av.legR.rotation.z = -0.18;
    if (!you) { av.legL.rotation.z = 0.18; av.legR.rotation.z = -0.18; }
  }

  private makeBat() {
    const bat = new THREE.Group();
    bat.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.06), new THREE.MeshStandardMaterial({ color: 0x222222 })));
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.62, 0.26), new THREE.MeshStandardMaterial({ color: 0xd8b98a })); blade.position.y = -0.42; bat.add(blade);
    bat.position.set(0, -0.62, 0.05);
    return bat;
  }

  /** Batter to the crease (in front of the stumps, a touch to leg), bowler to the top of the run-up. */
  private setCreases() {
    const c = this.cricket!, o = this.oval!, y = this.terrain.h(o.x, o.z);
    const batter = c.innings === 1 ? this.player : c.opp.av, bowler = c.innings === 1 ? c.opp.av : this.player;
    batter.group.position.set(o.x - 10 + 1.0, y, o.z - 0.15); batter.group.rotation.y = Math.PI / 2;   // bat arc sits on the line of a straight ball
    bowler.group.position.set(o.x + 26, this.terrain.h(o.x + 26, o.z), o.z - 1.2); bowler.group.rotation.y = -Math.PI / 2;
    c.bat.removeFromParent(); batter.armR.add(c.bat);
    this.airY = 0; this.vy = 0; this.yaw = c.innings === 1 ? -Math.PI / 2 : Math.PI / 2;
    if (c.balls === 0) { this.pitch = 0.22; this.dist = 24; this.camDist = 24; }   // start each innings zoomed right out and low, like a broadcast camera
    c.ball.visible = false;
  }

  /** Space / Bat: innings 1 swings the bat, innings 2 releases the ball. Timing decides everything. */
  private swing(): boolean {
    const c = this.cricket!;
    if (c.innings === 2) {
      if (c.phase === 'runup' && c.released < 0) c.released = Math.min(1, (this.elapsed - c.t0) / 1.8);
      return true;
    }
    if (c.phase !== 'flight' || c.hit) { if (c.phase === 'ready' || c.phase === 'runup') c.swingAt = this.elapsed; return true; }
    const o = this.oval!, dx = c.ball.position.x - (o.x - 10);   // distance still to travel to the bat
    const reach = Math.abs(c.ball.position.z - (this.player.group.position.z - 0.55));   // how far the ball is from the bat's arc
    const q = Math.max(0, 1 - Math.abs(dx - 1.1) / 2.0) * (reach < 0.9 ? 1 : reach < 1.6 ? 0.6 : 0.1);   // 1 = perfect; a generous window, out of reach = a waft
    this.strike(q, dx > 1.1);
    return true;
  }

  /** The bat meets the ball with quality q (0..1): sets the ball flying, or misses / edges it. */
  private strike(q: number, early: boolean) {
    const c = this.cricket!, o = this.oval!, ball = c.ball.position;
    c.swingAt = this.elapsed; c.hit = true;
    if (q < 0.1) { c.note = q < 0.04 ? 'Missed it…' : 'Edged… caught behind!'; if (q >= 0.04 && (c.innings === 2 || Math.random() < 0.5)) this.wicket(); else { c.hit = false; c.note = 'Missed it…'; } return; }
    const power = (c.innings === 1 ? 17 : 14) + q * 20 + Math.random() * 3, lift = early ? 0.72 + (1 - q) * 0.3 : q > 0.6 ? 0.42 : 0.2;   // your bat has a little more in it
    const side = early ? 1 : -1, ang = (1 - q) * 0.9 * side + (Math.random() - 0.5) * 0.3;   // early pulls to leg, late squirts to off
    c.vel.set(Math.cos(ang) * Math.cos(lift) * power, Math.sin(lift) * power, Math.sin(ang) * Math.cos(lift) * power);
    ball.set(o.x - 10 + 0.6, this.terrain.h(ball.x, ball.z) + 0.8, (c.innings === 1 ? this.player.group.position.z - 0.55 : o.z + 0.3));
    c.airborne = lift > 0.3; c.bounced = false; c.phase = 'hit'; c.t0 = this.elapsed;
    c.note = q > 0.85 ? 'Sweet timing!' : early ? 'Pulled high…' : 'Squeezed away';
    c.chaser = null;
    this.sfx.bump();
  }

  private wicket() {
    const c = this.cricket!;
    c.wkts++; c.phase = 'result'; c.t0 = this.elapsed; c.last = 'OUT';
    if (c.stumps && c.note.startsWith('Bowled')) c.stumps.rotation.z = -1.3;
    if (c.innings === 1) { this.sfx.questFail(); this.botSays(c.opp, ['Gotcha! 🎯', 'Next! 😎', 'Timber! 🏏'][c.wkts % 3], 0.5); }
    else { this.sfx.questDone(); this.points += 25; this.ev.onPoints(this.points); this.botSays(c.opp, ['Argh! 😤', 'Lucky ball…', 'Fine, fine 🙄'][c.wkts % 3], 0.5); }
    this.ev.onCollect({ name: `${c.note} · WICKET`, points: c.innings === 2 ? 25 : 0, color: c.innings === 2 ? 0x2fa66a : 0xd94a3d, shape: 'box' });
  }

  private tickCricket(dt: number, t: number) {
    const c = this.cricket!, o = this.oval!, ball = c.ball.position, batX = o.x - 10, y0 = this.terrain.h(o.x, o.z);
    const batting = c.innings === 1, batter = batting ? this.player : c.opp.av, bowler = batting ? c.opp.av : this.player;
    this.yaw += wrapAngle((batting ? -Math.PI / 2 : Math.PI / 2) - this.yaw) * Math.min(1, dt * 3);
    this.batPose(batter, c, t, batting);
    const bp = bowler.group.position;
    const held = this.batDir || (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
    if (batting) { const bz = this.player.group.position; bz.z = Math.max(o.z - 1.6, Math.min(o.z + 2.4, bz.z + held * 2.6 * dt)); }   // shuffle across to reach a wide one
    if (!batting && (c.phase === 'ready' || c.phase === 'runup')) { if (this.keys.has('w') || this.keys.has('arrowup')) { if (!this.paceKey) { c.pace = Math.min(2, c.pace + 1) as 0 | 1 | 2; this.paceKey = true; } } else if (this.keys.has('s') || this.keys.has('arrowdown')) { if (!this.paceKey) { c.pace = Math.max(0, c.pace - 1) as 0 | 1 | 2; this.paceKey = true; } } else this.paceKey = false; }
    else if (c.phase === 'ready' || c.phase === 'runup') c.aim = Math.max(-1, Math.min(1, c.aim + held * 1.6 * dt));            // pick a line before you let go
    if (c.phase === 'ready' && t > c.t0) {
      c.phase = 'runup'; c.t0 = t; c.hit = false; c.released = -1; c.decided = false;
      c.line = Math.random() < 0.65 ? (Math.random() - 0.5) * 0.5 : (Math.random() - 0.5) * 2.0; c.flightT = 0.95 + Math.random() * 0.3;   // their bowling: mostly straight, a touch slower so you can read it
      if (c.stumps) c.stumps.rotation.z = 0;
    }
    if (c.phase === 'runup') {
      const u = Math.min(1, (t - c.t0) / 1.8);
      bp.x = o.x + 26 - u * 15; bp.y = this.terrain.h(bp.x, bp.z);
      if (batting) animateWalk(bowler, t * 2.4, 1); else { this.moveAmount = 1; animateWalk(bowler, t * 2.4, 1); }
      if (u > 0.7) { const a = (u - 0.7) / 0.3; bowler.armR.rotation.x = -a * Math.PI * 2; bowler.armR.rotation.z = -0.25; bowler.armL.rotation.x = -1.2 + a * 1.4; bowler.body.rotation.z = -0.2 + a * 0.35; } else bowler.body.rotation.z = 0;   // wind-up: the bowling arm goes over the top
      if (u >= 1) {
        if (!batting) {   // your release: how close to the top of the action was it?
          const rel = c.released < 0 ? 0.55 : c.released;
          c.quality = Math.max(0, 1 - Math.abs(rel - 0.93) / 0.22);     // 1 = released right at the top
          c.line = c.aim * 1.1 + (c.quality > 0.7 ? (Math.random() - 0.5) * 0.4 : c.quality > 0.35 ? (Math.random() - 0.5) * 1.2 : (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random()));
          c.flightT = [1.05, 0.85, 0.66][c.pace] + (c.quality > 0.7 ? Math.random() * 0.08 : Math.random() * 0.25);
          c.note = c.quality > 0.7 ? 'Good ball' : c.quality > 0.35 ? 'A bit loose' : 'Way down leg…';
        }
        c.phase = 'flight'; c.t0 = t; c.ball.visible = true; ball.set(bp.x, bp.y + 2.2, o.z); c.hit = false;
      }
    }
    if (c.phase === 'flight') {
      // a bounce two-thirds of the way, then up to bat height, along the chosen line
      const u = Math.min(1, (t - c.t0) / c.flightT), sx = o.x + 11, ex = batX - 1.5;
      ball.x = sx + (ex - sx) * u; ball.z = o.z + c.line * u;
      const bounceU = 0.68;
      ball.y = y0 + (u < bounceU ? 2.2 - (2.2 - 0.18) * (u / bounceU) + Math.sin((u / bounceU) * Math.PI) * 0.1 : 0.18 + Math.sin(((u - bounceU) / (1 - bounceU)) * Math.PI * 0.5) * (0.5 + Math.abs(c.line) * 0.3));
      // the AI batter decides as the ball arrives
      if (!batting && !c.decided && ball.x - batX < 1.6) {
        c.decided = true;
        const r = Math.random(), qb = c.quality + (c.pace === 2 ? 0.08 : c.pace === 0 ? -0.05 : 0), soft = c.pace === 0 ? 0.8 : 1;   // fast beats the bat more; slow balls are hit softer but sat up when loose
        if (qb > 0.7) { if (r < 0.45 + (c.pace === 2 ? 0.08 : 0)) { /* beaten */ } else this.strike(r < 0.8 ? 0.2 + Math.random() * 0.25 : 0.55 + Math.random() * 0.25, Math.random() < 0.3); }
        else if (qb > 0.35) { if (r < 0.18) { /* beaten */ } else this.strike(r < 0.55 ? 0.35 + Math.random() * 0.3 : 0.7 + Math.random() * 0.25, Math.random() < 0.4); }
        else { if (r < 0.06) { /* beaten */ } else this.strike((0.8 + Math.random() * 0.2) * (c.pace === 2 ? 1.05 : soft), Math.random() < 0.5); }
        if (c.phase === 'flight') c.swingAt = t;   // swung and missed, or left it
      }
      if (u >= 1 && !c.hit) {
        const onStumps = Math.abs(c.line) < 0.45 && ball.y - y0 < 0.75;
        c.note = onStumps ? (batting ? 'Bowled him!' : `Bowled ${c.opp.name}!`) : batting ? 'Dot ball' : 'Beaten · dot ball';
        if (onStumps) this.wicket(); else { c.phase = 'result'; c.t0 = t; c.last = '·'; if (!batting) { this.points += 5; this.ev.onPoints(this.points); } }
        c.ball.visible = !onStumps;
      }
    }
    if (c.phase === 'hit') {
      // free flight, bounce, roll; fielders converge; boundary = 4 or 6
      c.vel.y -= GRAVITY * 0.7 * dt; ball.addScaledVector(c.vel, dt);
      const gy = this.terrain.h(ball.x, ball.z) + 0.16;
      if (ball.y < gy) {
        ball.y = gy;
        if (!c.bounced && c.airborne) {   // first bounce: was anyone under it?
          const catcher = c.fielders.find((f) => f.bot.av.group.position.distanceTo(ball) < 2.6);
          if (catcher) { c.note = `Caught by ${catcher.bot.name}!`; this.botSays(catcher.bot, 'Got it! 🙌', 0.2); this.wicket(); c.ball.visible = false; return; }
        }
        c.bounced = true; c.vel.y = Math.abs(c.vel.y) < 2 ? 0 : -c.vel.y * 0.45; c.vel.x *= 0.85; c.vel.z *= 0.85;
      }
      if (ball.y <= gy + 0.02) { c.vel.x -= c.vel.x * Math.min(1, 0.7 * dt); c.vel.z -= c.vel.z * Math.min(1, 0.7 * dt); }
      c.ball.rotation.x += c.vel.z * dt / 0.16; c.ball.rotation.z -= c.vel.x * dt / 0.16;
      const dist = Math.hypot(ball.x - o.x, ball.z - o.z);
      if (dist >= o.r) {   // over the rope
        const six = !c.bounced;
        c.runs += six ? 6 : 4; c.last = six ? 'SIX!' : 'FOUR!'; c.phase = 'result'; c.t0 = t;
        if (batting) { this.points += six ? 30 : 20; this.ev.onPoints(this.points); this.sfx.questDone(); }
        else this.botSays(c.opp, six ? 'Into the crowd! 💥' : 'Too easy 😎', 0.3);
        this.ev.onCollect({ name: six ? (batting ? 'SIX! Over the rope on the full' : `${c.opp.name} launches it for SIX`) : batting ? 'FOUR! Along the carpet' : `${c.opp.name} finds the rope · FOUR`, points: batting ? (six ? 30 : 20) : 0, color: batting ? 0x2fa66a : 0xd94a3d, shape: 'gem' });
        return;
      }
      // nearest fielder chases; when they get there the ball is dead and runs are counted by how far it went
      if (!c.chaser) c.chaser = c.fielders.reduce((a, b) => (a.bot.av.group.position.distanceTo(ball) < b.bot.av.group.position.distanceTo(ball) ? a : b)).bot;
      const fp = c.chaser.av.group.position, fdx = ball.x - fp.x, fdz = ball.z - fp.z, fd = Math.hypot(fdx, fdz);
      if (fd > 1 && ball.y - gy < 3) { const s = Math.min(fd, 6.5 * dt); fp.x += (fdx / fd) * s; fp.z += (fdz / fd) * s; c.chaser.av.group.rotation.y = Math.atan2(fdx, fdz); animateWalk(c.chaser.av, t * 2.2, 1); }
      else if (fd <= 1) {
        const far = Math.hypot(ball.x - batX, ball.z - o.z), runs = far < 12 ? (Math.random() < 0.5 ? 1 : 0) : far < 22 ? 1 : far < 30 ? 2 : 3;
        c.runs += runs; c.last = runs ? `${runs} run${runs > 1 ? 's' : ''}` : 'no run'; c.phase = 'result'; c.t0 = t;
        if (batting && runs) { this.points += runs * 5; this.ev.onPoints(this.points); }
        if (!batting && !runs) { this.points += 5; this.ev.onPoints(this.points); }
        this.ev.onCollect({ name: `${c.note} · ${c.last}`, points: batting ? runs * 5 : runs ? 0 : 5, color: (batting ? runs : !runs) ? 0x2fa66a : 0x999999, shape: 'gem' });
        c.chaser.av.group.position.set(fp.x, this.terrain.h(fp.x, fp.z), fp.z);
      }
      fp.y = this.terrain.h(fp.x, fp.z);
    }
    if (c.phase === 'result' && t > c.t0 + 2.4) {
      c.balls++;
      for (const f of c.fielders) { const g = f.bot.av.group; g.position.lerp(f.home, 0.5); g.position.y = this.terrain.h(g.position.x, g.position.z); }
      const chased = !batting && c.runs >= c.target;
      if (c.balls >= c.total || c.wkts >= c.maxWkts || chased) {
        if (batting) {   // innings break: swap ends, they chase your total
          c.first = c.runs; c.target = c.runs + 1; c.innings = 2; c.runs = 0; c.wkts = 0; c.balls = 0; c.last = ''; c.note = '';
          this.setCreases();
          c.phase = 'ready'; c.t0 = t + 3;
          this.ev.onMode({ icon: '🏏', label: 'Bowl', arrows: true, pace: true });
          this.ev.onCollect({ name: `Innings over · you made ${c.first}. Now bowl: tap Bowl at the top of your action`, points: 0, color: 0x3fb7d9, shape: 'gem' });
          this.botSays(c.opp, `${c.first}? Easy 😏`, 1);
          this.sfx.questStart();
        } else {
          c.phase = 'over'; c.t0 = t;
          const win = c.runs < c.target;
          this.ev.onQuest({ status: win ? 'done' : 'failed', title: win ? `You win by ${c.target - 1 - c.runs} run${c.target - 1 - c.runs === 1 ? '' : 's'}!` : `${c.opp.name} chased it down`, desc: `You ${c.first} · ${c.opp.name} ${c.runs}/${c.wkts}`, progress: '', remaining: 0, total: 1, reward: 200, hint: null, fill: 1, timeText: win ? '🏆' : '🏏' });
          this.gameResult('cricket', win, c.opp.name);
        }
      } else { c.phase = 'ready'; c.t0 = t + 1.2; this.setCreases(); }
    }
    if (c.phase === 'over' && t > c.t0 + 4) { this.endCricket(); return; }
    if (t - this.lastCricketHud > 0.15 && c.phase !== 'over') {
      this.lastCricketHud = t;
      const runupU = c.phase === 'runup' && !batting ? Math.min(1, (t - c.t0) / 1.8) : null;
      this.ev.onQuest({
        status: 'active',
        title: batting ? `🏏 You ${c.runs} / ${c.wkts}` : `🏏 ${c.opp.name} ${c.runs} / ${c.wkts} · needs ${Math.max(0, c.target - c.runs)} off ${c.total - c.balls}`,
        desc: batting ? `${c.opp.name} bowling · ◀ ▶ shuffle into line, Space / Bat as the ball reaches you. Perfect timing = six, early = high, late = along the ground.` : `You are bowling · ◀ ▶ aim the line, Speed button / W S for pace, tap Bowl / Space at the top of your action. Wickets +25, dot balls +5.`,
        progress: runupU !== null ? (c.released >= 0 ? 'Released!' : runupU > 0.85 ? 'NOW!' : `Running in… ${['🐢 slow', '🎯 medium', '⚡ fast'][c.pace]} · ${c.aim < -0.3 ? 'leg side' : c.aim > 0.3 ? 'off side' : 'at the stumps'}`) : c.last ? `Last ball: ${c.last}${!batting ? ` · ${['🐢 slow', '🎯 medium', '⚡ fast'][c.pace]}` : ''}` : 'First ball coming up',
        remaining: c.total - c.balls, total: c.total, reward: 200, hint: null,
        fill: runupU !== null ? runupU : c.balls / c.total, timeText: `${c.balls}/${c.total}`,
      });
    }
  }

  private endCricket() {
    const c = this.cricket; if (!c) return;
    this.cricket = null;
    this.scene.remove(c.ball); c.bat.removeFromParent();
    if (c.stumps) c.stumps.rotation.z = 0;
    for (const av of [this.player, c.opp.av]) { av.armR.rotation.z = 0; av.armL.rotation.z = 0; av.body.rotation.set(0, 0, 0); av.body.position.y = 0.85; av.legL.rotation.z = 0; av.legR.rotation.z = 0; av.legL.rotation.x = 0; av.legR.rotation.x = 0; }
    for (const b of [c.opp, ...c.fielders.map((f) => f.bot)]) { b.playing = false; b.av.armR.rotation.z = 0; b.av.armL.rotation.z = 0; b.wait = rand(1, 3); b.target = this.randomLandPoint(8, 120); b.speed = rand(1.8, 3.4); }
    this.ev.onMode(null);
    this.ev.onQuest(null);
    this.questCooldown = 10;
  }

  // ---------- zombie night ----------
  toggleZombies() {
    if (this.zombies && !this.zombies.ending) { this.endZombies(false); return; }
    if (this.zombies) { this.applyNight(0); this.zombies = null; }   // still dawning: skip straight to day and start over
    if (this.race || this.match) return;
    this.zombies = { list: [], wave: 0, hp: 100, kills: 0, breather: 3, punchAt: -1, fade: 0, ending: false, blasts: [], nextSpawn: 0 };
    this.clearQuest();
    this.questCooldown = 30;
    this.sfx.siren();
    this.ev.onMode({ icon: '🥊', label: 'Punch' });
    this.ev.onCollect({ name: '🧟 Zombie night — they are coming for you', points: 0, color: 0x7a1f1f, shape: 'box' });
    document.getElementById('zombiebtn')?.classList.add('on');
  }

  /** Blend the sky, fog and lights between day (0) and zombie night (1). */
  private applyNight(f: number) {
    const dl = this.daylight, night = { sky: 0x151c22, fog: 0x1a2320, sun: 0x9fb8a0 };
    (this.scene.background as THREE.Color).setHex(dl.sky).lerp(new THREE.Color(night.sky), f);
    const fog = this.scene.fog as THREE.Fog; fog.color.setHex(dl.fog).lerp(new THREE.Color(night.fog), f); fog.near = dl.near + (40 - dl.near) * f; fog.far = dl.far + (170 - dl.far) * f;
    this.sun.color.setHex(dl.sun).lerp(new THREE.Color(night.sun), f); this.sun.intensity = dl.sunI + (0.45 - dl.sunI) * f;
    this.hemi.intensity = dl.hemiI + (0.35 - dl.hemiI) * f;
  }

  private spawnWave() {
    const z = this.zombies!;
    z.wave++;
    const n = Math.min(this.mobile ? 30 : 48, 6 + z.wave * 4);
    const pp = this.driving ? this.driving.group.position : this.player.group.position;
    const dirs = [0, 1, 2].map(() => Math.random() * Math.PI * 2);   // they come in packs from a few directions
    let headless = 0;
    for (let i = 0; i < n; i++) {
      let x = pp.x, zz = pp.z;
      for (let k = 0; k < 12; k++) {
        const a = dirs[i % dirs.length] + rand(-0.6, 0.6), r = rand(20, 40);
        const tx = pp.x + Math.cos(a) * r, tz = pp.z + Math.sin(a) * r;
        if (Math.hypot(tx, tz) < WORLD_RADIUS - 10 && this.terrain.onLand(tx, tz) && this.walkable(tx, tz)) { x = tx; zz = tz; break; }
      }
      if (Math.hypot(x - pp.x, zz - pp.z) < 12) continue;   // nowhere free to put it
      const kind = this.spawnZombie(x, zz, headless < 2 && Math.random() < 0.35);
      if (kind === 'headless') headless++;
    }
    this.sfx.groan();
    const special = (['brute', 'bloater', 'crawler', 'hopper', 'runner', 'headless'] as ZombieKind[]).map((k) => [k, z.list.filter((zb) => zb.kind === k && !zb.dying).length] as const).filter(([, c]) => c > 0).map(([k, c]) => `${c} ${k}${c > 1 ? 's' : ''}`);
    this.ev.onCollect({ name: `Wave ${z.wave} · ${n} zombies${special.length ? ' · ' + special.join(', ') : ''}`, points: 0, color: 0x7a1f1f, shape: 'box' });
  }

  /** One zombie at (x, z). At most a couple per wave come without a head. */
  private spawnZombie(x: number, zz: number, headlessOk: boolean): ZombieKind {
    const z = this.zombies!;
    const pp = this.driving ? this.driving.group.position : this.player.group.position;
    {
      const look = ZOMBIE_LOOKS[Math.floor(Math.random() * ZOMBIE_LOOKS.length)], skin = ZOMBIE_SKINS[Math.floor(Math.random() * ZOMBIE_SKINS.length)];
      const av = makeAvatar({ ...look.style, shirt: dirty(look.style.shirt), pants: dirty(look.style.pants), skin });
      av.group.userData.skin = skin;
      av.group.position.set(x, this.groundAt(x, zz, this.terrain.h(x, zz)), zz);
      av.group.rotation.y = Math.atan2(pp.x - x, pp.z - zz);
      // every one of them is wrong in its own way: lanky or squat, hunched, head lolling, glowing eyes, a dragging leg
      const roll = Math.random();
      const kind: ZombieKind = z.wave >= 3 && roll < 0.08 ? 'brute' : z.wave >= 3 && roll < 0.2 ? 'bloater' : z.wave >= 2 && roll < 0.35 ? 'crawler' : z.wave >= 2 && roll < 0.47 ? 'hopper' : z.wave >= 2 && roll < 0.72 ? 'runner' : headlessOk ? 'headless' : 'walker';
      const runner = kind === 'runner';
      av.group.scale.set(rand(0.85, 1.15), runner ? rand(0.8, 0.95) : rand(0.9, 1.3), rand(0.85, 1.15));
      if (kind === 'brute') av.group.scale.set(1.6, 1.7, 1.6);
      if (kind === 'bloater') av.group.scale.set(1.35, 1.0, 1.35);
      if (kind === 'crawler') { av.legL.visible = av.legR.visible = false; av.body.position.y = 0.45; }
      av.body.rotation.x = runner ? 0.55 : kind === 'crawler' ? 1.25 : kind === 'hopper' ? 0.6 : rand(0.15, 0.45);
      let belly: THREE.Mesh | null = null;
      if (kind === 'bloater') { belly = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), new THREE.MeshStandardMaterial({ color: 0x9dff4a, emissive: 0x66ff33, emissiveIntensity: 1.2 })); belly.position.set(0, 0.32, 0.28); av.body.add(belly); }
      const head = av.body.children.find((c) => c.type === 'Group' && Math.abs(c.position.y - 1.02) < 0.01) ?? null;
      const tilt = rand(-0.5, 0.5);
      if (head && kind === 'headless') head.visible = false;
      dressZombie(av, look, kind === 'headless' ? null : head);
      if (head && kind !== 'headless') {
        head.rotation.z = tilt; head.rotation.x = rand(-0.2, 0.3);
        for (const sx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff3030, emissiveIntensity: 2 })); eye.position.set(sx * 0.13, 0.33, 0.32); head.add(eye); }
        if (Math.random() < 0.5) head.position.y += rand(0.05, 0.16);   // neck stretched
      }
      this.scene.add(av.group);
      const baseHp = 2 + Math.floor(z.wave / 3);
      const hp = kind === 'brute' ? baseHp + 5 : kind === 'crawler' ? 1 : kind === 'bloater' ? baseHp + 1 : baseHp;
      const speed = runner ? Math.min(10, 6.5 + z.wave * 0.4) : kind === 'brute' ? 2.2 : kind === 'crawler' ? Math.min(7.5, 4 + z.wave * 0.3) : kind === 'bloater' ? 2 : kind === 'hopper' ? 1.6 : Math.min(7, 2.8 + z.wave * 0.35 + Math.random() * 1.2);
      z.list.push({ av, kind, hp, speed, dying: 0, hitAt: -1, groan: this.elapsed + Math.random() * 6, head, limp: kind === 'walker' && Math.random() < 0.5, tilt, sway: rand(0.6, 1.6), arms: kind === 'headless' ? 0 : Math.floor(Math.random() * 3), twitchAt: this.elapsed + rand(1, 4), runner, hop: null, hopAt: this.elapsed + rand(0.5, 1.4), belly });
      return kind;
    }
  }

  /** Space during zombie night: punch the nearest zombie in front of you. */
  private punch(): boolean {
    const z = this.zombies!;
    if (z.ending || this.driving || this.elapsed - z.punchAt < 0.25) return false;
    const p = this.player.group.position, ry = this.player.group.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry);
    let best: Zombie | null = null, bd = 2.6;
    for (const zb of z.list) {
      if (zb.dying) continue;
      const q = zb.av.group.position, dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
      if (d < bd && (d < 1 || (dx * fx + dz * fz) / d > 0.2)) { bd = d; best = zb; }
    }
    if (!best) return false;
    z.punchAt = this.elapsed;
    best.hp--; best.hitAt = this.elapsed;   // staggered: no bite for a moment
    const q = best.av.group.position, dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1;
    const kb = best.kind === 'brute' ? 0.4 : 1.6, nx = q.x + (dx / d) * kb, nz = q.z + (dz / d) * kb;
    if (this.walkable(nx, nz, q.y)) { q.x = nx; q.z = nz; }
    if (best.hp <= 0) this.killZombie(best); else this.sfx.punch();
    return true;
  }

  private killZombie(zb: Zombie) {
    const z = this.zombies!;
    zb.dying = 1.8; z.kills++;
    this.points += zb.kind === 'brute' ? 40 : zb.kind === 'bloater' ? 20 : 10; this.ev.onPoints(this.points);
    this.sfx.thud();
    if (zb.kind === 'bloater') {   // bursts: a cloud that hurts you and takes the mob around it down with it
      const q = zb.av.group.position;
      const blast = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x9dff4a, emissive: 0x66ff33, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 }));
      blast.position.set(q.x, q.y + 1, q.z); this.scene.add(blast); z.blasts.push({ mesh: blast, t0: this.elapsed });
      const pp = this.driving ? this.driving.group.position : this.player.group.position;
      if (!this.driving && pp.distanceTo(q) < 4) { z.hp -= 14; this.ev.onHurt(); this.sfx.ouch(); }
      for (const o of z.list) if (o !== zb && !o.dying && o.av.group.position.distanceTo(q) < 4) this.killZombie(o);
      this.ev.onCollect({ name: 'Bloater burst!', points: 0, color: 0x66ff33, shape: 'gem' });
    }
  }

  private tickZombies(dt: number, t: number) {
    const z = this.zombies!;
    // night falls (and lifts again when the mode ends)
    z.fade = Math.max(0, Math.min(1, z.fade + (z.ending ? -dt / 6 : dt / 2.5)));
    this.applyNight(z.fade);
    if (z.ending) { if (z.fade <= 0) { this.zombies = null; this.ev.onQuest(null); } return; }

    const driving = this.driving;
    const pp = driving ? driving.group.position : this.player.group.position;
    if (z.breather > 0) { z.breather -= dt; if (z.breather <= 0) this.spawnWave(); }
    // no running away from it: while a wave is on, more keep appearing ahead of wherever you are heading
    if (z.wave > 0 && z.breather <= 0 && t > z.nextSpawn && z.list.filter((zb) => !zb.dying).length < (this.mobile ? 34 : 56)) {
      z.nextSpawn = t + 2.4;
      const heading = driving ? driving.heading : this.player.group.rotation.y;
      for (let k = 0; k < 2; k++) {
        const a = heading + rand(-0.7, 0.7), r = rand(26, 38), tx = pp.x + Math.sin(a) * r, tz = pp.z + Math.cos(a) * r;
        if (Math.hypot(tx, tz) < WORLD_RADIUS - 10 && this.terrain.onLand(tx, tz) && this.walkable(tx, tz)) this.spawnZombie(tx, tz, false);
      }
    }
    for (let i = z.blasts.length - 1; i >= 0; i--) { const b = z.blasts[i], u = (t - b.t0) / 0.6; if (u >= 1) { this.scene.remove(b.mesh); z.blasts.splice(i, 1); continue; } b.mesh.scale.setScalar(0.6 + u * 4); (b.mesh.material as THREE.MeshStandardMaterial).opacity = 0.7 * (1 - u); }
    let alive = 0;
    const close = z.list.filter((zb) => !zb.dying && zb.av.group.position.distanceTo(pp) < 1.6).length;   // a mob shares the bites
    for (let i = z.list.length - 1; i >= 0; i--) {
      const zb = z.list[i], g = zb.av.group, q = g.position;
      if (zb.dying > 0) {
        zb.dying -= dt;
        g.rotation.x = Math.min(Math.PI / 2, g.rotation.x + dt * 5);   // keel over
        if (zb.dying < 0.6) q.y -= dt * 2;                              // then sink away
        if (zb.dying <= 0) { this.scene.remove(g); z.list.splice(i, 1); }
        continue;
      }
      alive++;
      const dx = pp.x - q.x, dz = pp.z - q.z, d = Math.hypot(dx, dz) || 1;
      // crushed by a car
      if (driving && Math.abs(driving.speed) > 3.5 && d < driving.spec.length / 2 + 1.1) { this.killZombie(zb); this.sfx.bump(); continue; }
      if (zb.kind === 'hopper' && (zb.hop || (d > 1.35 && t > zb.hopAt))) {
        // hoppers crouch, then spring at you in long low leaps
        if (!zb.hop) { const len = Math.min(8.5, d - 0.6); let tx = q.x + (dx / d) * len, tz = q.z + (dz / d) * len; if (!this.walkable(tx, tz, q.y)) { tx = q.x + (dx / d) * 1.5; tz = q.z + (dz / d) * 1.5; } zb.hop = { t0: t, fx: q.x, fz: q.z, tx, tz }; this.sfx.groan(); }
        const u = Math.min(1, (t - zb.hop.t0) / 0.55);
        q.x = zb.hop.fx + (zb.hop.tx - zb.hop.fx) * u; q.z = zb.hop.fz + (zb.hop.tz - zb.hop.fz) * u;
        q.y = this.groundAt(q.x, q.z, q.y) + Math.sin(u * Math.PI) * 2.4;
        zb.av.legL.rotation.x = zb.av.legR.rotation.x = -1.4 + u; zb.av.armL.rotation.x = zb.av.armR.rotation.x = -2.6 + u * 1.2;
        g.rotation.y += wrapAngle(Math.atan2(dx, dz) - g.rotation.y) * Math.min(1, dt * 8);
        if (u >= 1) { zb.hop = null; zb.hopAt = t + rand(0.7, 1.6); }
        continue;
      }
      if (d > 1.35) {
        // shamble toward the player; slide along whatever is in the way; keep a little apart from each other
        const sp = zb.speed * dt;
        const wob = Math.sin(t * zb.sway * 2 + i) * 0.45;   // lurching zig-zag
        let nx = q.x + (dx / d) * sp - (dz / d) * sp * wob, nz = q.z + (dz / d) * sp + (dx / d) * sp * wob;
        for (const o of z.list) { if (o === zb || o.dying) continue; const op = o.av.group.position, ox = q.x - op.x, oz = q.z - op.z, od = Math.hypot(ox, oz); if (od < 1 && od > 0) { nx += (ox / od) * (1 - od) * 0.5; nz += (oz / od) * (1 - od) * 0.5; } }
        if (this.walkable(nx, nz, q.y) && this.terrain.onLand(nx, nz)) { q.x = nx; q.z = nz; }
        else if (this.walkable(q.x - (dz / d) * sp, q.z + (dx / d) * sp, q.y)) { q.x -= (dz / d) * sp; q.z += (dx / d) * sp; }
        else if (this.walkable(q.x + (dz / d) * sp, q.z - (dx / d) * sp, q.y)) { q.x += (dz / d) * sp; q.z -= (dx / d) * sp; }
        if (zb.kind === 'crawler') { zb.av.armL.rotation.x = -1.7 + Math.sin(t * 9 + i) * 0.6; zb.av.armR.rotation.x = -1.7 - Math.sin(t * 9 + i) * 0.6; g.rotation.z = Math.sin(t * 9 + i) * 0.06; }
        else if (zb.kind === 'brute') animateWalk(zb.av, t * 0.9 + i, 1);
        else animateWalk(zb.av, t * (zb.speed / 3) + i, 0.9);
        if (zb.limp) { zb.av.legR.rotation.x = 0.35 + Math.max(0, zb.av.legR.rotation.x) * 0.3; zb.av.group.rotation.z = Math.sin(t * zb.speed * 3.3 + i) * 0.08; }   // drags a leg, lists sideways
      } else {
        if (zb.kind !== 'crawler') animateWalk(zb.av, t * 2, 0.3);
        // bite
        if ((!driving || Math.abs(driving.speed) < 4) && t - zb.hitAt > 1.2) {
          zb.hitAt = t;
          z.hp -= (4 + Math.min(8, z.wave * 0.6)) * (zb.kind === 'brute' ? 2.4 : zb.kind === 'crawler' ? 0.7 : 1) * Math.min(1, 2.2 / Math.max(1, close)) * (driving ? 0.6 : 1);   // a stopped car is a tin can
          this.ev.onHurt(); this.sfx.ouch();
          const shove = zb.kind === 'brute' ? 2.5 : 0.7, kx = pp.x + (dx / d) * shove, kz = pp.z + (dz / d) * shove;   // shoved back a step (a brute sends you flying)
          if (!driving && this.walkable(kx, kz, pp.y)) { pp.x = kx; pp.z = kz; }
          if (z.hp <= 0) { this.endZombies(true); return; }
        }
      }
      // arms: both out, one out one dangling, or clawing high — always twitching
      const tw = Math.sin(t * 3 + i) * 0.15;
      if (zb.belly) zb.belly.scale.setScalar(1 + Math.sin(t * 5 + i) * 0.12);
      if (zb.kind === 'crawler') { /* arms drive the crawl */ }
      else if (zb.kind === 'hopper') { zb.av.armL.rotation.x = zb.av.armR.rotation.x = -0.6 + tw; zb.av.legL.rotation.x = zb.av.legR.rotation.x = -1.1; zb.av.body.position.y = 0.55; }
      else if (zb.kind === 'headless') { zb.av.armL.rotation.x = zb.av.armR.rotation.x = -1.5; zb.av.armL.rotation.z = 0.5 + Math.sin(t * 6 + i) * 0.4; zb.av.armR.rotation.z = -0.5 - Math.sin(t * 6 + i) * 0.4; zb.av.body.rotation.z = Math.sin(t * 2.3 + i) * 0.2; }
      else if (zb.arms === 0) { zb.av.armL.rotation.x = zb.av.armR.rotation.x = -1.45 + tw; }
      else if (zb.arms === 1) { zb.av.armR.rotation.x = -1.6 + tw; zb.av.armL.rotation.x = 0.3 + Math.sin(t * 7 + i) * 0.1; }
      else { zb.av.armR.rotation.x = -2.2 + tw; zb.av.armL.rotation.x = -1.2 - tw; zb.av.armR.rotation.z = -0.4; zb.av.armL.rotation.z = 0.4; }
      if (zb.head) { zb.head.rotation.z = zb.tilt + Math.sin(t * 1.7 + i) * 0.12; if (t > zb.twitchAt) { zb.twitchAt = t + rand(1.5, 5); zb.head.rotation.y = rand(-0.9, 0.9); } else zb.head.rotation.y *= Math.max(0, 1 - dt * 3); }
      g.rotation.y += wrapAngle(Math.atan2(dx, dz) - g.rotation.y) * Math.min(1, dt * 5);
      q.y = this.groundAt(q.x, q.z, q.y);
      if (t > zb.groan && d < 30) { zb.groan = t + 5 + Math.random() * 8; this.sfx.groan(); }
    }
    if (alive === 0 && z.breather <= 0 && z.wave > 0) {
      z.breather = 6;
      z.hp = Math.min(100, z.hp + 25);
      this.points += 100; this.ev.onPoints(this.points);
      this.sfx.questDone();
      this.ev.onCollect({ name: `Wave ${z.wave} cleared! Next one is bigger`, points: 100, color: 0x2fa66a, shape: 'gem' });
    }
    if (t - this.lastZombieHud > 0.2) {
      this.lastZombieHud = t;
      this.ev.onQuest({ status: 'active', title: z.breather > 0 ? (z.wave ? `🧟 Wave ${z.wave + 1} in ${Math.ceil(z.breather)}s` : `🧟 They are coming... ${Math.ceil(z.breather)}`) : `🧟 Wave ${z.wave} · ${alive} left`, desc: `${z.kills} kills · Punch (Space / Jump) when they are close, or run them over. Clear a wave to heal.`, progress: `❤ ${Math.max(0, Math.round(z.hp))} / 100`, remaining: z.hp, total: 100, reward: 100, hint: null, fill: Math.max(0, z.hp) / 100, timeText: `❤ ${Math.max(0, Math.round(z.hp))}` });
    }
  }

  private endZombies(died: boolean) {
    const z = this.zombies!;
    z.ending = true;
    this.ev.onMode(null);
    for (const zb of z.list) this.scene.remove(zb.av.group);
    z.list = [];
    for (const b of z.blasts) this.scene.remove(b.mesh);
    z.blasts = [];
    document.getElementById('zombiebtn')?.classList.remove('on');
    if (this.hangout && this.hangout.until - this.elapsed > 300) this.endHangout();
    if (died) {
      this.sfx.questFail();
      this.ev.onCollect({ name: `You died on wave ${z.wave} · ${z.kills} kills`, points: 0, color: 0xd94a3d, shape: 'box' });
      this.ev.onQuest({ status: 'failed', title: `You died on wave ${z.wave}`, desc: `${z.kills} kills. You wake up back downtown, a little shaken.`, progress: '', remaining: 0, total: 100, reward: 0, hint: null, fill: 0, timeText: '💀' });
      if (this.driving) this.exitVehicle();
      const [sx, sz] = this.spawnPoint();
      this.player.group.position.set(sx, this.terrain.h(sx, sz), sz);
      this.airY = 0; this.vy = 0;
    } else {
      this.sfx.questDone();
      this.ev.onCollect({ name: `Survived ${z.wave} wave${z.wave === 1 ? '' : 's'} · ${z.kills} kills`, points: 0, color: 0x2fa66a, shape: 'gem' });
      this.ev.onQuest({ status: 'done', title: `Dawn · survived ${z.wave} wave${z.wave === 1 ? '' : 's'}`, desc: `${z.kills} kills. The city is yours again.`, progress: '', remaining: 0, total: 100, reward: 0, hint: null, fill: 1, timeText: '☀️' });
    }
    this.questCooldown = 12;
  }

  // ---------- the Neon Palace: party, dance, lasers ----------
  private insideClub() { const c = this.casino; if (!c) return false; const p = this.player.group.position; return Math.abs(p.x - c.x) < c.w / 2 && Math.abs(p.z - c.z) < c.d / 2; }
  private onDanceFloor() { const c = this.casino; if (!c) return false; const p = this.player.group.position; return Math.abs(p.x - c.floor.x) < c.floor.w / 2 && Math.abs(p.z - c.floor.z) < c.floor.d / 2; }

  /** Eight regulars who never leave the dance floor. */
  private spawnDancers() {
    const c = this.casino; if (!c) return;
    for (let i = 0; i < 8; i++) {
      const female = i % 2 === 1, style = female ? FEMALE_OUTFITS[i % FEMALE_OUTFITS.length] : OUTFITS[(i * 3) % OUTFITS.length];
      const av = makeAvatar({ ...style, skin: SKINS[i % SKINS.length] });
      av.group.position.set(c.floor.x + (i % 4 - 1.5) * 2.4 + (i >= 4 ? 1.2 : 0), this.terrain.h(c.floor.x, c.floor.z) + 0.1, c.floor.z + (i >= 4 ? 2.6 : -2.2));
      av.group.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(av.group);
      this.dancers.push({ av, phase: Math.random() * 6, style: i % 3 });
    }
  }

  /** A dance loop: arms pump, hips sway, a little bounce; three variations. */
  private dancePose(av: Avatar, t: number, phase: number, style: number) {
    const b = t * 2.1 + phase;   // 126 bpm
    if (style === 0) { av.armL.rotation.x = -2.4 + Math.sin(b * Math.PI) * 0.5; av.armR.rotation.x = -2.4 - Math.sin(b * Math.PI) * 0.5; av.armL.rotation.z = 0.5; av.armR.rotation.z = -0.5; }
    else if (style === 1) { av.armL.rotation.x = -1.2 + Math.sin(b * Math.PI) * 0.9; av.armR.rotation.x = -1.2 - Math.sin(b * Math.PI) * 0.9; av.armL.rotation.z = 0.2; av.armR.rotation.z = -0.2; }
    else { av.armL.rotation.x = -0.6 + Math.sin(b * Math.PI * 0.5) * 0.4; av.armR.rotation.x = -2.6 + Math.cos(b * Math.PI) * 0.3; av.armL.rotation.z = 0.3; av.armR.rotation.z = -0.9 + Math.sin(b * Math.PI) * 0.3; }
    av.body.position.y = 0.85 + Math.abs(Math.sin(b * Math.PI)) * 0.08;
    av.body.rotation.z = Math.sin(b * Math.PI) * 0.12; av.body.rotation.y = Math.sin(b * Math.PI * 0.5) * 0.35;
    av.legL.rotation.x = Math.sin(b * Math.PI) * 0.35; av.legR.rotation.x = -Math.sin(b * Math.PI) * 0.35;
    av.group.rotation.y += Math.sin(b * Math.PI * 0.25) * 0.01;
  }

  private tickClub(dt: number, t: number) {
    const c = this.casino, root = this.landmarkRoot; if (!c || !root) return;
    const near = Math.hypot(this.player.group.position.x - c.x, this.player.group.position.z - c.z) < 60;
    const inside = this.insideClub();
    this.clubK = Math.max(0, Math.min(1, this.clubK + (inside ? dt / 1.2 : -dt / 1.2)));
    if (this.clubK > 0 && !(this.zombies && !this.zombies.ending) && this.sunsetK <= 0) this.applyClub(this.clubK);
    if (inside !== this.inClub) { this.inClub = inside; this.sfx.club(inside); document.body.classList.toggle('indoors', inside); if (inside) this.ev.onCollect({ name: '🎶 Welcome to the Neon Palace — dance floor, bar, slots and real 8-ball', points: 0, color: 0xff4fd8, shape: 'gem' }); }
    if (!near) return;
    // outside lasers sweep, inside lasers spin, floor tiles chase colours, the mirror ball turns
    root.traverse((o) => {
      if (o.name === 'laserout') { o.rotation.y += dt * 0.7; o.rotation.z = Math.sin(t * 0.9 + (o.userData.phase as number)) * 0.35; }
      else if (o.name === 'laserin') { o.rotation.y -= dt * 1.1; for (const arm of o.children) arm.rotation.x = Math.sin(t * 1.6 + (arm.userData.k as number)) * 0.5; }
      else if (o.name === 'dancefloor') { const k = Math.floor(t * 4); o.children.forEach((tile, i) => { const m = (tile as THREE.Mesh).material as THREE.MeshStandardMaterial; const on = (i + k) % 4 === 0 || (i * 7 + k) % 5 === 0; m.emissiveIntensity = on ? 1.4 : 0.35; }); }
    });
    for (const d of this.dancers) { this.dancePose(d.av, t, d.phase, d.style); }
    if (this.dancing) {
      const dn = this.dancing;
      if (dn.partner) { this.dancePose(dn.partner.av, t, 1.5, 1); dn.partner.label.visible = true; if (t > dn.nextLine) { dn.nextLine = t + 8 + Math.random() * 6; this.botSays(dn.partner, DATE_LINES.party[Math.floor(Math.random() * DATE_LINES.party.length)], 0); } }
      if (!dn.rewarded && t - dn.t0 > 15) { dn.rewarded = true; this.points += 20; this.ev.onPoints(this.points); this.ev.onCollect({ name: dn.partner ? `Dancing with ${dn.partner.name} · party!` : 'Party! You have the moves', points: 20, color: 0xff4fd8, shape: 'gem' }); if (dn.partner) this.ev.onHearts(); }
    }
  }

  /** Inside the Palace: the sky goes to night, the fog closes in, the sun steps back so the lasers and neon carry the room. */
  private applyClub(k: number) {
    const dl = this.daylight;
    (this.scene.background as THREE.Color).setHex(dl.sky).lerp(new THREE.Color(0x0b0714), k);
    const fog = this.scene.fog as THREE.Fog; fog.color.setHex(dl.fog).lerp(new THREE.Color(0x120a1e), k); fog.near = dl.near + (30 - dl.near) * k; fog.far = dl.far + (110 - dl.far) * k;
    this.sun.color.setHex(dl.sun).lerp(new THREE.Color(0xff4fd8), k * 0.6); this.sun.intensity = dl.sunI * (1 - 0.7 * k);
    this.hemi.intensity = dl.hemiI * (1 - 0.45 * k);
  }

  private startDancing() {
    if (this.dancing || this.inMode()) return;
    const partner = this.datePartner();
    const p = this.player.group.position;
    if (partner) { partner.playing = true; partner.wait = 0; partner.av.group.position.set(p.x + 1.4, p.y, p.z); partner.av.group.rotation.y = Math.atan2(-1.4, 0); partner.label.visible = true; if (this.hangout?.bot === partner) this.hangout.until += 120; }
    this.dancing = { partner, t0: this.elapsed, rewarded: false, nextLine: this.elapsed + 3 };
    this.ev.onCollect({ name: partner ? `Dancing with ${partner.name} 🕺💃` : 'You hit the dance floor 🕺', points: 0, color: 0xff4fd8, shape: 'gem' });
    this.clearQuest(); this.questCooldown = 30;
  }

  private stopDancing() {
    const dn = this.dancing; if (!dn) return;
    this.dancing = null;
    this.player.armL.rotation.set(0, 0, 0); this.player.armR.rotation.set(0, 0, 0); this.player.body.rotation.set(0, 0, 0); this.player.body.position.y = 0.85;
    if (dn.partner) { dn.partner.playing = false; dn.partner.wait = 1; dn.partner.av.body.rotation.set(0, 0, 0); dn.partner.av.armL.rotation.set(0, 0, 0); dn.partner.av.armR.rotation.set(0, 0, 0); if (this.hangout?.bot !== dn.partner) dn.partner.target = this.randomLandPoint(8, 120); }
    this.questCooldown = 10;
  }

  // ---------- real 8-ball on the Palace tables ----------
  private nearestPoolTable() {
    const c = this.casino; if (!c) return null;
    const p = this.player.group.position;
    return c.tables.find((tb) => Math.hypot(tb.x - p.x, tb.z - p.z) < 3.6) ?? null;
  }

  /** table units → world position on this table */
  private tablePos(tb: Casino['tables'][number], x: number, y: number, out: THREE.Vector3) {
    const u = (x - POOL.W / 2) * POOL_SCALE, v = (y - POOL.H / 2) * POOL_SCALE, c = Math.cos(tb.ry), s = Math.sin(tb.ry);
    return out.set(tb.x + u * c - v * s, tb.y + POOL.R * POOL_SCALE, tb.z + u * s + v * c);
  }

  startPool(table: Casino['tables'][number], oppBot?: Bot) {
    if (this.pool || this.inMode()) return;
    if (this.driving) this.exitVehicle();
    if (this.date) this.endDate(); if (this.dancing) this.stopDancing();
    const opp = oppBot ?? this.datePartner() ?? this.bots.filter((b) => !b.remote && !b.riding && !b.knocked && !b.playing).sort((a, b) => a.av.group.position.distanceTo(this.player.group.position) - b.av.group.position.distanceTo(this.player.group.position))[0];
    if (!opp) return;
    opp.playing = true; opp.wait = 0; opp.label.visible = true;
    // you at the near long side, they at the far one
    this.player.group.position.set(table.x, this.terrain.h(table.x, table.z), table.z + 1.9); this.player.group.rotation.y = Math.PI;
    opp.av.group.position.set(table.x, this.terrain.h(table.x, table.z), table.z - 1.9); opp.av.group.rotation.y = 0;
    this.airY = 0; this.vy = 0; this.yaw = 0; this.pitch = 0.95; this.dist = 4.2; this.camDist = 4.2;
    const meshes: THREE.Mesh[] = [];
    const game = createPool(opp.name, {
      status: (text) => { if (this.pool) this.pool.status = text; },
      turn: () => {},
      finish: (win, why) => { const ps = this.pool; if (!ps) return; ps.over = true; ps.endAt = this.elapsed + 5; ps.status = why; this.gameResult('pool', win, opp.name); },
      potted: (n) => { this.sfx.thud(); if (n !== 0 && this.pool) { const m = this.pool.meshes[n]; if (m) m.visible = false; } },
      botAim: (angle) => { if (this.pool) this.pool.botAim = { angle, until: this.elapsed + 0.7 }; if (Math.random() < 0.3) this.botSays(opp, POOL_TALK[Math.floor(Math.random() * POOL_TALK.length)], 0); },
    }, 1100);
    for (const b of game.balls) {
      const mat = new THREE.MeshStandardMaterial({ color: isStripe(b.n) ? 0xffffff : POOL_COLORS[b.n], roughness: 0.25, metalness: 0.05 });
      const m = new THREE.Mesh(new THREE.SphereGeometry(POOL.R * POOL_SCALE, 14, 10), mat);
      if (isStripe(b.n)) { const band = new THREE.Mesh(new THREE.CylinderGeometry(POOL.R * POOL_SCALE * 1.005, POOL.R * POOL_SCALE * 1.005, POOL.R * POOL_SCALE * 0.9, 14, 1, true), new THREE.MeshStandardMaterial({ color: POOL_COLORS[b.n], roughness: 0.25 })); m.add(band); }
      if (b.n) { const dot = new THREE.Mesh(new THREE.SphereGeometry(POOL.R * POOL_SCALE * 0.45, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff })); dot.position.y = POOL.R * POOL_SCALE * 0.75; m.add(dot); }
      m.castShadow = true; this.scene.add(m); meshes[b.n] = m;
    }
    const cueStick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 1.45, 8), new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.6 })); cueStick.geometry.translate(0, 0.72, 0); cueStick.rotation.x = Math.PI / 2; this.scene.add(cueStick);
    const aimLine = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.004, 1.2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 })); aimLine.geometry.translate(0, 0, 0.6); this.scene.add(aimLine);
    this.pool = { game, table, opp, meshes, cueStick, aimLine, aim: 0, power: 0, charging: false, status: 'Your shot', over: false, endAt: 0, botAim: null, lastHud: 0 };
    this.clearQuest(); this.questCooldown = 30;
    this.ev.onMode({ icon: '🎱', label: 'Shoot', arrows: true });
    this.ev.onCollect({ name: `8-ball vs ${opp.name} · ◀ ▶ aim, Shoot to set power, Shoot again to strike`, points: 0, color: 0xff4fd8, shape: 'gem' });
    this.botSays(opp, 'Your break. Do not scratch 😏', 1.2);
    this.sfx.questStart();
  }

  private poolButton() {
    const ps = this.pool!; if (ps.over) return;
    const g = ps.game;
    if (g.turn !== 'you' || g.moving) return;
    if (g.ballInHand) { g.autoPlaceCue(); return; }
    if (!ps.charging) { ps.charging = true; ps.power = 0; return; }
    ps.charging = false;
    g.shoot(ps.aim, 6 + ps.power * 18);
    this.sfx.click();
  }

  private tickPool(dt: number, t: number) {
    const ps = this.pool!, g = ps.game, tb = ps.table;
    if (ps.over && t > ps.endAt) { this.endPool(); return; }
    g.step();
    // aim with ◀ ▶ (or A/D); power meter bounces while charging
    const held = this.batDir || (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
    if (g.turn === 'you' && !g.moving) ps.aim += held * dt * (this.keys.has('shift') ? 0.35 : 1.1);
    if (ps.charging) ps.power = (Math.sin(t * 3.2) + 1) / 2;
    // balls
    const v = new THREE.Vector3();
    for (const b of g.balls) { const m = ps.meshes[b.n]; if (!m) continue; m.visible = !b.in; if (!b.in) { this.tablePos(tb, b.x, b.y, v); m.position.copy(v); m.rotation.x += b.vy * POOL_SCALE * 0.5; m.rotation.z -= b.vx * POOL_SCALE * 0.5; } }
    // cue stick + aim line follow the cue ball; the bot's aim animates for a moment before its shot
    const cueW = this.tablePos(tb, g.cue.x, g.cue.y, new THREE.Vector3());
    const showAim = !g.moving && !ps.over && (g.turn === 'you' || !!(ps.botAim && t < ps.botAim.until));
    const ang = g.turn === 'you' ? ps.aim : (ps.botAim?.angle ?? 0);
    const worldAng = ang + tb.ry, dx = Math.cos(worldAng), dz = Math.sin(worldAng);
    ps.aimLine.visible = showAim; ps.cueStick.visible = showAim;
    if (showAim) {
      ps.aimLine.position.copy(cueW); ps.aimLine.rotation.set(0, -worldAng + Math.PI / 2, 0);
      const back = 0.06 + (ps.charging ? ps.power * 0.25 : 0.04);
      ps.cueStick.position.set(cueW.x - dx * back, cueW.y, cueW.z - dz * back);
      ps.cueStick.rotation.set(0, -worldAng - Math.PI / 2, 0); ps.cueStick.rotateX(Math.PI / 2);   // stick points along -aim, lying flat
    }
    if (g.turn === 'you' && g.moving === false && g.ballInHand) g.autoPlaceCue();
    // the opponent leans over the table on their shot
    ps.opp.av.armR.rotation.x = g.turn === 'bot' && !g.moving ? -1.3 : -0.3; ps.opp.av.armL.rotation.x = g.turn === 'bot' && !g.moving ? -1.1 : -0.3; ps.opp.av.body.rotation.x = g.turn === 'bot' && !g.moving ? 0.5 : 0.1;
    if (t - ps.lastHud > 0.15) {
      ps.lastHud = t;
      const you = g.groups.you ? `${g.groupName('you')} · ${g.remaining('you')} left` : 'open table', them = g.groups.you ? `${g.groupName('bot')} · ${g.remaining('bot')} left` : 'open table';
      this.ev.onQuest({ status: ps.over ? (ps.status.startsWith('You sank the 8-ball to win') || (ps.status.includes(ps.opp.name) && ps.status.includes('too early')) ? 'done' : 'failed') : 'active', title: `🎱 You (${you}) vs ${ps.opp.name} (${them})`, desc: ps.over ? ps.status : g.turn === 'you' ? (ps.charging ? 'Shoot again to strike at this power' : g.moving ? 'Balls rolling…' : `${this.mobile ? '◀ ▶' : '◀ ▶ / A D'} to aim (Shift = fine) · Shoot to start the power meter`) : ps.status, progress: ps.charging ? `Power ${Math.round(ps.power * 100)}%` : g.turn === 'you' ? 'Your shot' : `${ps.opp.name}'s shot`, remaining: 1, total: 1, reward: 250, hint: null, fill: ps.charging ? ps.power : g.turn === 'you' ? 1 : 0, timeText: g.turn === 'you' ? '🫵' : '⏳' });
    }
  }

  private endPool() {
    const ps = this.pool; if (!ps) return;
    this.pool = null;
    ps.game.dispose();
    for (const m of ps.meshes) if (m) this.scene.remove(m);
    this.scene.remove(ps.cueStick); this.scene.remove(ps.aimLine);
    ps.opp.playing = false; ps.opp.wait = 2; ps.opp.av.body.rotation.set(0, 0, 0); ps.opp.av.armL.rotation.set(0, 0, 0); ps.opp.av.armR.rotation.set(0, 0, 0); if (this.hangout?.bot !== ps.opp) ps.opp.target = this.randomLandPoint(8, 120);
    this.player.armL.rotation.set(0, 0, 0); this.player.armR.rotation.set(0, 0, 0); this.player.body.rotation.set(0, 0, 0);
    this.pitch = 0.3; this.dist = 10; this.camDist = 10;
    this.ev.onMode(null); this.ev.onQuest(null);
    this.questCooldown = 10;
  }

  // ---------- carrom on the Palace board ----------
  private nearestCarrom() {
    const c = this.casino; if (!c) return null;
    const p = this.player.group.position;
    return c.carrom.find((b) => Math.hypot(b.x - p.x, b.z - p.z) < 2.6) ?? null;
  }

  private boardPos(b: CarromState['board'], x: number, y: number, out: THREE.Vector3) {
    return out.set(b.x + (x - CARROM.W / 2) * CARROM_SCALE, b.y + 0.012, b.z + (y - CARROM.W / 2) * CARROM_SCALE);
  }

  startCarrom(board: Casino['carrom'][number], oppBot?: Bot) {
    if (this.carrom || this.inMode()) return;
    if (this.driving) this.exitVehicle();
    if (this.date) this.endDate(); if (this.dancing) this.stopDancing();
    const opp = oppBot ?? this.datePartner() ?? this.bots.filter((b) => !b.remote && !b.riding && !b.knocked && !b.playing).sort((a, b) => a.av.group.position.distanceTo(this.player.group.position) - b.av.group.position.distanceTo(this.player.group.position))[0];
    if (!opp) return;
    opp.playing = true; opp.wait = 0; opp.label.visible = true;
    const y = this.terrain.h(board.x, board.z);
    this.player.group.position.set(board.x, y, board.z + 1.15); this.player.group.rotation.y = Math.PI; poseSit(this.player);
    opp.av.group.position.set(board.x, y, board.z - 1.15); opp.av.group.rotation.y = 0; poseSit(opp.av);
    this.airY = 0; this.vy = 0; this.yaw = 0; this.pitch = 1.05; this.dist = 2.4; this.camDist = 2.4;
    const coins: THREE.Mesh[] = [];
    const game = createCarrom(opp.name, {
      status: (text) => { if (this.carrom) this.carrom.status = text; },
      turn: (who) => { if (this.carrom && who === 'you') this.carrom.phase = 'slide'; },
      finish: (win, why) => { const cs = this.carrom; if (!cs) return; cs.over = true; cs.endAt = this.elapsed + 5; cs.status = why; this.gameResult('carrom', win, opp.name); },
      potted: () => this.sfx.click(),
      botAim: () => { if (this.carrom) this.carrom.botAim = { until: this.elapsed + 0.6 }; if (Math.random() < 0.3) this.botSays(opp, POOL_TALK[Math.floor(Math.random() * POOL_TALK.length)], 0); },
    }, 1000);
    const disc = (r: number, color: number) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.4 })); m.castShadow = true; this.scene.add(m); return m; };
    game.coins.forEach((k, i) => { coins[i] = disc(CARROM.R * CARROM_SCALE, k.kind === 'w' ? 0xfdf5e0 : k.kind === 'b' ? 0x2a2a2a : 0xe04a3a); });
    const strikerMesh = disc(CARROM.RS * CARROM_SCALE, 0x5fd0ee);
    const aimLine = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.003, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x111111, transparent: true, opacity: 0.8 })); aimLine.geometry.translate(0, 0, 0.25); this.scene.add(aimLine);
    this.carrom = { game, board, opp, coins, strikerMesh, aimLine, phase: 'slide', aim: -Math.PI / 2, power: 0, over: false, endAt: 0, status: 'Your turn.', botAim: null, lastHud: 0 };
    this.clearQuest(); this.questCooldown = 30;
    this.ev.onMode({ icon: '🎯', label: 'Flick', arrows: true });
    this.ev.onCollect({ name: `Carrom vs ${opp.name} · ◀ ▶ slide the striker, Flick, ◀ ▶ aim, Flick, Flick again at the right power`, points: 0, color: 0xf2c31b, shape: 'gem' });
    this.botSays(opp, 'White is yours. Queen is mine 😉', 1.2);
    this.sfx.questStart();
  }

  private carromButton() {
    const cs = this.carrom!; if (cs.over) return;
    const g = cs.game;
    if (g.turn !== 'you' || g.moving) return;
    if (cs.phase === 'slide') { cs.phase = 'aim'; cs.aim = Math.atan2(CARROM.W / 2 - g.striker.y, CARROM.W / 2 - g.striker.x); return; }
    if (cs.phase === 'aim') { cs.phase = 'power'; cs.power = 0; return; }
    g.shoot(cs.aim, 6 + cs.power * 18);
    cs.phase = 'slide';
    this.sfx.click();
  }

  private tickCarrom(dt: number, t: number) {
    const cs = this.carrom!, g = cs.game, b = cs.board;
    if (cs.over && t > cs.endAt) { this.endCarrom(); return; }
    g.step();
    const held = this.batDir || (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
    if (g.turn === 'you' && !g.moving) {
      if (cs.phase === 'slide') g.striker.x = Math.max(CARROM.MIN_X, Math.min(CARROM.MAX_X, g.striker.x + held * dt * 180));
      else if (cs.phase === 'aim') cs.aim += held * dt * (this.keys.has('shift') ? 0.3 : 0.9);
      else cs.power = (Math.sin(t * 3.2) + 1) / 2;
    }
    const v = new THREE.Vector3();
    g.coins.forEach((k, i) => { const m = cs.coins[i]; m.visible = !k.in; if (!k.in) m.position.copy(this.boardPos(b, k.x, k.y, v)); });
    cs.strikerMesh.visible = !g.striker.in; if (!g.striker.in) cs.strikerMesh.position.copy(this.boardPos(b, g.striker.x, g.striker.y, v));
    const showAim = !g.moving && !cs.over && ((g.turn === 'you' && cs.phase !== 'slide') || !!(cs.botAim && t < cs.botAim.until));
    cs.aimLine.visible = showAim;
    if (showAim) { const ang = g.turn === 'you' ? cs.aim : (g.botDecide()?.angle ?? 0); cs.aimLine.position.copy(cs.strikerMesh.position); cs.aimLine.rotation.set(0, -ang + Math.PI / 2, 0); cs.aimLine.scale.z = cs.phase === 'power' ? 0.6 + cs.power * 1.2 : 1; }
    // the rival leans in on their turn
    cs.opp.av.armR.rotation.x = g.turn === 'bot' && !g.moving ? -1.6 : -1.1; cs.opp.av.body.rotation.x = g.turn === 'bot' && !g.moving ? 0.45 : 0.15;
    if (t - cs.lastHud > 0.15) {
      cs.lastHud = t;
      const you = `${g.potted.you} / 9 white${g.queen === 'you' ? ' + queen' : ''}`, them = `${g.potted.bot} / 9 black${g.queen === 'bot' ? ' + queen' : ''}`;
      const step = cs.phase === 'slide' ? '◀ ▶ slide the striker · Flick to aim' : cs.phase === 'aim' ? '◀ ▶ aim (Shift = fine) · Flick to set power' : 'Flick again at the right power';
      this.ev.onQuest({ status: cs.over ? (cs.status.startsWith('All nine') ? 'done' : 'failed') : 'active', title: `🎯 You ${you} · ${cs.opp.name} ${them}`, desc: cs.over ? cs.status : g.turn === 'you' ? (g.moving ? 'Coins rolling…' : step) : cs.status, progress: cs.phase === 'power' && g.turn === 'you' ? `Power ${Math.round(cs.power * 100)}%` : g.turn === 'you' ? 'Your turn' : `${cs.opp.name}'s turn`, remaining: 1, total: 1, reward: 200, hint: null, fill: cs.phase === 'power' && g.turn === 'you' ? cs.power : g.turn === 'you' ? 1 : 0, timeText: g.turn === 'you' ? '🫵' : '⏳' });
    }
  }

  private endCarrom() {
    const cs = this.carrom; if (!cs) return;
    this.carrom = null;
    cs.game.dispose();
    for (const m of cs.coins) this.scene.remove(m);
    this.scene.remove(cs.strikerMesh); this.scene.remove(cs.aimLine);
    cs.opp.playing = false; cs.opp.wait = 2; cs.opp.av.body.rotation.set(0, 0, 0); cs.opp.av.armL.rotation.set(0, 0, 0); cs.opp.av.armR.rotation.set(0, 0, 0); cs.opp.av.legL.rotation.x = cs.opp.av.legR.rotation.x = 0; if (this.hangout?.bot !== cs.opp) cs.opp.target = this.randomLandPoint(8, 120);
    this.player.armL.rotation.set(0, 0, 0); this.player.armR.rotation.set(0, 0, 0); this.player.body.rotation.set(0, 0, 0); this.player.legL.rotation.x = this.player.legR.rotation.x = 0;
    const p = this.player.group.position; p.set(cs.board.x + 1.6, this.terrain.h(cs.board.x + 1.6, cs.board.z + 1.2), cs.board.z + 1.2);
    this.pitch = 0.3; this.dist = 10; this.camDist = 10;
    this.ev.onMode(null); this.ev.onQuest(null);
    this.questCooldown = 10;
  }

  // ---------- dates: sit together, ride the wheel, take the boat out, watch the sunset ----------
  private nearestSpot(): Spot | null {
    const p = this.player.group.position;
    let best: Spot | null = null, bd = 3.2;
    for (const s of this.spots) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  /** Whoever is with you: the hangout partner, the person on your card, or a friend standing close. */
  private datePartner(): Bot | null {
    if (this.hangout?.bot && !this.hangout.bot.remote) return this.hangout.bot;
    const p = this.player.group.position;
    if (this.meet && !this.meet.remote && this.meet.av.group.position.distanceTo(p) < 7) return this.meet;
    return this.bots.find((b) => !b.remote && b.friend && !b.riding && !b.knocked && !b.playing && b.av.group.position.distanceTo(p) < 7) ?? null;
  }

  private seatAt(spot: Spot, k: number, out: THREE.Vector3) {
    const [dx, dz] = spot.seats[k] ?? [0, 0];
    return out.set(spot.x + dx, spot.y + 0.1, spot.z + dz);
  }

  private startDate(spot: Spot) {
    if (this.date || this.inMode()) return;
    if (this.driving) this.exitVehicle();
    // a real player on your card? invite them over instead — they choose to come
    if (this.meet?.remote && this.net) { this.net.send({ t: 'inv', id: this.selfId, to: this.meet.remote.id, n: this.playerName, kind: spot.id, x: spot.x + (spot.seats[1]?.[0] ?? 0), z: spot.z + (spot.seats[1]?.[1] ?? 0) }); this.ev.onCollect({ name: `Invited ${this.meet.name} to join you`, points: 0, color: 0x3fb7d9, shape: 'gem' }); }
    const partner = this.datePartner();
    const t = this.elapsed;
    this.seatAt(spot, 0, this.player.group.position); this.player.group.rotation.y = spot.ry; this.airY = 0; this.vy = 0;
    if (partner) { partner.playing = true; partner.wait = 0; this.seatAt(spot, 1, partner.av.group.position); partner.av.group.rotation.y = spot.ry + (spot.face ? Math.PI : 0); poseSit(partner.av); partner.label.visible = true; if (this.hangout?.bot === partner) this.hangout.until += 120; }
    let gondola: THREE.Object3D | null = null;
    if (spot.kind === 'wheel' && this.wheel) {   // board the gondola nearest the ground
      let best = Infinity;
      for (const c of this.wheel.children) if (c.name.startsWith('gondola')) { const wp = c.getWorldPosition(new THREE.Vector3()); if (wp.y < best) { best = wp.y; gondola = c; } }
    }
    this.date = { spot, partner, t0: t, nextLine: t + 3, gondola, boatA: 0, rewarded: false, giftAt: t + 18 + Math.random() * 15 };
    this.yaw = spot.ry + Math.PI; this.pitch = spot.kind === 'wheel' ? 0.15 : 0.28;
    this.clearQuest(); this.questCooldown = 30;
    this.sfx.checkpoint();
    const first = store.addDate(spot.kind);
    this.ev.onCollect({ name: `${spot.label}${partner ? ` with ${partner.name}` : ''}${first ? ' · first time here +40' : ''}`, points: first ? 40 : 0, color: 0xe75480, shape: 'gem' });
    if (first) { this.points += 40; this.ev.onPoints(this.points); }
    if (partner) this.botSays(partner, spot.kind === 'wheel' ? 'Eee, it is moving! 🎡' : spot.kind === 'boat' ? 'Captain, take us somewhere nice 🚤' : ['This is nice.', 'Good idea.', 'Finally, a sit-down.'][Math.floor(Math.random() * 3)], 1.2);
  }

  private tickDate(dt: number, t: number) {
    const d = this.date!, sp = d.spot, p = this.player.group.position;
    const seat = new THREE.Vector3();
    if (sp.kind === 'wheel' && d.gondola) {
      const wp = d.gondola.getWorldPosition(new THREE.Vector3());
      p.set(wp.x, wp.y - 1.6 + 0.05, wp.z - 0.6); this.player.group.rotation.y = -Math.PI / 2;
      if (d.partner) { d.partner.av.group.position.set(wp.x, wp.y - 1.6 + 0.05, wp.z + 0.6); d.partner.av.group.rotation.y = -Math.PI / 2; poseSit(d.partner.av); }
      this.yaw += wrapAngle(Math.PI / 2 + Math.sin(t * 0.15) * 0.8 - this.yaw) * Math.min(1, dt);   // slow look around from up top
      if (t - d.t0 > RIDE_SECONDS) { this.endDate(); return; }
    } else if (sp.kind === 'boat' && this.dateBoat) {
      d.boatA += dt * (Math.PI * 2 / RIDE_SECONDS);
      const cx = 400, cz = -172, r = 17, b = this.dateBoat;
      const nx = cx + Math.cos(d.boatA) * r, nz = cz + Math.sin(d.boatA) * r;
      b.rotation.y = Math.atan2(nx - b.position.x, nz - b.position.z);
      b.position.set(nx, 0.3 + Math.sin(t * 2) * 0.06, nz); b.rotation.z = Math.sin(t * 1.7) * 0.03;
      const s0 = b.localToWorld(new THREE.Vector3(0, 0.95, -0.2)), s1 = b.localToWorld(new THREE.Vector3(0, 0.95, 1.0));
      p.copy(s0); this.player.group.rotation.y = b.rotation.y;
      if (d.partner) { d.partner.av.group.position.copy(s1); d.partner.av.group.rotation.y = b.rotation.y; poseSit(d.partner.av); }
      this.yaw += wrapAngle(b.rotation.y + Math.PI - this.yaw) * Math.min(1, dt * 2);
      if (d.boatA > Math.PI * 2) { this.endDate(); return; }
    } else {
      this.seatAt(sp, 0, seat); p.copy(seat); this.player.group.rotation.y = sp.ry;
      if (d.partner) { this.seatAt(sp, 1, d.partner.av.group.position); d.partner.av.group.rotation.y = sp.ry + (sp.face ? Math.PI : 0); poseSit(d.partner.av); d.partner.label.visible = true; }
    }
    if (d.partner && t > d.nextLine) { d.nextLine = t + 8 + Math.random() * 7; const lines = DATE_LINES[sp.kind] ?? DATE_LINES.pier; this.botSays(d.partner, lines[Math.floor(Math.random() * lines.length)], 0); }
    if (d.partner && t > d.giftAt) { d.giftAt = t + 60; if (Math.random() < 0.5) { const g = GIFTS[Math.floor(Math.random() * GIFTS.length)]; store.receiveGift(d.partner.name, g.e); this.points += 5; this.ev.onPoints(this.points); this.showGift(d.partner, g.e); this.ev.onCollect({ name: `${d.partner.name} gave you ${g.e} ${g.n}`, points: 5, color: 0xe75480, shape: 'gem' }); this.ev.onHearts(); this.sfx.questDone(); } }
    if (!d.rewarded && t - d.t0 > 15) { d.rewarded = true; this.points += 20; this.ev.onPoints(this.points); this.ev.onCollect({ name: d.partner ? `A moment with ${d.partner.name}` : 'A quiet moment', points: 20, color: 0xe75480, shape: 'gem' }); if (d.partner) this.ev.onHearts(); }
  }

  private endDate() {
    const d = this.date; if (!d) return;
    this.date = null;
    const sp = d.spot, p = this.player.group.position;
    // stand up beside the seat (or back on the ground after a ride)
    const gx = sp.x - Math.sin(sp.ry) * 1.2 + 1.2, gz = sp.z - Math.cos(sp.ry) * 1.2;
    p.set(gx, this.groundAt(gx, gz, sp.y), gz); this.airY = 0; this.vy = 0;
    if (sp.kind === 'boat' && this.dateBoat) { this.dateBoat.position.set(406, 0.3, -152); this.dateBoat.rotation.set(0, 0, 0); }
    if (d.partner) { d.partner.playing = false; d.partner.av.group.position.set(gx + 1.2, this.groundAt(gx + 1.2, gz, sp.y), gz); d.partner.wait = 1.5; if (this.hangout?.bot !== d.partner) d.partner.target = this.randomLandPoint(8, 120); this.botSays(d.partner, ['That was lovely.', 'Same time tomorrow?', 'I needed that.', 'Okay, where next?'][Math.floor(Math.random() * 4)], 0.5); }
    this.player.armL.rotation.x = this.player.armR.rotation.x = 0;
    this.questCooldown = 10;
  }

  /** Warm evening light while you watch the sunset from Lighthouse Point. */
  private applySunset(k: number) {
    const dl = this.daylight;
    (this.scene.background as THREE.Color).setHex(dl.sky).lerp(new THREE.Color(0xf7a56b), k * 0.85);
    const fog = this.scene.fog as THREE.Fog; fog.color.setHex(dl.fog).lerp(new THREE.Color(0xf2b07a), k * 0.8);
    this.sun.color.setHex(dl.sun).lerp(new THREE.Color(0xffa040), k); this.sun.intensity = dl.sunI * (1 - 0.35 * k);
    this.hemi.intensity = dl.hemiI * (1 - 0.3 * k);
  }

  // ---------- gifts ----------
  private showGift(b: Bot, gift: string) {
    const el = b.label.element;
    el.textContent = gift; el.classList.add('gift'); b.label.visible = true;
    b.bubbleUntil = this.elapsed + 3;
    setTimeout(() => { el.classList.remove('gift'); }, 2800);
  }

  private sendGift(b: Bot, gift: string) {
    const t = this.elapsed, key = b.remote?.id ?? b.name;
    if (t - (this.giftAt.get(key) ?? -99) < 30) { this.ev.onCollect({ name: `Give ${b.name} a minute to enjoy the last one`, points: 0, color: 0x999999, shape: 'box' }); return; }
    this.giftAt.set(key, t);
    store.sentGift();
    this.points += 10; this.ev.onPoints(this.points);
    this.ev.onCollect({ name: `You gave ${b.name} ${gift}`, points: 10, color: 0xe75480, shape: 'gem' });
    this.ev.onHearts(); this.sfx.questDone();
    this.showGift(b, gift);
    if (b.remote) { this.net?.send({ t: 'g', id: this.selfId, to: b.remote.id, n: this.playerName, gift }); return; }
    const thanks = GIFT_THANKS[gift] ?? ['Thank you! 💖'];
    this.botSays(b, thanks[Math.floor(Math.random() * thanks.length)], 3.2);
    b.asked = -100;   // they are happy to be asked to be friends again
    if (!b.friend && Math.random() < 0.6) { setTimeout(   // a gift usually wins them over
      () => { if (!b.friend) { this.markFriend(b); store.addFriend(b.name); this.ev.onFriends(store.friends().length); this.botSays(b, 'We should be friends 🤝', 0); this.ev.onCollect({ name: `${b.name} added you as a friend`, points: 25, color: 0xe75480, shape: 'gem' }); this.points += 25; this.ev.onPoints(this.points); } }, 3200); }
  }

  /** Dev helper: drop the player at a world position. */
  teleport(x: number, z: number) { const p = this.player.group.position; p.set(x, this.terrain.h(x, z), z); }

  startCircuitRace(opp?: Bot, laps?: number) {
    if (!this.circuit || this.race) return;
    if (laps === undefined) { this.ev.onPick({ title: 'How many laps?', sub: 'The Speedway is about a kilometre round: pit straight, the Valley run, Big Bend and back.', options: ['1 lap', '2 laps', '3 laps', '5 laps'] }, (i) => this.startCircuitRace(opp, [1, 2, 3, 5][i])); return; }
    if (this.driving) this.exitVehicle();
    const pts = this.circuit.pts, N = pts.length;
    const a = pts[0], b = pts[1], dir = b.clone().sub(a).setY(0).normalize(), nx = -dir.z, nz = dir.x;
    const heading = Math.atan2(dir.x, dir.z);
    const drivers: (Bot | null)[] = [null];
    const pool = this.bots.filter((x) => !x.remote && !x.riding && !x.knocked && x !== opp);
    if (opp && !opp.remote && !opp.riding) drivers.push(opp); else drivers.push(pool.shift() ?? null);
    drivers.push(pool.shift() ?? null, pool.shift() ?? null);
    const cars: RaceCar[] = drivers.map((bot, i) => {
      const car = makeVehicle('jeep', [0xe8c46a, 0xe75480, 0x3fb7d9, 0x2fa66a][i]);
      const back = 8 + Math.floor(i / 2) * 8, side = (i % 2 ? 1 : -1) * 3.4;
      car.group.position.set(a.x - dir.x * back + nx * side, 0, a.z - dir.z * back + nz * side);
      car.heading = heading; car.fuel = 1;
      this.settleVehicle(car);
      this.scene.add(car.group);
      if (bot) { this.scene.remove(bot.av.group); car.group.add(bot.av.group); bot.av.group.position.copy(car.seat); bot.av.group.rotation.set(0, 0, 0); poseSit(bot.av); bot.riding = car; bot.label.visible = true; }
      return { car, bot, name: i === 0 ? this.playerName : bot?.name ?? ['Ravi', 'Kenji', 'Mia'][i], idx: N - 3, lap: 0, prog: 0, done: 0, skill: i === 0 ? 0 : 0.86 + (i === 1 ? 0.12 : (3 - i) * 0.05), lane: (i % 2 ? 1 : -1) * 2.2, you: i === 0, nitroUntil: 0, nitroAt: 6 + Math.random() * 6 };
    });
    this.vehicles.push(cars[0].car);
    this.enterVehicle(cars[0].car);
    this.yaw = heading + Math.PI;
    // a hologram racing line: glowing arrows that run ahead of your car so the route is never in doubt
    const guide: THREE.Mesh[] = [];
    for (let k = 0; k < 10; k++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 3), new THREE.MeshStandardMaterial({ color: 0x3fd36f, emissive: 0x3fd36f, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 })); m.rotation.x = Math.PI / 2; this.scene.add(m); guide.push(m); }
    this.race = { cars, countdown: 4.2, laps, finished: 0, over: false, t0: 0, endAt: 0, opp: opp?.name ?? 'the field', guide, wrongWay: 0 };
    this.raceLock = true;
    this.ev.onMode({ icon: '', label: '', button: false });   // focus mode: fewer labels and chips
    this.clearQuest();
    this.questCooldown = 8;
    this.sfx.questStart();
  }

  private tickRace(dt: number, t: number) {
    const r = this.race!, pts = this.circuit!.pts, N = pts.length;
    if (r.countdown > 0) {
      const before = Math.ceil(r.countdown - 1.2);
      r.countdown -= dt;
      const now = Math.ceil(r.countdown - 1.2);
      if (now !== before) { if (now <= 0) this.sfx.checkpoint(); else this.sfx.tick(); }
      this.raceLock = r.countdown > 1.2;
      if (r.countdown <= 1.2 && !r.t0) r.t0 = t;
    }
    if (r.over && t > r.endAt) { this.endRace(); return; }
    for (const c of r.cars) {
      const v = c.car, vp = v.group.position;
      if (!c.you && !r.over && r.countdown <= 1.2 && !c.done) {
        // AI: aim at a point ahead on the centre line, offset into a lane, ease off in the corners
        const ahead = (c.idx + 7) % N, a2 = (c.idx + 14) % N;
        const tp = pts[ahead], dir = pts[(ahead + 1) % N].clone().sub(pts[ahead]).setY(0).normalize();
        const tx = tp.x - dir.z * c.lane, tz = tp.z + dir.x * c.lane;
        const want = Math.atan2(tx - vp.x, tz - vp.z);
        const diff = wrapAngle(want - v.heading);
        const bend = Math.abs(wrapAngle(Math.atan2(pts[a2].x - tp.x, pts[a2].z - tp.z) - Math.atan2(dir.x, dir.z)));
        let target = v.spec.maxSpeed * c.skill * (bend > 0.35 ? 0.62 : 1);
        for (const pad of this.circuit!.pads) if (Math.abs(vp.x - pad.x) < 4.5 && Math.abs(vp.z - pad.z) < 4.5) target *= 1.35;
        // rivals use nitro too: a burst on a straight every 8-14 s, more eagerly when behind you
        if (t > c.nitroAt && bend < 0.18 && t > r.t0 + 2) { const behind = c.prog < r.cars[0].prog; c.nitroUntil = t + (behind ? 2.2 : 1.6); c.nitroAt = t + 8 + Math.random() * 6; if (vp.distanceTo(r.cars[0].car.group.position) < 60) this.sfx.boost(); }
        const nitro = t < c.nitroUntil;
        if (nitro) target *= 1.45;
        for (const f of v.flames) { f.visible = nitro; if (nitro) f.scale.setScalar(0.8 + Math.random() * 0.5); }
        v.speed += (target - v.speed) * Math.min(1, dt * (v.speed < target ? 1.1 : 3));
        v.heading += Math.max(-1, Math.min(1, diff * 2.5)) * v.spec.turn * dt * Math.min(1, v.speed / 6);
        vp.x += Math.sin(v.heading) * v.speed * dt; vp.z += Math.cos(v.heading) * v.speed * dt;
        this.settleVehicle(v);
        for (const w of v.wheels) w.rotation.x += (v.speed * dt) / 0.5;
      } else if (!c.you && c.done) { v.speed *= 0.97; vp.x += Math.sin(v.heading) * v.speed * dt; vp.z += Math.cos(v.heading) * v.speed * dt; this.settleVehicle(v); }
      // car-car separation
      for (const o of r.cars) { if (o === c) continue; const op = o.car.group.position, dx = op.x - vp.x, dz = op.z - vp.z, d = Math.hypot(dx, dz); if (d < 3.6 && d > 0) { const push = (3.6 - d) / 2; if (!c.you) { vp.x -= dx / d * push; vp.z -= dz / d * push; } if (!o.you) { op.x += dx / d * push; op.z += dz / d * push; } } }
      // progress + laps
      const i = this.nearestIdx(vp, c.idx);
      if (c.idx > N - 12 && i < 12) c.lap++; else if (c.idx < 12 && i > N - 12) c.lap--;
      c.idx = i; c.prog = c.lap * N + i;
      if (c.lap > r.laps && !c.done) {
        c.done = ++r.finished;
        if (c.you) {
          r.over = true; r.endAt = t + 7;
          const place = c.done;
          this.gameResult('race', place === 1, r.opp);
          this.ev.onCollect({ name: place === 1 ? 'Chequered flag - you won the race!' : `Finished ${['', '1st', '2nd', '3rd', '4th'][place]} of 4`, points: 0, color: 0xe8c46a, shape: 'gem' });
          if (place === 1) this.sfx.questDone(); else this.sfx.questFail();
        } else if (c.bot) this.botSays(c.bot, c.done === 1 ? 'Winner!' : 'Good race!', 0.3);
      }
    }
    {   // racing line ahead of you + wrong-way check
      const me = r.cars[0], vp = me.car.group.position;
      for (let k = 0; k < r.guide.length; k++) {
        const i = (me.idx + 4 + k * 5) % N, q = pts[i], nq = pts[(i + 1) % N], m = r.guide[k];
        m.position.set(q.x, q.y + 0.9 + Math.sin(t * 6 - k * 0.7) * 0.15, q.z);
        m.rotation.set(Math.PI / 2, 0, -Math.atan2(nq.x - q.x, nq.z - q.z));
        (m.material as THREE.MeshStandardMaterial).opacity = 0.9 - k * 0.07;
        m.visible = !r.over && r.countdown <= 0;
      }
      const d = pts[(me.idx + 3) % N].clone().sub(pts[me.idx]).setY(0).normalize();
      const facing = Math.sin(me.car.heading) * d.x + Math.cos(me.car.heading) * d.z;
      r.wrongWay = facing < -0.3 && me.car.speed > 3 ? r.wrongWay + dt : 0;
    }
    if (t - this.lastRaceHud > 0.2) {
      this.lastRaceHud = t;
      const order = [...r.cars].sort((a, b) => (a.done && b.done ? a.done - b.done : a.done ? -1 : b.done ? 1 : b.prog - a.prog));
      const me = r.cars[0], place = order.indexOf(me) + 1;
      const cd = Math.ceil(r.countdown - 1.2);
      const SECTORS: [number, string][] = [[0, 'Pit straight'], [3, 'Sunset sweeper'], [7, 'Neon chicane'], [10, 'Back straight'], [13, 'Valley straight'], [17, 'Big Bend'], [21, 'Return run'], [23, 'Esses'], [26, 'Grandstand hairpin']];
      const segF = (((me.idx + 6) % N) / N) * 28;
      const sector = [...SECTORS].reverse().find(([s]) => segF >= s)?.[1] ?? 'Pit straight';
      const title = r.countdown > 1.2 ? `On the grid... ${cd}` : r.countdown > 0 ? 'GO! GO! GO!' : r.over ? `Race over - P${me.done}` : r.wrongWay > 0.8 ? '⚠️ WRONG WAY - turn around' : `Lap ${Math.max(1, Math.min(r.laps, me.lap))} / ${r.laps} - P${place} - ${sector}`;
      this.ev.onQuest({ status: r.over ? (me.done === 1 ? 'done' : 'failed') : 'active', title, desc: order.map((c, k) => `${k + 1}. ${c.name}`).join('   '), progress: `${r.laps} laps - green pads = boost - Shift nitro`, remaining: r.t0 ? t - r.t0 : 0, total: 600, reward: 250, hint: null });
    }
  }

  private endRace() {
    const r = this.race!;
    this.race = null; this.raceLock = false;
    this.ev.onMode(null);
    for (const m of r.guide) this.scene.remove(m);
    for (const c of r.cars) {
      if (c.you) continue;
      if (c.bot) { c.car.group.remove(c.bot.av.group); this.scene.add(c.bot.av.group); const p = c.car.group.position; c.bot.av.group.position.set(p.x + 2, this.groundAt(p.x + 2, p.z, p.y), p.z); c.bot.av.group.rotation.set(0, c.car.heading, 0); c.bot.av.armL.rotation.x = c.bot.av.armR.rotation.x = 0; c.bot.riding = null; c.bot.wait = 2; c.bot.target = this.randomLandPoint(8, 120); }
      this.scene.remove(c.car.group);
    }
    this.ev.onQuest(null);
  }

  // ---------- friends ----------
  /** Anyone within reach — friend or not — you can talk to, play with, or hang out with. */
  private nearestPerson(p: THREE.Vector3): Bot | null {
    // stick with the current person until they are clearly out of reach
    if (this.meet && !this.meet.riding && !this.meet.knocked && !this.meet.playing && !this.meet.reply && this.meet.av.group.position.distanceTo(p) < 6.5) return this.meet;
    let best: Bot | null = null, bd = 4;
    if ((this.match && !this.match.over) || (this.zombies && !this.zombies.ending) || this.cricket) return null;   // no meet card mid-match, at the crease or during zombie night
    for (const b of this.bots) {
      if (b.riding || b.knocked || b.playing || b.reply || b.remote?.car) continue;
      const d = b.av.group.position.distanceTo(p);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  /** Buttons on the meet card. */
  interact(action: MeetAction) {
    const b = this.meet;
    if (!b) return;
    const t = this.elapsed;
    switch (action) {
      case 'friend':
        if (b.remote) { if (!b.friend && t - b.asked > 20) { b.asked = t; this.net?.send({ t: 'f', id: this.selfId, to: b.remote.id, n: this.playerName }); this.ev.onCollect({ name: `Friend request sent to ${b.name}`, points: 0, color: 0x3fb7d9, shape: 'gem' }); this.sfx.checkpoint(); } }
        else if (!b.friend && t - b.asked > 20) this.askFriend(b, t);
        break;
      case 'hangout':
        if (b.remote) { this.net?.send({ t: 'c', id: this.selfId, n: this.playerName, text: `${b.name}, let's hang out — follow me! 🚶` }); this.ev.onChat(this.playerName, `${b.name}, let's hang out — follow me! 🚶`, true); break; }
        if (this.hangout) this.endHangout();
        this.hangout = { bot: b, until: t + 90, nextLine: t + 3 };
        b.wait = 0;
        this.ev.onCollect({ name: `${b.name} is hanging out with you for a bit`, points: 0, color: 0x3fb7d9, shape: 'gem' });
        this.botSays(b, 'Sure, let us walk! 🚶', 0.4);
        this.sfx.checkpoint();
        break;
      case 'chat': if (!b.remote) this.botSays(b, `Hi ${this.playerName}! Type something 💬`, 0.3); break;
      case 'casino': {   // off to the Neon Palace together
        const c = this.casino; if (!c) break;
        if (this.driving) this.exitVehicle();
        const ex = c.x, ez = c.z + c.d / 2 + 4;
        this.player.group.position.set(ex - 1, this.terrain.h(ex, ez), ez); this.player.group.rotation.y = Math.PI; this.airY = 0; this.yaw = 0;
        if (!b.remote) { b.av.group.position.set(ex + 1, this.terrain.h(ex, ez), ez); b.wait = 0; if (this.hangout?.bot !== b) { if (this.hangout) this.endHangout(); this.hangout = { bot: b, until: t + 300, nextLine: t + 4 }; } this.botSays(b, 'Neon Palace! Dance first or pool first? 🎰', 1); }
        else { this.net?.send({ t: 'inv', id: this.selfId, to: b.remote.id, n: this.playerName, kind: 'casino', x: ex + 1, z: ez }); }
        this.ev.onCollect({ name: '🎰 Neon Palace — the casino & club at the end of Neon Lane', points: 0, color: 0xff4fd8, shape: 'gem' });
        this.sfx.checkpoint();
        break;
      }
      case 'gift': this.ev.onPick({ title: `Send ${b.name} a gift`, sub: 'Gifts are free. Be nice, be creative.', options: GIFTS.map((g) => `${g.e} ${g.n}`) }, (i) => this.sendGift(b, GIFTS[i].e)); break;
      case 'race': this.startCircuitRace(b); break;
      case 'football': this.botSays(b, 'Kick-off at the stadium! ⚽', 0.2); this.startFootball(b); break;
      case 'cricket': this.startCricket(b); break;
      case 'zombies': if (!this.zombies) { this.botSays(b, 'Stay close, they are coming! 🧟', 0.2); this.toggleZombies(); if (!b.remote) { if (this.hangout) this.endHangout(); this.hangout = { bot: b, until: t + 600, nextLine: t + 8 }; b.wait = 0; } } break;
      case 'hunt': this.startVersus('hunt', b); break;
      case 'pool': { const pt = this.casino && Math.hypot(this.player.group.position.x - this.casino.x, this.player.group.position.z - this.casino.z) < 30 ? this.casino.tables[0] : null; this.botSays(b, 'Rack them up 🎱', 0.2); if (pt && !b.remote) this.startPool(pt, b); else this.ev.onGame('pool', b.name); break; }
      case 'chess': this.botSays(b, 'White moves first — your go ♟️', 0.2); this.ev.onGame('chess', b.name); break;
      case 'ludo': this.botSays(b, 'Roll a six! 🎲', 0.2); this.ev.onGame('ludo', b.name); break;
      case 'carrom': { const cb = this.casino && Math.hypot(this.player.group.position.x - this.casino.x, this.player.group.position.z - this.casino.z) < 30 ? this.casino.carrom[0] : null; this.botSays(b, 'Flick it! 🎯', 0.2); if (cb && !b.remote) this.startCarrom(cb, b); else this.ev.onGame('carrom', b.name); break; }
    }
  }

  private endHangout() {
    const hg = this.hangout;
    if (!hg) return;
    this.hangout = null;
    hg.bot.speed = rand(1.8, 3.4); hg.bot.wait = 1; hg.bot.target = this.randomLandPoint(8, 120);
    this.points += 15; this.ev.onPoints(this.points);
    this.ev.onCollect({ name: `Hangout with ${hg.bot.name} · fun!`, points: 15, color: 0x3fb7d9, shape: 'gem' });
    this.botSays(hg.bot, 'That was fun, see you! 👋', 0);
  }

  /** A line from an explorer: shows in the chat log and as a bubble on their name tag. */
  private botSays(b: Bot, text: string, delay: number) {
    if (delay > 0) { this.pending.push({ at: this.elapsed + delay, bot: b, text }); return; }
    this.ev.onChat(b.name, text, false);
    b.bubbleUntil = this.elapsed + 4.5;
    b.label.element.textContent = `${b.name}: ${text}`;
    b.label.element.classList.add('talk');
    b.label.visible = true;
  }

  /** The player typed something: nearby explorers answer. */
  say(text: string) {
    text = text.trim().slice(0, 120);
    if (!text) return;
    this.ev.onChat(this.playerName, text, true);
    this.net?.send({ t: 'c', id: this.selfId, n: this.playerName, text });
    const p = this.driving ? this.driving.group.position : this.player.group.position;
    const pos = (b: Bot) => (b.remote?.car ? b.remote.car.group.position : b.av.group.position);
    if (this.bots.some((b) => b.remote && pos(b).distanceTo(p) < 30)) return;   // real people nearby: let them answer
    const near = this.bots.filter((b) => !b.remote && !b.knocked && b.av.group.position.distanceTo(p) < 22).sort((a, b) => a.av.group.position.distanceTo(p) - b.av.group.position.distanceTo(p)).slice(0, 2);
    if (!near.length) { this.ev.onChat('', 'No one close enough heard you — walk up to someone.', false); return; }
    near.forEach((b, i) => this.botSays(b, chatReply(text, { friend: b.friend, name: b.name, you: this.playerName }), 1 + i * 1.2 + Math.random()));
  }

  /** Result of a board / table game. */
  gameResult(kind: GameKind, win: boolean | null, opponent: string) {
    const b = this.bots.find((x) => x.name === opponent);
    const name = { pool: '8-ball', chess: 'chess', ludo: 'Ludo', carrom: 'carrom', race: 'the race', football: 'the match', cricket: 'the chase' }[kind];
    const prize = { pool: 250, chess: 300, ludo: 200, carrom: 200, race: 250, football: 300, cricket: 200 }[kind];
    if (win === null) { this.ev.onCollect({ name: `Draw at ${name} vs ${opponent}`, points: 0, color: 0x999999, shape: 'box' }); return; }
    if (win) {
      this.points += prize; this.ev.onPoints(this.points);
      this.ev.onCollect({ name: `Won ${name} vs ${opponent}!`, points: prize, color: 0x2fa66a, shape: 'gem' });
      this.sfx.questDone();
      if (b) this.botSays(b, RACE_GG[Math.floor(Math.random() * RACE_GG.length)], 0.5);
    } else {
      this.ev.onCollect({ name: `Lost ${name} vs ${opponent}`, points: 0, color: 0xd94a3d, shape: 'box' });
      this.sfx.questFail();
      if (b) this.botSays(b, 'Told you I never lose 😎', 0.5);
    }
  }

  private nearestStranger(p: THREE.Vector3): Bot | null {
    let best: Bot | null = null, bd = 4;
    for (const b of this.bots) {
      if (b.friend || b.riding || b.knocked || b.playing || b.reply || this.elapsed - b.asked < 20) continue;
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

  private startQuest(forced?: QuestKind, opp?: Bot) {
    this.clearQuest();
    const kinds: QuestKind[] = ['hunt', 'race', 'taxi', 'collect'];
    const kind = forced ?? kinds[this.questSeq++ % kinds.length];
    const t = this.elapsed;
    const focus = this.driving ? this.driving.group.position : this.player.group.position;
    const q = {
      kind, title: '', desc: '', reward: 0, total: 0, endsAt: 0, seconds: 1, gifts: [] as THREE.Group[], got: 0,
      stops: [] as { name: string; pos: THREE.Vector3 }[], stopIdx: 0, beacon: null as THREE.Group | null,
      rider: null as Bot | null, arrow: null as THREE.Mesh | null, item: null as string | null, need: 0,
      status: 'active' as const, finishedAt: 0, lastTick: 0,
      opp: null as Bot | null, oppVehicle: null as Vehicle | null, oppIdx: 0, oppGot: 0, oppNext: 0,
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
    if (opp) {
      q.opp = opp; opp.wait = 0;
      if (kind === 'race') {
        q.title = `Race vs ${opp.name}`; q.desc = `First to ${q.stops.map((s) => s.name).join(' → ')} wins. ${opp.name} is on a bike — grab one too!`; q.reward = 200;
        const bike = makeVehicle('bike', 0x2a2a2a);
        const op = opp.av.group.position;
        bike.heading = opp.av.group.rotation.y;
        bike.group.position.set(op.x, op.y, op.z);
        this.scene.add(bike.group);
        this.scene.remove(opp.av.group); bike.group.add(opp.av.group);
        opp.av.group.position.set(0, 0.55, -0.15); opp.av.group.rotation.set(0, 0, 0); poseRide(opp.av);
        opp.riding = bike; q.oppVehicle = bike;
      } else {
        q.title = `Prize hunt vs ${opp.name}`; q.desc = `${GIFT_TOTAL} bundles, two hunters. Find more than ${opp.name} before the clock runs out.`; q.reward = 160; q.seconds = 100; q.endsAt = t + 100;
        q.oppNext = t + 10 + Math.random() * 8;
      }
      this.botSays(opp, RACE_TRASH[Math.floor(Math.random() * RACE_TRASH.length)], 0.5);
    }
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
    this.releaseOpponent(q);
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
    if (q.opp) this.botSays(q.opp, ok ? RACE_GG[Math.floor(Math.random() * RACE_GG.length)] : 'Better luck next time 😄', 0.6);
    this.releaseOpponent(q);
    this.questCooldown = 10;
    this.pushQuest(this.elapsed, 0);
  }

  startVersus(kind: 'race' | 'hunt', opp: Bot) { this.startQuest(kind, opp); }

  private releaseOpponent(q: NonNullable<World['quest']>) {
    const opp = q.opp;
    if (!opp) return;
    if (q.oppVehicle) {
      const v = q.oppVehicle;
      v.group.remove(opp.av.group); this.scene.add(opp.av.group);
      opp.av.group.position.set(v.group.position.x + 1.5, this.terrain.h(v.group.position.x + 1.5, v.group.position.z), v.group.position.z);
      opp.av.group.rotation.set(0, v.heading, 0);
      opp.av.armL.rotation.x = opp.av.armR.rotation.x = 0; opp.av.legL.rotation.z = opp.av.legR.rotation.z = 0;
      opp.riding = null;
      this.scene.remove(v.group);
      q.oppVehicle = null;
    }
    opp.wait = 1; opp.target = this.randomLandPoint(8, 120);
    q.opp = null;
  }

  /** Move the rival along the checkpoints / let them "find" bundles. */
  private updateOpponent(q: NonNullable<World['quest']>, dt: number, t: number) {
    const opp = q.opp!;
    if (q.kind === 'race' && q.oppVehicle) {
      const v = q.oppVehicle, vp = v.group.position;
      const target = q.stops[q.oppIdx]?.pos;
      if (!target) return;
      const dx = target.x - vp.x, dz = target.z - vp.z, d = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      v.heading += wrapAngle(want - v.heading) * Math.min(1, dt * 2.5);
      const speed = 11.5 + Math.sin(t * 0.7) * 1.5;   // a fair rival: a quick cycle pace with a bit of rhythm
      const nx = vp.x + Math.sin(v.heading) * speed * dt, nz = vp.z + Math.cos(v.heading) * speed * dt;
      if (this.walkable(nx, nz, vp.y)) { vp.x = nx; vp.z = nz; } else { v.heading += 1.2 * dt; vp.x += Math.sin(v.heading + 1) * 2 * dt; vp.z += Math.cos(v.heading + 1) * 2 * dt; }
      this.settleVehicle(v);
      for (const w of v.wheels) w.rotation.x += (speed * dt) / 0.4;
      opp.label.visible = true;
      if (d < 12) {
        q.oppIdx++;
        if (q.oppIdx >= q.stops.length) { this.botSays(opp, 'Winner! 🏆', 0); this.finishQuest(false); }
        else this.ev.onCollect({ name: `${opp.name} passed ${q.stops[q.oppIdx - 1].name}`, points: 0, color: 0xd94a3d, shape: 'box' });
      }
    } else if (q.kind === 'hunt') {
      if (t >= q.oppNext) {
        q.oppNext = t + 12 + Math.random() * 8;
        const left = q.gifts.filter((g) => g.visible);
        if (left.length) {
          left[Math.floor(Math.random() * left.length)].visible = false;
          q.oppGot++;
          this.ev.onCollect({ name: `${opp.name} found \u20B9500 · ${q.oppGot}`, points: 0, color: 0xd94a3d, shape: 'box' });
          this.botSays(opp, 'Got one! 💰', 0);
          if (q.got + q.oppGot >= q.total) this.finishQuest(q.got > q.oppGot);
        }
      }
    }
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
    if (this.race || this.match || this.zombies || this.cricket) { this.questCooldown = 8; return; }   // the race / match / zombie night owns the task card
    if (this.wantQuest) { this.wantQuest = false; if (!this.quest || this.quest.status !== 'active') this.startQuest(); }
    const q = this.quest;
    if (!q || q.status !== 'active') {
      this.questCooldown -= dt;
      if (this.questCooldown <= 0) this.startQuest();
      return;
    }
    const left = q.endsAt - t;
    if (left <= 0) { this.finishQuest(q.opp && q.kind === 'hunt' ? q.got > q.oppGot : false); return; }
    if (left < 10 && Math.floor(left) !== Math.floor(left + dt)) this.sfx.tick();
    if (q.opp) this.updateOpponent(q, dt, t);

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
          if (q.opp ? q.got + q.oppGot >= q.total || q.got > q.total / 2 : q.got >= q.total) this.finishQuest(q.opp ? q.got > q.oppGot : true);
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
    if (q.kind === 'hunt') progress = q.opp ? `You ${q.got} · ${q.opp.name} ${q.oppGot}` : `${q.got} / ${q.total} bundles`;
    else if (q.kind === 'race') { progress = q.opp ? `You ${q.stopIdx} · ${q.opp.name} ${q.oppIdx} of ${q.total}` : `${q.stopIdx} / ${q.total} checkpoints`; const s = q.stops[q.stopIdx]; if (s) hint = `${s.name} · ${dist(s.pos)}`; }
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
