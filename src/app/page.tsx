import Link from "next/link";
import { CITY } from "@/world/destinations";
import { Progress, NameField } from "./progress";

// Entry screen: one city, one button. Per-user bits (points, name) hydrate on the client.
export default function Home() {
  return (
    <div className="landing enter">
      <header className="top">
        <div className="brand">
          <span className="logo">🏙️</span>
          <div>
            <b>FINDURAI</b>
            <small>ONE CITY · COUNTLESS STORIES</small>
          </div>
        </div>
        <Progress />
      </header>

      <section className="hero">
        <p className="eyebrow">Step into the city</p>
        <h1>{CITY.tagline}</h1>
        <p className="lede">
          A whole low-poly city to hang out in with real people: meet at Downtown Plaza, bar-hop along Neon Lane,
          wander the college campus, jog around Central Park and chill on Sunset Beach. Drive tuk-tuks and bikes, race,
          play chess, Ludo, carrom and pool, hunt hidden cash, chat and make friends — live.
        </p>
        <div className="online">👥 {CITY.explorers.toLocaleString()} exploring right now</div>
        <NameField />
        <Link className="enter-btn" href={`/world/${CITY.id}/`}>Enter the city →</Link>
      </section>

      <footer className="foot">WASD to move · Space to jump · E to drive · G to add friends · T for a task · drag to look</footer>
    </div>
  );
}
