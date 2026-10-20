"use client";

import Link from "next/link";
import { useState } from "react";
import { FAQS, PLANS } from "../_components/data";

export function Pricing() {
  const [yearly, setYearly] = useState(true);
  return (
    <>
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Pricing that scales with your content</h1>
        <p className="mt-3 text-muted">Start free. Upgrade when you are posting daily.</p>
        <div className="mt-6 inline-flex rounded-lg border border-line bg-surface p-1 text-sm" role="group" aria-label="Billing period">
          <button onClick={() => setYearly(false)} aria-pressed={!yearly} className={`rounded-md px-4 py-1.5 ${!yearly ? "bg-brand text-brand-ink" : "text-muted"}`}>Monthly</button>
          <button onClick={() => setYearly(true)} aria-pressed={yearly} className={`rounded-md px-4 py-1.5 ${yearly ? "bg-brand text-brand-ink" : "text-muted"}`}>
            Yearly <span className="ml-1 text-xs opacity-80">−20%</span>
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.id} className={`flex flex-col rounded-2xl border bg-surface p-6 ${p.featured ? "border-brand ring-2 ring-brand/20" : "border-line"}`}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{p.name}</h2>
              {p.featured && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">Most popular</span>}
            </div>
            <p className="mt-1 text-sm text-muted">{p.blurb}</p>
            <p className="mt-5 text-4xl font-semibold">
              ${yearly ? p.yearly : p.monthly}
              <span className="text-sm font-normal text-muted"> /mo{yearly && p.yearly > 0 ? ", billed yearly" : ""}</span>
            </p>
            <p className="mt-1 text-sm font-medium text-brand">{p.credits}</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-brand" aria-hidden>✓</span>{f}</li>
              ))}
            </ul>
            <Link href="/studio/" className={`mt-6 rounded-lg py-2.5 text-center text-sm font-medium ${p.featured ? "bg-brand text-brand-ink hover:opacity-90" : "border border-line hover:bg-bg"}`}>{p.cta}</Link>
          </div>
        ))}
      </div>

      <section id="faq" className="mx-auto mt-20 max-w-2xl scroll-mt-24">
        <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group p-4">
              <summary className="cursor-pointer list-none font-medium">{q}</summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
