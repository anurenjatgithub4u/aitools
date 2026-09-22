import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { bakeInto } from './bake';

export interface Avatar {
  group: THREE.Group;
  body: THREE.Group;   // everything above the hips – bobs while walking
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
}

export type HairStyle =
  | 'crop' | 'buzz' | 'sidepart' | 'spiky' | 'curls' | 'manbun'          // shorter cuts
  | 'bob' | 'ponytail' | 'long' | 'braids' | 'topknot' | 'curlylong';    // longer cuts

export interface AvatarStyle {
  shirt: number;
  pants: number;
  skin?: number;
  hair?: number;
  hairStyle?: HairStyle;   // defaults to 'crop' / 'bob'; a hat flattens the tall ones
  hat?: 'explorer' | 'cap' | 'none';
  backpack?: boolean;
  female?: boolean;   // longer hair, ponytail, skirt, bindi
}

const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });

function rbox(w: number, h: number, d: number, c: number, r = 0.06, pivotTop = false) {
  const geo = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
  if (pivotTop) geo.translate(0, -h / 2, 0);
  const m = new THREE.Mesh(geo, mat(c));
  m.castShadow = true;
  return m;
}
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };

// Stylised explorer, ~2.4 units tall, facing +Z. Limb pivots sit at hip / shoulder. Round head, dot eyes and
// a smile, short sleeves and shorts with skin showing, chunky shoes — a friendly low-poly person, not a crate.
const sphere = (r: number, c: number, seg = 18) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.7)), mat(c)); m.castShadow = true; return m; };

// ─── Hair ─────────────────────────────────────────────────────────────────────
// A dozen cuts. The skull is a sphere of r 0.34 (y-scale 1.08) centred at HEAD_C in head
// space, with the face looking down +z: eyes at y 0.34, brows 0.44, ears y 0.28. Hair is a
// closed cap over the crown (its rim is the hairline, just above the brows) plus a band that
// comes down the sides and back, so no scalp ever shows through. bakeInto merges it all after.
const HEAD_C: [number, number, number] = [0, 0.3, -0.02];
const shade = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k).getHex();

/**
 * A piece of the hair sphere: `phiGap` radians left open at the front (0 = closed all round),
 * from `theta0` to `theta1` measured down from the crown (0.5π = ear level).
 */
function hairPiece(c: number, r: number, phiGap: number, theta0: number, theta1: number) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 26, 16, Math.PI / 2 + phiGap / 2, Math.PI * 2 - phiGap, theta0, theta1 - theta0), mat(c));
  m.castShadow = true;
  m.scale.set(1, 1.06, 0.99);
  return at(m, ...HEAD_C);
}
/** The closed crown; `theta` ≈ 0.37π puts the hairline just above the brows. */
const hairCap = (c: number, r: number, theta = 0.375 * Math.PI) => hairPiece(c, r, 0, 0, theta);
/** The sides and back below the hairline, open at the front so the face stays clear. */
const hairSides = (c: number, r: number, gap: number, t0 = 0.34 * Math.PI, t1 = 0.66 * Math.PI) => hairPiece(c, r, gap, t0, t1);

const puff = (c: number, r: number, x: number, y: number, z: number) => at(sphere(r, c, 10), x, y, z);

/** A spike or curl tip pointing away from the crown. */
function tuft(c: number, r: number, h: number, x: number, y: number, z: number, tx = 0, tz = 0) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mat(c));
  m.castShadow = true; m.rotation.set(tx, 0, tz);
  return at(m, x, y, z);
}

/** A soft lock of hair: a rounded box with a rounded tip. */
function hairLock(c: number, w: number, h: number, d: number, x: number, y: number, z: number, rx = 0, rz = 0) {
  const g = new THREE.Group();
  g.add(rbox(w, h, d, c, Math.min(w, d) * 0.45));
  g.add(puff(c, Math.min(w, d) * 0.5, 0, -h / 2, 0));
  g.rotation.set(rx, 0, rz);
  return at(g, x, y, z);
}

const hairTie = (c: number, r: number, x: number, y: number, z: number, rx = Math.PI / 2) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.34, 6, 14), mat(c));
  m.rotation.x = rx;
  return at(m, x, y, z);
};

/** Curls packed over the crown and around the back — the base for afro / curly hair. */
function curlCluster(head: THREE.Object3D, c: number, R: number, size: number) {
  const dark = shade(c, 0.84);
  const rings: [number, number, number][] = [[18, 6, 0], [46, 8, 58], [72, 9, 82], [94, 7, 105]];
  for (const [polDeg, count, skipDeg] of rings) {
    const pol = (polDeg * Math.PI) / 180;
    for (let i = 0; i < count; i++) {
      const az = (i / count) * Math.PI * 2 - Math.PI;                            // 0 = back of the head, ±π/2 = sides
      const towardFace = 180 - Math.abs((az * 180) / Math.PI);                   // 0 = straight back, 180 = the face
      if (towardFace > 180 - skipDeg) continue;                                  // keep the face clear
      const x = Math.sin(pol) * Math.sin(az) * R;
      const z = -Math.sin(pol) * Math.cos(az) * R + HEAD_C[2];
      const y = HEAD_C[1] + Math.cos(pol) * R * 1.06;
      head.add(puff(i % 3 === 0 ? dark : c, size * (0.88 + (i % 4) * 0.06), x, y, z));
    }
  }
}

/** Build one of the cuts onto `head`. */
function addHair(head: THREE.Group, cut: HairStyle, c: number) {
  const dark = shade(c, 0.8), lite = shade(c, 1.14);
  const sideburns = (h = 0.13) => { for (const sx of [-1, 1]) head.add(at(rbox(0.055, h, 0.11, dark, 0.02), sx * 0.315, 0.33, 0.05)); };
  const nape = (h = 0.3, y = 0.27) => head.add(at(rbox(0.46, h, 0.17, c, 0.08), 0, y, -0.26));

  switch (cut) {
    case 'buzz': {                                     // close cut, straight hairline
      head.add(hairCap(c, 0.358, 0.4 * Math.PI));
      head.add(hairSides(c, 0.358, 1.5, 0.36 * Math.PI, 0.7 * Math.PI));
      head.add(at(rbox(0.42, 0.06, 0.1, dark, 0.02), 0, 0.465, 0.25));
      sideburns(0.11);
      break;
    }
    case 'sidepart': {                                 // combed over, parted to one side
      head.add(hairCap(c, 0.373));
      head.add(hairSides(c, 0.373, 1.7));
      const sweep = at(rbox(0.34, 0.13, 0.18, lite, 0.06), -0.05, 0.505, 0.215); sweep.rotation.set(-0.2, 0, -0.17); head.add(sweep);
      const side = at(rbox(0.16, 0.1, 0.14, c, 0.05), 0.21, 0.485, 0.19); side.rotation.z = 0.36; head.add(side);
      const part = at(rbox(0.035, 0.05, 0.26, dark, 0.015), -0.1, 0.65, 0.06); part.rotation.x = -0.25; head.add(part);
      nape(); sideburns(0.15);
      break;
    }
    case 'spiky': {                                    // short, spikes off the crown
      head.add(hairCap(c, 0.365));
      head.add(hairSides(c, 0.365, 1.75));
      const spikes: [number, number, number, number, number][] = [
        [0, 0.7, 0.03, -0.15, 0], [-0.15, 0.67, 0.1, -0.3, -0.35], [0.15, 0.67, 0.1, -0.3, 0.35],
        [-0.19, 0.65, -0.1, 0.15, -0.5], [0.19, 0.65, -0.1, 0.15, 0.5], [0, 0.66, -0.19, 0.45, 0],
      ];
      for (const [x, y, z, tx, tz] of spikes) head.add(tuft(c, 0.08, 0.22, x, y, z, tx, tz));
      nape(0.26); sideburns(0.11);
      break;
    }
    case 'curls': {                                    // a rounded afro
      head.add(hairCap(c, 0.355, 0.4 * Math.PI));
      head.add(hairSides(c, 0.355, 1.6, 0.36 * Math.PI, 0.68 * Math.PI));
      curlCluster(head, c, 0.4, 0.125);
      sideburns(0.13);
      break;
    }
    case 'manbun': {                                   // swept back into a small knot
      head.add(hairCap(c, 0.368, 0.42 * Math.PI));
      head.add(hairSides(c, 0.368, 1.35));
      nape(0.28, 0.26);
      head.add(puff(c, 0.13, 0, 0.5, -0.35));
      head.add(hairTie(dark, 0.095, 0, 0.44, -0.33, 0.3));
      break;
    }
    case 'bob': {                                      // jaw-length bob, tips curling in
      head.add(hairCap(c, 0.385, 0.38 * Math.PI));
      head.add(hairSides(c, 0.385, 1.25, 0.33 * Math.PI, 0.8 * Math.PI));
      head.add(at(rbox(0.46, 0.12, 0.15, c, 0.05), 0, 0.485, 0.25));                     // fringe
      head.add(at(rbox(0.46, 0.36, 0.2, c, 0.1), 0, 0.15, -0.24));                       // back
      for (const sx of [-1, 1]) head.add(hairLock(c, 0.14, 0.34, 0.19, sx * 0.31, 0.14, 0.03, 0, sx * 0.07));
      for (const sx of [-1, 1]) head.add(puff(c, 0.085, sx * 0.28, -0.03, 0.05));        // tips turning toward the chin
      break;
    }
    case 'ponytail': {                                 // smoothed back, high tail
      head.add(hairCap(c, 0.378, 0.4 * Math.PI));
      head.add(hairSides(c, 0.378, 1.45));
      head.add(at(rbox(0.42, 0.26, 0.18, c, 0.08), 0, 0.28, -0.26));
      head.add(hairTie(0xd94a3d, 0.1, 0, 0.29, -0.34, 0.35));
      head.add(hairLock(c, 0.18, 0.3, 0.18, 0, 0.13, -0.39, 0.3));
      head.add(hairLock(c, 0.16, 0.28, 0.16, 0, -0.11, -0.45, 0.5));
      for (const sx of [-1, 1]) head.add(hairLock(c, 0.08, 0.24, 0.11, sx * 0.31, 0.26, 0.09, 0, sx * 0.05));   // strands by the ears
      break;
    }
    case 'long': {                                     // loose hair past the shoulders
      head.add(hairCap(c, 0.385, 0.38 * Math.PI));
      head.add(hairSides(c, 0.385, 1.2, 0.33 * Math.PI, 0.82 * Math.PI));
      const fringe = at(rbox(0.46, 0.12, 0.16, lite, 0.05), -0.03, 0.485, 0.245); fringe.rotation.z = -0.12; head.add(fringe);
      head.add(at(rbox(0.5, 0.76, 0.22, c, 0.12), 0, -0.14, -0.24));
      for (const sx of [-1, 1]) head.add(hairLock(c, 0.14, 0.56, 0.2, sx * 0.33, 0.0, 0.04, 0, sx * 0.05));
      for (const sx of [-1, 1]) head.add(puff(c, 0.1, sx * 0.18, -0.52, -0.22));          // rounded ends
      break;
    }
    case 'braids': {                                   // centre parting and two braids
      head.add(hairCap(c, 0.384, 0.38 * Math.PI));
      head.add(hairSides(c, 0.384, 1.3, 0.33 * Math.PI, 0.76 * Math.PI));
      for (const sx of [-1, 1]) { const f = at(rbox(0.22, 0.11, 0.15, c, 0.05), sx * 0.12, 0.49, 0.245); f.rotation.z = sx * 0.24; head.add(f); }
      head.add(at(rbox(0.44, 0.3, 0.2, c, 0.1), 0, 0.2, -0.24));
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 4; i++) head.add(puff(i % 2 ? dark : c, 0.088 - i * 0.008, sx * (0.3 + i * 0.012), 0.14 - i * 0.15, -0.05 - i * 0.02));
        head.add(hairTie(0xf2c31b, 0.062, sx * 0.34, -0.33, -0.11, 0.4));
        head.add(puff(c, 0.05, sx * 0.34, -0.41, -0.12));
      }
      break;
    }
    case 'topknot': {                                  // pulled up into a bun
      head.add(hairCap(c, 0.376, 0.42 * Math.PI));
      head.add(hairSides(c, 0.376, 1.15, 0.36 * Math.PI, 0.64 * Math.PI));
      head.add(puff(c, 0.145, 0, 0.76, -0.03));
      head.add(puff(dark, 0.075, 0.09, 0.74, 0.05));
      head.add(hairTie(0xd94a3d, 0.115, 0, 0.65, -0.03, 0));
      for (const sx of [-1, 1]) head.add(hairLock(c, 0.075, 0.28, 0.11, sx * 0.31, 0.25, 0.1, 0, sx * 0.06));
      break;
    }
    case 'curlylong': {                                // big curls, long at the back
      head.add(hairCap(c, 0.362, 0.4 * Math.PI));
      head.add(hairSides(c, 0.362, 1.35, 0.35 * Math.PI, 0.74 * Math.PI));
      curlCluster(head, c, 0.4, 0.115);
      head.add(at(rbox(0.44, 0.48, 0.2, c, 0.1), 0, 0.02, -0.26));
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) head.add(puff(i % 2 ? shade(c, 0.86) : c, 0.115 - i * 0.012, sx * (0.2 - i * 0.03), -0.06 - i * 0.17, -0.26 - i * 0.02));
      break;
    }
    default: {                                         // 'crop' — a neat short cut
      head.add(hairCap(c, 0.373));
      head.add(hairSides(c, 0.373, 1.75));
      const fringe = at(rbox(0.42, 0.11, 0.13, c, 0.04), 0, 0.475, 0.245); fringe.rotation.x = -0.15; head.add(fringe);
      const sweep = at(rbox(0.18, 0.09, 0.12, lite, 0.04), 0.13, 0.495, 0.225); sweep.rotation.z = 0.3; head.add(sweep);
      nape(); sideburns();
      break;
    }
  }
}

export function makeAvatar(style: AvatarStyle): Avatar {
  const skin = style.skin ?? 0xe0ac7e;
  const hairC = style.hair ?? 0x2b1d14;
  const shorts = !style.female && style.hat !== 'explorer';   // explorers wear long trousers; everyone else shorts
  const shoe = style.female ? 0xf4f4f4 : [0xf4f4f4, 0x25211f, 0xd94a3d][(style.shirt + style.pants) % 3];
  const g = new THREE.Group();

  // legs: thigh in the shorts / trouser colour, shin in skin (shorts) or cloth, a chunky shoe (hip pivot at y 0.85)
  const mkLeg = (x: number) => {
    const thigh = at(rbox(0.24, 0.44, 0.26, style.pants, 0.1, true), x, 0.85, 0);
    thigh.add(at(rbox(0.2, 0.4, 0.22, shorts || style.female ? skin : style.pants, 0.08), 0, -0.6, 0));
    thigh.add(at(rbox(0.26, 0.15, 0.4, shoe, 0.06), 0, -0.78, 0.06));
    thigh.add(at(rbox(0.27, 0.06, 0.42, 0xdddddd, 0.02), 0, -0.83, 0.06));   // sole
    return thigh;
  };
  const legL = mkLeg(-0.15), legR = mkLeg(0.15);

  const body = new THREE.Group();
  body.position.y = 0.85;
  g.add(legL, legR, body);

  // hips, torso (a T-shirt), round shoulders / short sleeves, neck
  body.add(at(rbox(0.54, 0.24, 0.34, style.pants, 0.1), 0, 0.02, 0));
  body.add(at(rbox(0.6, 0.72, 0.38, style.shirt, 0.14), 0, 0.42, 0));
  for (const sx of [-1, 1]) body.add(at(rbox(0.24, 0.26, 0.3, style.shirt, 0.11), sx * 0.36, 0.68, 0));
  { const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.115, 0.26, 14), mat(skin)); neck.castShadow = true; body.add(at(neck, 0, 0.88, 0)); }   // a visible neck between collar and chin
  if (style.female) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.44, 0.46, 14), mat(style.pants)); skirt.castShadow = true; body.add(at(skirt, 0, -0.16, 0));   // skirt from the hips
    body.add(at(rbox(0.62, 0.07, 0.4, 0xf2c31b, 0.03), 0, 0.06, 0));                    // waist band
  }
  if (style.backpack) {
    body.add(at(rbox(0.46, 0.56, 0.22, 0x8a5a2b, 0.08), 0, 0.42, -0.3));
    body.add(at(rbox(0.28, 0.18, 0.1, 0x6b4520, 0.04), 0, 0.28, -0.44));
  }

  // arms: skin below the sleeve, a round hand (shoulder pivot)
  const mkArm = (x: number) => {
    const arm = at(rbox(0.17, 0.62, 0.17, skin, 0.08, true), x, 0.74, 0);
    arm.add(at(rbox(0.2, 0.22, 0.2, style.shirt, 0.09), 0, -0.06, 0));   // sleeve hangs over the top of the arm
    arm.add(at(sphere(0.1, skin, 12), 0, -0.66, 0));
    return arm;
  };
  const armL = mkArm(-0.42), armR = mkArm(0.42);
  body.add(armL, armR);

  // head: a round face, hair on top and behind, dot eyes with a highlight, brows, a small nose, a smile
  const head = new THREE.Group();
  head.position.y = 1.02;
  body.add(head);
  const face = sphere(0.34, skin, 22); face.scale.set(1, 1.08, 0.96); head.add(at(face, 0, 0.3, -0.02));
  for (const sx of [-1, 1]) head.add(at(sphere(0.065, skin, 10), sx * 0.32, 0.28, -0.02));   // ears
  // hair: one of a dozen cuts (see addHair). A hat flattens the tall ones so nothing pokes through.
  const TALL: HairStyle[] = ['spiky', 'curls', 'manbun', 'topknot', 'curlylong'];
  let cut: HairStyle = style.hairStyle ?? (style.female ? 'bob' : 'crop');
  if (style.hat && style.hat !== 'none' && TALL.includes(cut)) cut = style.female ? 'ponytail' : 'crop';
  addHair(head, cut, hairC);
  if (style.female) {
    if (cut === 'bob' || cut === 'ponytail') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.028, 6, 24, Math.PI), mat(0xf2c31b));
      band.rotation.x = -Math.PI / 2 + 0.28; head.add(at(band, 0, 0.42, -0.01));   // a hair band pressed over the hair
    }
    if (cut !== 'curls' && cut !== 'curlylong') head.add(at(sphere(0.05, 0xd94a3d, 8), 0.29, 0.55, 0.14));   // a flower clip
    head.add(at(sphere(0.028, 0xd92b2b, 8), 0, 0.43, 0.32));               // bindi
    for (const sx of [-1, 1]) head.add(at(sphere(0.045, 0xf0a0a0, 8), sx * 0.19, 0.2, 0.26));   // cheeks
  }
  for (const sx of [-1, 1]) {
    head.add(at(sphere(0.048, 0x1a1a1a, 10), sx * 0.12, 0.34, 0.3));
    head.add(at(sphere(0.016, 0xffffff, 6), sx * 0.12 + 0.015, 0.355, 0.34));
    head.add(at(rbox(0.13, 0.03, 0.03, hairC, 0.01), sx * 0.12, 0.44, 0.31));
  }
  head.add(at(sphere(0.04, skin, 8), 0, 0.26, 0.33));                                              // nose
  { const smile = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 6, 14, Math.PI), mat(0x8a3a2a)); smile.rotation.z = Math.PI; head.add(at(smile, 0, 0.19, 0.31)); }

  if (style.hat === 'explorer') {
    head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.05, 16), mat(0xc9b07a)), 0, 0.72, 0));
    head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.28, 16), mat(0xc9b07a)), 0, 0.86, 0));
    head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 16), mat(0x6b4520)), 0, 0.76, 0));
  } else if (style.hat === 'cap') {
    head.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.39, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(style.shirt)), 0, 0.45, -0.03));
    head.add(at(rbox(0.36, 0.05, 0.3, style.shirt, 0.02), 0, 0.47, 0.44));
  }

  // merge the static bits (head features, torso, hat…) so each explorer is ~6 draw calls instead of ~40
  g.updateMatrixWorld(true);
  bakeInto(head, head.children.filter((c): c is THREE.Mesh => (c as THREE.Mesh).isMesh), { flat: false });
  bakeInto(body, body.children.filter((c): c is THREE.Mesh => (c as THREE.Mesh).isMesh && c !== armL && c !== armR), { flat: false });
  return { group: g, body, legL, legR, armL, armR };
}

export function animateWalk(a: Avatar, t: number, amount: number) {
  const s = Math.sin(t * 10) * 0.7 * amount;
  a.legL.rotation.x = s;
  a.legR.rotation.x = -s;
  a.armL.rotation.x = -s * 0.8;
  a.armR.rotation.x = s * 0.8;
  a.body.position.y = 0.85 + Math.abs(Math.sin(t * 10)) * 0.06 * amount;
}

export function poseJump(a: Avatar) {
  a.legL.rotation.x = -0.5; a.legR.rotation.x = 0.4;
  a.armL.rotation.x = -2.6; a.armR.rotation.x = -2.6;
}

export function poseSit(a: Avatar) {
  a.legL.rotation.x = a.legR.rotation.x = -Math.PI / 2;
  a.armL.rotation.x = a.armR.rotation.x = -1.1;
  a.body.position.y = 0.85;
}

// astride a bike or cycle: legs down and bent, hands forward on the bars
export function poseRide(a: Avatar) {
  a.legL.rotation.x = a.legR.rotation.x = -0.9;
  a.legL.rotation.z = 0.25; a.legR.rotation.z = -0.25;
  a.armL.rotation.x = a.armR.rotation.x = -0.9;
  a.body.position.y = 0.85;
}

export const FEMALE_OUTFITS: AvatarStyle[] = [
  { shirt: 0xe75480, pants: 0x6a3fb0, hair: 0x1a1a1a, female: true, hairStyle: 'long' },
  { shirt: 0x3fb7d9, pants: 0xf2c31b, hair: 0x4a2a12, female: true, hairStyle: 'bob' },
  { shirt: 0xf27d3a, pants: 0x2fa66a, hair: 0x1a1a1a, female: true, backpack: true, hairStyle: 'ponytail' },
  { shirt: 0xffffff, pants: 0xd94a3d, hair: 0x8a5a2b, female: true, hairStyle: 'curlylong' },
  { shirt: 0xb0308a, pants: 0x2c3e6b, hair: 0x1a1a1a, female: true, hairStyle: 'braids' },
  { shirt: 0x6a3fb0, pants: 0xe75480, hair: 0xd9c27a, female: true, hat: 'cap', hairStyle: 'ponytail' },
  { shirt: 0x2fa66a, pants: 0x2b2b3a, hair: 0x3a2417, female: true, hairStyle: 'topknot' },
  { shirt: 0xf2c31b, pants: 0x6a3fb0, hair: 0x6b3a1f, female: true, hairStyle: 'long' },
];

export const OUTFITS: AvatarStyle[] = [
  { shirt: 0xd94a3d, pants: 0x2c3e6b, hat: 'explorer', backpack: true, hairStyle: 'crop' },
  { shirt: 0x3f8fd6, pants: 0x333333, hair: 0x4a2a12, hat: 'cap', hairStyle: 'crop' },
  { shirt: 0xf2c31b, pants: 0x4a5d3a, hair: 0x1a1a1a, hairStyle: 'spiky' },
  { shirt: 0x6a3fb0, pants: 0x2b2b2b, hair: 0xb5651d, backpack: true, hairStyle: 'sidepart' },
  { shirt: 0x2fa66a, pants: 0x5a3b2b, hair: 0xd9c27a, hairStyle: 'manbun' },
  { shirt: 0xf27d3a, pants: 0x2c3e6b, hair: 0x1a1a1a, hat: 'cap', hairStyle: 'buzz' },
  { shirt: 0xffffff, pants: 0x1f3b5c, hair: 0x4a2a12, hairStyle: 'curls' },
  { shirt: 0xe75480, pants: 0x333333, hair: 0x1a1a1a, hat: 'explorer', hairStyle: 'crop' },
  { shirt: 0x1fb5b5, pants: 0x3a2f2f, hair: 0x8a5a2b, backpack: true, hairStyle: 'sidepart' },
  { shirt: 0x8a5a2b, pants: 0x2b2b3a, hair: 0xd9c27a, hat: 'cap', hairStyle: 'buzz' },
  { shirt: 0x2c3e6b, pants: 0x4a4a4a, hair: 0x1a1a1a, hairStyle: 'curls' },
  { shirt: 0xd9d9d9, pants: 0x2fa66a, hair: 0x3a2417, hairStyle: 'spiky' },
];
export const SKINS = [0xe0ac7e, 0x8d5524, 0xf1c27d, 0xc68642, 0xa5714a];
export const HAIR_COLORS = [0x1a1a1a, 0x2b1d14, 0x4a2a12, 0x6b3a1f, 0x8a5a2b, 0xb5651d, 0xd9c27a, 0x3a2417];
