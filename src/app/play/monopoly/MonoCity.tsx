'use client';
// The little 3D city in the middle of the board — the same low-poly look as FindurAI City.
// Buildings grow as properties get bought; houses and hotels on the board add towers.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PALETTE = [0xf4e1c1, 0xd6e6f2, 0xf2d0d0, 0xe4f0d0, 0xf7e7b0, 0xe0d6f2, 0xffffff, 0xf4ede0];
const ROOFS = [0xa33b2c, 0x2c3e6b, 0x6b4a2a, 0x2f6b4a, 0x1e4d3a, 0xd94a3d];

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export default function MonoCity({ owned, houses, active }: { owned: number; houses: number; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<{ setCounts: (owned: number, houses: number) => void } | null>(null);

  useEffect(() => {
    const host = ref.current; if (!host) return;
    const W = host.clientWidth || 300, H = host.clientHeight || 300;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(W, H); renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xdfefff, 0x8fb37a, 0.9));
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.4); sun.position.set(10, 18, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -16; sc.right = sc.top = 16; scene.add(sun);

    const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
    const water = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshStandardMaterial({ color: 0x3a8fc4, roughness: 0.3, metalness: 0.1 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -0.3; scene.add(water);
    const island = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 10.5, 0.8, 28), mat(0x8bc46a)); island.position.y = 0.1; island.receiveShadow = true; scene.add(island);
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(10.3, 10.8, 0.3, 28), mat(0xe8d9a8)); sand.position.y = -0.15; scene.add(sand);
    // a ring road and a cross road
    const road = new THREE.Mesh(new THREE.RingGeometry(6.4, 7.4, 40), mat(0x5f5f5f)); road.rotation.x = -Math.PI / 2; road.position.y = 0.52; scene.add(road);
    for (const r of [0, Math.PI / 2]) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 13.2), mat(0x5f5f5f)); m.rotation.y = r; m.position.y = 0.52; scene.add(m); }

    // buildings: a fixed layout, revealed as the game fills up
    const r = rng(7);
    const slots: { x: number; z: number; w: number; d: number; h: number; c: number; roof: number }[] = [];
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, d = 1.4 + r() * 4.2, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 0.9 || Math.abs(z) < 0.9) continue;   // keep the cross road clear
      slots.push({ x, z, w: 0.7 + r() * 0.7, d: 0.7 + r() * 0.7, h: 0.8 + r() * 2.2 + (d < 2.5 ? 1.5 : 0), c: PALETTE[Math.floor(r() * PALETTE.length)], roof: ROOFS[Math.floor(r() * ROOFS.length)] });
    }
    for (let i = 0; i < 14; i++) {   // suburbs outside the ring road
      const a = r() * Math.PI * 2, d = 7.9 + r() * 1.3;
      slots.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, w: 0.6 + r() * 0.4, d: 0.6 + r() * 0.4, h: 0.5 + r() * 0.5, c: PALETTE[Math.floor(r() * PALETTE.length)], roof: ROOFS[Math.floor(r() * ROOFS.length)] });
    }
    const buildings: { g: THREE.Group; target: number; scale: number }[] = [];
    for (const s of slots) {
      const g = new THREE.Group(); g.position.set(s.x, 0.5, s.z); g.scale.setScalar(0.001);
      const body = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), mat(s.c)); body.position.y = s.h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.08, 0.12, s.d + 0.08), mat(s.roof)); roof.position.y = s.h + 0.06; g.add(roof);
      if (s.h > 1.6) { const win = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.6, s.h * 0.55, 0.02), new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffd36b, emissiveIntensity: 0.35 })); win.position.set(0, s.h * 0.45, s.d / 2 + 0.01); g.add(win); }
      scene.add(g); buildings.push({ g, target: 0, scale: 0.001 });
    }
    // trees along the shore
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + r() * 0.2, d = 8.6 + r() * 1.0, s = 0.6 + r() * 0.5;
      const t = new THREE.Group(); t.position.set(Math.cos(a) * d, 0.5, Math.sin(a) * d);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.5 * s, 6), mat(0x6b4a2a)); trunk.position.y = 0.25 * s; t.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 8, 6), mat(0x4f9a3e)); crown.position.y = 0.7 * s; crown.castShadow = true; t.add(crown);
      scene.add(t);
    }
    // a landmark: the wheel
    const wheel = new THREE.Group(); wheel.position.set(0, 2.3, 0);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 8, 30), mat(0xe8c46a)));
    for (let k = 0; k < 8; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3, 0.05), mat(0xffffff)); sp.rotation.z = (k * Math.PI) / 8; wheel.add(sp); }
    for (const sd of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), mat(0xd94a3d)); leg.position.set(sd * 0.5, -1.1, 0.25); leg.rotation.x = sd * 0.0; leg.rotation.z = sd * 0.25; scene.add(leg); leg.position.y = 1.2; }
    scene.add(wheel);

    let t = 0, raf = 0, running = true;
    const tick = () => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      t += 1 / 60;
      camera.position.set(Math.cos(t * 0.12) * 17, 9.5, Math.sin(t * 0.12) * 17); camera.lookAt(0, 0.8, 0);
      wheel.rotation.z += 0.004;
      for (const b of buildings) { b.scale += (b.target - b.scale) * 0.08; b.g.scale.set(b.scale, b.scale, b.scale); }
      renderer.render(scene, camera);
    };
    const setCounts = (o: number, h: number) => { const n = Math.min(buildings.length, 12 + o * 2 + h); buildings.forEach((b, i) => { b.target = i < n ? 1 : 0.001; }); };
    api.current = { setCounts };
    setCounts(owned, houses);
    tick();
    const io = new IntersectionObserver(([e]) => { const on = e.isIntersecting; if (on && !running) { running = true; tick(); } else if (!on) { running = false; cancelAnimationFrame(raf); } });
    io.observe(host);
    const ro = new ResizeObserver(() => { const w = host.clientWidth, hh = host.clientHeight; if (!w || !hh) return; renderer.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix(); });
    ro.observe(host);
    return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); renderer.dispose(); host.removeChild(renderer.domElement); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { api.current?.setCounts(owned, houses); }, [owned, houses]);
  useEffect(() => { /* `active` is reserved for pausing when a modal covers the board */ }, [active]);

  return <div ref={ref} className="mono-city" aria-hidden="true" />;
}
