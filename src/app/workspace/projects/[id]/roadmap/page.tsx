"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { workspaceApi } from "@/lib/workspace"
import { onProjectDataChanged } from "@/lib/workspace-events"
import type { Milestone, WorkspaceCollectionDto, WorkspaceItemDto, WorkspaceProjectDto } from "@/types/workspace"

// Dynamic Roadmap (workspace-execution-redesign-spec.md 6): the plan's
// milestones as a visual sequence, progress computed live from file
// completionStatus, with the next-recommended milestone highlighted.

export default function ProjectRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [project, setProject] = useState<WorkspaceProjectDto | null>(null)
  const [items, setItems] = useState<WorkspaceItemDto[]>([])
  const [folders, setFolders] = useState<WorkspaceCollectionDto[]>([])
  const [loading, setLoading] = useState(true)

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
      setFolders(projectFolders)
    } finally {
      setLoading(false)
    }
  }, [user, id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => onProjectDataChanged(load), [load])

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />
  if (!project) return <p className="text-sm text-muted-foreground">Project not found.</p>

  const milestones: Milestone[] = [...(project.plan?.milestones || [])].sort((a, b) => a.order - b.order)
  const folderById = new Map(folders.map((f) => [f._id, f]))
  const milestoneOfItem = (item: WorkspaceItemDto) => folderById.get(item.collectionIds[0])?.milestoneId || null

  let currentMilestoneId: string | null = null
  for (const m of milestones) {
    if (items.some((i) => milestoneOfItem(i) === m.id && i.completionStatus !== "completed")) {
      currentMilestoneId = m.id
      break
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">🗺️ Roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">{project.name}</p>
      </div>

      {project.plan?.suggestedTimeline && (
        <p className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          {project.plan.suggestedTimeline}
        </p>
      )}

      {milestones.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            This project doesn't have a milestone plan — it was likely created before the roadmap system, or generated directly without reviewing a plan.
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col gap-4">
          {milestones.map((m, idx) => {
            const msFolders = folders.filter((f) => f.milestoneId === m.id && !f.parentId)
            const msItems = items.filter((i) => milestoneOfItem(i) === m.id)
            const done = msItems.filter((i) => i.completionStatus === "completed").length
            const pct = msItems.length > 0 ? Math.round((done / msItems.length) * 100) : 0
            const isCurrent = m.id === currentMilestoneId
            const isDone = msItems.length > 0 && pct === 100

            return (
              <div key={m.id} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isDone
                        ? "bg-emerald-500/15 text-emerald-500"
                        : isCurrent
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  {idx < milestones.length - 1 && <div className="mt-1 h-full w-px flex-1 bg-border" />}
                </div>

                <div
                  className={`mb-2 flex-1 rounded-xl border p-4 ${
                    isCurrent ? "border-primary/40 bg-primary/5" : isDone ? "border-emerald-500/30" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold">{m.title}</h2>
                    {isCurrent && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Up next
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {done}/{msItems.length}
                    </span>
                  </div>
                  {m.description && <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${isDone ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {msFolders.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {msFolders.map((f) => (
                        <Link
                          key={f._id}
                          href={`/workspace/projects/${id}?folder=${f._id}`}
                          className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                          <span>{f.emoji}</span> {f.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
