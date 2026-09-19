import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "../seo";
import { AdScript, AdSlot } from "../ads";
import { PLAY_PAGES } from "../play/pages";

export const metadata: Metadata = {
  title: "Games in FindurAI City — race, football, cricket, zombie night, pool, chess, Ludo, carrom",
  description:
    "How every game in FindurAI works: the 960 m Speedway race with boost pads, five-a-side football at City Stadium, cricket with batting and bowling, zombie night survival, cash hunts and taxi jobs, plus 8-ball pool, chess, Ludo and carrom — all free in your browser.",
  alternates: { canonical: "/games/" },
  openGraph: { title: "Games in FindurAI City", description: "Race, football, cricket, zombies, pool, chess, Ludo, carrom — free in the browser.", url: `${SITE}/games/` },
};

export default function Games() {
  return (
    <main className="landing page">
      <AdScript />
      <nav className="top"><Link href="/" className="brand"><span className="logo">🌍</span><span><b>FINDURAI</b><small>ONE CITY · COUNTLESS STORIES</small></span></Link><Link href="/" className="cta">Play now →</Link></nav>
      <section className="hero">
        <p className="eyebrow">Games</p>
        <h1>Everything you can play in FindurAI City.</h1>
        <p className="lede">All of these happen inside the 3D world — no separate app, no download. Most can be started by walking to the place, or by picking the game on another explorer&apos;s card so they play with you.</p>
      </section>

      <AdSlot />

      <section><h2>🏁 Speedway race — free car racing game in the browser</h2>
        <p>The FindurAI Speedway is a 960 m circuit: pit straight past the grandstand, the Sunset sweeper, the Neon chicane, a long back straight, the Valley run south of the city, Big Bend, the Return run, the Esses and a hairpin under the grandstand. Choose 1, 2, 3 or 5 laps against three rivals. Drive over the green boost pads for a burst of speed, hold Shift for nitro. The HUD shows your lap, position and sector.</p></section>

      <section><h2>⚽ Football — 5-a-side at City Stadium</h2>
        <p>A full pitch with goals, keepers and stands. Walk onto the pitch and press E (or tap Drive on a phone). Run into the ball to dribble — it sticks to your feet — and press Kick or Space to shoot; harder while sprinting and aim-assisted when you face the goal. Your four team-mates pass and defend, the rivals keep goal and counter. 90 seconds, first to five ends it.</p></section>

      <section><h2>🏏 Cricket — bat and bowl on the FindurAI Cricket Ground</h2>
        <p>Pick 1, 2, 3 or 5 overs a side. You bat first: watch the bowler run in, use ◀ ▶ to shuffle across the crease and press Bat as the ball reaches you — perfect timing drives it for six, early pulls it high where it can be caught, late squeezes it along the ground, miss a straight one and you are bowled. After a shot, press Run to take runs with your partner at the other end — press again for another, but be home before the fielder's throw or you are run out. Then you bowl: pick the speed and line before every ball, tap Bowl to run in, and release at the top of your action for a good ball; wickets and dot balls score points. A proper batting animation with backlift and follow-through.</p></section>

      <section><h2>🧟 Zombie night — survival mode</h2>
        <p>Zombie night comes on its own — the 🧟 chip counts down to it, then night falls on the city. Waves of the undead come in packs from several directions: walkers, headless ones, runners, crawlers, hoppers that leap at you, bloaters that burst in a cloud and brutes that hit like a truck. Punch (Space / Punch button) or crush them with a car, clear a wave to heal, and do not think running will save you — more keep appearing wherever you go.</p></section>

      <section><h2>💰 Tasks — cash hunt, checkpoint dash, taxi job, snack run</h2>
        <p>Timed tasks appear in the top-left card (or press T): find hidden ₹500 bundles shown roughly on the map, dash through checkpoints, drive a passenger across town, or gather snacks along Café Row. Finish fast for double points and climb the leaderboard.</p></section>

      <section><h2>🎱 Real 8-ball at the Neon Palace</h2>
        <p>The Neon Palace is the casino and club at the end of Neon Lane: a dance floor with chasing tiles, a DJ, a bar, slot machines, a roulette table and laser lights sweeping inside and over the roof. Press E on the dance floor to dance with whoever is with you. Press E at either pool table for real 8-ball on a 3D table — ◀ ▶ to aim, a power slider (or W/S) sets the strength, Shoot to strike. Real rules: first pot decides solids or stripes, scratch is ball in hand, sink the 8 last. There is a carrom board by the bar too: a striker slider places it along your baseline, ◀ ▶ aims, the power slider sets the flick — white for you, black for your rival, the red queen worth three. An Exit button (or Esc) leaves any game. Away from the Palace, 8-ball, chess, Ludo and carrom are still playable from any explorer's card.</p></section>

      <section><h2>Jump straight into a game</h2>
        <p>{PLAY_PAGES.map((p, i) => (<span key={p.slug}>{i > 0 && ' · '}<Link href={`/play/${p.slug}/`}>{p.icon} {p.h1.split(' — ')[0]}</Link></span>))}</p></section>

      <section><h2>Also in the city</h2>
        <p>Driving jeeps, tuk-tuks, bikes and cycles (with petrol and a fuel station), giving people lifts, the Harbour Bridge to Eastside island, buses and police on the roads, dogs, cats and birds, and a big map of it all.</p></section>

      <AdSlot />

      <p className="lede"><Link href="/" className="cta">Play free now →</Link> · <Link href="/about/">About FindurAI</Link></p>
    </main>
  );
}
