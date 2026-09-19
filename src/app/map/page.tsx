import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "../seo";
import { AdScript, AdSlot } from "../ads";

export const metadata: Metadata = {
  title: "FindurAI City map — every place in the city and what to do there",
  description:
    "A guide to FindurAI City: Downtown Plaza, Café Row, Neon Lane and the Neon Palace, Sunset Beach and the Sunset Wheel, Central Park, City Stadium, the Skate Park fairground, the Speedway in the valley, the Harbour Bridge and Eastside — Harbour Town, Windmill Hill, Mirror Lake, Sunny Orchard, Lighthouse Point and the cricket ground.",
  alternates: { canonical: "/map/" },
  openGraph: { title: "FindurAI City map", description: "Every district, what is there and what to do.", url: `${SITE}/map/` },
};

const AREAS: [string, string, string][] = [
  ["Downtown Plaza", "the centre", "Fountain, big screen and the spawn point — everyone arrives here. The leaderboard sign, the first jeeps and tuk-tuks, and the road north to Neon Lane or south to Café Row."],
  ["Café Row", "just south of the plaza", "Bean There Café, Chai Corner, Waffle Wonders, Gelato Bar and Pizza Point along the road, with terraces out front. Chai Corner's table is the coffee-date spot; snack-run tasks send you along here."],
  ["Neon Lane", "north", "The nightlife strip: The Tipsy Turtle Pub, Whiskey & Wings, Bass Drop Club, Karaoke Kingdom, Skyline Rooftop Bar and the Mojito Shack, all under neon."],
  ["Neon Palace", "end of Neon Lane", "The casino and club: a dance floor with chasing tiles, a DJ, a bar, slot machines, a roulette table, lasers inside and over the roof, two real 8-ball tables and a carrom board."],
  ["Sky Wheel", "between Neon Lane and the beach", "The big wheel — twelve lit cabins, a slow minute-long turn with a view over the whole city. Press E at the gate; it seats two."],
  ["Sunset Beach", "east coast", "Sand, shacks, a volleyball net, the pier with its bench, boats, a lifeguard tower, a candle-lit table on the sand and the Sunset Wheel — the beach's own Ferris wheel and a classic date."],
  ["Beach fairground", "north of the beach", "The pirate ship swings here; the Chair Swing spins beside the Skate Park a little inland."],
  ["Central Park", "west", "A lake with an islet, a bandstand, benches, an ice-cream cart and the carousel — eight bobbing horses under a lit canopy."],
  ["City Stadium", "south", "A full 56 × 36 m pitch with goals, stands and floodlights. Walk on and press E for five-a-side."],
  ["FindurAI Speedway", "the valley, south", "A 960 m GP-style circuit with a grandstand, pit garages, boost pads and pines along the Valley straight. Big Bend is the far end."],
  ["Palm Grove Homes, Sunrise High School, FindurAI College, City Mall, Starlight Cinema", "around the city", "The rest of town — worth a walk, and where cash-hunt bundles tend to hide."],
  ["Harbour Bridge", "east", "A suspension bridge over the strait to Eastside, with a road, walkways and towers. Buses and the Coast line cross it."],
  ["Harbour Town", "Eastside, south shore", "Cottages, the Harbour Café and a marina — the boat ride for two leaves from the pier."],
  ["Windmill Hill and Mirror Lake", "Eastside", "A windmill on the ridge, and Lakeside Camp on Mirror Lake with a campfire log to share."],
  ["Sunny Orchard", "Eastside, north", "Rows of fruit trees and a farmhouse."],
  ["Lighthouse Point", "the eastern tip", "The lighthouse and the sunset bench — sit there with someone and the whole sky turns gold."],
  ["FindurAI Cricket Ground", "Eastside", "An oval with a strip, a pavilion and a scoreboard. Walk onto the strip and press E for a match."],
];

export default function CityMap() {
  return (
    <main className="landing page">
      <AdScript />
      <nav className="top"><Link href="/" className="brand"><span className="logo">🌍</span><span><b>FINDURAI</b><small>ONE CITY · COUNTLESS STORIES</small></span></Link><Link href="/" className="cta">Play now →</Link></nav>
      <section className="hero">
        <p className="eyebrow">City map</p>
        <h1>Every place in FindurAI City.</h1>
        <p className="lede">The city sits on the west shore; Eastside is the island across the Harbour Bridge. Tap the minimap in the game (bottom-right) for the live map with everyone on it — this page is the guidebook.</p>
      </section>

      <AdSlot />

      {AREAS.map(([name, where, what], i) => (
        <section key={name}>
          <h2>{name} <small style={{ fontWeight: 400, opacity: 0.7 }}>· {where}</small></h2>
          <p>{what}</p>
          {i === 7 && <AdSlot />}
        </section>
      ))}

      <AdSlot />

      <p className="lede"><Link href="/" className="cta">Play free now →</Link> · <Link href="/how-to-play/">How to play</Link> · <Link href="/games/">All games</Link></p>
    </main>
  );
}
