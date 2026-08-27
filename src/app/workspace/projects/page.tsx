"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Sparkles, Star, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { useConfirm } from "@/components/confirm-dialog-context"
import { Button } from "@/components/ui/button"
import { CircularProgress } from "@/components/ui/circular-progress"
import { QuickCreateDialog } from "@/components/workspace/quick-create"
import { workspaceApi, timeAgo, taskUnits } from "@/lib/workspace"
import type { WorkspaceCollectionDto, WorkspaceItemDto, WorkspaceProjectDto } from "@/types/workspace"

const TRACKED_KINDS = new Set(["execution", "ai", "knowledge"])

export default function ProjectsPage() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [projects, setProjects] = useState<WorkspaceProjectDto[]>([])
  const [items, setItems] = useState<WorkspaceItemDto[]>([])
  const [folders, setFolders] = useState<WorkspaceCollectionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [projectList, itemList, folderList] = await Promise.all([
        workspaceApi.listProjects(user.uid),
        workspaceApi.listItems(user.uid, { limit: "500" }),
        workspaceApi.listCollections(user.uid),
      ])
      setProjects(projectList)
      setItems(itemList)
      setFolders(folderList)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const folderById = new Map(folders.map((f) => [f._id, f]))
  const progressForProject = (projectId: string) => {
    const tracked = items.filter(
      (i) =>
        i.projectId === projectId &&
        i.collectionIds.some((cid) => TRACKED_KINDS.has(folderById.get(cid)?.kind || ""))
    )
    const totals = tracked.reduce(
      (acc, i) => {
        const u = taskUnits(i)
        acc.done += u.done
        acc.total += u.total
        return acc
      },
      { done: 0, total: 0 }
    )
    return totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0
  }

  const toggleFavorite = async (p: WorkspaceProjectDto) => {
    if (!user) return
    setProjects((prev) =>
      prev.map((x) => (x._id === p._id ? { ...x, favorite: !x.favorite } : x))
    )
    try {
      await workspaceApi.updateProject(p._id, { userId: user.uid, favorite: !p.favorite })
    } catch {
      load()
    }
  }

  const deleteProject = async (p: WorkspaceProjectDto) => {
    if (!user) return
    if (!(await confirm(`Delete "${p.name}"? Its files are kept but unfiled from this project.`))) return
    setProjects((prev) => prev.filter((x) => x._id !== p._id))
    try {
      await workspaceApi.deleteProject(p._id, user.uid)
    } catch {
      load()
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">📁 Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects are your top-level containers. Everything belongs to a project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/workspace/new">
            <Button variant="outline" className="rounded-full gap-2">
              <Sparkles className="h-4 w-4" /> Generate with AI
            </Button>
          </Link>
          <Button onClick={() => setCreateOpen(true)} className="rounded-full gap-2">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <span className="text-3xl">📁</span>
          <p className="text-sm text-muted-foreground">No projects yet.</p>
          <div className="flex items-center gap-2">
            <Link href="/workspace/new">
              <Button size="sm" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Generate with AI
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              Create manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p._id}
              className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
            >
              <Link
                href={`/workspace/projects/${p._id}`}
                className="absolute inset-0"
                aria-label={p.name}
              />
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{p.emoji}</span>
                  <h3 className="truncate text-sm font-medium">{p.name}</h3>
                </div>
                <div className="relative z-10 flex items-center gap-1">
                  <button
                    onClick={() => toggleFavorite(p)}
                    className="text-muted-foreground hover:text-yellow-500 transition-colors cursor-pointer p-1"
                    aria-label="Favorite project"
                  >
                    <Star
                      className={`h-4 w-4 ${p.favorite ? "fill-yellow-400 text-yellow-400" : ""}`}
                    />
                  </button>
                  <button
                    onClick={() => deleteProject(p)}
                    className="text-muted-foreground opacity-0 transition-colors hover:text-destructive group-hover:opacity-100 cursor-pointer p-1"
                    aria-label="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {p.description && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground">Updated {timeAgo(p.updatedAt)}</p>
                <CircularProgress pct={progressForProject(p._id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {user && (
        <QuickCreateDialog
          userId={user.uid}
          open={createOpen}
          onOpenChange={(o) => {
            setCreateOpen(o)
            if (!o) load()
          }}
          initialKind="project"
        />
      )}
    </div>
  )
}
