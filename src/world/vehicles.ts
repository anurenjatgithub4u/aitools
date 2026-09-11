import * as THREE from 'three';

export type VehicleKind = 'jeep' | 'tuktuk';

export interface VehicleSpec { kind: VehicleKind; label: string; maxSpeed: number; reverse: number; accel: number; turn: number; length: number; width: number }

export const SPECS: Record<VehicleKind, VehicleSpec> = {
  jeep: { kind: 'jeep', label: 'Jeep', maxSpeed: 26, reverse: 9, accel: 14, turn: 1.9, length: 4, width: 2.2 },
  tuktuk: { kind: 'tuktuk', label: 'Tuk-tuk', maxSpeed: 15, reverse: 6, accel: 9, turn: 2.4, length: 2.6, width: 1.5 },
};

export interface Vehicle {
  spec: VehicleSpec;
  group: THREE.Group;
  wheels: THREE.Mesh[];
  seat: THREE.Vector3;
  heading: number;
  speed: number;
}

const mat = (c: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...extra });
function box(w: number, h: number, d: number, c: number, extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, extra));
  m.castShadow = true;
  return m;
}
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };
const rot = <T extends THREE.Object3D>(o: T, axis: 'x' | 'y' | 'z', a: number) => { o.rotation[axis] = a; return o; };

function wheel(r: number, w: number) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), mat(0x222222, { roughness: 0.9 }));
  m.rotation.z = Math.PI / 2;
  m.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w + 0.02, 8), mat(0xbbbbbb));
  m.add(hub);
  return m;
}

// Vehicles face +Z. Wheels are returned so they can spin.
export function makeVehicle(kind: VehicleKind, color: number): Vehicle {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const wheels: THREE.Mesh[] = [];
  let seat: THREE.Vector3;

  if (kind === 'jeep') {
    g.add(at(box(2.2, 0.7, 4, color), 0, 0.85, 0));                     // tub
    g.add(at(box(2.1, 0.35, 1.4, color), 0, 1.35, 1.2));                // hood
    g.add(at(box(2.0, 0.9, 0.08, 0x9fd3e8, { transparent: true, opacity: 0.55 }), 0, 1.85, 0.5)); // windshield
    g.add(at(box(2.2, 0.1, 0.12, 0x333333), 0, 2.3, 0.5));
    g.add(at(box(0.5, 0.5, 0.5, 0x333333), -0.55, 1.35, -0.3));        // seats
    g.add(at(box(0.5, 0.5, 0.5, 0x333333), 0.55, 1.35, -0.3));
    g.add(at(box(0.5, 0.5, 0.1, 0x333333), -0.55, 1.75, -0.55));
    g.add(at(box(2.4, 0.25, 0.3, 0x444444), 0, 0.6, 2.05));            // bumpers
    g.add(at(box(2.4, 0.25, 0.3, 0x444444), 0, 0.6, -2.05));
    g.add(at(box(0.3, 0.2, 0.05, 0xfff2a8, { emissive: 0xfff2a8, emissiveIntensity: 0.6 }), -0.75, 1.3, 1.92));
    g.add(at(box(0.3, 0.2, 0.05, 0xfff2a8, { emissive: 0xfff2a8, emissiveIntensity: 0.6 }), 0.75, 1.3, 1.92));
    g.add(at(box(0.06, 0.06, 1.6, 0x333333), 0, 2.25, -0.3));           // roll cage
    for (const x of [-0.95, 0.95]) g.add(at(box(0.06, 0.9, 0.06, 0x333333), x, 1.8, -1.1));
    g.add(at(box(2.0, 0.06, 0.06, 0x333333), 0, 2.25, -1.1));
    g.add(rot(at(box(0.16, 0.16, 0.55, 0x333333), -0.55, 1.75, 0.35), 'x', -0.5)); // steering column
    g.add(rot(at(new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 6, 14), mat(0x222222)), -0.55, 1.95, 0.05), 'x', 0.9));
    // spare wheel
    const spare = wheel(0.5, 0.3); spare.rotation.set(0, Math.PI / 2, 0); spare.position.set(0, 1.4, -2.2); g.add(spare);
    for (const [x, z] of [[-1.15, 1.3], [1.15, 1.3], [-1.15, -1.3], [1.15, -1.3]]) {
      const w = wheel(0.5, 0.4); w.position.set(x, 0.5, z); g.add(w); wheels.push(w);
    }
    seat = new THREE.Vector3(-0.55, 1.05, -0.2);
  } else {
    const dark = 0x1e6b3a;
    g.add(at(box(1.5, 0.9, 2.6, color), 0, 0.85, -0.2));               // floor + body
    g.add(at(box(1.5, 1.2, 0.08, 0x9fd3e8, { transparent: true, opacity: 0.55 }), 0, 1.9, 1.0)); // windshield
    for (const x of [-0.72, 0.72]) g.add(at(box(0.08, 1.4, 0.08, dark), x, 1.8, -1.4));
    for (const x of [-0.72, 0.72]) g.add(at(box(0.08, 1.4, 0.08, dark), x, 1.8, 1.0));
    g.add(at(box(1.7, 0.1, 2.9, dark), 0, 2.55, -0.2));                // roof
    g.add(at(box(1.5, 1.2, 0.08, dark), 0, 1.9, -1.45));               // back panel
    g.add(at(box(1.3, 0.45, 0.6, 0x333333), 0, 1.4, -0.9));            // bench
    g.add(at(box(0.5, 0.35, 0.5, 0x333333), 0, 1.4, 0.3));             // driver seat
    g.add(at(box(0.9, 0.05, 0.05, 0x333333), 0, 1.95, 0.85));          // handlebar
    g.add(at(box(0.05, 0.6, 0.05, 0x333333), 0, 1.65, 0.85));
    g.add(rot(at(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 10), mat(0xfff2a8, { emissive: 0xfff2a8, emissiveIntensity: 0.6 })), 0, 1.5, 1.35), 'x', Math.PI / 2));
    const front = wheel(0.38, 0.25); front.position.set(0, 0.38, 1.2); g.add(front); wheels.push(front);
    for (const x of [-0.7, 0.7]) { const w = wheel(0.38, 0.25); w.position.set(x, 0.38, -0.9); g.add(w); wheels.push(w); }
    seat = new THREE.Vector3(0, 1.15, 0.3);
  }

  return { spec: SPECS[kind], group: g, wheels, seat, heading: 0, speed: 0 };
}

export const VEHICLE_COLORS = [0xd94a3d, 0x2f6fd1, 0xf2c31b, 0x3fa66a, 0xf27d3a, 0xffffff];
