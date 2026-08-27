"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Star, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { useConfirm } from "@/components/confirm-dialog-context"
import { Button } from "@/components/ui/button"
import { ItemCard } from "@/components/workspace/item-card"
import { workspaceApi, ITEM_TYPE_META } from "@/lib/workspace"
import { onProjectDataChanged, notifyProjectDataChanged } from "@/lib/workspace-events"
import type {
  WorkspaceCollectionDto,
  WorkspaceItemDto,
  WorkspaceItemType,
  WorkspaceProjectDto,
} from "@/types/workspace"

// Flat, folder-grouped listing of everything in the project — the previous
// default landing page, kept as its own view now that the project root is
// the Dashboard (see ../page.tsx).

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

export default function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const confirm = useConfirm()
  const router = useRouter()
  const [project, setProject] = useState<WorkspaceProjectDto | null>(null)
  const [items, setItems] = useState<WorkspaceItemDto[]>([])
  const [folders, setFolders] = useState<WorkspaceCollectionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("")

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

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-muted" />
  }
  if (!project) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>
  }

  const typesPresent = Array.from(new Set(items.map((i) => i.type)))
  const shown = typeFilter ? items.filter((i) => i.type === typeFilter) : items

  const toggleFavorite = async () => {
    if (!user) return
    setProject({ ...project, favorite: !project.favorite })
    await workspaceApi
      .updateProject(project._id, { userId: user.uid, favorite: !project.favorite })
      .catch(() => {})
  }

  const remove = async () => {
    if (!user) return
    if (!(await confirm(`Delete project "${project.name}"? Items inside are kept but unlinked.`))) return
    await workspaceApi.deleteProject(project._id, user.uid)
    router.push("/workspace/projects")
  }

  const handleItemUpdated = (updated: WorkspaceItemDto) => {
    setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)))
    notifyProjectDataChanged()
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <span>{project.emoji}</span> {project.name}
          </h1>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleFavorite} className="gap-1.5">
            <Star
              className={`h-3.5 w-3.5 ${project.favorite ? "fill-yellow-400 text-yellow-400" : ""}`}
            />
            {project.favorite ? "Favorited" : "Favorite"}
          </Button>
          <Button variant="outline" size="sm" onClick={remove} className="gap-1.5 text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {folders.length > 0 ? (
        <div className="flex flex-col gap-6">
          {folders
            .filter((f) => f.kind !== "dashboard")
            .map((folder) => {
              const folderItems = items.filter((i) => i.collectionIds.includes(folder._id))
              const ancestors = ancestorsOf(folder, folders)
              const folderCompleted = folderItems.filter((i) => i.completionStatus === "completed").length
              const folderPct =
                folderItems.length > 0 ? Math.round((folderCompleted / folderItems.length) * 100) : 0
              return (
                <div key={folder._id}>
                  <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {ancestors.length > 0 && (
                      <span className="font-normal text-muted-foreground">
                        {ancestors.map((a) => a.name).join(" / ")} /
                      </span>
                    )}
                    <span>{folder.emoji}</span> {folder.name}
                    <span className="font-normal text-muted-foreground">({folderItems.length})</span>
                  </h2>
                  {folderItems.length > 0 && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${folderPct}%` }}
                        />
                      </div>
                      <span>
                        {folderPct}% · {folderCompleted} of {folderItems.length} Files Completed
                      </span>
                    </div>
                  )}
                  {folderItems.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                      Empty. Use the + button to add items to this folder.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {folderItems.map((item) => (
                        <ItemCard key={item._id} item={item} userId={user?.uid} onUpdated={handleItemUpdated} onDelete={handleItemDeleted} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          {(() => {
            const folderIds = new Set(folders.map((f) => f._id))
            const unfiled = items.filter((i) => !i.collectionIds.some((c) => folderIds.has(c)))
            if (unfiled.length === 0) return null
            return (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-foreground">Unfiled</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {unfiled.map((item) => (
                    <ItemCard key={item._id} item={item} userId={user?.uid} onUpdated={handleItemUpdated} onDelete={handleItemDeleted} />
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      ) : (
        <>
          {typesPresent.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTypeFilter("")}
                className={`rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer ${
                  !typeFilter ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                All ({items.length})
              </button>
              {typesPresent.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(typeFilter === t ? "" : t)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer ${
                    typeFilter === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {ITEM_TYPE_META[t as WorkspaceItemType]?.plural || t} (
                  {items.filter((i) => i.type === t).length})
                </button>
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing in this project yet. Use the + button to add knowledge, prompts or workflows.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((item) => (
                <ItemCard key={item._id} item={item} userId={user?.uid} onUpdated={handleItemUpdated} onDelete={handleItemDeleted} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
