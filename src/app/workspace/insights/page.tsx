"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Bot,
  Brain,
  Clock,
  FolderKanban,
  MessageSquare,
  Paperclip,
  TrendingUp,
  Zap,
} from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { GraphView } from "@/components/workspace/graph-view"
import { workspaceApi } from "@/lib/workspace"
import type { GraphData, StackToolDto, WorkspaceInsights } from "@/types/workspace"

function Stat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-bold">{value}</p>
    </div>
  )
}

export default function InsightsPage() {
  const { user } = useAuth()
  const [insights, setInsights] = useState<WorkspaceInsights | null>(null)
  const [stack, setStack] = useState<StackToolDto[]>([])
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      workspaceApi.getInsights(user.uid),
      workspaceApi.listStack(user.uid),
      workspaceApi.getGraph(user.uid),
    ])
      .then(([ins, s, g]) => {
        setInsights(ins)
        setStack(s)
        setGraph(g)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  if (!insights) return <p className="text-sm text-muted-foreground">Could not load insights.</p>

  const mostUsedTool = stack[0]
  const weekly: string[] = []
  weekly.push(
    insights.hoursSaved > 0
      ? `Your reusable assets are worth roughly ${insights.hoursSaved} hours of saved work.`
      : "Start saving prompts and playbooks to build up reusable hours."
  )
  if (insights.weeklyCreated > 0)
    weekly.push(`You created ${insights.weeklyCreated} new items this week.`)
  if (insights.weeklySolved > 0)
    weekly.push(`You marked ${insights.weeklySolved} problems as solved this week. 🎉`)
  if (mostUsedTool && mostUsedTool.usageCount > 0)
    weekly.push(`${mostUsedTool.emoji} ${mostUsedTool.name} is your most used AI tool.`)
  if (insights.topTags[0])
    weekly.push(
      `Your deepest topic is #${insights.topTags[0].tag} with ${insights.topTags[0].count} items.`
    )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">📊 Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What your AI work adds up to.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Hours Saved" value={insights.hoursSaved} icon={Clock} color="text-emerald-500" />
        <Stat label="Playbooks" value={insights.counts.playbooks} icon={BookOpen} color="text-indigo-500" />
        <Stat label="Prompts" value={insights.counts.prompts} icon={MessageSquare} color="text-pink-500" />
        <Stat label="Workflows" value={insights.counts.workflows} icon={Zap} color="text-amber-500" />
        <Stat label="AI Memory" value={insights.counts.memory} icon={Brain} color="text-purple-500" />
        <Stat label="Projects" value={insights.counts.projects} icon={FolderKanban} color="text-blue-500" />
        <Stat label="Resources" value={insights.counts.resources} icon={Paperclip} color="text-cyan-500" />
        <Stat label="Stack Tools" value={stack.length} icon={Bot} color="text-emerald-500" />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          This Week
        </h2>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
          {weekly.map((line, i) => (
            <p key={i} className="flex items-start gap-2 text-sm">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {line}
            </p>
          ))}
        </div>
      </section>

      {insights.topTags.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Learning Progress
          </h2>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            {insights.topTags.map((t) => {
              const pct = Math.min(100, t.count * 10)
              return (
                <div key={t.tag}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">#{t.tag}</span>
                    <span className="text-xs text-muted-foreground">{t.count} items</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {graph && graph.nodes.length >= 6 ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Connections
            </h2>
            <Link href="/workspace/graph" className="text-xs text-primary hover:underline">
              Open full view
            </Link>
          </div>
          <GraphView data={graph} height={320} interactive={false} />
        </section>
      ) : (
        <p className="text-xs text-muted-foreground">
          Your Connections map unlocks once you have a few linked items.
        </p>
      )}
    </div>
  )
}
