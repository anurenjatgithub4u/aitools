"use client";

import { ArrowRightIcon, LanguagesIcon, RadarIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { CountryFlag } from "@/components/country-flag";
import { useTypewriter } from "@/components/home/typewriter";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { Button } from "@/components/ui/button";
import { PLAN_LIMITS } from "@/lib/plans";

// One keyword, as people really search it in each store (from a real Localize run).
const SEARCHES = [
  { country: "US", phrase: "habit tracker" },
  { country: "DE", phrase: "gewohnheitstracker" },
  { country: "JP", phrase: "習慣管理" },
  { country: "BR", phrase: "rastreador de hábitos" },
  { country: "FR", phrase: "suivi d'habitudes" },
  { country: "IT", phrase: "tracker abitudini" },
];
const PHRASES = SEARCHES.map((s) => s.phrase);

const STEPS = [
  { icon: SparklesIcon, title: "Brainstorm", body: "AI suggests 30 keywords people actually type, short and long-tail." },
  { icon: LanguagesIcon, title: "Localize", body: "Each one rewritten the way locals search, not translated word for word." },
  { icon: RadarIcon, title: "Check & decide", body: "Live App Store ranks, volume, difficulty and a clear verdict per country." },
];

const delay = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

export function Hero({ signedIn, hasProjects }: { signedIn: boolean; hasProjects: boolean }) {
  const { index, text, typing } = useTypewriter(PHRASES);

  return (
    <section className="relative isolate overflow-hidden rounded-3xl border bg-card px-5 py-12 sm:px-10 sm:py-16">
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10" />

      <div className="mx-auto max-w-3xl text-center">
        <p style={delay(0)} className="fade-up inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          AI keyword research for the App Store
        </p>

        <h1 style={delay(0.1)} className="fade-up mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Find the words people <span className="text-shimmer">really search</span>
        </h1>

        <div style={delay(0.25)} className="fade-up mt-6 text-lg text-muted-foreground sm:text-2xl">
          <span className="sr-only">For example: {SEARCHES.map((s) => `${s.phrase} (${s.country})`).join(", ")}</span>
          <div aria-hidden className="flex min-h-[1.6em] flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span>in every country:</span>
            <span className="inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-1 font-medium text-foreground shadow-sm">
              <CountryFlag key={index} code={SEARCHES[index].country} className="flag-pop" />
              <span className="whitespace-pre">{text}</span>
              {typing && <span className="caret -ml-1 inline-block h-[1.1em] w-0.5 bg-foreground" />}
            </span>
          </div>
        </div>

        <p style={delay(0.4)} className="fade-up mx-auto mt-6 max-w-xl text-pretty text-muted-foreground">
          Brainstorm keywords for your app or idea, turn them into what locals type in 9 App Stores, and see exactly where you rank and which ones are worth fighting for.
        </p>

        <div style={delay(0.55)} className="fade-up mt-8 flex flex-wrap items-center justify-center gap-3">
          {signedIn ? (
            <NewProjectDialog
              trigger={
                <Button size="lg" className="group">
                  {hasProjects ? "New project" : "Start your first project"}
                  <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
                </Button>
              }
            />
          ) : (
            <Button size="lg" className="group" asChild>
              <Link href="/login?mode=signup">
                Get started free
                <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{PLAN_LIMITS.free.projects} projects free · no card needed</span>
        </div>
      </div>

      <ol className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} style={delay(0.7 + i * 0.12)} className="fade-up rounded-2xl border bg-background/70 p-4 text-left backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-muted">
                <s.icon className="size-4" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
            </div>
            <h2 className="mt-3 font-medium">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
