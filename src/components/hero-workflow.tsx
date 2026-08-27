"use client"

import { motion } from "framer-motion"
import {
  Zap,
  Search,
  MessageSquare,
  Sparkles,
  CheckCheck,
  FileText,
  Layers,
  Bookmark,
  type LucideIcon,
} from "lucide-react"

// A personal AI workflow — the kind a student assembles from the tools they
// already chat with. It reads like something you built and saved: research in
// Perplexity, draft in ChatGPT, then either polish it into an essay (Claude →
// Grammarly) or turn it into study materials (NotebookLM → Quizlet).

interface NodeData {
  icon: LucideIcon
  title: string
  tag: string
  desc: string
  tint: string
}

const NODES = {
  trigger: {
    icon: Zap,
    title: "New Assignment",
    tag: "You start here",
    desc: "Add a topic, essay, or exam to prep for.",
    tint: "bg-violet-500/15 text-violet-400",
  },
  research: {
    icon: Search,
    title: "Perplexity",
    tag: "Research",
    desc: "Gathers cited sources on your topic.",
    tint: "bg-emerald-500/15 text-emerald-400",
  },
  draft: {
    icon: MessageSquare,
    title: "ChatGPT",
    tag: "Draft",
    desc: "Writes a first draft you can edit.",
    tint: "bg-teal-500/15 text-teal-400",
  },
  refine: {
    icon: Sparkles,
    title: "Claude",
    tag: "Refine",
    desc: "Sharpens tone, structure and clarity.",
    tint: "bg-orange-500/15 text-orange-400",
  },
  proofread: {
    icon: CheckCheck,
    title: "Grammarly",
    tag: "Proofread",
    desc: "Fixes grammar and tightens citations.",
    tint: "bg-sky-500/15 text-sky-400",
  },
  summarize: {
    icon: FileText,
    title: "NotebookLM",
    tag: "Summarize",
    desc: "Condenses readings into short notes.",
    tint: "bg-rose-500/15 text-rose-400",
  },
  flashcards: {
    icon: Layers,
    title: "Quizlet",
    tag: "Flashcards",
    desc: "Turns notes into quiz-ready cards.",
    tint: "bg-amber-500/15 text-amber-400",
  },
} satisfies Record<string, NodeData>

function Node({ data, className = "" }: { data: NodeData; className?: string }) {
  const Icon = data.icon
  return (
    <div
      className={`group/node relative w-[188px] shrink-0 cursor-pointer rounded-2xl border border-border/60 bg-card/80 p-4 shadow-lg shadow-black/20 backdrop-blur transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary/50 hover:bg-card hover:shadow-xl hover:shadow-primary/15 ${className}`}
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
    </div>
  )
}

function Line({ w = "w-6" }: { w?: string }) {
  return (
    <div className="flex shrink-0 items-center">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500/70" />
      <span className={`h-[2px] ${w} bg-gradient-to-r from-blue-500/70 to-blue-500/70`} />
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500/70" />
    </div>
  )
}

// Header that frames the diagram as the user's own saved workflow
function WorkflowHeader() {
  return (
    <div className="mb-8 flex flex-col items-center gap-2 px-4 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
        <Bookmark className="h-3.5 w-3.5 text-primary" />
        My Study Workflow
        <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
          Saved
        </span>
      </span>
      <p className="max-w-md text-sm text-muted-foreground">
        Built from the AI tools you already chat with — save it once, reuse it every week.
      </p>
    </div>
  )
}

export function HeroWorkflow() {
  return (
    <div className="w-full">

      {/* Desktop / tablet: branching horizontal flow */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="mx-auto hidden max-w-6xl overflow-x-auto py-8 lg:block"
      >
        <div className="mx-auto flex min-w-max items-center justify-center px-4 py-4">
          <Node data={NODES.trigger} />
          <Line />
          <Node data={NODES.research} />
          <Line />
          <Node data={NODES.draft} />

          {/* Branch split connector */}
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
            <span className="absolute left-1/2 top-[44px] -translate-x-1/2 rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Essay
            </span>
            <span className="absolute left-1/2 top-[204px] -translate-x-1/2 rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Study
            </span>
          </div>

          {/* Two branch rows */}
          <div className="flex flex-col justify-between" style={{ height: 288 }}>
            <div className="flex items-center">
              <Node data={NODES.refine} />
              <Line />
              <Node data={NODES.proofread} />
            </div>
            <div className="flex items-center">
              <Node data={NODES.summarize} />
              <Line />
              <Node data={NODES.flashcards} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile: clean vertical stack with Essay / Study groupings */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="mx-auto flex max-w-sm flex-col items-center gap-0 px-4 lg:hidden"
      >
        {[NODES.trigger, NODES.research, NODES.draft].map((n, i) => (
          <div key={i} className="flex flex-col items-center">
            <Node data={n} className="w-full max-w-[280px]" />
            <span className="my-1.5 h-6 w-[2px] bg-blue-500/60" />
          </div>
        ))}

        <span className="mb-2 rounded-md border border-border/60 bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          If · Essay
        </span>
        <Node data={NODES.refine} className="w-full max-w-[280px]" />
        <span className="my-1.5 h-6 w-[2px] bg-blue-500/60" />
        <Node data={NODES.proofread} className="w-full max-w-[280px]" />

        <span className="mb-2 mt-5 rounded-md border border-border/60 bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Else · Study
        </span>
        <Node data={NODES.summarize} className="w-full max-w-[280px]" />
        <span className="my-1.5 h-6 w-[2px] bg-blue-500/60" />
        <Node data={NODES.flashcards} className="w-full max-w-[280px]" />
      </motion.div>
    </div>
  )
}
