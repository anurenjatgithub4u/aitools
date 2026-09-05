"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Sparkles,
  GraduationCap,
  Bookmark,
  Gauge,
  ChevronDown,
  FileText,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { NeuralOrb } from "@/components/neural-orb"

// The learning loop, subject-agnostic by design — the whole point is that step
// 01 accepts anything. Each step maps to a surface that ships today.
const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Bring anything",
    desc: "A textbook chapter, lecture slides, a research paper, a work document — whatever you need to learn.",
    icon: FileText,
  },
  {
    step: "02",
    title: "AI turns it into study material",
    desc: "Notes, flashcards, practice questions or a full quiz — generated strictly from your material, not the internet.",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "Practice until it sticks",
    desc: "Test yourself, drill recall, and measure reading speed and comprehension with real numbers.",
    icon: Gauge,
  },
  {
    step: "04",
    title: "Keep it in one place",
    desc: "Everything you learn lands in a personal workspace instead of scattering across tabs and downloads.",
    icon: Bookmark,
  },
]

// Two ways in: your own material, or our library. Every href is a route that
// exists — nothing here promises an unbuilt feature.
const TRACKS = [
  {
    label: "Start here",
    title: "Bring Your Own Material",
    blurb: "The fastest way to learn something specific. Upload what you already have and get study material built from it in seconds.",
    icon: FileText,
    accent: "text-sky-400",
    items: [
      {
        title: "PDF to Notes, Flashcards & Quiz",
        desc: "Any subject, any document — turn it into notes, flashcards, questions or an interactive quiz.",
        href: "/utilities/pdf-to-study",
        tag: "Free tool",
      },
      {
        title: "Typing & Reading Speed",
        desc: "Measure WPM, accuracy and comprehension, then watch the numbers move over weeks.",
        href: "/utilities/typing-reading-speed",
        tag: "Free tool",
      },
      {
        title: "Your Workspace",
        desc: "Keep notes, prompts and saved guides together instead of losing them across tabs.",
        href: "/workspace",
        tag: "Personal",
      },
    ],
  },
  {
    label: "Or explore",
    title: "Start From Our Library",
    blurb: "Nothing specific in mind? Structured paths and guides written to be read in order, plus prompts you can run today.",
    icon: GraduationCap,
    accent: "text-violet-400",
    items: [
      {
        title: "AI Agents Learning Path",
        desc: "Five guides in order — what an agent is, architecture, memory, planning, and production.",
        href: "/topics/ai-agents",
        tag: "Learning path",
      },
      {
        title: "Improve English Speaking With AI",
        desc: "A daily system for spoken fluency — drills, prompts and a 30-day plan.",
        href: "/blog/how-to-improve-english-speaking-with-ai",
        tag: "Guide",
      },
      {
        title: "Prompt Packs",
        desc: "Ready-to-run prompt collections for study, writing and code — fork and adapt them.",
        href: "/packs",
        tag: "Practice",
      },
    ],
  },
]

export default function HomeClient() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* ── 1. Hero ──────────────────────────────────────────────── */}
      <section className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden py-16">
        <div className="fixed inset-0 -z-10 bg-purple-500/10 [mask-image:radial-gradient(ellipse_60%_50%_at_30%_20%,black,transparent)] dark:bg-black dark:bg-[radial-gradient(ellipse_65%_50%_at_15%_10%,rgba(255,255,255,0.14),transparent_60%),radial-gradient(ellipse_55%_45%_at_85%_85%,rgba(255,255,255,0.06),transparent_65%)] dark:[mask-image:none]" />
        <div className="pointer-events-none fixed -z-10 top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl dark:hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
        </div>
        <CursorGlow />

        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-6 flex justify-center lg:justify-start">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 py-1 pl-1 pr-3.5 text-sm backdrop-blur">
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                      Free
                    </span>
                    <span className="text-muted-foreground font-medium">AI LEARNING PLATFORM</span>
                  </span>
                </div>

                <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tight mb-3 leading-[1.05]">
                  <span className="text-foreground dark:text-white">
                    Your Second Brain.
                  </span>
                </h1>

                <p className="text-xl md:text-2xl font-medium text-foreground/70 mb-6 max-w-xl mx-auto lg:mx-0">
                  Learn anything with AI.
                </p>

                <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Bring any material — a textbook chapter, lecture slides, a paper, a report — and AI turns it into notes, flashcards, questions and quizzes. Practice until it sticks, and keep it all in one workspace.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-4"
              >
                <Link href="/workspace">
                  <Button size="lg" className="h-13 rounded-2xl px-8 font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-95 shadow-xl shadow-purple-500/25 transition-all text-base cursor-pointer">
                    Start Learning Free →
                  </Button>
                </Link>
                <Link href="/packs" className="group flex items-center gap-2 rounded-2xl border border-border bg-card/60 px-7 h-13 shadow-sm transition-colors hover:border-primary/50 text-foreground font-medium text-base cursor-pointer">
                  Browse Prompt Packs
                </Link>
              </motion.div>
            </div>

            {/* Orbit graphic */}
            <HeroOrbit />
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
        >
          <ChevronDown className="h-5 w-5 animate-bounce text-muted-foreground/60" />
        </motion.div>
      </section>

      {/* ── 2. How It Works ─────────────────────────────────────────── */}
      <section className="py-20 border-t border-border/40 relative bg-muted/20">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">Four steps, any subject</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">How FindUrAI Works</h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Reading something once isn&apos;t learning it. This loop turns whatever you&apos;re studying into material you can actually be tested on — and keeps it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur space-y-4 relative"
              >
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-extrabold text-primary font-mono">{item.step}</span>
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. The Two Tracks ───────────────────────────────────────── */}
      <section className="py-20 border-t border-border/40">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">Where to Start</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Two Ways In</h2>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                Come with something you need to learn, or pick up one of our paths. Either way, what you save lands in the same workspace.
              </p>
            </div>
            <Link href="/workspace">
              <Button variant="outline" className="rounded-xl gap-2 cursor-pointer">
                Open Workspace
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {TRACKS.map((track, trackIdx) => (
              <motion.div
                key={track.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: trackIdx * 0.1 }}
                className="rounded-3xl border border-border/60 bg-card/40 p-6 md:p-8"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <track.icon className={`h-6 w-6 ${track.accent}`} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {track.label}
                    </span>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">{track.title}</h3>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{track.blurb}</p>

                <div className="space-y-3">
                  {track.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group block rounded-2xl border border-border/60 bg-background/60 p-4 transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Closing strip */}
          <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md px-6 py-5">
            <Layers className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              Free to start, no sign-up needed to use the tools. Sign in to save what you learn and pick up where you left off.
            </p>
            <Link href="/blog">
              <Button variant="ghost" className="rounded-xl gap-2 cursor-pointer text-sm">
                Browse all guides
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (ref.current) {
        ref.current.style.background = `radial-gradient(500px circle at ${e.clientX}px ${e.clientY}px, rgba(255,255,255,0.10), transparent 45%)`
      }
    }
    window.addEventListener("mousemove", handleMove)
    return () => window.removeEventListener("mousemove", handleMove)
  }, [])

  return <div ref={ref} className="pointer-events-none fixed inset-0 z-0 hidden dark:block" />
}

function HeroOrbit() {
  return (
    <motion.div
      className="relative mx-auto hidden aspect-square w-full max-w-xl lg:block"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      {/* Soft core glow behind the mesh. */}
      <div className="pointer-events-none absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(99,102,241,0.10),transparent_65%)] blur-2xl dark:bg-[radial-gradient(circle_at_50%_45%,rgba(91,141,239,0.20),transparent_65%)]" />

      <NeuralOrb />
    </motion.div>
  )
}
