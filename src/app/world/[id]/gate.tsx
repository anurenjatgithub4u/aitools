"use client";

import { useEffect, useRef, useState } from "react";
import { store } from "@/world/store";
import { preroll } from "@/world/ads";

// Shown before the city: a splash while the 3D bundle loads, then (first time only)
// "create your explorer" — a name and a gender, each option rendered as a live spinning avatar.

type Phase = "splash" | "profile" | "building" | "leaving";
const SPLASH_MIN_MS = 700;

// `ready` flips true once the world has rendered its first frame; only then does the gate fade out.
export function Gate({ loading, ready, build, fatal, onEnter }: { loading: Promise<unknown>; ready: boolean; build: { f: number; label: string } | null; fatal: string | null; onEnter: () => void }) {
  const [phase, setPhase] = useState<Phase>("splash");
  const [progress, setProgress] = useState(4);
  const [loaded, setLoaded] = useState(false);
  const [gender, setGender] = useState<"m" | "f" | null>(null);
  const [name, setName] = useState("Explorer");
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const startedAt = useRef(Date.now());

  // a stale page after a deploy can point at chunks that no longer exist: reload once, then show a button
  useEffect(() => {
    loading.catch(() => {
      try { if (!sessionStorage.getItem('findurai.reloaded')) { sessionStorage.setItem('findurai.reloaded', '1'); location.reload(); return; } } catch { /* ignore */ }
      setFailed(true);
    });
    const t = setTimeout(() => setSlow(true), 25000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => { if (build) setProgress(60 + build.f * 40); }, [build]);
  useEffect(() => { if (ready) { setProgress(100); const t = setTimeout(() => setPhase("leaving"), 250); return () => clearTimeout(t); } }, [ready]);

  useEffect(() => {
    setGender(store.gender());
    setName(store.name());
    let done = false;
    loading.then(() => { done = true; setLoaded(true); });
    // creep toward 85% while the bundle downloads, snap to 100% when it lands
    const iv = setInterval(() => setProgress((p) => (done ? p : Math.min(60, p + (60 - p) * 0.035 + 0.15))), 50);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    if (!loaded || phase !== "splash") return;
    const hold = process.env.NODE_ENV !== 'production' && typeof location !== 'undefined' && new URLSearchParams(location.search).has('splash') ? 20000 : 0;   // dev: ?splash keeps the splash up to look at it
    const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - startedAt.current)) + hold;
    const t = setTimeout(() => {
      if (store.gender()) enter(); else setPhase("profile");
    }, wait + 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, phase]);

  const enter = () => { setPhase("building"); preroll(() => setTimeout(onEnter, 80)); };   // a preroll ad (if configured) while the splash paints "Building…", then the heavy work
  const [tip, setTip] = useState(0);
  useEffect(() => { const t = setInterval(() => setTip((k) => (k + 1) % TIPS.length), 2600); return () => clearInterval(t); }, []);
  const save = () => {
    if (!gender) return;
    store.setGender(gender);
    store.setName(name);
    enter();
  };

  return (
    <div className={`gate ${phase}`}>
      <div className="gate-sky"><Stars /><div className="gate-sun" /><Clouds /><Wheel /><Skyline /></div>

      {phase !== "profile" && (
        <div className="splash">
          <div className="splash-logo">
            {"FINDURAI".split("").map((c, i) => <span key={i} style={{ animationDelay: `${i * 70}ms` }}>{c}</span>)}
          </div>
          <p className="splash-tag">one city · countless stories</p>
          <div className="splash-bar"><i style={{ width: `${progress}%` }} /><em>{Math.round(progress)}%</em></div>
          <p className="splash-hint" key={fatal ?? (failed ? 'f' : phase === "leaving" || ready ? 'r' : phase === "building" ? build?.label ?? 'b' : 'l')}>{fatal ?? (failed ? "Could not load the city." : phase === "leaving" || ready ? "Ready — see you in there" : phase === "building" ? build?.label ?? "Building the city…" : "Loading the city…")}</p>
          <p className="splash-tip" key={`tip${tip}`}>💡 {TIPS[tip]}</p>
          {(slow || fatal || failed) && !ready && <button className="enter-btn" onClick={() => { try { sessionStorage.removeItem("findurai.reloaded"); } catch { /* ignore */ } location.reload(); }}>{fatal || failed ? "Reload" : "Taking a while — reload"}</button>}
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

const TIPS = [
  'Walk up to anyone and a card appears — tap an opener to break the ice.',
  'Press E on the Neon Palace dance floor to dance. The lasers are free.',
  'Real 8-ball and carrom are on the tables inside the Neon Palace.',
  'Sunset at Lighthouse Point turns the whole sky gold. Take someone.',
  'The Sunset Wheel by the beach is a 60-second ride for two.',
  'Green pads on the Speedway give you a burst — Shift for nitro.',
  'Press Z for zombie night. Running away will not save you.',
  'Send a rose, chai or a love note from the Gift button on any card.',
  'Buses do not brake. Look both ways on Neon Lane.',
  'Cricket: pick your overs, shuffle with ◀ ▶, time the shot with Bat.',
];

function Stars() {
  const pts = Array.from({ length: 26 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 42, d: (i % 5) * 0.4, s: 1 + (i % 3) }));
  return <div className="stars">{pts.map((p, i) => <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, animationDelay: `${p.d}s` }} />)}</div>;
}
function Clouds() {
  return <div className="clouds"><i style={{ top: '5%', animationDuration: '46s' }} /><i style={{ top: '13%', animationDuration: '62s', animationDelay: '-20s', transform: 'scale(.7)' }} /><i style={{ top: '19%', animationDuration: '54s', animationDelay: '-38s', transform: 'scale(1.3)' }} /></div>;
}
function Wheel() {
  return <div className="wheel"><div className="rim" /><div className="hub" /><div className="leg l" /><div className="leg r" /></div>;
}

function Skyline() {
  // a few low-poly towers + trees, purely decorative
  const blocks = [22, 46, 32, 66, 38, 56, 28, 50, 36, 62, 26, 44];
  return (
    <div className="skyline">
      {blocks.map((h, i) => <i key={i} style={{ height: `${h}px`, animationDelay: `${i * 90}ms`, backgroundPositionY: `${(i * 7) % 12}px` }} />)}
    </div>
  );
}
