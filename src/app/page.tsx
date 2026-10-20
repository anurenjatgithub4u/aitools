import Link from "next/link";
import { SiteFooter, SiteHeader } from "./_components/Site";
import { CREATORS, PLANS, TEMPLATES } from "./_components/data";

const FEATURES = [
  ["✦", "Scripts that hook", "Product in, hook-first scripts out, tuned to platform, tone and length."],
  ["☺", "AI creators", "Pick from synthetic creators that look and sound like real UGC."],
  ["▦", "Templates", "Proven formats: testimonials, unboxings, before/afters and more."],
  ["⚡", "Captions & music", "Burned-in captions, beat-matched cuts and licensed audio."],
  ["↗", "One-click publish", "Schedule to TikTok, Reels and Shorts from the same screen."],
  ["⧉", "Bulk variations", "Test 10 hooks per product and keep what performs."],
];

const STEPS = [
  ["1", "Describe your product", "Paste a link or a few lines: what it is, who it is for."],
  ["2", "Pick a creator and format", "Choose a face, a tone and a proven template."],
  ["3", "Edit and render", "Tweak the script, preview in a phone frame and export."],
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:pt-24">
          <div className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">Find your AI video · beta</span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
                Turn any product into <span className="text-brand">scroll-stopping</span> UGC videos
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted">
                FindUrAI writes the hook, casts an AI creator and renders short-form videos for TikTok, Reels and Shorts, in minutes instead of weeks.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/studio/" className="rounded-lg bg-brand px-6 py-3 font-medium text-brand-ink hover:opacity-90">Create your first video</Link>
                <Link href="/pricing/" className="rounded-lg border border-line bg-surface px-6 py-3 font-medium hover:bg-bg">See pricing</Link>
              </div>
              <p className="mt-4 text-xs text-muted">Free plan included. No card required.</p>
            </div>
            <div className="relative mx-auto flex w-full max-w-sm justify-center gap-3">
              {CREATORS.slice(0, 3).map((c, i) => (
                <div
                  key={c.id}
                  className={`aspect-[9/16] w-1/3 rounded-2xl border border-line p-2 text-[10px] text-white shadow-lg ${i === 1 ? "-translate-y-6" : ""}`}
                  style={{ background: `linear-gradient(160deg, hsl(${c.hue} 70% 40%), hsl(${c.hue + 50} 70% 15%))` }}
                >
                  <div className="flex h-full flex-col justify-between">
                    <span className="opacity-80">@{c.name.toLowerCase()}</span>
                    <span className="rounded bg-black/40 p-1 font-semibold">Stop scrolling if you struggle with this.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Everything a UGC team does, automated</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([icon, title, body]) => (
              <div key={title} className="rounded-2xl border border-line bg-surface p-5">
                <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand">{icon}</div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">From link to video in three steps</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map(([n, title, body]) => (
              <li key={n} className="rounded-2xl border border-line bg-surface p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-sm font-semibold text-bg">{n}</span>
                <h3 className="mt-3 font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-semibold tracking-tight">Start from a proven template</h2>
            <Link href="/studio/templates/" className="text-sm text-brand hover:underline">Browse all</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {TEMPLATES.slice(0, 4).map((t) => (
              <div key={t.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="aspect-[9/12]" style={{ background: `linear-gradient(160deg, hsl(${t.hue} 70% 40%), hsl(${t.hue + 50} 70% 18%))` }} />
                <div className="p-3 text-sm font-medium">{t.name}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className={`rounded-2xl border bg-surface p-5 ${p.featured ? "border-brand ring-2 ring-brand/20" : "border-line"}`}>
                <h3 className="font-medium">{p.name}</h3>
                <p className="mt-2 text-3xl font-semibold">${p.monthly}<span className="text-sm font-normal text-muted"> /mo</span></p>
                <p className="mt-1 text-sm text-muted">{p.credits}</p>
              </div>
            ))}
          </div>
          <Link href="/pricing/" className="mt-6 inline-block text-sm text-brand hover:underline">Compare plans →</Link>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 pt-8">
          <div className="rounded-3xl bg-ink px-6 py-14 text-center text-bg">
            <h2 className="text-3xl font-semibold tracking-tight">Ship a week of content before lunch</h2>
            <Link href="/studio/" className="mt-6 inline-block rounded-lg bg-brand px-6 py-3 font-medium text-brand-ink hover:opacity-90">Open the studio</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
