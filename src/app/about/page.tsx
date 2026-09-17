import type { Metadata } from "next";
import Link from "next/link";
import { FEATURES, SITE, SITE_NAME } from "../seo";

export const metadata: Metadata = {
  title: "About FindurAI — a free 3D city to hang out, date, race and play",
  description:
    "Everything inside FindurAI City: Downtown Plaza, Neon Lane bars, Sunset Beach, City Stadium, the Harbour Bridge to Eastside, a 960 m speedway, football, cricket, zombie night, cash hunts, chess, Ludo, carrom and pool — free, in your browser, on phone or desktop.",
  alternates: { canonical: "/about/" },
  openGraph: { title: "About FindurAI — a free 3D city in your browser", description: "Places, games and how multiplayer works.", url: `${SITE}/about/` },
};

export default function About() {
  return (
    <main className="landing page">
      <nav className="top"><Link href="/" className="brand"><span className="logo">🌍</span><span><b>FINDURAI</b><small>ONE CITY · COUNTLESS STORIES</small></span></Link><Link href="/" className="cta">Play now →</Link></nav>
      <section className="hero">
        <p className="eyebrow">About {SITE_NAME}</p>
        <h1>A whole 3D city in your browser — to hang out, date, drive and play.</h1>
        <p className="lede">
          FindurAI is a free browser metaverse: one imaginary city with bars, a beach, a stadium, a cricket ground and a race track, where real people walk, drive, chat and play games together. No download, no sign-up — pick a name and an avatar and you are in, on a phone or a laptop.
        </p>
      </section>

      <section>
        <h2>Places to explore</h2>
        <ul className="feat">{FEATURES.places.map(([n, d]) => <li key={n}><b>{n}</b> — {d}</li>)}</ul>
      </section>

      <section>
        <h2>Games inside the city</h2>
        <p>Every game happens in the world itself — you walk onto the pitch, the strip or the starting grid, or pick a game on another explorer&apos;s card.</p>
        <ul className="feat">{FEATURES.games.map(([n, d]) => <li key={n}><b>{n}</b> — {d}</li>)}</ul>
        <p><Link href="/games/">Read how each game works →</Link></p>
      </section>

      <section>
        <h2>Meet people, make friends, go on a virtual date</h2>
        <ul className="feat">{FEATURES.social.map(([n, d]) => <li key={n}><b>{n}</b> — {d}</li>)}</ul>
        <p>Walk up to anyone and a card appears: send a friend request, start a game, hang out (they walk with you) or chat. Friends keep a badge every time you visit.</p>
      </section>

      <section>
        <h2>Vehicles</h2>
        <p>Jeeps, tuk-tuks, bikes and cycles are parked around the plaza. Press E to drive, Shift for nitro, H for the horn, F to give someone a lift. A tank of petrol lasts about 5 km — refuel at FindurAI City Fuel. Buses run their routes and they do not brake for you, so look both ways.</p>
      </section>

      <section>
        <h2>Coming from Little Kerala?</h2>
        <p>If you played Little Kerala (kerala.dhilber.com) you will feel at home: same idea of a shared 3D city you can walk around with friends, with more to do — a racing circuit, football, cricket, zombie nights and table games. <Link href="/little-kerala/">See the comparison →</Link></p>
      </section>

      <section className="faq">
        <h2>Questions</h2>
        <h3>Is FindurAI free?</h3><p>Yes, completely. There is nothing to buy.</p>
        <h3>Do I need to download anything?</h3><p>No. It runs in Chrome, Safari, Edge or Firefox on any phone, tablet or computer.</p>
        <h3>Can I play with my friends?</h3><p>Yes — everyone on the site is in the same city. Share the link, find each other at Downtown Plaza and send a friend request.</p>
        <h3>Does it work on mobile?</h3><p>Yes. There is a joystick on the left and Jump, Run, Drive, Kick and Bat buttons on the right.</p>
      </section>

      <p className="lede"><Link href="/" className="cta">Enter the city →</Link></p>
    </main>
  );
}
