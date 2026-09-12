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
          Walk or ride through Vidhana Soudha, Brigade Road, Lalbagh, Whitefield and the airport. Hop in a tuk-tuk or
          on a bike, run timed tasks, find hidden cash, give lifts and make friends with the explorers around you.
        </p>
        <div className="online">👥 {CITY.explorers.toLocaleString()} exploring right now</div>
        <NameField />
        <Link className="enter-btn" href={`/world/${CITY.id}/`}>Enter the city →</Link>
      </section>

      <footer className="foot">WASD to move · Space to jump · E to drive · G to add friends · T for a task · drag to look</footer>
    </div>
  );
}
