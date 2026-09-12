"use client";

import { useEffect, useRef } from "react";
import { byId } from "@/world/destinations";
import { renderHud } from "@/world/hud";
import { store } from "@/world/store";
import type { World } from "@/world/world";

// Mounts the Three.js world into a full-screen stage and the DOM HUD on top of it.
// Everything 3D is loaded on the client only; the page itself is static.
export function WorldView({ id }: { id: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    });

    import("@/world/world").then(({ World }) => {
      if (cancelled) return;
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
          onPool: (opponent) => { import("@/world/pool").then(({ openPool }) => openPool(hudEl, opponent, store.name(), (win) => world?.poolResult(win, opponent))); },
        },
        store.name(),
        store.points(),
      );
      world.attachMinimap(hud.minimap);
      hud.muted(world.sfx.muted);
      world.start();
      if (process.env.NODE_ENV === "development") (window as unknown as { __world: World }).__world = world;
    });

    return () => {
      cancelled = true;
      world?.dispose();
      hudEl.innerHTML = "";
    };
  }, [id]);

  return (
    <div className="in-world">
      <div ref={stageRef} className="stage" />
      <div ref={hudRef} />
    </div>
  );
}
