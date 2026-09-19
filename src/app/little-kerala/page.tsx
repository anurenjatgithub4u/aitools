import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "../seo";
import { AdScript, AdSlot } from "../ads";

export const metadata: Metadata = {
  title: "Little Kerala / Kerala Dhilber fans — try FindurAI, a free 3D city game in your browser",
  description:
    "Looking for Little Kerala (kerala.dhilber.com) or a Kerala game to play with friends online? FindurAI is a free browser metaverse in the same spirit: a 3D city to walk, drive and chat in with real people — plus a race track, football, cricket, zombie nights and table games. No download, works on phones.",
  alternates: { canonical: "/little-kerala/" },
  openGraph: { title: "Little Kerala fans: meet FindurAI", description: "A free 3D city to hang out in with friends — with races, football, cricket and zombies.", url: `${SITE}/little-kerala/` },
};

export default function LittleKerala() {
  return (
    <main className="landing page">
      <AdScript />
      <nav className="top"><Link href="/" className="brand"><span className="logo">🌍</span><span><b>FINDURAI</b><small>ONE CITY · COUNTLESS STORIES</small></span></Link><Link href="/" className="cta">Play now →</Link></nav>
      <section className="hero">
        <p className="eyebrow">For Little Kerala players</p>
        <h1>Liked Little Kerala? FindurAI is the next city to hang out in.</h1>
        <p className="lede">
          Little Kerala (kerala.dhilber.com, often searched as &ldquo;kerala dilber&rdquo; or &ldquo;kerala dhilber&rdquo;) showed how much fun a shared 3D Kerala-style world in the browser can be — walk around, meet people, chat. FindurAI takes the same idea and builds a bigger city around it, with things to actually do together.
        </p>
      </section>

      <AdSlot />

      <section>
        <h2>What is the same</h2>
        <ul className="feat">
          <li><b>Free and in the browser</b> — nothing to install, on phone or desktop</li>
          <li><b>One shared world</b> — real people walk, drive and chat in the same city</li>
          <li><b>Made in Kerala, for hanging out</b> — cafés, chai, tuk-tuks, a beach and a friendly low-poly look</li>
        </ul>
      </section>

      <section>
        <h2>What FindurAI adds</h2>
        <ul className="feat">
          <li><b>Games in the world</b> — a 960 m racing circuit, 5-a-side football at City Stadium, cricket with batting and bowling, zombie night survival, cash hunts, taxi jobs, plus pool, chess, Ludo and carrom</li>
          <li><b>Two islands</b> — the city and Eastside, joined by the Harbour Bridge: harbour town, windmills, a lake camp, an orchard and a lighthouse</li>
          <li><b>Vehicles with petrol and nitro</b> — jeeps, tuk-tuks, bikes, cycles; buses and police on the roads</li>
          <li><b>Friends, dating and hangouts</b> — friend requests, chat, walk together, a leaderboard and your own male or female explorer</li>
          <li><b>Nightlife</b> — Neon Lane with a pub, a club, karaoke and a rooftop bar</li>
        </ul>
      </section>

      <section className="faq">
        <h2>Questions</h2>
        <h3>Is FindurAI a Kerala game?</h3><p>It is made in Kerala and has the chai shops, tuk-tuks and beach you would expect, but the city itself is imaginary — FindurAI City — so it can have a speedway, a stadium and an island.</p>
        <h3>Is it connected to Little Kerala or Dhilber?</h3><p>No. FindurAI is an independent project, built for the same players who enjoy hanging out in a 3D city with friends.</p>
        <h3>Can I play it with the same friends?</h3><p>Yes — send them <b>findurai.com</b>. You all land at Downtown Plaza and can find each other on the map.</p>
      </section>

      <AdSlot />

      <p className="lede"><Link href="/" className="cta">Enter FindurAI City →</Link> · <Link href="/games/">All the games</Link> · <Link href="/about/">About</Link></p>
    </main>
  );
}
