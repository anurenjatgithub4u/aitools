import Link from "next/link";
import { CITY } from "@/world/destinations";
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
          Walk around FindurAI City with real people: Downtown Plaza, Café Row, the Neon Lane bars and club, Sunset Beach, Central Park, City Stadium, and across the Harbour Bridge to Eastside island. Drive jeeps, tuk-tuks and bikes, race the 960 m Speedway, play 5-a-side football and cricket, survive zombie night, hunt hidden cash, and play 8-ball pool, chess, Ludo and carrom. Free, no download, on phone or desktop. Loved Little Kerala (kerala.dhilber.com)? This is your next city.
        </p>
        <p><Link href="/about/">About FindurAI</Link> · <Link href="/games/">All games</Link> · <Link href="/little-kerala/">For Little Kerala players</Link></p>
      </section>
      <noscript>
        <div className="landing page"><h1>FindurAI needs JavaScript</h1><p>FindurAI is a free 3D city game that runs in your browser. Please enable JavaScript to enter the city, or read <a href="/about/">about FindurAI</a> and <a href="/games/">its games</a>.</p></div>
      </noscript>
    </>
  );
}
