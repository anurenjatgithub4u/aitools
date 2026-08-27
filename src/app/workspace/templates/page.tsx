"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { ItemCard } from "@/components/workspace/item-card"
import { workspaceApi, DEFAULT_TEMPLATES, ITEM_TYPE_META } from "@/lib/workspace"
import type { WorkspaceItemDto } from "@/types/workspace"

export default function TemplatesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [userTemplates, setUserTemplates] = useState<WorkspaceItemDto[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setUserTemplates(await workspaceApi.listItems(user.uid, { type: "template" }).catch(() => []))
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const useDefault = async (tpl: (typeof DEFAULT_TEMPLATES)[number]) => {
    if (!user || busyId) return
    setBusyId(tpl.id)
    try {
      const item = await workspaceApi.createItem({
        userId: user.uid,
        title: `New ${tpl.name}`,
        type: tpl.type,
        emoji: tpl.emoji,
        markdownContent: tpl.markdownContent,
      } as any)
      router.push(`/workspace/items/${item._id}`)
    } finally {
      setBusyId(null)
    }
  }

  const useUserTemplate = async (tpl: WorkspaceItemDto) => {
    if (!user || busyId) return
    setBusyId(tpl._id)
    try {
      const item = await workspaceApi.createItem({
        userId: user.uid,
        title: `${tpl.title} (copy)`,
        type: "knowledge",
        emoji: tpl.emoji,
        markdownContent: tpl.markdownContent,
        tags: tpl.tags,
      } as any)
      router.push(`/workspace/items/${item._id}`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">📐 Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start new items from a template. Create your own with Quick Create → New Template.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Default Templates
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEFAULT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => useDefault(tpl)}
              disabled={busyId === tpl.id}
              className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{tpl.emoji}</span>
                <span className="text-sm font-medium">{tpl.name}</span>
                <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                  {ITEM_TYPE_META[tpl.type].label}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{tpl.description}</p>
              <p className="mt-3 text-xs font-medium text-primary">
                {busyId === tpl.id ? "Creating..." : "Use template →"}
              </p>
            </button>
          ))}
        </div>
      </section>

      {userTemplates.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your Templates
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {userTemplates.map((tpl) => (
              <div key={tpl._id} className="flex flex-col gap-2">
                <ItemCard item={tpl} />
                <button
                  onClick={() => useUserTemplate(tpl)}
                  disabled={busyId === tpl._id}
                  className="self-start text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
                >
                  {busyId === tpl._id ? "Creating..." : "Use this template →"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
