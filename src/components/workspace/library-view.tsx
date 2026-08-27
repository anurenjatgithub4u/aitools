"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Star, Plus } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ItemCard } from "@/components/workspace/item-card"
import { QuickCreateDialog } from "@/components/workspace/quick-create"
import { workspaceApi, ITEM_TYPE_META } from "@/lib/workspace"
import type { WorkspaceItemDto, WorkspaceItemType, WorkspaceProjectDto } from "@/types/workspace"

export function LibraryView({
  type,
  title,
  description,
  headerExtra,
  emptyExtra,
}: {
  type: WorkspaceItemType
  title: string
  description: string
  headerExtra?: React.ReactNode
  emptyExtra?: React.ReactNode
}) {
  const { user } = useAuth()
  const [items, setItems] = useState<WorkspaceItemDto[]>([])
  const [projects, setProjects] = useState<WorkspaceProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [res, p] = await Promise.all([
        workspaceApi.listItems(user.uid, {
          type,
          q: q || undefined,
          favorite: favoritesOnly || undefined,
        }),
        workspaceApi.listProjects(user.uid),
      ])
      setItems(res)
      setProjects(p)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user, type, q, favoritesOnly])

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  const toggleFavorite = async (item: WorkspaceItemDto) => {
    if (!user) return
    setItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, favorite: !i.favorite } : i))
    )
    try {
      await workspaceApi.updateItem(item._id, { userId: user.uid, favorite: !item.favorite })
    } catch {
      load()
    }
  }

  const handleItemUpdated = (updated: WorkspaceItemDto) => {
    setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)))
  }

  const deleteItem = async (item: WorkspaceItemDto) => {
    if (!user) return
    setItems((prev) => prev.filter((i) => i._id !== item._id))
    try {
      await workspaceApi.deleteItem(item._id, user.uid)
    } catch {
      load()
    }
  }

  const meta = ITEM_TYPE_META[type]

  // Group by project so it's obvious which items are standalone vs. scoped
  // to a specific project's workspace.
  const projectById = new Map(projects.map((p) => [p._id, p]))
  const standalone = items.filter((i) => !i.projectId || !projectById.has(i.projectId))
  const byProject = new Map<string, WorkspaceItemDto[]>()
  for (const item of items) {
    if (item.projectId && projectById.has(item.projectId)) {
      if (!byProject.has(item.projectId)) byProject.set(item.projectId, [])
      byProject.get(item.projectId)!.push(item)
    }
  }
  const projectGroups = Array.from(byProject.entries()).map(([pid, its]) => ({
    project: projectById.get(pid)!,
    items: its,
  }))
  const showGrouped = items.length > 0 && (standalone.length > 0 ? 1 : 0) + projectGroups.length > 1

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>{meta.emoji}</span> {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          <Button onClick={() => setCreateOpen(true)} className="rounded-full gap-2">
            <Plus className="h-4 w-4" /> New {meta.label}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${meta.plural.toLowerCase()}...`}
          className="max-w-xs"
        />
        <Button
          variant={favoritesOnly ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setFavoritesOnly((f) => !f)}
        >
          <Star className={`h-3.5 w-3.5 ${favoritesOnly ? "fill-current" : ""}`} />
          Favorites
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <span className="text-3xl">{meta.emoji}</span>
          <p className="text-sm text-muted-foreground">
            {q ? `No ${meta.plural.toLowerCase()} match “${q}”.` : `No ${meta.plural.toLowerCase()} yet.`}
          </p>
          {!q && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                Create your first {meta.label.toLowerCase()}
              </Button>
              {emptyExtra}
            </div>
          )}
        </div>
      ) : showGrouped ? (
        <div className="flex flex-col gap-6">
          {projectGroups.map(({ project, items: groupItems }) => (
            <div key={project._id}>
              <Link
                href={`/workspace/projects/${project._id}`}
                className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary"
              >
                <span>{project.emoji}</span> {project.name}
                <span className="font-normal text-muted-foreground">({groupItems.length})</span>
              </Link>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groupItems.map((item) => (
                  <ItemCard key={item._id} item={item} onToggleFavorite={toggleFavorite} onDelete={deleteItem} userId={user?.uid} onUpdated={handleItemUpdated} />
                ))}
              </div>
            </div>
          ))}
          {standalone.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                Standalone {meta.plural}
                <span className="font-normal text-muted-foreground"> ({standalone.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {standalone.map((item) => (
                  <ItemCard key={item._id} item={item} onToggleFavorite={toggleFavorite} onDelete={deleteItem} userId={user?.uid} onUpdated={handleItemUpdated} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item._id} item={item} onToggleFavorite={toggleFavorite} onDelete={deleteItem} userId={user?.uid} onUpdated={handleItemUpdated} />
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
          initialKind={
            type === "playbook" ||
            type === "knowledge" ||
            type === "prompt" ||
            type === "workflow" ||
            type === "template"
              ? type
              : undefined
          }
        />
      )}
    </div>
  )
}
