"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { X, Check, ArrowRight, Folder, FileText, Bot, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

// "See The Difference" (FindurAI_See_The_Difference_Home_Feature.md), reworked
// for the AI Workspace Generator era: the product's core output is no longer
// a single workflow reply, it's a real nested project workspace. Both panels
// get the SAME typed input — the only variable is what comes back: one plain
// AI reply (rated) vs. an actual nested folder structure.

interface TreeFolder {
  title: string
  icon: string
  files?: string[]
  folders?: TreeFolder[]
}

interface Example {
  id: string // role id (matches PACK_ROLES) so the workspace picker can drive it
  role: string
  emoji: string
  goal: string // the shared input typed into both a plain AI tool and FindurAI
  aiReply: string // a realistic plain-AI-tool response to that same input
  aiRating: number // out of 5
  aiRatingNote: string
  tree: TreeFolder[]
}

const EXAMPLES: Example[] = [
  {
    id: "writer",
    role: "Writer",
    emoji: "✍️",
    goal: "Grow a niche blog with SEO-optimized, 3,500+ word posts",
    aiReply:
      "Great goal! Here are some tips: write consistently, focus on a niche, use SEO keywords, and promote your posts on social media. You could start with a post about a trending topic in your niche and build from there. Let me know if you'd like a sample outline!",
    aiRating: 2,
    aiRatingNote: "Generic advice, no research or calendar — nothing saved",
    tree: [
      { title: "Content Calendar", icon: "📅", files: ["Q1 Post Ideas", "Publishing Schedule"] },
      { title: "SEO Research", icon: "🔍", files: ["Keyword Research: AI Agents", "Competitor Analysis"] },
      { title: "Drafts", icon: "📝", files: ["AI Agents: The Complete Guide"] },
      { title: "AI Workflows", icon: "🤖", files: ["Blog Post Generator"] },
    ],
  },
  {
    id: "developer",
    role: "Developer",
    emoji: "💻",
    goal: "Prep for Senior Backend Engineer interviews in 6 weeks",
    aiReply:
      "Here's a general plan: 1) Review data structures & algorithms, 2) Practice system design questions, 3) Do a few mock interviews, 4) Brush up on your past projects. Six weeks should be enough if you stay consistent. Good luck with your prep!",
    aiRating: 2,
    aiRatingNote: "A checklist, not a plan — no tracking or practice log",
    tree: [
      { title: "Week 1-2: Fundamentals", icon: "📚", files: ["Data Structures & Algorithms", "System Design Basics"] },
      { title: "Week 3-4: Mock Interviews", icon: "🎤", files: ["Mock Interview Log", "Common Questions Bank"] },
      { title: "Company Research", icon: "🏢", files: ["Target Companies"] },
      { title: "AI Workflows", icon: "🤖", files: ["Interview Prep Assistant"] },
    ],
  },
  {
    id: "marketer",
    role: "Marketer",
    emoji: "📣",
    goal: "Launch a product marketing campaign end-to-end",
    aiReply:
      "Sure! A typical campaign launch involves defining your audience, crafting your messaging, choosing channels (social, email, ads), setting a budget, and tracking performance metrics like CTR and conversions. Want me to draft some sample ad copy?",
    aiRating: 1.5,
    aiRatingNote: "Textbook overview, no positioning, assets, or timeline",
    tree: [
      { title: "Positioning", icon: "🎯", files: ["Core Message & Beliefs"] },
      { title: "Campaign Assets", icon: "🖼️", files: ["Ad Variants (5x)", "Landing Page Copy"] },
      { title: "Channels & Timeline", icon: "📅", files: ["Launch Calendar"] },
      { title: "AI Workflows", icon: "🤖", files: ["Campaign Launch Workflow"] },
    ],
  },
  {
    id: "founder",
    role: "Founder",
    emoji: "🚀",
    goal: "Take a startup idea from concept to investor-ready pitch",
    aiReply:
      "To go from idea to pitch: validate the problem with real customers, define your unique value proposition, build a simple pitch deck (problem, solution, market, traction, ask), and practice telling your story concisely. Want a slide-by-slide template?",
    aiRating: 2,
    aiRatingNote: "A generic checklist — wouldn't survive real investor Q&A",
    tree: [
      { title: "Problem & Validation", icon: "🔎", files: ["Customer Interviews", "Problem Statement"] },
      { title: "Pitch Deck", icon: "📊", files: ["Slide-by-Slide Draft", "Investor Q&A Prep"] },
      { title: "Go-To-Market", icon: "🗺️", files: ["Launch Plan"] },
      { title: "AI Workflows", icon: "🤖", files: ["Pitch Review Workflow"] },
    ],
  },
  {
    id: "student",
    role: "Student",
    emoji: "🎓",
    goal: "Master a new subject before the final exam",
    aiReply:
      "Here's a general approach: review your notes regularly, use active recall instead of just re-reading, do practice problems, and study in short focused sessions rather than cramming. Would you like me to explain a specific topic from your syllabus?",
    aiRating: 2,
    aiRatingNote: "Generic study advice — no plan, tracking, or practice set",
    tree: [
      { title: "Foundations", icon: "📚", files: ["Core Concepts", "Key Terminology"] },
      { title: "Practice", icon: "✏️", files: ["Practice Questions Set 1", "Weak Areas Tracker"] },
      { title: "Exam Prep", icon: "🎯", files: ["Likely Exam Questions"] },
      { title: "AI Workflows", icon: "🤖", files: ["Study Session Assistant"] },
    ],
  },
]

function StarRating({ value, note }: { value: number; note: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
      <div className="flex items-center gap-0.5 shrink-0">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${
              i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">{note}</span>
    </div>
  )
}

function countFiles(folders: TreeFolder[]): number {
  return folders.reduce((n, f) => n + (f.files?.length || 0) + (f.folders ? countFiles(f.folders) : 0), 0)
}

function FolderTree({ folders, depth = 0 }: { folders: TreeFolder[]; depth?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {folders.map((f, i) => (
        <div key={i} style={{ marginLeft: depth * 14 }}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
            <span>{f.icon}</span> {f.title}
          </p>
          {f.files && f.files.length > 0 && (
            <ul className="mt-1 ml-5 flex flex-col gap-0.5">
              {f.files.map((file, fi) => (
                <li key={fi} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <FileText className="h-2.5 w-2.5 shrink-0" /> {file}
                </li>
              ))}
            </ul>
          )}
          {f.folders && f.folders.length > 0 && (
            <div className="mt-1">
              <FolderTree folders={f.folders} depth={depth + 1} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function HeroSeeTheDifference({ roleId }: { roleId?: string } = {}) {
  // Standalone (homepage) uses its own switcher; controlled (workspace) is
  // driven by an external role picker via `roleId` — no duplicate switcher.
  const [internal, setInternal] = useState(0)
  const controlled = roleId !== undefined
  const idx = controlled
    ? Math.max(0, EXAMPLES.findIndex((e) => e.id === roleId))
    : internal
  const active = idx === -1 ? 0 : idx
  const ex = EXAMPLES[active]
  const fileCount = countFiles(ex.tree)

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Role switcher — only in standalone mode */}
      {!controlled && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 hidden text-xs text-muted-foreground sm:inline">Show me for a</span>
          {EXAMPLES.map((e, i) => (
            <button
              key={e.role}
              onClick={() => setInternal(i)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                i === active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {e.emoji} {e.role}
            </button>
          ))}
        </div>
      )}

      {/* Comparison card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/5">
        <div className="grid md:grid-cols-2">
          {/* ❌ Plain AI tool */}
          <div className="border-b border-border p-5 md:border-b-0 md:border-r md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold text-muted-foreground">A plain AI tool</h3>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`n-${active}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  You type
                </p>
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-foreground/80">{ex.goal}</div>

                <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  You get
                </p>
                <div className="relative">
                  <p className="max-h-28 overflow-hidden rounded-lg bg-muted/30 p-3 text-sm leading-relaxed text-foreground/70">
                    {ex.aiReply}
                  </p>
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-b-lg bg-gradient-to-t from-card to-transparent" />
                </div>
                <StarRating value={ex.aiRating} note={ex.aiRatingNote} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ✅ FindurAI nested workspace */}
          <div className="relative bg-gradient-to-br from-primary/[0.06] to-transparent p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold">FindurAI workspace</h3>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`w-${active}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  You type
                </p>
                <div className="rounded-lg bg-background/60 p-3 text-sm text-foreground/90">{ex.goal}</div>

                <p className="mb-2 mt-5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>You get a real workspace</span>
                  <span className="flex items-center gap-1 normal-case text-foreground/60">
                    <Folder className="h-3 w-3" /> {ex.tree.length} folders · {fileCount} files
                  </span>
                </p>
                <div className="rounded-lg bg-background/60 p-3">
                  <FolderTree folders={ex.tree} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Same-AI reminder + CTA */}
        <div className="flex flex-col items-center gap-3 border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-between">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Bot className="h-4 w-4 shrink-0" /> Same AI model — the difference is a real, organized workspace
            instead of one throwaway reply.
          </p>
          <Link href={`/workspace/new?goal=${encodeURIComponent(ex.goal)}`}>
            <Button className="gap-2 rounded-full">
              Generate this workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
