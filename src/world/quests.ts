import * as THREE from 'three';

// Timed tasks that keep a visit lively: hunt hidden gifts, race through checkpoints,
// run a taxi job, or gather a specific treat. The world owns the state; this file holds
// the definitions, the reward maths and the little 3D props.

export type QuestKind = 'hunt' | 'race' | 'taxi' | 'collect';

export interface QuestDef {
  kind: QuestKind;
  title: string;
  desc: string;
  seconds: number;
  reward: number;
}

export interface QuestState {
  status: 'idle' | 'active' | 'done' | 'failed';
  title: string;
  desc: string;
  progress: string;   // e.g. "2 / 5 gifts"
  remaining: number;  // seconds left
  total: number;
  reward: number;
  hint: string | null; // e.g. "Lalbagh · 120 m"
}

const GIFT_COUNT = 5;

export function makeQuestDef(kind: QuestKind, ctx: { item?: string; count?: number; rider?: string; place?: string; stops?: string[] }): QuestDef {
  switch (kind) {
    case 'hunt':
      return { kind, title: 'Cash hunt', desc: `₹500 bundles are hidden nearby — ${GIFT_COUNT} of them. The map shows roughly where. Find them all!`, seconds: 180, reward: 150 };
    case 'race':
      return { kind, title: 'Checkpoint dash', desc: `Reach ${ctx.stops?.join(' → ')} in order. Grab a bike — it's far.`, seconds: 150, reward: 160 };
    case 'taxi':
      return { kind, title: 'Taxi job', desc: `${ctx.rider} needs a ride to ${ctx.place}. Pull up, press F to pick them up, drive there and drop off.`, seconds: 140, reward: 180 };
    default:
      return { kind: 'collect', title: 'Snack run', desc: `Collect ${ctx.count} × ${ctx.item} before the clock runs out.`, seconds: 120, reward: 100 };
  }
}

export const GIFT_TOTAL = GIFT_COUNT;

// ---------- props ----------
const mat = (c: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...extra });

/** A bundle of ₹500 notes with a band, plus a couple of gold coins beside it. */
export function makeGift(): THREE.Group {
  const g = new THREE.Group();
  const note = mat(0x9aa8b5, { emissive: 0x6e8a99, emissiveIntensity: 0.15 });      // ₹500 grey-green
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.55), note);
    b.position.set((i - 1) * 0.06, 0.09 + i * 0.19, (i - 1) * 0.03); b.rotation.y = (i - 1) * 0.12; b.castShadow = true; g.add(b);
  }
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.62, 0.6), mat(0xf2c31b, { emissive: 0xf2c31b, emissiveIntensity: 0.3 }));
  band.position.set(0, 0.32, 0); g.add(band);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.3), mat(0xffffff));
  face.position.set(-0.28, 0.66, 0); g.add(face);                                   // pale panel on the top note
  const gold = mat(0xf2c31b, { emissive: 0xf2c31b, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 });
  for (const [x, z, y] of [[0.75, 0.15, 0.05], [0.85, -0.2, 0.15], [-0.7, -0.25, 0.05]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 14), gold);
    c.position.set(x, y, z); c.rotation.x = 0.2; g.add(c);
  }
  return g;
}

/** Tall glowing pillar marking a checkpoint / drop-off point. */
export function makeBeacon(color: number): THREE.Group {
  const g = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.6, 40, 16, 1, true),
    mat(color, { emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  pillar.position.y = 20; g.add(pillar);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.25, 8, 32), mat(color, { emissive: color, emissiveIntensity: 1.5 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
  g.userData.ring = ring;
  return g;
}

/** Floating arrow that points down at a person or vehicle. */
export function makeArrow(color: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 4), mat(color, { emissive: color, emissiveIntensity: 1.2 }));
  m.rotation.x = Math.PI; // point down
  return m;
}
