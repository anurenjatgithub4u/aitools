"use client"

import { Suspense, use, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Circle,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { useConfirm } from "@/components/confirm-dialog-context"
import { Button } from "@/components/ui/button"
import { ItemCard } from "@/components/workspace/item-card"
import { FolderResources } from "@/components/workspace/folder-resources"
import { MarkdownView } from "@/components/workspace/markdown-view"
import { workspaceApi, taskUnits, parseMinutes, formatMinutes } from "@/lib/workspace"
import { onProjectDataChanged, notifyProjectDataChanged } from "@/lib/workspace-events"
import type {
  Milestone,
  WorkspaceCollectionDto,
  WorkspaceItemDto,
  WorkspaceProjectDto,
} from "@/types/workspace"

const DAY_MS = 86400000
const TRACKED_KINDS = new Set(["execution", "ai", "knowledge"])

function toDayStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

// Counts consecutive days (today or yesterday backward) with at least one
// completed file — a real, derivable "streak" with no fabricated data.
function computeStreak(completedDayStrs: Set<string>): number {
  let streak = 0
  const cursor = new Date()
  if (!completedDayStrs.has(toDayStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (completedDayStrs.has(toDayStr(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function greetingForHour(h: number) {
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

const FOLDER_KIND_ORDER: Record<string, number> = {
  dashboard: 0,
  execution: 1,
  ai: 2,
  knowledge: 3,
  personal: 4,
  archive: 5,
}

function ancestorsOf(folder: WorkspaceCollectionDto, all: WorkspaceCollectionDto[]): WorkspaceCollectionDto[] {
  const byId = new Map(all.map((f) => [f._id, f]))
  const chain: WorkspaceCollectionDto[] = []
  let parentId = folder.parentId
  while (parentId) {
    const parent = byId.get(parentId)
    if (!parent) break
    chain.unshift(parent)
    parentId = parent.parentId
  }
  return chain
}

function ProjectPageInner({ id }: { id: string }) {
  const { user } = useAuth()
  const confirm = useConfirm()
  const searchParams = useSearchParams()
  const folderId = searchParams.get("folder")
  const [project, setProject] = useState<WorkspaceProjectDto | null>(null)
  const [items, setItems] = useState<WorkspaceItemDto[]>([])
  const [folders, setFolders] = useState<WorkspaceCollectionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [readmeOpen, setReadmeOpen] = useState(false)
  const [scopeNote, setScopeNote] = useState<string | null>(null)
  const [backfilling, setBackfilling] = useState(false)
  const backfillCheckedRef = useRef<string | null>(null)

  // One-time "here's why this workspace is focused" note, set right after
  // generation when the goal was broad enough that the AI had to narrow it
  // to the fixed size limits (see /api/workspace/generate).
  useEffect(() => {
    try {
      const key = `findurai:scope-note:${id}`
      const note = sessionStorage.getItem(key)
      if (note) {
        setScopeNote(note)
        sessionStorage.removeItem(key)
      }
    } catch {
      /* ignore */
    }
  }, [id])

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [projects, projectItems, projectFolders] = await Promise.all([
        workspaceApi.listProjects(user.uid),
        workspaceApi.listItems(user.uid, { projectId: id }),
        workspaceApi.listCollections(user.uid, { projectId: id }),
      ])
      setProject(projects.find((p) => p._id === id) || null)
      setItems(projectItems)
      setFolders(
        [...projectFolders].sort(
          (a, b) => (FOLDER_KIND_ORDER[a.kind || ""] ?? 9) - (FOLDER_KIND_ORDER[b.kind || ""] ?? 9) || a.order - b.order
        )
      )
    } finally {
      setLoading(false)
    }
  }, [user, id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => onProjectDataChanged(load), [load])

  const missingChecklistCount = items.filter(
    (i) => i.generationState === "generated" && !(i.typeData?.steps && i.typeData.steps.length > 0)
  ).length

  // Best-effort and can leave gaps behind (a malformed AI response, a rate
  // limit) — callable both automatically on first load and manually, so a
  // partial failure isn't a dead end the user can't retry.
  const runBackfill = useCallback(() => {
    if (!user || backfilling) return
    setBackfilling(true)
    workspaceApi
      .backfillMissions(user.uid, id)
      .then((res) => {
        if (res.updated > 0) {
          notifyProjectDataChanged()
          load()
        }
      })
      .catch(() => {})
      .finally(() => setBackfilling(false))
  }, [user, id, backfilling, load])

  // Self-heals projects generated before checklists were guaranteed for
  // every file (workspace-generation-spec.md) — auto-triggers once per
  // project visit; the banner below stays available to retry manually if
  // that pass doesn't clear every gap (e.g. a rate limit).
  useEffect(() => {
    if (loading || !project || backfillCheckedRef.current === id) return
    backfillCheckedRef.current = id
    if (missingChecklistCount > 0) runBackfill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, project, id])

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-muted" />
  }
  if (!project) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>
  }

  const handleItemUpdated = (updated: WorkspaceItemDto) => {
    setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)))
    notifyProjectDataChanged()
  }

  const handleFolderUpdated = (updated: WorkspaceCollectionDto) => {
    setFolders((prev) => prev.map((f) => (f._id === updated._id ? updated : f)))
  }

  const handleItemDeleted = async (item: WorkspaceItemDto) => {
    if (!user) return
    if (!(await confirm(`Delete "${item.title}"? This can't be undone.`))) return
    setItems((prev) => prev.filter((i) => i._id !== item._id))
    try {
      await workspaceApi.deleteItem(item._id, user.uid)
      notifyProjectDataChanged()
    } catch {
      load()
    }
  }

  const toggleItemComplete = async (item: WorkspaceItemDto) => {
    if (!user || togglingId) return
    setTogglingId(item._id)
    try {
      const next = item.completionStatus === "completed" ? "not_started" : "completed"
      const updated = await workspaceApi.updateItem(item._id, { userId: user.uid, completionStatus: next })
      handleItemUpdated(updated)
    } catch {
      /* ignore */
    } finally {
      setTogglingId(null)
    }
  }

  const regenerateFolder = async (targetFolderId: string) => {
    if (!user || regenerating) return
    setRegenerating(true)
    try {
      const newItems = await workspaceApi.regenerateFolder(user.uid, project._id, targetFolderId, reason.trim())
      setItems((prev) => [...prev.filter((i) => !i.collectionIds.includes(targetFolderId)), ...newItems])
      setReasonOpen(false)
      setReason("")
    } catch {
      /* ignore */
    } finally {
      setRegenerating(false)
    }
  }

  // Single-folder view (navigated from the sidebar tree)
  const activeFolder = folderId ? folders.find((f) => f._id === folderId) : null
  if (folderId && activeFolder) {
    const folderItems = items.filter((i) => i.collectionIds.includes(activeFolder._id))
    const ancestors = ancestorsOf(activeFolder, folders)
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href={`/workspace/projects/${id}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> {project.name}
          </Link>
          {ancestors.map((a) => (
            <span key={a._id} className="flex items-center gap-1">
              <span>/</span>
              <Link href={`/workspace/projects/${id}?folder=${a._id}`} className="hover:text-foreground transition-colors">
                {a.name}
              </Link>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span>{activeFolder.emoji}</span> {activeFolder.name}
          </h1>
          {["execution", "ai", "knowledge"].includes(activeFolder.kind || "") && (
            <div className="flex flex-col items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={regenerating}
                onClick={() => setReasonOpen((o) => !o)}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                {regenerating ? "Regenerating…" : "Regenerate this"}
              </Button>
              {reasonOpen && (
                <div className="flex items-center gap-2">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Optional: what's wrong? (too basic, wrong focus...)"
                    onKeyDown={(e) => e.key === "Enter" && regenerateFolder(activeFolder._id)}
                    className="w-64 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus-visible:border-ring dark:bg-input/30"
                  />
                  <Button size="sm" disabled={regenerating} onClick={() => regenerateFolder(activeFolder._id)}>
                    Go
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        {activeFolder.readme && (
          <div className="rounded-xl border border-border/60 bg-muted/20">
            <button
              onClick={() => setReadmeOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              About this folder
              <ChevronDown className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${readmeOpen ? "rotate-180" : ""}`} />
            </button>
            {readmeOpen && (
              <div className="border-t border-border/60 px-4 py-3 text-sm">
                <MarkdownView content={activeFolder.readme} />
              </div>
            )}
          </div>
        )}
        {user && (
          <FolderResources folder={activeFolder} userId={user.uid} onUpdated={handleFolderUpdated} />
        )}
        {folderItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Empty. Use the + button to add items to this folder.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {folderItems.map((item) => (
              <ItemCard
                key={item._id}
                item={item}
                userId={user?.uid}
                onUpdated={handleItemUpdated}
                onDelete={handleItemDeleted}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Dashboard — the project's "wow" home page (workspace-execution-redesign
  // follow-up): daily focus, streak, and at-a-glance progress, all derived
  // from real completionStatus/completedAt data — no fabricated metrics.
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
  const todaysFocus = orderedRemaining.slice(0, 3)

  const nextRecommendedTask = (() => {
    for (const item of orderedRemaining) {
      const steps = item.typeData?.steps
      if (Array.isArray(steps) && steps.length > 0) {
        const next = steps.find((s) => !s.done)
        if (next) return { itemId: item._id, itemTitle: item.title, text: next.text }
      } else {
        return { itemId: item._id, itemTitle: item.title, text: item.title }
      }
    }
    return null
  })()

  const todaysWorkflow =
    trackedItems.find((i) => i.type === "workflow" && i.completionStatus !== "completed") ||
    trackedItems.find((i) => i.type === "workflow") ||
    null

  const completedDayStrs = new Set(
    completed.filter((i) => i.completedAt).map((i) => toDayStr(new Date(i.completedAt!)))
  )
  const streak = computeStreak(completedDayStrs)

  const completedWithDates = completed.filter((i) => i.completedAt)
  const daysSinceCreated = Math.max(1, Math.ceil((Date.now() - new Date(project.createdAt).getTime()) / DAY_MS))
  const velocity = completedWithDates.length / daysSinceCreated
  const daysNeeded = velocity > 0 && remaining.length > 0 ? Math.ceil(remaining.length / velocity) : null
  const estimatedDate = daysNeeded !== null ? new Date(Date.now() + daysNeeded * DAY_MS) : null

  const weekAgo = Date.now() - 7 * DAY_MS
  const filesThisWeek = completedWithDates.filter((i) => new Date(i.completedAt!).getTime() >= weekAgo).length

  const firstName = user?.displayName?.split(" ")[0] || "there"
  const greeting = greetingForHour(new Date().getHours())

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">
          {greeting}, {firstName} 👋
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>{project.emoji}</span> {project.name}
        </p>
      </div>

      {scopeNote && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="flex-1 text-sm text-foreground/90">{scopeNote}</p>
          <button
            onClick={() => setScopeNote(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {backfilling ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          Filling in missing checklists for {missingChecklistCount} file{missingChecklistCount === 1 ? "" : "s"} — they
          will appear as soon as ready.
        </div>
      ) : (
        missingChecklistCount > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-sm">
            <span className="text-foreground/90">
              {missingChecklistCount} file{missingChecklistCount === 1 ? "" : "s"} still missing a checklist.
            </span>
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={runBackfill}>
              <Sparkles className="h-3.5 w-3.5" /> Fix Now
            </Button>
          </div>
        )
      )}

      {nextRecommendedTask && (
        <Link
          href={`/workspace/items/${nextRecommendedTask.itemId}`}
          className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:border-primary/40"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Target className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Next Recommended Task
            </p>
            <p className="truncate text-sm font-medium">{nextRecommendedTask.text}</p>
            <p className="truncate text-xs text-muted-foreground">in {nextRecommendedTask.itemTitle}</p>
          </div>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's Focus */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-semibold">Today's Focus</p>
          {todaysFocus.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {trackedItems.length === 0 ? "Nothing to work on yet." : "You're all caught up! 🎉"}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {todaysFocus.map((item) => (
                <button
                  key={item._id}
                  onClick={() => toggleItemComplete(item)}
                  disabled={togglingId === item._id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
                >
                  {togglingId === item._id ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{item.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Today's AI Workflow */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-semibold">Today's AI Workflow</p>
          {todaysWorkflow ? (
            <Link
              href={`/workspace/items/${todaysWorkflow._id}`}
              className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 transition-colors hover:border-primary/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Zap className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{todaysWorkflow.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {todaysWorkflow.description || "Run this workflow"}
                </p>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">No workflows in this project yet.</p>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Daily Streak</p>
          <p className="mt-1 text-lg font-bold">
            {streak > 0 ? `🔥 ${streak} Day${streak === 1 ? "" : "s"}` : "Start today"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{completionPct}%</span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Current Phase</p>
          <p className="mt-1 truncate text-sm font-semibold">{currentMilestone?.title || "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Files Completed</p>
          <p className="mt-1 text-lg font-bold">
            {completed.length}/{trackedItems.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Tasks Completed</p>
          <p className="mt-1 text-lg font-bold">
            {taskTotals.done}/{taskTotals.total}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Estimated Time Remaining</p>
          <p className="mt-1 text-sm font-semibold">
            {estimatedMinutesRemaining > 0 ? formatMinutes(estimatedMinutesRemaining) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Estimated Completion</p>
          <p className="mt-1 text-sm font-semibold">
            {estimatedDate
              ? estimatedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : "Complete a few files to see an estimate"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Files Completed This Week</p>
          <p className="mt-1 text-lg font-bold">{filesThisWeek}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/workspace/projects/${id}/overview`}>
          <Button variant="outline" size="sm">
            Browse all files
          </Button>
        </Link>
        <Link href={`/workspace/projects/${id}/roadmap`}>
          <Button variant="outline" size="sm">
            View Roadmap
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
      <ProjectPageInner id={id} />
    </Suspense>
  )
}
