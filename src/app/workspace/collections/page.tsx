"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Star } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QuickCreateDialog } from "@/components/workspace/quick-create"
import { workspaceApi } from "@/lib/workspace"
import type { WorkspaceCollectionDto } from "@/types/workspace"

export default function CollectionsPage() {
  const { user } = useAuth()
  const [collections, setCollections] = useState<WorkspaceCollectionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      setCollections(await workspaceApi.listCollections(user.uid))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const toggleFavorite = async (c: WorkspaceCollectionDto) => {
    if (!user) return
    setCollections((prev) =>
      prev.map((x) => (x._id === c._id ? { ...x, favorite: !x.favorite } : x))
    )
    await workspaceApi
      .updateCollection(c._id, { userId: user.uid, favorite: !c.favorite })
      .catch(() => load())
  }

  const shown = q
    ? collections.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.description.toLowerCase().includes(q.toLowerCase())
      )
    : collections

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">📎 Resources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resources work like playlists — one item can live in many of them.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="rounded-full gap-2">
          <Plus className="h-4 w-4" /> New Resource
        </Button>
      </div>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search resources..."
        className="max-w-xs"
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <span className="text-3xl">📎</span>
          <p className="text-sm text-muted-foreground">
            {q ? `No resources match “${q}”.` : "No resources yet."}
          </p>
          {!q && (
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              Create your first resource
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <div
              key={c._id}
              className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              style={{ borderLeftColor: c.color, borderLeftWidth: 3 }}
            >
              <Link
                href={`/workspace/collections/${c._id}`}
                className="absolute inset-0"
                aria-label={c.name}
              />
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{c.emoji}</span>
                  <h3 className="truncate text-sm font-medium">{c.name}</h3>
                </div>
                <button
                  onClick={() => toggleFavorite(c)}
                  className="relative z-10 text-muted-foreground hover:text-yellow-500 transition-colors cursor-pointer"
                  aria-label="Favorite collection"
                >
                  <Star
                    className={`h-4 w-4 ${c.favorite ? "fill-yellow-400 text-yellow-400" : ""}`}
                  />
                </button>
              </div>
              {c.description && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{c.description}</p>
              )}
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
          initialKind="collection"
        />
      )}
    </div>
  )
}
