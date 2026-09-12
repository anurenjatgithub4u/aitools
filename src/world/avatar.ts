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
function plain(w: number, h: number, d: number, c: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.castShadow = true;
  return m;
}
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };

// Stylised explorer, ~2.1 units tall, facing +Z. Limb pivots sit at hip / shoulder.
export function makeAvatar(style: AvatarStyle): Avatar {
  const skin = style.skin ?? 0xe0ac7e;
  const hairC = style.hair ?? 0x2b1d14;
  const dark = 0x25211f;
  const g = new THREE.Group();

  // legs + shoes (hip pivot at y 0.85)
  const legL = at(rbox(0.3, 0.85, 0.32, style.pants, 0.07, true), -0.18, 0.85, 0);
  const legR = at(rbox(0.3, 0.85, 0.32, style.pants, 0.07, true), 0.18, 0.85, 0);
  for (const leg of [legL, legR]) leg.add(at(rbox(0.32, 0.16, 0.44, dark, 0.05), 0, -0.8, 0.06));

  const body = new THREE.Group();
  body.position.y = 0.85;
  g.add(legL, legR, body);

  // torso, belt, collar
  body.add(at(rbox(0.76, 0.85, 0.44, style.shirt, 0.1), 0, 0.42, 0));
  body.add(at(plain(0.78, 0.09, 0.46, dark), 0, 0.03, 0));
  body.add(at(plain(0.34, 0.1, 0.24, style.shirt), 0, 0.9, 0.02));
  if (style.female) {
    body.add(at(rbox(0.9, 0.42, 0.56, style.pants, 0.08), 0, -0.18, 0));          // skirt over the hips
    body.add(at(plain(0.5, 0.06, 0.3, 0xf2c31b), 0, 0.02, 0.2));                    // waist band
  }
  if (style.backpack) {
    body.add(at(rbox(0.5, 0.6, 0.24, 0x8a5a2b, 0.06), 0, 0.45, -0.32));
    body.add(at(rbox(0.3, 0.2, 0.1, 0x6b4520, 0.03), 0, 0.3, -0.48));
  }

  // arms with hands (shoulder pivot)
  const armL = at(rbox(0.22, 0.78, 0.24, style.shirt, 0.06, true), -0.5, 0.82, 0);
  const armR = at(rbox(0.22, 0.78, 0.24, style.shirt, 0.06, true), 0.5, 0.82, 0);
  for (const arm of [armL, armR]) arm.add(at(rbox(0.2, 0.2, 0.2, skin, 0.06), 0, -0.85, 0));
  body.add(armL, armR);

  // head
  const head = new THREE.Group();
  head.position.y = 1.02;
  body.add(head);
  head.add(at(rbox(0.6, 0.62, 0.58, skin, 0.14), 0, 0.3, 0));
  head.add(at(plain(0.1, 0.12, 0.08, skin), -0.33, 0.3, 0));   // ears
  head.add(at(plain(0.1, 0.12, 0.08, skin), 0.33, 0.3, 0));
  head.add(at(rbox(0.64, 0.24, 0.62, hairC, 0.1), 0, 0.55, -0.02));  // hair cap
  if (style.female) {
    head.add(at(rbox(0.66, 0.5, 0.2, hairC, 0.08), 0, 0.28, -0.26));   // long hair down the back
    for (const s of [-1, 1]) head.add(at(rbox(0.1, 0.42, 0.34, hairC, 0.04), s * 0.32, 0.3, -0.06)); // sides
    const tail = at(rbox(0.16, 0.6, 0.16, hairC, 0.06), 0, 0.0, -0.4); tail.rotation.x = 0.25; head.add(tail); // ponytail
    head.add(at(plain(0.2, 0.06, 0.2, 0xd94a3d), 0, 0.68, 0.1));      // hair clip
    head.add(at(plain(0.06, 0.06, 0.02, 0xd92b2b), 0, 0.42, 0.3));    // bindi
  } else {
    head.add(at(plain(0.62, 0.3, 0.14, hairC), 0, 0.38, -0.25));      // hair at the back
  }
  for (const s of [-1, 1]) {
    head.add(at(plain(0.14, 0.12, 0.02, 0xffffff), s * 0.14, 0.34, 0.29));
    head.add(at(plain(0.07, 0.08, 0.02, 0x1a1a1a), s * 0.13, 0.33, 0.3));
    head.add(at(plain(0.16, 0.035, 0.02, hairC), s * 0.14, 0.45, 0.29));
  }
  head.add(at(plain(0.07, 0.1, 0.07, skin), 0, 0.24, 0.3));            // nose
  head.add(at(plain(0.18, 0.035, 0.02, 0xa8503f), 0, 0.12, 0.29));     // smile

  if (style.hat === 'explorer') {
    head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.5, 0.05, 14), mat(0xc9b07a)), 0, 0.6, 0));
    head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.26, 14), mat(0xc9b07a)), 0, 0.74, 0));
    head.add(at(plain(0.66, 0.06, 0.66, 0x6b4520), 0, 0.64, 0));
  } else if (style.hat === 'cap') {
    head.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(style.shirt)), 0, 0.5, 0));
    head.add(at(plain(0.36, 0.04, 0.3, style.shirt), 0, 0.5, 0.4));
  }

  // merge the static bits (head features, torso, hat…) so each explorer is ~6 draw calls instead of ~30
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
