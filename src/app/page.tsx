import Link from "next/link";
import { DESTINATIONS } from "@/world/destinations";
import { hex } from "@/world/hud";
import { Progress, NameField } from "./progress";

// Landing page: pick a wonder. Static; the per-user bits (points, name) hydrate on the client.
export default function Home() {
  const total = DESTINATIONS.reduce((s, d) => s + d.explorers, 0);
  return (
    <div className="landing">
      <header className="top">
        <div className="brand">
          <span className="logo">🌍</span>
          <div>
            <b>WANDER</b>
            <small>ONE PLANET · COUNTLESS WONDERS</small>
          </div>
        </div>
        <Progress />
      </header>

      <section className="hero">
        <p className="eyebrow">Pick a wonder · step inside</p>
        <h1>Walk the world&apos;s most famous places, together.</h1>
        <p className="lede">
          Tiny low-poly versions of real cities and landmarks. Wander with people from everywhere, hop in a tuk-tuk,
          ride the metro, collect local treats and rack up points.
        </p>
        <div className="online">👥 {total.toLocaleString()} exploring right now</div>
        <NameField />
      </section>

      <section className="grid">
        {DESTINATIONS.map((d) => (
          <Link
            key={d.id}
            className="card"
            href={`/world/${d.id}/`}
            style={{ ["--accent" as string]: d.theme.accent }}
          >
            <div
              className="thumb"
              style={{ background: `linear-gradient(160deg, ${hex(d.theme.sky)} 0%, ${hex(d.theme.ground)} 100%)` }}
            >
              <span>{d.emoji}</span>
            </div>
            <div className="body">
              <small>
                {d.place} · {d.country}
              </small>
              <h3>{d.name}</h3>
              <p>{d.tagline}</p>
              <div className="meta">
                <span>👥 {d.explorers}</span>
                <b>Enter world →</b>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <footer className="foot">WASD to move · Space to jump · E to drive · drag to look · walk over items to collect</footer>
    </div>
  );
}
