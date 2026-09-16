"use client";

import { useEffect, useRef, useState } from "react";
import { Gate } from "./gate";
import { byId } from "@/world/destinations";
import { renderHud } from "@/world/hud";
import { store } from "@/world/store";
import type { World } from "@/world/world";

// Each open tab is its own explorer on the network (the same person in two tabs = two avatars).
function tabId() {
  try {
    let t = sessionStorage.getItem('findurai.tab');
    if (!t) { t = Math.random().toString(36).slice(2, 8); sessionStorage.setItem('findurai.tab', t); }
    return `${store.id()}-${t}`;
  } catch { return store.id(); }
}

// Mounts the Three.js world into a full-screen stage and the DOM HUD on top of it.
// Everything 3D is loaded on the client only; the page itself is static.
export function WorldView({ id }: { id: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  // the 3D bundle starts downloading behind the splash; the world is built once the player has an explorer
  const [loading] = useState(() => (typeof window === "undefined" ? Promise.resolve(null) : import("@/world/world")));
  const [entered, setEntered] = useState(false);
  const [ready, setReady] = useState(false);
  const [gateGone, setGateGone] = useState(false);
  useEffect(() => { if (!ready) return; const t = setTimeout(() => setGateGone(true), 900); return () => clearTimeout(t); }, [ready]);

  useEffect(() => {
    if (!entered) return;
    const dest = byId(id);
    const stage = stageRef.current, hudEl = hudRef.current;
    if (!dest || !stage || !hudEl) return;

    let world: World | null = null;
    let cancelled = false;
    store.visit(dest.id);
    const hud = renderHud(hudEl, dest, store.points(), {
      jump: () => world?.jump(),
      drive: () => world?.toggleDrive(),
      lift: () => world?.lift(),
      run: () => world?.toggleRun(),
      zoom: (d) => world?.zoom(d),
      boost: (held) => world?.setBoost(held),
      refuel: () => world?.refuel(),
      horn: () => world?.horn(),
      mute: () => world?.toggleMute(),
      task: () => world?.startTask(),
      befriend: () => world?.befriend(),
      interact: (a) => world?.interact(a),
      say: (text) => world?.say(text),
      answerRequest: (id, yes) => world?.answerRequest(id, yes),
    });

    loading.then((mod) => {
      if (cancelled || !mod) return;
      const { World } = mod;
      world = new World(
        stage,
        dest,
        {
          onPoints: (n) => { store.setPoints(n); hud.points(n); },
          onCollect: (item) => hud.collect(item),
          onOnline: (n) => hud.online(n),
          onNearest: (name, d) => hud.nearest(name, d),
          onPrompt: (text, driving) => hud.prompt(text, driving),
          onLift: (text) => hud.lift(text),
          onRun: (on) => hud.run(on),
          onDash: (d) => hud.dash(d),
          onMuted: (m) => hud.muted(m),
          onQuest: (q) => hud.quest(q),
          onFriends: (n) => hud.friends(n),
          onRank: (r, of) => hud.rank(r, of),
          onMeet: (m) => hud.meet(m),
          onChat: (from, text, mine) => hud.chat(from, text, mine),
          onFriendRequest: (req) => hud.friendRequest(req),
          onNet: (s, kind) => hud.net(s, kind),
          onGame: (kind, opponent) => {
            const done = (win: boolean | null) => world?.gameResult(kind, win, opponent);
            const me = store.name();
            if (kind === 'pool') import("@/world/pool").then(({ openPool }) => openPool(hudEl, opponent, me, done));
            else if (kind === 'chess') import("@/world/chess").then(({ openChess }) => openChess(hudEl, opponent, me, done));
            else if (kind === 'ludo') import("@/world/ludo").then(({ openLudo }) => openLudo(hudEl, opponent, me, done));
            else import("@/world/carrom").then(({ openCarrom }) => openCarrom(hudEl, opponent, me, done));
          },
        },
        store.name(),
        store.points(),
        { id: tabId(), gender: store.gender() ?? 'm' },
      );
      world.attachMinimap(hud.minimap);
      let stopBig: (() => void) | null = null;
      hud.onMapToggle((open) => { stopBig?.(); stopBig = open ? world!.attachBigMap(hud.bigmap) : null; });
      hud.muted(world.sfx.muted);
      world.start();
      requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));   // first frame is on screen
      setTimeout(() => setReady(true), 2500);                                       // …or a background tab that never paints
      if (process.env.NODE_ENV === "development") (window as unknown as { __world: World }).__world = world;
    });

    return () => {
      cancelled = true;
      world?.dispose();
      hudEl.innerHTML = "";
    };
  }, [id, entered, loading]);

  return (
    <div className="in-world">
      <div ref={stageRef} className="stage" />
      <div ref={hudRef} />
      {!gateGone && <Gate loading={loading} ready={ready} onEnter={() => setEntered(true)} />}
    </div>
  );
}
