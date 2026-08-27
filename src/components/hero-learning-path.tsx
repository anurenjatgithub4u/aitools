"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  Lightbulb,
  MessageSquare,
  PenTool,
  Zap,
  FolderKanban,
  Bot,
  Network,
  type LucideIcon,
} from "lucide-react"

// The AI Learning Path, drawn as a flowchart (Homepage Redesign v2).
// Every node links to real content — the flowchart IS the curriculum.

interface PathNode {
  icon: LucideIcon
  title: string
  tag: string
  desc: string
  tint: string
  href: string
}

const NODES: Record<string, PathNode> = {
  basics: {
    icon: Lightbulb,
    title: "AI Basics",
    tag: "Start here",
    desc: "How LLMs actually work — in plain English.",
    tint: "bg-violet-500/15 text-violet-400",
    href: "/blog/how-do-large-language-models-work",
  },
  everyday: {
    icon: MessageSquare,
    title: "Everyday AI",
    tag: "Lesson 2",
    desc: "ChatGPT, Claude & Gemini — pick your tools.",
    tint: "bg-emerald-500/15 text-emerald-400",
    href: "/blog/chatgpt-vs-claude-vs-gemini-vs-perplexity-vs-grok-2026",
  },
  prompting: {
    icon: PenTool,
    title: "Prompting",
    tag: "Lesson 3 · RCTF",
    desc: "The RCTF structure behind every great prompt.",
    tint: "bg-amber-500/15 text-amber-400",
    href: "/techniques/rctf",
  },
  workflows: {
    icon: Zap,
    title: "AI Workflows",
    tag: "Practice",
    desc: "Run real multi-step prompt sequences.",
    tint: "bg-blue-500/15 text-blue-400",
    href: "/packs",
  },
  workspace: {
    icon: FolderKanban,
    title: "Workspace",
    tag: "Save & reuse",
    desc: "Keep what works. Never start blank again.",
    tint: "bg-sky-500/15 text-sky-400",
    href: "/workspace",
  },
  agents: {
    icon: Bot,
    title: "AI Agents",
    tag: "Go deeper",
    desc: "The complete beginner-to-production path.",
    tint: "bg-rose-500/15 text-rose-400",
    href: "/topics/ai-agents",
  },
  advanced: {
    icon: Network,
    title: "MCP & RAG",
    tag: "Advanced",
    desc: "The systems behind serious AI products.",
    tint: "bg-orange-500/15 text-orange-400",
    href: "/blog/model-context-protocol-guide",
  },
}

function Node({ data, className = "" }: { data: PathNode; className?: string }) {
  const Icon = data.icon
  return (
    <Link
      href={data.href}
      className={`group/node relative block w-[188px] shrink-0 cursor-pointer rounded-2xl border border-border/60 bg-card/80 p-4 shadow-lg shadow-black/20 backdrop-blur transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/50 hover:bg-card hover:shadow-xl hover:shadow-primary/15 ${className}`}
    >
      <div className="mb-2 flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-300 group-hover/node:scale-110 ${data.tint}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{data.title}</div>
          <div className="truncate text-[11px] text-muted-foreground">{data.tag}</div>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{data.desc}</p>
    </Link>
  )
}

function Line({ w = "w-6" }: { w?: string }) {
  return (
    <div className="flex shrink-0 items-center">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500/70" />
      <span className={`h-[2px] ${w} bg-blue-500/70`} />
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500/70" />
    </div>
  )
}

export function HeroLearningPath() {
  return (
    <div className="w-full">
      {/* Desktop / tablet: branching horizontal flow */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto hidden max-w-6xl overflow-x-auto pb-4 lg:block"
      >
        <div className="mx-auto flex min-w-max items-center justify-center px-4">
          <Node data={NODES.basics} />
          <Line />
          <Node data={NODES.everyday} />
          <Line />
          <Node data={NODES.prompting} />

          {/* Branch split */}
          <div className="relative shrink-0" style={{ width: 72, height: 288 }}>
            <svg width="72" height="288" viewBox="0 0 72 288" fill="none" className="text-blue-500/70">
              <path d="M0 144 H36" stroke="currentColor" strokeWidth="2" />
              <path d="M36 64 V224" stroke="currentColor" strokeWidth="2" />
              <path d="M36 64 H72" stroke="currentColor" strokeWidth="2" />
              <path d="M36 224 H72" stroke="currentColor" strokeWidth="2" />
              <circle cx="2" cy="144" r="3" fill="currentColor" />
              <circle cx="70" cy="64" r="3" fill="currentColor" />
              <circle cx="70" cy="224" r="3" fill="currentColor" />
            </svg>
            <span className="absolute left-1/2 top-[44px] -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Use AI daily
            </span>
            <span className="absolute left-1/2 top-[204px] -translate-x-1/2 whitespace-nowrap rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Build with AI
            </span>
          </div>

          <div className="flex flex-col justify-between" style={{ height: 288 }}>
            <div className="flex items-center">
              <Node data={NODES.workflows} />
              <Line />
              <Node data={NODES.workspace} />
            </div>
            <div className="flex items-center">
              <Node data={NODES.agents} />
              <Line />
              <Node data={NODES.advanced} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile: vertical stack with branch labels */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto flex max-w-sm flex-col items-center gap-0 px-4 lg:hidden"
      >
        {[NODES.basics, NODES.everyday, NODES.prompting].map((n, i) => (
          <div key={i} className="flex w-full flex-col items-center">
            <Node data={n} className="w-full max-w-[280px]" />
            <span className="my-1.5 h-6 w-[2px] bg-blue-500/60" />
          </div>
        ))}

        <span className="mb-2 rounded-md border border-border/60 bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Path A · Use AI daily
        </span>
        <Node data={NODES.workflows} className="w-full max-w-[280px]" />
        <span className="my-1.5 h-6 w-[2px] bg-blue-500/60" />
        <Node data={NODES.workspace} className="w-full max-w-[280px]" />

        <span className="mb-2 mt-5 rounded-md border border-border/60 bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Path B · Build with AI
        </span>
        <Node data={NODES.agents} className="w-full max-w-[280px]" />
        <span className="my-1.5 h-6 w-[2px] bg-blue-500/60" />
        <Node data={NODES.advanced} className="w-full max-w-[280px]" />
      </motion.div>
    </div>
  )
}
