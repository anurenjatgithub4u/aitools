"use client";

import { useEffect, useRef, useState } from "react";
import { store } from "@/world/store";

// Shown before the city: a splash while the 3D bundle loads, then (first time only)
// "create your explorer" — a name and a gender, each option rendered as a live spinning avatar.

type Phase = "splash" | "profile" | "building" | "leaving";
const SPLASH_MIN_MS = 700;

// `ready` flips true once the world has rendered its first frame; only then does the gate fade out.
export function Gate({ loading, ready, onEnter }: { loading: Promise<unknown>; ready: boolean; onEnter: () => void }) {
  const [phase, setPhase] = useState<Phase>("splash");
  const [progress, setProgress] = useState(4);
  const [loaded, setLoaded] = useState(false);
  const [gender, setGender] = useState<"m" | "f" | null>(null);
  const [name, setName] = useState("Explorer");
  const startedAt = useRef(Date.now());

  useEffect(() => { if (ready) { setProgress(100); const t = setTimeout(() => setPhase("leaving"), 250); return () => clearTimeout(t); } }, [ready]);

  useEffect(() => {
    setGender(store.gender());
    setName(store.name());
    let done = false;
    loading.then(() => { done = true; setLoaded(true); });
    // creep toward 85% while the bundle downloads, snap to 100% when it lands
    const iv = setInterval(() => setProgress((p) => (done ? Math.min(92, p + 3) : Math.min(70, p + (70 - p) * 0.08 + 0.4))), 120);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    if (!loaded || phase !== "splash") return;
    const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - startedAt.current));
    const t = setTimeout(() => {
      if (store.gender()) enter(); else setPhase("profile");
    }, wait + 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, phase]);

  const enter = () => { setPhase("building"); setTimeout(onEnter, 80); };   // let the splash paint "Building…" before the heavy work
  const save = () => {
    if (!gender) return;
    store.setGender(gender);
    store.setName(name);
    enter();
  };

  return (
    <div className={`gate ${phase}`}>
      <div className="gate-sky"><div className="gate-sun" /><Skyline /></div>

      {phase !== "profile" && (
        <div className="splash">
          <div className="splash-logo">
            {"FINDURAI".split("").map((c, i) => <span key={i} style={{ animationDelay: `${i * 70}ms` }}>{c}</span>)}
          </div>
          <p className="splash-tag">one city · countless stories</p>
          <div className="splash-bar"><i style={{ width: `${progress}%` }} /></div>
          <p className="splash-hint">{phase === "building" ? "Building the city…" : progress < 70 ? "Loading…" : "Almost there…"}</p>
        </div>
      )}

      {phase === "profile" && (
        <div className="profile">
          <p className="eyebrow">Create your explorer</p>
          <h1>Who are you in the city?</h1>
          <label className="pname">
            <span>Your name</span>
            <input value={name} maxLength={18} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} autoFocus />
          </label>
          <div className="gcards">
            <AvatarCard g="m" label="Male" sel={gender === "m"} onPick={() => setGender("m")} />
            <AvatarCard g="f" label="Female" sel={gender === "f"} onPick={() => setGender("f")} />
          </div>
          <button className="enter-btn big" disabled={!gender} onClick={save}>Enter the city →</button>
          <p className="pnote">Real people see your name and avatar. You can change both later from the home page.</p>
        </div>
      )}
    </div>
  );
}

/** A spinning 3D avatar on a small canvas. */
function AvatarCard({ g, label, sel, onPick }: { g: "m" | "f"; label: string; sel: boolean; onPick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let stop = false, dispose = () => {};
    Promise.all([import("three"), import("@/world/avatar")]).then(([THREE, av]) => {
      if (stop) return;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(32, canvas.clientWidth / canvas.clientHeight, 0.1, 20);
      cam.position.set(0, 1.5, 5.2); cam.lookAt(0, 1.05, 0);
      scene.add(new THREE.HemisphereLight(0xbfe3ef, 0x6fb35e, 1.1));
      const sun = new THREE.DirectionalLight(0xfff0cf, 1.6); sun.position.set(2, 4, 3); scene.add(sun);
      const a = av.makeAvatar(g === "f" ? av.FEMALE_OUTFITS[0] : av.OUTFITS[0]);
      scene.add(a.group);
      let raf = 0; const t0 = performance.now();
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const t = (performance.now() - t0) / 1000;
        a.group.rotation.y = Math.sin(t * 0.9) * 0.7;
        av.animateWalk(a, t, 0.35);
        renderer.render(scene, cam);
      };
      loop();
      dispose = () => { cancelAnimationFrame(raf); renderer.dispose(); };
    });
    return () => { stop = true; dispose(); };
  }, [g]);
  return (
    <button type="button" className={`gcard ${sel ? "sel" : ""}`} onClick={onPick}>
      <canvas ref={ref} width={220} height={300} />
      <b>{label}</b>
      <i>{sel ? "✓" : ""}</i>
    </button>
  );
}

function Skyline() {
  // a few low-poly towers + trees, purely decorative
  const blocks = [40, 90, 60, 130, 75, 110, 55, 95, 70, 120, 50, 85];
  return (
    <div className="skyline">
      {blocks.map((h, i) => <i key={i} style={{ height: `${h}px`, animationDelay: `${i * 90}ms` }} />)}
    </div>
  );
}
