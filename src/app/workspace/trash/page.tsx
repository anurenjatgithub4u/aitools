"use client"

import { useCallback, useEffect, useState } from "react"
import { RotateCcw, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { useConfirm } from "@/components/confirm-dialog-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { workspaceApi, ITEM_TYPE_META, timeAgo } from "@/lib/workspace"
import type { WorkspaceItemDto } from "@/types/workspace"

export default function TrashPage() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [items, setItems] = useState<WorkspaceItemDto[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    try {
      setItems(await workspaceApi.listItems(user.uid, { archived: true }))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const restore = async (item: WorkspaceItemDto) => {
    if (!user) return
    setItems((prev) => prev.filter((i) => i._id !== item._id))
    await workspaceApi
      .updateItem(item._id, { userId: user.uid, archived: false })
      .catch(() => load())
  }

  const destroy = async (item: WorkspaceItemDto) => {
    if (!user) return
    if (!(await confirm(`Permanently delete "${item.title}"? This cannot be undone.`))) return
    setItems((prev) => prev.filter((i) => i._id !== item._id))
    await workspaceApi.deleteItem(item._id, user.uid).catch(() => load())
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">🗑️ Trash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Items you moved to trash. Restore them or delete them forever.
        </p>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Trash is empty. Nice and tidy.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item._id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="text-lg">{item.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  Trashed {timeAgo(item.updatedAt)}
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {ITEM_TYPE_META[item.type]?.label || item.type}
              </Badge>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => restore(item)}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive"
                onClick={() => destroy(item)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
