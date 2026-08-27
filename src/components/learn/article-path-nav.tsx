"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, Circle } from "lucide-react"
import type { ArticleTopicContext } from "@/lib/topics"

const key = (topic: string) => `findurai:progress:${topic}`

function useDone(topicSlug: string, articleSlug: string) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    try {
      const set = new Set(JSON.parse(localStorage.getItem(key(topicSlug)) || "[]"))
      setDone(set.has(articleSlug))
    } catch {
      /* ignore */
    }
  }, [topicSlug, articleSlug])

  const toggle = () => {
    try {
      const set = new Set<string>(JSON.parse(localStorage.getItem(key(topicSlug)) || "[]"))
      if (set.has(articleSlug)) set.delete(articleSlug)
      else set.add(articleSlug)
      localStorage.setItem(key(topicSlug), JSON.stringify([...set]))
      setDone(set.has(articleSlug))
    } catch {
      /* ignore */
    }
  }
  return { done, toggle }
}

// Small pill shown above the article title
export function TopicPill({ ctx }: { ctx: ArticleTopicContext }) {
  return (
    <Link
      href={`/topics/${ctx.topicSlug}`}
      className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
    >
      <span>{ctx.topicEmoji}</span>
      {ctx.topicTitle}
      <span className="text-primary/60">· Lesson {ctx.lessonNumber} of {ctx.totalLessons}</span>
    </Link>
  )
}

// Footer: mark-done toggle + prev/next
export function ArticlePathNav({
  ctx,
  articleSlug,
}: {
  ctx: ArticleTopicContext
  articleSlug: string
}) {
  const { done, toggle } = useDone(ctx.topicSlug, articleSlug)

  return (
    <div className="mt-16 border-t border-border pt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/topics/${ctx.topicSlug}`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Back to {ctx.topicEmoji} {ctx.topicTitle} path
        </Link>
        <button
          onClick={toggle}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
            done
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
              : "border-border hover:border-primary/40"
          }`}
        >
          {done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          {done ? "Completed" : "Mark as done"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ctx.prev ? (
          <Link
            href={`/blog/${ctx.prev.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                Previous
              </span>
              <span className="block truncate text-sm font-medium">{ctx.prev.title}</span>
            </span>
          </Link>
        ) : (
          <div />
        )}
        {ctx.next ? (
          <Link
            href={`/blog/${ctx.next.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-right transition-colors hover:border-primary/40 sm:justify-end"
          >
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                Next
              </span>
              <span className="block truncate text-sm font-medium">{ctx.next.title}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
          </Link>
        ) : (
          <Link
            href={`/topics/${ctx.topicSlug}`}
            className="group flex items-center justify-end gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-right transition-colors hover:border-primary/50"
          >
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                Finish
              </span>
              <span className="block truncate text-sm font-medium">Back to the topic hub →</span>
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}
