import Link from "next/link";
import { SiteFooter, SiteHeader } from "./_components/Site";
import { PLANS, TEMPLATES } from "./_components/data";

const FEATURES = [
  ["✦", "Scripts that hook", "Product in, hook-first scripts out, tuned to platform, tone and length."],
  ["☺", "AI creators", "Pick from synthetic creators that look and sound like real UGC."],
  ["▦", "Templates", "Proven formats: testimonials, unboxings, before/afters and more."],
  ["⚡", "Captions & music", "Burned-in captions, beat-matched cuts and licensed audio."],
  ["↗", "One-click publish", "Schedule to TikTok, Reels and Shorts from the same screen."],
  ["⧉", "Bulk variations", "Test 10 hooks per product and keep what performs."],
];

const CARDS = [
  { hue: 20, who: "maya", line: "I didn't believe the hype until I tried it." },
  { hue: 220, who: "dev", line: "3 reasons this is on my desk." },
  { hue: 330, who: "sofia", line: "POV: your skin finally glows." },
  { hue: 150, who: "kai", line: "Stop scrolling if you lift." },
  { hue: 28, who: "zara", line: "Get ready with me, new drop." },
  { hue: 280, who: "omar", line: "Cold brew at home, done right." },
  { hue: 190, who: "lena", line: "Unboxing day, finally." },
];

function Card({ hue, who, line, center }: { hue: number; who: string; line: string; center?: boolean }) {
  return (
    <div
      className={`shrink-0 rounded-2xl border-4 border-white shadow-lg ${center ? "h-72 w-40 sm:h-80 sm:w-44" : "h-60 w-32 sm:h-64 sm:w-36"}`}
      style={{ background: `linear-gradient(165deg, hsl(${hue} 75% 62%), hsl(${hue + 40} 70% 28%))` }}
    >
      <div className="flex h-full flex-col justify-between p-2 text-[10px] text-white">
        <span className="opacity-90">@{who}</span>
        <div className="mx-auto h-14 w-14 rounded-full bg-white/25 ring-2 ring-white/50" />
        <span className="rounded bg-black/40 p-1 font-semibold leading-snug">{line}</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero-glow relative -mt-16 overflow-hidden pt-32">
          <div aria-hidden className="drift pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
          <div aria-hidden style={{ "--d": "-6s" } as React.CSSProperties} className="drift pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <span className="anim-up inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted shadow-sm">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" /><span className="relative h-1.5 w-1.5 rounded-full bg-brand" /></span> Find your AI video · 1,284 videos made last week
            </span>
            <h1 style={{ "--d": "0.1s" } as React.CSSProperties} className="anim-up mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
              Your AI Content <span className="font-normal italic text-brand">Creator</span>
              <br />
              for TikTok, Reels and Shorts
            </h1>
            <p style={{ "--d": "0.25s" } as React.CSSProperties} className="anim-up mx-auto mt-5 max-w-xl text-muted">Turn any product link or photo into UGC-style short videos in minutes: hook, script, AI creator and captions included.</p>
            <div style={{ "--d": "0.4s" } as React.CSSProperties} className="anim-up mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/studio/" className="shine rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-ink shadow-md shadow-brand/30 transition hover:-translate-y-0.5 hover:opacity-90">Create your first video →</Link>
              <Link href="/studio/templates/" className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold shadow-sm hover:bg-bg">Browse templates →</Link>
            </div>
          </div>
          <div className="mt-14 flex items-center justify-center gap-3 pb-16 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            {CARDS.map((c, i) => (
              <div key={c.who} style={{ "--d": `${0.5 + i * 0.08}s` } as React.CSSProperties} className={`anim-up ${i < 1 || i > 5 ? "hidden md:block" : i === 1 || i === 5 ? "hidden sm:block" : ""}`}>
                <div style={{ "--d": `${-i * 0.7}s` } as React.CSSProperties} className="bob">
                  <Card {...c} center={i === 3} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="dot-grid scroll-mt-16 bg-bg px-4 py-20">
          <div className="reveal mx-auto max-w-5xl text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-brand">HOW IT WORKS</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Create AI content in 3 steps</h2>
            <div className="mt-12 grid items-stretch gap-4 text-left md:grid-cols-[1fr_auto_1fr_auto_1fr]">
              <StepCard title="Share it" body="Upload a product photo or paste a link to your website, store page or app listing. That's all we need.">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-10 w-8 rounded bg-accent/60" /> OR
                  <span className="rounded-full bg-surface px-3 py-1.5 shadow-sm">🔗 yourstore.com</span>
                </div>
              </StepCard>
              <Arrow />
              <StepCard title="We create it" body="Our AI studies your product, chooses the best angles for your category and writes your scripts automatically.">
                <div className="flex flex-wrap gap-1.5 text-[10px] text-muted">
                  {["✓ Analysis", "Hook", "Script", "Creator", "Location"].map((t) => (
                    <span key={t} className="rounded-full bg-surface px-2.5 py-1 shadow-sm">{t}</span>
                  ))}
                </div>
              </StepCard>
              <Arrow />
              <StepCard title="Post it" body="Preview in a phone frame, tweak any line, then export or publish straight to your channels.">
                <div className="mx-auto h-16 w-10 rounded-lg border-2 border-ink/70 bg-surface" />
              </StepCard>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
          <h2 className="reveal text-3xl font-semibold tracking-tight">Everything a UGC team does, automated</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([icon, title, body]) => (
              <div key={title} className="reveal lift rounded-2xl border border-line bg-surface p-5">
                <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand">{icon}</div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-semibold tracking-tight">Start from a proven template</h2>
            <Link href="/studio/templates/" className="text-sm text-brand hover:underline">Browse all</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {TEMPLATES.slice(0, 4).map((t) => (
              <div key={t.id} className="reveal lift overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="aspect-[9/12]" style={{ background: `linear-gradient(160deg, hsl(${t.hue} 70% 55%), hsl(${t.hue + 50} 70% 25%))` }} />
                <div className="p-3 text-sm font-medium">{t.name}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className={`reveal lift rounded-2xl border bg-surface p-5 ${p.featured ? "border-brand ring-2 ring-brand/20" : "border-line"}`}>
                <h3 className="font-medium">{p.name}</h3>
                <p className="mt-2 text-3xl font-semibold">${p.monthly}<span className="text-sm font-normal text-muted"> /mo</span></p>
                <p className="mt-1 text-sm text-muted">{p.credits}</p>
              </div>
            ))}
          </div>
          <Link href="/pricing/" className="mt-6 inline-block text-sm text-brand hover:underline">Compare plans →</Link>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 pt-8">
          <div className="reveal rounded-3xl bg-ink px-6 py-14 text-center text-bg">
            <h2 className="text-3xl font-semibold tracking-tight">Ship a week of content before lunch</h2>
            <Link href="/studio/" className="shine mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-ink transition hover:-translate-y-0.5 hover:opacity-90">Open the studio →</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function StepCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="lift rounded-2xl border border-line bg-surface p-3 shadow-sm">
      <div className="grid h-28 place-items-center rounded-xl bg-gradient-to-br from-accent/30 to-brand/10 p-3">{children}</div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

function Arrow() {
  return <div className="nudge hidden place-self-center rounded-full border border-line bg-surface px-2 py-1 text-xs text-muted shadow-sm md:block" aria-hidden>→</div>;
}
