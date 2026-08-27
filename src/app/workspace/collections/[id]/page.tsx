"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Star, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { useConfirm } from "@/components/confirm-dialog-context"
import { Button } from "@/components/ui/button"
import { ItemCard } from "@/components/workspace/item-card"
import { workspaceApi } from "@/lib/workspace"
import type { WorkspaceCollectionDto, WorkspaceItemDto } from "@/types/workspace"

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const confirm = useConfirm()
  const router = useRouter()
  const [collection, setCollection] = useState<WorkspaceCollectionDto | null>(null)
  const [items, setItems] = useState<WorkspaceItemDto[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [collections, collectionItems] = await Promise.all([
        workspaceApi.listCollections(user.uid),
        workspaceApi.listItems(user.uid, { collectionId: id }),
      ])
      setCollection(collections.find((c) => c._id === id) || null)
      setItems(collectionItems)
    } finally {
      setLoading(false)
    }
  }, [user, id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />
  if (!collection) return <p className="text-sm text-muted-foreground">Collection not found.</p>

  const toggleFavorite = async () => {
    if (!user) return
    setCollection({ ...collection, favorite: !collection.favorite })
    await workspaceApi
      .updateCollection(collection._id, { userId: user.uid, favorite: !collection.favorite })
      .catch(() => {})
  }

  const remove = async () => {
    if (!user) return
    if (!(await confirm(`Delete collection "${collection.name}"? Items are kept.`))) return
    await workspaceApi.deleteCollection(collection._id, user.uid)
    router.push("/workspace/collections")
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <span>{collection.emoji}</span> {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-1 text-sm text-muted-foreground">{collection.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleFavorite} className="gap-1.5">
            <Star
              className={`h-3.5 w-3.5 ${collection.favorite ? "fill-yellow-400 text-yellow-400" : ""}`}
            />
            {collection.favorite ? "Favorited" : "Favorite"}
          </Button>
          <Button variant="outline" size="sm" onClick={remove} className="gap-1.5 text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            This collection is empty. Open any item and add it to “{collection.name}”.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
