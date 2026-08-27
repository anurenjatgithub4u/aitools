"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Clipboard, ClipboardCheck, Loader2, Sparkles, Star, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useConfirm } from "@/components/confirm-dialog-context"
import { ITEM_TYPE_META, timeAgo, workspaceApi } from "@/lib/workspace"
import type { WorkspaceItemDto } from "@/types/workspace"

const AI_TARGETS = [
  { key: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
  { key: "claude", label: "Claude", url: "https://claude.ai/new" },
] as const

const STATUS_META: Record<string, { label: string; tint: string }> = {
  not_started: { label: "Not started", tint: "text-muted-foreground" },
  in_progress: { label: "In progress", tint: "text-amber-500" },
  completed: { label: "Completed", tint: "text-emerald-500" },
}

export function ItemCard({
  item,
  onToggleFavorite,
  onDelete,
  userId,
  onUpdated,
}: {
  item: WorkspaceItemDto
  onToggleFavorite?: (item: WorkspaceItemDto) => void
  onDelete?: (item: WorkspaceItemDto) => void
  userId?: string
  onUpdated?: (item: WorkspaceItemDto) => void
}) {
  const meta = ITEM_TYPE_META[item.type]
  const isStub = item.generationState === "stub"
  const status = item.completionStatus || "not_started"
  const [generating, setGenerating] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const promptText = item.type === "prompt" ? item.typeData?.promptText : undefined
  const confirm = useConfirm()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!onDelete) return
    if (!(await confirm(`Delete "${item.title}"? This can't be undone.`))) return
    onDelete(item)
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!promptText) return
    try {
      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const handleUseIn = (e: React.MouseEvent, url: string) => {
    e.preventDefault()
    if (!promptText) return
    navigator.clipboard.writeText(promptText).catch(() => {})
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleGenerate = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!userId || generating) return
    setGenerating(true)
    try {
      const updated = await workspaceApi.generateItem(userId, item._id)
      onUpdated?.(updated)
    } catch {
      /* ignore */
    } finally {
      setGenerating(false)
    }
  }

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!userId || completing) return
    setCompleting(true)
    try {
      const next = status === "completed" ? "not_started" : "completed"
      const updated = await workspaceApi.updateItem(item._id, { userId, completionStatus: next })
      onUpdated?.(updated)
    } catch {
      /* ignore */
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div
      className={`group relative rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 ${
        status === "completed" ? "border-emerald-500/30" : "border-border"
      }`}
    >
      <Link href={`/workspace/items/${item._id}`} className="absolute inset-0" aria-label={item.title} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{item.emoji || meta?.emoji}</span>
          <h3
            className={`font-medium text-sm truncate ${
              status === "completed" ? "text-muted-foreground line-through" : ""
            }`}
          >
            {item.title}
          </h3>
        </div>
        <div className="relative z-10 flex items-center gap-1 shrink-0">
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onToggleFavorite(item)
              }}
              className="text-muted-foreground hover:text-yellow-500 transition-colors cursor-pointer p-1"
              aria-label={item.favorite ? "Unfavorite" : "Favorite"}
            >
              <Star className={`h-4 w-4 ${item.favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="text-muted-foreground opacity-0 transition-colors hover:text-destructive group-hover:opacity-100 cursor-pointer p-1"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {item.description && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
      )}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <Badge variant="secondary" className="text-[10px]">
          {meta?.label || item.type}
        </Badge>
        {item.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px]">
            #{tag}
          </Badge>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(item.updatedAt)}</span>
      </div>
      {promptText && (
        <div className="relative z-10 mt-3 flex items-center gap-1.5 border-t border-border/60 pt-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            {copied ? <ClipboardCheck className="h-3 w-3 text-emerald-500" /> : <Clipboard className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          {AI_TARGETS.map((t) => (
            <button
              key={t.key}
              onClick={(e) => handleUseIn(e, t.url)}
              className="rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              Use in {t.label}
            </button>
          ))}
        </div>
      )}
      {isStub ? (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Not generated yet
          </Badge>
          <button
            onClick={handleGenerate}
            disabled={generating || !userId}
            className="relative z-10 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {generating ? "Generating…" : "Generate this"}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <span className={`text-[10px] font-medium ${STATUS_META[status].tint}`}>{STATUS_META[status].label}</span>
          <button
            onClick={handleToggleComplete}
            disabled={completing || !userId}
            className={`relative z-10 flex items-center gap-1 text-[11px] font-medium hover:underline cursor-pointer disabled:opacity-50 ${
              status === "completed" ? "text-muted-foreground" : "text-primary"
            }`}
          >
            {completing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            {status === "completed" ? "Mark incomplete" : "Complete"}
          </button>
        </div>
      )}
    </div>
  )
}
