import * as THREE from 'three';

export type VehicleKind = 'jeep' | 'tuktuk' | 'bike' | 'cycle';

export interface VehicleSpec { kind: VehicleKind; label: string; maxSpeed: number; reverse: number; accel: number; turn: number; length: number; width: number; fuel: boolean; ride: boolean }

export const SPECS: Record<VehicleKind, VehicleSpec> = {
  jeep: { kind: 'jeep', label: 'Jeep', maxSpeed: 26, reverse: 9, accel: 14, turn: 1.9, length: 4, width: 2.2, fuel: true, ride: false },
  tuktuk: { kind: 'tuktuk', label: 'Tuk-tuk', maxSpeed: 15, reverse: 6, accel: 9, turn: 2.4, length: 2.6, width: 1.5, fuel: true, ride: false },
  bike: { kind: 'bike', label: 'Bike', maxSpeed: 30, reverse: 3, accel: 17, turn: 2.8, length: 2.2, width: 0.9, fuel: true, ride: true },
  cycle: { kind: 'cycle', label: 'Cycle', maxSpeed: 10, reverse: 2, accel: 6, turn: 3.2, length: 1.9, width: 0.7, fuel: false, ride: true },
};

export interface Vehicle {
  spec: VehicleSpec;
  group: THREE.Group;
  wheels: THREE.Mesh[];
  seat: THREE.Vector3;
  heading: number;
  speed: number;
  fuel: number;          // 0..1, one tank = FUEL_RANGE metres
  boost: number;         // 0..1 nitro meter
  flames: THREE.Mesh[];  // shown while boosting
}

export const FUEL_RANGE = 5000; // metres per tank (5 km)
export const BOOST_MULT = 1.7;  // top-speed multiplier while boosting

const mat = (c: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...extra });
function box(w: number, h: number, d: number, c: number, extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, extra));
  m.castShadow = true;
  return m;
}
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };
const rot = <T extends THREE.Object3D>(o: T, axis: 'x' | 'y' | 'z', a: number) => { o.rotation[axis] = a; return o; };

function bar(a: THREE.Vector3, b: THREE.Vector3, r: number, c: number) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat(c));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  return m;
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

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
  } else if (kind === 'tuktuk') {
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
  } else if (kind === 'bike') {
    const dark = 0x2a2a2a;
    g.add(at(box(0.5, 0.45, 0.9, color), 0, 1.0, 0.25));                          // tank
    g.add(at(box(0.55, 0.16, 0.9, dark), 0, 0.8, -0.35));                          // seat
    g.add(at(box(0.7, 0.22, 0.5, 0x444444), 0, 0.55, -0.05));                       // engine block
    g.add(bar(V(0, 0.75, 0.55), V(0, 1.05, 0.95), 0.05, 0x999999));                 // fork
    g.add(bar(V(0, 0.75, 0.55), V(0, 0.45, 1.0), 0.05, 0x999999));
    g.add(bar(V(0, 0.75, 0.55), V(0, 0.6, -0.9), 0.05, dark));                      // frame to rear
    g.add(bar(V(-0.35, 1.15, 0.7), V(0.35, 1.15, 0.7), 0.03, dark));                // handlebar
    g.add(rot(at(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10), mat(0xfff2a8, { emissive: 0xfff2a8, emissiveIntensity: 0.6 })), 0, 1.0, 1.0), 'x', Math.PI / 2));
    g.add(rot(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), mat(0xbbbbbb)), 0.28, 0.4, -0.5), 'x', Math.PI / 2)); // exhaust
    for (const z of [0.95, -0.85]) { const w = wheel(0.42, 0.18); w.position.set(0, 0.42, z); g.add(w); wheels.push(w); }
    seat = new THREE.Vector3(0, 0.55, -0.15);
  } else {
    const frame = color, dark = 0x2a2a2a;
    g.add(bar(V(0, 0.95, -0.15), V(0, 0.45, 0.65), 0.03, frame));                    // top tube -> fork
    g.add(bar(V(0, 0.95, -0.15), V(0, 0.4, -0.05), 0.03, frame));                    // seat tube
    g.add(bar(V(0, 0.4, -0.05), V(0, 0.45, 0.65), 0.03, frame));                     // down tube
    g.add(bar(V(0, 0.4, -0.05), V(0, 0.4, -0.75), 0.025, frame));                     // chain stay
    g.add(bar(V(0, 0.95, -0.15), V(0, 0.4, -0.75), 0.025, frame));                    // seat stay
    g.add(bar(V(0, 0.45, 0.65), V(0, 1.05, 0.5), 0.03, frame));                       // head tube
    g.add(bar(V(-0.3, 1.05, 0.5), V(0.3, 1.05, 0.5), 0.025, dark));                   // handlebar
    g.add(at(box(0.18, 0.08, 0.3, dark), 0, 1.0, -0.15));                             // saddle
    g.add(at(box(0.3, 0.06, 0.4, dark), 0, 0.5, -0.75));                              // carrier
    g.add(rot(at(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), mat(dark)), 0, 0.4, -0.05), 'z', Math.PI / 2)); // crank
    for (const x of [-0.14, 0.14]) g.add(at(box(0.08, 0.03, 0.12, dark), x, 0.4 + (x > 0 ? 0.14 : -0.14), -0.05));
    for (const z of [0.65, -0.75]) { const w = wheel(0.4, 0.06); w.position.set(0, 0.4, z); g.add(w); wheels.push(w); }
    seat = new THREE.Vector3(0, 0.7, -0.15);
  }

  // exhaust flames, hidden until the booster kicks in
  const flames: THREE.Mesh[] = [];
  const rear = kind === 'jeep' ? { y: 0.6, z: -2.2, xs: [-0.6, 0.6] } : kind === 'tuktuk' ? { y: 0.5, z: -1.6, xs: [0] } : kind === 'bike' ? { y: 0.4, z: -1.1, xs: [0.28] } : { y: 0, z: 0, xs: [] as number[] };
  for (const x of rear.xs) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 8), mat(0xffa030, { emissive: 0xff5a00, emissiveIntensity: 2, transparent: true, opacity: 0.85 }));
    f.rotation.x = -Math.PI / 2; f.position.set(x, rear.y, rear.z - 0.6); f.visible = false;
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 6), mat(0xfff2a8, { emissive: 0xffffff, emissiveIntensity: 2 }));
    core.position.y = 0.1; f.add(core);
    g.add(f); flames.push(f);
  }

  return { spec: SPECS[kind], group: g, wheels, seat, heading: 0, speed: 0, fuel: 0.55 + Math.random() * 0.4, boost: 1, flames };
}

export const VEHICLE_COLORS = [0xd94a3d, 0x2f6fd1, 0xf2c31b, 0x3fa66a, 0xf27d3a, 0xffffff];
