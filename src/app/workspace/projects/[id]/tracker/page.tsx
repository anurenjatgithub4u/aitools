"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth-context"
import { workspaceApi, taskUnits, parseMinutes, formatMinutes } from "@/lib/workspace"
import { onProjectDataChanged } from "@/lib/workspace-events"
import type { Milestone, WorkspaceCollectionDto, WorkspaceItemDto, WorkspaceProjectDto } from "@/types/workspace"

// Persistent Project Tracker (workspace-execution-redesign-spec.md 5): the
// pinned, always-current view of where the project actually stands — driven
// entirely by file completionStatus, updated automatically as files complete.

const TRACKED_KINDS = new Set(["execution", "ai", "knowledge"])
const DAY_MS = 86400000

export default function ProjectTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [project, setProject] = useState<WorkspaceProjectDto | null>(null)
  const [items, setItems] = useState<WorkspaceItemDto[]>([])
  const [folders, setFolders] = useState<WorkspaceCollectionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [deadlineInput, setDeadlineInput] = useState("")
  const [savingDeadline, setSavingDeadline] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [projects, projectItems, projectFolders] = await Promise.all([
        workspaceApi.listProjects(user.uid),
        workspaceApi.listItems(user.uid, { projectId: id }),
        workspaceApi.listCollections(user.uid, { projectId: id }),
      ])
      const p = projects.find((x) => x._id === id) || null
      setProject(p)
      setItems(projectItems)
      setFolders(projectFolders)
      setDeadlineInput(p?.plan?.deadline ? p.plan.deadline.slice(0, 10) : "")
    } finally {
      setLoading(false)
    }
  }, [user, id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => onProjectDataChanged(load), [load])

  const saveDeadline = async (value: string) => {
    if (!user || value === (project?.plan?.deadline ? project.plan.deadline.slice(0, 10) : "")) return
    setSavingDeadline(true)
    try {
      const updated = await workspaceApi.setProjectDeadline(id, user.uid, value || null)
      setProject(updated)
    } finally {
      setSavingDeadline(false)
    }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />
  if (!project) return <p className="text-sm text-muted-foreground">Project not found.</p>

  const folderById = new Map(folders.map((f) => [f._id, f]))
  const trackedItems = items.filter((i) =>
    i.collectionIds.some((cid) => TRACKED_KINDS.has(folderById.get(cid)?.kind || ""))
  )
  const completed = trackedItems.filter((i) => i.completionStatus === "completed")
  const remaining = trackedItems.filter((i) => i.completionStatus !== "completed")

  const taskTotals = trackedItems.reduce(
    (acc, i) => {
      const u = taskUnits(i)
      acc.done += u.done
      acc.total += u.total
      return acc
    },
    { done: 0, total: 0 }
  )
  const completionPct = taskTotals.total > 0 ? Math.round((taskTotals.done / taskTotals.total) * 100) : 0

  const estimatedMinutesRemaining = trackedItems.reduce((sum, i) => {
    const totalMin = parseMinutes(i.typeData?.estimatedTime)
    if (totalMin <= 0) return sum
    const steps = i.typeData?.steps
    if (Array.isArray(steps) && steps.length > 0) {
      const remainingFrac = steps.filter((s) => !s.done).length / steps.length
      return sum + totalMin * remainingFrac
    }
    return sum + (i.completionStatus === "completed" ? 0 : totalMin)
  }, 0)

  const milestones: Milestone[] = [...(project.plan?.milestones || [])].sort((a, b) => a.order - b.order)
  const milestoneOfItem = (item: WorkspaceItemDto) => folderById.get(item.collectionIds[0])?.milestoneId || null

  let currentMilestone: Milestone | null = null
  for (const m of milestones) {
    if (trackedItems.some((i) => milestoneOfItem(i) === m.id && i.completionStatus !== "completed")) {
      currentMilestone = m
      break
    }
  }

  const orderedRemaining = [...remaining].sort((a, b) => {
    const fa = folderById.get(a.collectionIds[0])
    const fb = folderById.get(b.collectionIds[0])
    const aFirst = currentMilestone && fa?.milestoneId === currentMilestone.id ? 0 : 1
    const bFirst = currentMilestone && fb?.milestoneId === currentMilestone.id ? 0 : 1
    if (aFirst !== bFirst) return aFirst - bFirst
    return (fa?.order ?? 0) - (fb?.order ?? 0)
  })
  const nextRecommended = orderedRemaining[0] || null
  const nextRecommendedSteps = nextRecommended?.typeData?.steps
  const nextRecommendedTaskText = Array.isArray(nextRecommendedSteps)
    ? nextRecommendedSteps.find((s) => !s.done)?.text
    : null

  const completedWithDates = completed.filter((i) => i.completedAt)
  const daysSinceCreated = Math.max(1, Math.ceil((Date.now() - new Date(project.createdAt).getTime()) / DAY_MS))
  const velocity = completedWithDates.length / daysSinceCreated
  const daysNeeded = velocity > 0 && remaining.length > 0 ? Math.ceil(remaining.length / velocity) : null
  const estimatedDate = daysNeeded !== null ? new Date(Date.now() + daysNeeded * DAY_MS) : null

  const deadline = project.plan?.deadline ? new Date(project.plan.deadline) : null
  const daysRemaining = deadline ? Math.ceil((deadline.getTime() - Date.now()) / DAY_MS) : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">🎯 Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">{project.name}</p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium">Overall completion</span>
          <span className="text-muted-foreground">{completionPct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Completed files" value={completed.length} />
        <StatCard label="Remaining files" value={remaining.length} />
        <StatCard label="Tasks completed" value={`${taskTotals.done}/${taskTotals.total}`} />
        <StatCard label="Current milestone" value={currentMilestone?.title || "—"} />
        <StatCard
          label="Time remaining"
          value={estimatedMinutesRemaining > 0 ? formatMinutes(estimatedMinutesRemaining) : "—"}
        />
        <StatCard label="Days remaining" value={daysRemaining !== null ? `${daysRemaining}d` : "No deadline set"} />
      </div>

      {nextRecommended && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Next recommended task</p>
          <Link
            href={`/workspace/items/${nextRecommended._id}`}
            className="mt-1 flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <span>{nextRecommended.emoji}</span> {nextRecommendedTaskText || nextRecommended.title}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {nextRecommendedTaskText ? `in ${nextRecommended.title}` : nextRecommended.description}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Estimated completion</p>
          <p className="mt-1 text-sm font-semibold">
            {estimatedDate
              ? estimatedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
              : "Complete a few files to see an estimate"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Deadline (optional)</p>
          <input
            type="date"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
            onBlur={(e) => saveDeadline(e.target.value)}
            disabled={savingDeadline}
            className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none dark:bg-input/30"
          />
        </div>
      </div>

      {milestones.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Milestones</h2>
            <Link href={`/workspace/projects/${id}/roadmap`} className="text-xs text-primary hover:underline">
              View Roadmap →
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            {milestones.map((m) => {
              const msItems = trackedItems.filter((i) => milestoneOfItem(i) === m.id)
              const msDone = msItems.filter((i) => i.completionStatus === "completed").length
              const isCurrent = currentMilestone?.id === m.id
              return (
                <div
                  key={m.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    isCurrent ? "border-primary/40 bg-primary/5" : "border-border/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      {m.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {msDone}/{msItems.length}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}
