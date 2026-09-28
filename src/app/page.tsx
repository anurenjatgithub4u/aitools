import Link from "next/link";
import { CITY } from "@/world/destinations";
import { PLAY_PAGES } from "./play/pages";
import { WorldView } from "./world/[id]/world-view";

// The home page *is* the city: no landing screen, straight into the world.
// A short accessible description sits under it for screen readers, search engines and no-JS visitors.
export default function Home() {
  return (
    <>
      <WorldView id={CITY.id} />
      <section className="sr-only" aria-label="About FindurAI">
        <h1>FindurAI — a free 3D city game in your browser to hang out, date, race and play with friends</h1>
        <p>
          FindurAI is a free browser-based multiplayer 3D virtual world where players explore, socialize, meet people, and play games together with zero installation or downloads required.
          Walk around FindurAI City with real people: Downtown Plaza, Café Row, the Neon Lane nightlife strip, Sunset Beach, Central Park, City Stadium, and across the Harbour Bridge to Eastside island.
          Drive jeeps, tuk-tuks and bikes, race the 960 m Speedway, play 5-a-side football and full cricket matches with batting and bowling, survive cooperative zombie night waves, hunt hidden cash, and challenge friends to 8-ball pool, chess, Ludo and carrom.
        </p>
        <p>
          <Link href="/about/">About FindurAI</Link> ·{" "}
          <Link href="/games/">All games</Link> ·{" "}
          <Link href="/how-to-play/">How to Play</Link> ·{" "}
          <Link href="/map/">City Map</Link> ·{" "}
          <Link href="/little-kerala/">For Little Kerala players</Link> ·{" "}
          <Link href="/privacy-policy/">Privacy Policy</Link> ·{" "}
          <Link href="/terms/">Terms of Service</Link>
        </p>
        <h2>Play games in FindurAI City</h2>
        <ul>{PLAY_PAGES.map((p) => (<li key={p.slug}><Link href={`/play/${p.slug}/`}>{p.icon} {p.h1.split(" — ")[0]}</Link></li>))}</ul>
        <p>
          Disclaimer: FindurAI is a free-to-play social virtual world for entertainment only. In-game tokens, points and mini-game rewards have no real-world value and cannot be exchanged for cash.
        </p>
      </section>
      <noscript>
        <div className="landing page">
          <h1>FindurAI — Free 3D Multiplayer City Game</h1>
          <p>
            FindurAI is a free 3D city game that runs directly in your browser. Please enable JavaScript to enter the city and explore in 3D.
          </p>
          <p>
            Explore our site: <a href="/about/">About FindurAI</a> · <a href="/games/">Games Directory</a> · <a href="/how-to-play/">How to Play</a> · <a href="/map/">City Map</a> · <a href="/privacy-policy/">Privacy Policy</a> · <a href="/terms/">Terms of Service</a>
          </p>
        </div>
      </noscript>
    </>
  );
}
