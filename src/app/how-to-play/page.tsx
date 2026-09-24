import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "../seo";
import { AdScript, AdSlot } from "../ads";

export const metadata: Metadata = {
  title: "How to play FindurAI — controls, cricket, 8-ball, race, football, dates and zombie night",
  description:
    "A complete guide to FindurAI City: keyboard and touch controls, how to bat and bowl in cricket, sink balls in real 8-ball, flick carrom, win the Speedway race, score in five-a-side football, take someone on a date, ride the fairground rides and survive zombie night.",
  alternates: { canonical: "/how-to-play/" },
  openGraph: { title: "How to play FindurAI", description: "Controls and tips for every game in the city.", url: `${SITE}/how-to-play/` },
};

export default function HowToPlay() {
  return (
    <main className="landing page">
      <AdScript />
      <nav className="top"><Link href="/" className="brand"><span className="logo">🌍</span><span><b>FINDURAI</b><small>ONE CITY · COUNTLESS STORIES</small></span></Link><Link href="/" className="cta">Play now →</Link></nav>
      <section className="hero">
        <p className="eyebrow">Guide</p>
        <h1>How to play FindurAI City.</h1>
        <p className="lede">Everything is free and in the browser. Pick a name and an avatar, and you spawn at Downtown Plaza with the whole city around you. Here is how each part works.</p>
      </section>

      <section><h2>Controls</h2>
        <p><b>Desktop:</b> W A S D or the arrow keys to move, Shift to run, Space to jump, drag the mouse to look, scroll to zoom. <b>E</b> does the thing in front of you — get into a car, sit at a date spot, board a ride, start a match. <b>F</b> gives a lift while driving, <b>R</b> refuels, <b>H</b> honks, <b>T</b> asks for a task, <b>C</b> opens chat, <b>G</b> sends a friend request, <b>Esc</b> leaves any game.</p>
        <p><b>Phone:</b> the left half of the screen is a joystick, the right half looks around. Buttons for Jump, Run, Drive and whatever the moment needs (Bat, Bowl, Kick, Shoot, Exit) appear on the right.</p></section>

      <AdSlot />

      <section><h2>Driving and lifts</h2>
        <p>Walk up to a jeep, tuk-tuk, bike or cycle and press E. W/S accelerate, A/D steer, Space brakes, Shift is nitro. Petrol runs out after about 5 km — coast to the ⛽ station and press R. Slow down beside any explorer, including a real friend, and press F to give them a lift; they sit behind you and ride along on their own screen too. F again drops them off for +30. Buses do not stop for anyone: walking or driving into one costs 20 points and a tumble.</p></section>

      <section><h2>Cricket — batting and bowling</h2>
        <p>Walk onto the strip at the FindurAI Cricket Ground on Eastside and press E, or pick Cricket on an explorer&apos;s card. Choose 1, 2, 3 or 5 overs, then <b>call the toss</b> — heads or tails. Win it and you decide whether to bat first and set a target, or bowl first and know exactly what you are chasing. Lose it and your rival decides for you.</p>
        <p><b>Batting:</b> on a computer, pick the shot first — a small row of icons above the Bat button, or keys 1 to 8 — block, drive, cover, cut, flick, pull, sweep or slog, then press Bat as the ball reaches you. The shot decides where it goes; timing decides how well it comes off, and a bigger shot has a smaller margin for error. On a phone, batting is pure timing with no picker to manage: perfect timing drives it for six; early pulls it high where a fielder can catch it; late squeezes it along the ground; miss a straight one and you are bowled. Use ◀ ▶ to shuffle across the crease. After a shot, press <b>Run</b> (or W) to run with the batter at the other end — press again for a second — but the fielder throws at your stumps, and if you are mid-pitch when it lands you are run out.</p>
        <p>Every fielder chasing a shot down now gathers it properly and throws it back into play, at your stumps while you are the one running or safely to the bowler while you field — nobody just jogs up to the ball and wanders off. A skied shot is a real chance for a catch, not a certainty; a fielder near the rope can dive and save a four; and a rushed pickup can be fumbled. <b>Bowling:</b> before every ball a panel asks for the speed (slow, medium, fast) and the line (leg, stumps, off). Tap Bowl to run in, then Bowl again at the top of your action — the bar in the green — for a good ball. Loose balls get hit. Wickets +25, dot balls +5, winning the match +200.</p></section>

      <section><h2>Real 8-ball and carrom at the Neon Palace</h2>
        <p>The Neon Palace is the casino and club at the end of Neon Lane. Press E at either pool table or the carrom board by the bar, and you are asked for an optional <b>shot clock</b> first — no timer, or 15 or 30 seconds a turn before it plays whatever shot you had set up. A small scoreboard above the controls tracks both sides&apos; tallies from the first shot, and a <b>View</b> button cycles a few fixed camera angles — a high angle over your shoulder, a low rail-level look down the table, and a bird&apos;s-eye view.</p>
        <p><b>Pool:</b> hold ◀ ▶ to aim (Shift for fine aim), set the Power slider or tap Soft / Medium / Full, press Shoot. Real rules — the first pot decides solids or stripes, a scratch is ball in hand, sink the 8 last. <b>Carrom:</b> works the same way with a Striker slider for your baseline position: white for you, black for your rival, the red queen worth three. Press E on the dance floor to dance.</p></section>

      <AdSlot />

      <section><h2>The Speedway race</h2>
        <p>A 960 m circuit south of the city: pit straight, the Sunset sweeper, the Neon chicane, the long Valley run, Big Bend, the Esses and a hairpin under the grandstand. Choose 1–5 laps against three rivals. Follow the hologram arrows, drive over the green pads for a burst and hold Shift for nitro — the rivals have nitro too. A wrong-way warning tells you if you have turned around.</p></section>

      <section><h2>Football</h2>
        <p>Five-a-side at City Stadium, 90 seconds, first to five wins. Run into the ball to dribble — it sticks to your feet — and press Kick to shoot: harder while sprinting, aimed at the goal when you face it. Kick-offs are contested rather than free: after a goal the side that conceded restarts, and the other team&apos;s front player is held back outside the circle, so you have to win the first touch, not just collect it. Get closely marked and a defender has a real chance of nicking the ball off your feet. Your blue-bib team-mates pass and defend; the red team has a keeper and counters.</p></section>

      <section><h2>Dates, gifts and the rides</h2>
        <p>Walk up to anyone and a card appears: tap an opener to break the ice, or invite them for a coffee at Chai Corner, the pier bench, a candle-lit table on the sand, the campfire, the sunset bench at Lighthouse Point, the Sunset Wheel or the marina boat. Gifts (🌹 🍦 ☕ 🧸 🍫 💌) are free and show on their profile. The fairground rides take two: walk to the gate and press E with someone beside you. There are ten — the Sky Wheel by Neon Lane, the carousel in Central Park, the chair swing by the Skate Park, the pirate ship on the beach, the <b>Sky Drop</b> tower that winches you into the air and drops you, the <b>Spinning Teacups</b> on the sand, the <b>Seaside Coaster</b> (a full circuit behind the dunes with a chain lift, a first drop and two camelbacks), the <b>Bumper Cars</b> in the covered rink by the Skate Park, the <b>Sky Flyer</b> that swings you out over the sea on a spinning gondola, and the <b>Spooky Express</b>, a little ghost train that winds between the gravestones behind the fairground. A ride costs 5 🪙 — gold coins lie all over the city (walk or drive over them), and every finished task pays 5.</p></section>

      <section><h2>Police, fines and the lock-up</h2>
        <p>A patrol jeep works the city with an officer at the wheel. Drive into someone, ram the jeep or scream past it at speed and you pick up heat — one to three stars, shown on a red chip at the top of the screen. The siren starts, the light bar flashes and the jeep leaves its beat to come after you, faster the more stars you have.</p>
        <p>The chase is relentless: the patrol always drives a little faster than however you are moving — on foot, on a bike, or flooring a jeep — and pushes harder still the further behind it falls, so a quick burst of speed will not shake it. Let it catch you while you are slow or on foot and you are <b>fined 15 🪙 a star</b>, straight out of your coins. If you have not got enough on you, you do the time instead: the cell at the City Police Station, twenty to forty-five seconds behind the bars and thirty points gone. Or put real distance between you — stay well clear of the patrol for sixteen seconds and it gives up and goes back to its beat. Coins are lying all over the city, so it pays to keep a few on you.</p></section>

      <section><h2>Zombie night</h2>
        <p>It comes on its own — the 🧟 chip at the top counts down to it. When night falls, waves of walkers, runners, crawlers, hoppers, bloaters and brutes come from every direction. Space punches the one in front of you (three hits each); cars crush them. Every bite drains your ❤ health, clearing a wave heals you, and if you die you wake up back downtown. You cannot outrun them for long, so fight near a vehicle.</p></section>

      <AdSlot />

      <p className="lede"><Link href="/" className="cta">Play free now →</Link> · <Link href="/games/">All games</Link> · <Link href="/map/">City map</Link></p>
    </main>
  );
}
