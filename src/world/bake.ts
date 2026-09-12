import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Merge many small single-colour meshes into one vertex-coloured mesh: one draw call
// (two with shadows) instead of hundreds. Only plain opaque, non-emissive materials qualify.

const cache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();

function nonIndexed(geo: THREE.BufferGeometry) {
  let g = cache.get(geo);
  if (!g) {
    g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    cache.set(geo, g);
  }
  return g;
}

export function bakeable(m: THREE.Mesh) {
  const mat = m.material as THREE.MeshStandardMaterial;
  return !Array.isArray(m.material) && mat.isMeshStandardMaterial && !mat.transparent && !mat.vertexColors && mat.emissive.getHex() === 0 && !!m.geometry.attributes.position;
}

/**
 * Bake `meshes` (world matrices relative to `parent`) into one mesh appended to `parent`,
 * removing the originals. Skips meshes under an ancestor flagged `userData.animated`.
 */
export function bakeInto(parent: THREE.Object3D, meshes: THREE.Mesh[], opts: { flat?: boolean; roughness?: number } = {}) {
  if (!meshes.length) return null;
  parent.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const parts: THREE.BufferGeometry[] = [];
  const local = new THREE.Matrix4();
  for (const m of meshes) {
    const geo = nonIndexed(m.geometry).clone();
    local.multiplyMatrices(inv, m.matrixWorld);
    geo.applyMatrix4(local);
    const col = (m.material as THREE.MeshStandardMaterial).color;
    const n = geo.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(geo);
    m.parent?.remove(m);
  }
  const merged = mergeGeometries(parts, false)!;
  if (opts.flat !== false) merged.computeVertexNormals();
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: opts.roughness ?? 0.85, flatShading: opts.flat !== false }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Bake every static, plain mesh in a scene subtree (used for landmarks). */
export function bakeStatic(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  const walk = (o: THREE.Object3D, animated: boolean) => {
    const a = animated || !!o.userData.animated;
    const m = o as THREE.Mesh;
    if (m.isMesh && !a && bakeable(m)) meshes.push(m);
    for (const c of o.children) walk(c, a);
  };
  walk(root, false);
  // chunk so a single geometry never gets unwieldy
  for (let i = 0; i < meshes.length; i += 400) bakeInto(root, meshes.slice(i, i + 400));
}
