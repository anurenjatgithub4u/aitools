import * as THREE from 'three';
import { makeVehicle } from './vehicles';

// Small ambient life: animals, birds and road traffic. All models face +Z.

const mat = (c: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...extra });
function box(w: number, h: number, d: number, c: number, pivotTop = false, extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (pivotTop) geo.translate(0, -h / 2, 0);
  const m = new THREE.Mesh(geo, mat(c, extra));
  m.castShadow = true;
  return m;
}
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };

export interface Animal { group: THREE.Group; legs: THREE.Mesh[]; tail: THREE.Mesh; speed: number; size: number }

export function makeDog(color: number): Animal {
  const g = new THREE.Group();
  const legs: THREE.Mesh[] = [];
  g.add(at(box(0.4, 0.4, 0.9, color), 0, 0.6, 0));
  g.add(at(box(0.36, 0.34, 0.4, color), 0, 0.8, 0.6));
  g.add(at(box(0.2, 0.16, 0.22, 0x3a2a1a), 0, 0.72, 0.9));                       // snout
  g.add(at(box(0.06, 0.06, 0.06, 0x111111), 0, 0.78, 1.02));                     // nose
  for (const x of [-0.14, 0.14]) g.add(at(box(0.1, 0.18, 0.06, 0x3a2a1a), x, 1.0, 0.55)); // ears
  for (const x of [-0.14, 0.14]) for (const z of [-0.3, 0.3]) {
    const l = at(box(0.12, 0.42, 0.12, color, true), x, 0.45, z); g.add(l); legs.push(l);
  }
  const tail = at(box(0.07, 0.07, 0.4, color), 0, 0.75, -0.6); tail.rotation.x = -0.6; g.add(tail);
  return { group: g, legs, tail, speed: 2.2, size: 1 };
}

export function makeCat(color: number): Animal {
  const g = new THREE.Group();
  const legs: THREE.Mesh[] = [];
  g.add(at(box(0.24, 0.24, 0.6, color), 0, 0.36, 0));
  g.add(at(box(0.26, 0.24, 0.26, color), 0, 0.5, 0.38));
  for (const x of [-0.08, 0.08]) g.add(at(box(0.07, 0.1, 0.04, color), x, 0.66, 0.36));  // ears
  for (const x of [-0.07, 0.07]) g.add(at(box(0.04, 0.03, 0.02, 0x7fd36a), x, 0.52, 0.52)); // eyes
  for (const x of [-0.08, 0.08]) for (const z of [-0.2, 0.2]) {
    const l = at(box(0.07, 0.26, 0.07, color, true), x, 0.26, z); g.add(l); legs.push(l);
  }
  const tail = at(box(0.05, 0.05, 0.4, color), 0, 0.5, -0.45); tail.rotation.x = -1.1; g.add(tail);
  return { group: g, legs, tail, speed: 1.4, size: 0.6 };
}

export interface Bird { group: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; center: THREE.Vector3; radius: number; angle: number; speed: number; phase: number }

export function makeBird(color: number, center: THREE.Vector3, radius: number): Bird {
  const g = new THREE.Group();
  g.add(at(box(0.14, 0.12, 0.45, color), 0, 0, 0));
  g.add(at(box(0.06, 0.05, 0.12, 0xf2c31b), 0, 0, 0.27));                         // beak
  const wingL = box(0.6, 0.03, 0.2, color); wingL.geometry.translate(-0.3, 0, 0); wingL.position.set(-0.07, 0.02, 0);
  const wingR = box(0.6, 0.03, 0.2, color); wingR.geometry.translate(0.3, 0, 0); wingR.position.set(0.07, 0.02, 0);
  g.add(wingL, wingR);
  return { group: g, wingL, wingR, center, radius, angle: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 0.4, phase: Math.random() * 6 };
}

export interface Traffic { group: THREE.Group; wheels: THREE.Mesh[]; light?: THREE.Mesh[]; label: string; speed: number; length: number }

export function makeBus(color: number, label = 'KSRTC'): Traffic {
  const g = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  g.add(at(box(3, 3, 11, color), 0, 2, 0));
  g.add(at(box(3.05, 0.6, 11.05, 0xf2c31b), 0, 1.3, 0));
  g.add(at(box(3.05, 0.9, 11.05, 0x9fd3e8), 0, 2.6, 0));
  g.add(at(box(2.6, 1.4, 0.06, 0x9fd3e8), 0, 2.6, 5.53));                        // windscreen
  for (const x of [-1, 1]) g.add(at(box(0.4, 0.25, 0.06, 0xfff2a8, false, { emissive: 0xfff2a8, emissiveIntensity: 0.6 }), x, 1.2, 5.53));
  g.add(at(box(2.2, 0.5, 0.06, 0xffffff), 0, 3.3, 5.53));                        // destination board
  for (const z of [-3.5, 3.5]) for (const x of [-1.35, 1.35]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), mat(0x222222));
    wh.rotation.z = Math.PI / 2; wh.castShadow = true; g.add(at(wh, x, 0.55, z)); wheels.push(wh);
  }
  g.rotation.order = 'YXZ';
  return { group: g, wheels, label: `\u{1F68C} ${label}`, speed: 9, length: 11 };
}

export function makePoliceJeep(): Traffic {
  const v = makeVehicle('jeep', 0xf4f4f4);
  const g = v.group;
  for (const x of [-1.11, 1.11]) g.add(at(box(0.02, 0.25, 3.6, 0x1f4fb0), x, 0.95, 0));  // blue stripe
  g.add(at(box(1.4, 0.12, 0.3, 0x333333), 0, 2.36, 0.2));                             // light bar
  const light = [
    at(box(0.5, 0.2, 0.28, 0xd92b2b, false, { emissive: 0xd92b2b, emissiveIntensity: 1 }), -0.4, 2.5, 0.2),
    at(box(0.5, 0.2, 0.28, 0x2b6fd9, false, { emissive: 0x2b6fd9, emissiveIntensity: 1 }), 0.4, 2.5, 0.2),
  ];
  g.add(...light);
  return { group: g, wheels: v.wheels, light, label: '\u{1F694} Kerala Police', speed: 7, length: 4 };
}
