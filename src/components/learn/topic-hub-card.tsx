import Link from "next/link"
import { BookOpen, Zap, MessageSquare, ArrowRight, Layers } from "lucide-react"
import type { Topic } from "@/lib/topics"

// The card that REPLACES the flat cluster of article cards on listing pages.
// One topic = one entry, instead of 9 near-identical article cards.
export function TopicHubCard({ topic }: { topic: Topic }) {
  return (
    <Link
      href={`/topics/${topic.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          <Layers className="h-3 w-3" /> Topic Hub
        </span>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{topic.emoji}</span>
        <div className="min-w-0">
          <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
            {topic.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{topic.tagline}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-indigo-500" /> {topic.guideCount} guides
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-500" /> {topic.workflowCount} workflows
        </span>
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-pink-500" /> {topic.promptPackCount} pack{topic.promptPackCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
        Explore the learning path
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  )
}
