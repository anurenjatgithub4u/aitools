"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Circle, Lock, ArrowRight, Clock } from "lucide-react"
import type { ResolvedPathSection } from "@/lib/topics"

// localStorage progress — anonymous, zero-friction (see DESIGN_KNOWLEDGE_HUB.md §4.4)
const key = (topic: string) => `findurai:progress:${topic}`

export function readProgress(topic: string): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(key(topic)) || "[]"))
  } catch {
    return new Set()
  }
}

function levelColor(level: string): string {
  if (level === "Beginner") return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
  if (level === "Intermediate") return "text-amber-500 border-amber-500/30 bg-amber-500/10"
  if (level === "Advanced") return "text-rose-500 border-rose-500/30 bg-rose-500/10"
  return "text-muted-foreground border-border bg-muted"
}

export function LearningPath({
  topicSlug,
  sections,
}: {
  topicSlug: string
  sections: ResolvedPathSection[]
}) {
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    setDone(readProgress(topicSlug))
  }, [topicSlug])

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section, si) => (
        <div key={section.section}>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {si + 1}
            </span>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide">{section.section}</h3>
              {section.summary && (
                <p className="text-xs text-muted-foreground">{section.summary}</p>
              )}
            </div>
          </div>

          <ol className="ml-3 flex flex-col gap-1 border-l border-border pl-6">
            {section.items.map((item) => {
              const isDone = done.has(item.slug)
              const Wrapper = item.live ? Link : "div"
              const props = item.live ? { href: `/blog/${item.slug}` } : {}
              return (
                <li key={item.slug} className="relative">
                  <span className="absolute -left-[31px] top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-background">
                    {!item.live ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                    ) : isDone ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  {/* @ts-expect-error polymorphic */}
                  <Wrapper
                    {...props}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                      item.live ? "hover:bg-muted cursor-pointer" : "cursor-default opacity-60"
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {String(item.order).padStart(2, "0")}
                        </span>
                        <span
                          className={`truncate text-sm font-medium ${isDone ? "text-muted-foreground" : ""}`}
                        >
                          {item.title}
                        </span>
                        {item.role === "start-here" && (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase text-primary-foreground">
                            Start here
                          </span>
                        )}
                        {!item.live && (
                          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] uppercase text-muted-foreground">
                            Coming soon
                          </span>
                        )}
                      </span>
                    </span>
                    {item.level && (
                      <span
                        className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] sm:inline-block ${levelColor(item.level)}`}
                      >
                        {item.level}
                      </span>
                    )}
                    {item.readingTime && (
                      <span className="hidden shrink-0 items-center gap-1 text-[10px] text-muted-foreground md:flex">
                        <Clock className="h-3 w-3" />
                        {item.readingTime.replace(" read", "")}
                      </span>
                    )}
                    {item.live && (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </Wrapper>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </div>
  )
}

// Compact progress bar for the hero — reads the same localStorage
export function TopicProgressBar({
  topicSlug,
  total,
}: {
  topicSlug: string
  total: number
}) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const live = readProgress(topicSlug)
    setCount(live.size)
  }, [topicSlug])
  if (total === 0) return null
  const pct = Math.round((Math.min(count, total) / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground">
        {count}/{total} done
      </span>
    </div>
  )
}
