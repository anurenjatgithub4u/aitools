"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, CornerDownLeft } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { workspaceApi, ITEM_TYPE_META } from "@/lib/workspace"
import type { WorkspaceItemType } from "@/types/workspace"

interface SearchResult {
  id: string
  title: string
  emoji: string
  kind: string
  href: string
}

function kindLabel(kind: string): string {
  if (kind === "project") return "Project"
  if (kind === "collection") return "Resource"
  if (kind === "tool") return "AI Tool"
  return ITEM_TYPE_META[kind as WorkspaceItemType]?.label || kind
}

export function CommandPalette({
  userId,
  open,
  onOpenChange,
}: {
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await workspaceApi.search(userId, query.trim())
        setResults(res)
        setActive(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query, userId])

  const go = (result: SearchResult) => {
    onOpenChange(false)
    router.push(result.href)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg top-[20%] translate-y-0 p-0 gap-0 overflow-hidden"
      >
        <DialogTitle className="sr-only">Search workspace</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, results.length - 1))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault()
                go(results[active])
              }
            }}
            placeholder="Search projects, prompts, workflows, knowledge..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>}
          {!loading && query && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No results for “{query}”.</p>
          )}
          {!query && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Type to search your entire workspace instantly.
            </p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.id}`}
              onClick={() => go(r)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                i === active ? "bg-muted" : ""
              }`}
            >
              <span className="text-base">{r.emoji}</span>
              <span className="flex-1 truncate">{r.title}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {kindLabel(r.kind)}
              </span>
              {i === active && <CornerDownLeft className="h-3 w-3 text-muted-foreground" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
