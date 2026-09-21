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

export interface AvatarStyle {
  shirt: number;
  pants: number;
  skin?: number;
  hair?: number;
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
  // hair: a sphere a little bigger than the head, open at the front so the face shows (phi = π/2 is +z, the face)
  const hairShell = (r: number, gap: number, theta: number) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 14, Math.PI / 2 + gap / 2, Math.PI * 2 - gap, 0, theta), mat(hairC)); m.castShadow = true; return m; };
  if (style.female) {
    head.add(at(hairShell(0.385, 1.15, Math.PI * 0.62), 0, 0.34, -0.05));          // a bob down to the jaw, open over the face
    head.add(at(rbox(0.5, 0.11, 0.16, hairC, 0.05), 0, 0.53, 0.25));               // fringe
    for (const sx of [-1, 1]) { const lock = at(rbox(0.12, 0.44, 0.2, hairC, 0.06), sx * 0.33, 0.1, 0.06); lock.rotation.z = sx * 0.06; head.add(lock); }   // locks in front of the ears
    head.add(at(rbox(0.5, 0.62, 0.22, hairC, 0.11), 0, -0.02, -0.24));            // long hair down the back
    { const tail = at(rbox(0.16, 0.5, 0.16, hairC, 0.07), 0, -0.34, -0.26); tail.rotation.x = 0.15; head.add(tail); head.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12), mat(0xd94a3d)), 0, -0.1, -0.27)); }   // gathered with a red tie
    { const band = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.03, 6, 24, Math.PI), mat(0xf2c31b)); band.rotation.x = -Math.PI / 2 + 0.35; head.add(at(band, 0, 0.48, 0.0)); }   // a hair band over the top
    head.add(at(sphere(0.05, 0xd94a3d, 8), 0.3, 0.6, 0.14));               // a flower clip
    head.add(at(sphere(0.028, 0xd92b2b, 8), 0, 0.43, 0.32));               // bindi
    for (const sx of [-1, 1]) head.add(at(sphere(0.045, 0xf0a0a0, 8), sx * 0.19, 0.2, 0.26));   // cheeks
  } else {
    head.add(at(hairShell(0.37, 1.3, Math.PI * 0.5), 0, 0.4, -0.04));            // short crop over the top and back
    head.add(at(rbox(0.5, 0.09, 0.12, hairC, 0.04), 0, 0.5, 0.26));              // fringe
    head.add(at(rbox(0.5, 0.34, 0.18, hairC, 0.09), 0, 0.28, -0.26));           // nape
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
  { shirt: 0xe75480, pants: 0x6a3fb0, hair: 0x1a1a1a, female: true },
  { shirt: 0x3fb7d9, pants: 0xf2c31b, hair: 0x4a2a12, female: true },
  { shirt: 0xf27d3a, pants: 0x2fa66a, hair: 0x1a1a1a, female: true, backpack: true },
  { shirt: 0xffffff, pants: 0xd94a3d, hair: 0x8a5a2b, female: true },
  { shirt: 0xb0308a, pants: 0x2c3e6b, hair: 0x1a1a1a, female: true },
  { shirt: 0x6a3fb0, pants: 0xe75480, hair: 0xd9c27a, female: true, hat: 'cap' },
];

export const OUTFITS: AvatarStyle[] = [
  { shirt: 0xd94a3d, pants: 0x2c3e6b, hat: 'explorer', backpack: true },
  { shirt: 0x3f8fd6, pants: 0x333333, hair: 0x4a2a12, hat: 'cap' },
  { shirt: 0xf2c31b, pants: 0x4a5d3a, hair: 0x1a1a1a },
  { shirt: 0x6a3fb0, pants: 0x2b2b2b, hair: 0xb5651d, backpack: true },
  { shirt: 0x2fa66a, pants: 0x5a3b2b, hair: 0xd9c27a },
  { shirt: 0xf27d3a, pants: 0x2c3e6b, hair: 0x1a1a1a, hat: 'cap' },
  { shirt: 0xffffff, pants: 0x1f3b5c, hair: 0x4a2a12 },
  { shirt: 0xe75480, pants: 0x333333, hair: 0x1a1a1a, hat: 'explorer' },
  { shirt: 0x1fb5b5, pants: 0x3a2f2f, hair: 0x8a5a2b, backpack: true },
  { shirt: 0x8a5a2b, pants: 0x2b2b3a, hair: 0xd9c27a, hat: 'cap' },
];
export const SKINS = [0xe0ac7e, 0x8d5524, 0xf1c27d, 0xc68642, 0xa5714a];
