"use client";

import Link from "next/link";
import { useState } from "react";
import { CREATORS, FORMATS, LENGTHS, LIBRARY, PLATFORMS, TEMPLATES, TONES, buildScenes, type Scene } from "./data";

type Template = (typeof TEMPLATES)[number];

const NAV = [
  { id: "create", label: "Create", icon: "✦", soon: false },
  { id: "templates", label: "Templates", icon: "❖", soon: false },
  { id: "library", label: "Library", icon: "▦", soon: false },
  { id: "creators", label: "AI creators", icon: "☺", soon: true },
  { id: "analytics", label: "Analytics", icon: "↗", soon: true },
];
type View = "create" | "templates" | "library";

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "mb-1.5 block text-xs font-medium text-muted";

export function Studio({ initialView = "create" }: { initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const [preset, setPreset] = useState<Template | null>(null);
  const useTemplate = (t: Template) => {
    setPreset(t);
    setView("create");
  };
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 md:w-56 md:flex-col md:items-stretch md:overflow-visible md:border-b-0 md:border-r md:p-4">
        <Link href="/" className="mr-3 flex items-center gap-2 md:mb-6 md:mr-0">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-ink">F</span>
          <span className="leading-tight font-semibold tracking-tight">FindUrAI<span className="block text-[10px] font-normal text-muted">Find your AI video</span></span>
        </Link>
        <nav className="flex gap-1 md:flex-col">
          {NAV.map((n) => (
            <button
              key={n.id}
              disabled={n.soon}
              onClick={() => setView(n.id as View)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition ${n.id === view ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-bg"} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span aria-hidden>{n.icon}</span>
              {n.label}
              {n.soon && <span className="ml-auto hidden rounded bg-bg px-1.5 text-[10px] md:inline">Soon</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden rounded-xl border border-line p-3 text-xs text-muted md:block">
          <div className="mb-2 flex justify-between"><span>Credits</span><span className="font-medium text-ink">38 / 50</span></div>
          <div className="h-1.5 rounded-full bg-bg"><div className="h-full w-[76%] rounded-full bg-brand" /></div>
          <Link href="/pricing/" className="mt-3 block w-full rounded-lg bg-ink py-1.5 text-center font-medium text-bg">Upgrade</Link>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{view === "create" ? <Create key={preset?.id ?? "blank"} preset={preset} /> : view === "templates" ? <Templates onUse={useTemplate} /> : <Library />}</main>
    </div>
  );
}

function Create({ preset }: { preset: Template | null }) {
  const [product, setProduct] = useState("Glow Serum");
  const [problem, setProblem] = useState("dull, tired-looking skin");
  const [audience, setAudience] = useState("Women 22–35 into skincare");
  const [platform, setPlatform] = useState<string>(preset?.platform ?? PLATFORMS[0]);
  const [tone, setTone] = useState<string>(preset?.tone ?? TONES[0]);
  const [format, setFormat] = useState<string>(preset?.format ?? FORMATS[0]);
  const [length, setLength] = useState<number>(preset?.length ?? 30);
  const [creator, setCreator] = useState(CREATORS[0].id);
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const generate = () => {
    setLoading(true);
    setTimeout(() => {
      setScenes(buildScenes(product, problem, length, format));
      setActive(0);
      setLoading(false);
    }, 900);
  };
  const edit = (id: number, voice: string) => setScenes((s) => s && s.map((x) => (x.id === id ? { ...x, voice } : x)));
  const who = CREATORS.find((c) => c.id === creator)!;
  const total = scenes?.reduce((a, s) => a + s.seconds, 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">New video{preset ? ` · ${preset.name}` : ""}</h1>
        <p className="text-sm text-muted">Describe the product, pick a creator, and get a UGC-style script and scene plan.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_280px]">
        <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">1 · Brief</h2>
          <div><label className={label}>Product name or link</label><input className={field} value={product} onChange={(e) => setProduct(e.target.value)} /></div>
          <div><label className={label}>Problem it solves</label><input className={field} value={problem} onChange={(e) => setProblem(e.target.value)} /></div>
          <div><label className={label}>Target audience</label><input className={field} value={audience} onChange={(e) => setAudience(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Platform</label><select className={field} value={platform} onChange={(e) => setPlatform(e.target.value)}>{PLATFORMS.map((x) => <option key={x}>{x}</option>)}</select></div>
            <div><label className={label}>Tone</label><select className={field} value={tone} onChange={(e) => setTone(e.target.value)}>{TONES.map((x) => <option key={x}>{x}</option>)}</select></div>
          </div>
          <div><label className={label}>Format</label><select className={field} value={format} onChange={(e) => setFormat(e.target.value)}>{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div>
            <span className={label}>Length</span>
            <div className="grid grid-cols-4 gap-2">
              {LENGTHS.map((l) => (
                <button key={l} onClick={() => setLength(l)} className={`rounded-lg border py-1.5 text-sm ${l === length ? "border-brand bg-brand/10 font-medium text-brand" : "border-line text-muted hover:bg-bg"}`}>{l}s</button>
              ))}
            </div>
          </div>
          <div>
            <span className={label}>AI creator</span>
            <div className="grid grid-cols-3 gap-2">
              {CREATORS.map((c) => (
                <button key={c.id} onClick={() => setCreator(c.id)} className={`rounded-xl border p-2 text-center ${c.id === creator ? "border-brand ring-2 ring-brand/20" : "border-line hover:bg-bg"}`}>
                  <div className="mx-auto mb-1 h-10 w-10 rounded-full" style={{ background: `linear-gradient(135deg, hsl(${c.hue} 80% 65%), hsl(${c.hue + 40} 80% 45%))` }} />
                  <div className="text-xs font-medium">{c.name}</div>
                  <div className="truncate text-[10px] text-muted">{c.vibe}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={generate} disabled={loading || !product.trim()} className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-ink transition hover:opacity-90 disabled:opacity-50">
            {loading ? "Writing script…" : scenes ? "Regenerate script" : "Generate script"}
          </button>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">2 · Script & scenes</h2>
            {scenes && <span className="text-xs text-muted">{scenes.length} scenes · {total}s</span>}
          </div>
          {!scenes ? (
            <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-line text-center text-sm text-muted">
              <div><div className="mb-2 text-2xl">✦</div>Fill in the brief and generate a script.</div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-bg">
                {scenes.map((s, i) => (
                  <button key={s.id} aria-label={s.label} onClick={() => setActive(i)} style={{ width: `${(s.seconds / total) * 100}%` }} className={`border-r border-surface ${i === active ? "bg-brand" : "bg-brand/30"}`} />
                ))}
              </div>
              <ol className="space-y-3">
                {scenes.map((s, i) => (
                  <li key={s.id} onClick={() => setActive(i)} className={`rounded-xl border p-3 ${i === active ? "border-brand" : "border-line"}`}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold">{i + 1}. {s.label}</span>
                      <span className="text-muted">{s.seconds}s</span>
                    </div>
                    <textarea rows={2} value={s.voice} onChange={(e) => edit(s.id, e.target.value)} className={`${field} resize-none`} />
                    <p className="mt-2 text-xs text-muted">🎬 {s.visual}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg">Render video · 5 credits</button>
                <button className="rounded-lg border border-line px-4 py-2 text-sm hover:bg-bg">Save draft</button>
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 lg:col-span-2 xl:col-span-1">
          <h2 className="mb-4 text-sm font-semibold">3 · Preview</h2>
          <div className="mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-[28px] border-4 border-ink/80 p-3" style={{ background: `linear-gradient(160deg, hsl(${who.hue} 70% 35%), hsl(${who.hue + 50} 70% 15%))` }}>
            <div className="flex h-full flex-col justify-between text-white">
              <div className="flex items-center justify-between text-[10px] opacity-80"><span>{platform}</span><span>{length}s</span></div>
              <div className="text-center">
                <div className="mx-auto mb-3 h-20 w-20 rounded-full bg-white/20 ring-2 ring-white/40" />
                <p className="rounded-md bg-black/40 px-2 py-1 text-[11px] font-semibold leading-snug">{scenes ? scenes[active].voice : `${who.name} talks about ${product || "your product"}`}</p>
              </div>
              <div className="text-[10px] opacity-80">@{who.name.toLowerCase()} · {tone}</div>
            </div>
          </div>
          <dl className="mt-4 space-y-1 text-xs text-muted">
            <div className="flex justify-between"><dt>Creator</dt><dd className="text-ink">{who.name}</dd></div>
            <div className="flex justify-between"><dt>Format</dt><dd className="text-ink">{format}</dd></div>
            <div className="flex justify-between"><dt>Audience</dt><dd className="max-w-32 truncate text-ink">{audience}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}

const STATUS: Record<string, string> = {
  Ready: "bg-emerald-500/15 text-emerald-600",
  Rendering: "bg-amber-500/15 text-amber-600",
  Published: "bg-brand/15 text-brand",
  Draft: "bg-muted/15 text-muted",
};

function Library() {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Draft", "Rendering", "Ready", "Published"];
  const items = LIBRARY.filter((x) => filter === "All" || x.status === filter);
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="text-sm text-muted">Every video you have made, in one place.</p>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 text-xs ${f === filter ? "bg-brand text-brand-ink" : "text-muted hover:bg-bg"}`}>{f}</button>
          ))}
        </div>
      </header>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {items.map((v) => (
          <article key={v.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="aspect-[9/12] p-3" style={{ background: `linear-gradient(160deg, hsl(${v.hue} 70% 40%), hsl(${v.hue + 50} 70% 18%))` }}>
              <span className={`rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium ${STATUS[v.status]}`}>{v.status}</span>
            </div>
            <div className="p-3">
              <h3 className="truncate text-sm font-medium">{v.title}</h3>
              <p className="mt-0.5 flex justify-between text-xs text-muted"><span>{v.platform}</span><span>{v.views} views</span></p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Templates({ onUse }: { onUse: (t: Template) => void }) {
  const [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(TEMPLATES.map((t) => t.category)))];
  const items = TEMPLATES.filter((t) => cat === "All" || t.category === cat);
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted">Proven short-form formats. Pick one and the brief is pre-filled.</p>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-md px-3 py-1 text-xs ${c === cat ? "bg-brand text-brand-ink" : "text-muted hover:bg-bg"}`}>{c}</button>
          ))}
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((t) => (
          <article key={t.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex aspect-[16/10] items-end justify-between p-3 text-xs text-white" style={{ background: `linear-gradient(160deg, hsl(${t.hue} 70% 40%), hsl(${t.hue + 50} 70% 18%))` }}>
              <span className="rounded-full bg-black/40 px-2 py-0.5">{t.category}</span>
              <span className="rounded-full bg-black/40 px-2 py-0.5">{t.length}s</span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-medium">{t.name}</h3>
              <p className="mt-1 flex-1 text-sm text-muted">{t.desc}</p>
              <p className="mt-3 text-xs text-muted">{t.platform} · {t.tone} · {t.uses} uses</p>
              <button onClick={() => onUse(t)} className="mt-3 rounded-lg bg-brand py-2 text-sm font-medium text-brand-ink hover:opacity-90">Use template</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
