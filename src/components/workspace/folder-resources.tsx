"use client"

import { useState } from "react"
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Paperclip,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { workspaceApi } from "@/lib/workspace"
import type { FolderResource, FolderResourceType, WorkspaceCollectionDto } from "@/types/workspace"

function newResourceId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `res_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

const TYPE_META: Record<FolderResourceType, { label: string; icon: typeof StickyNote }> = {
  note: { label: "Note", icon: StickyNote },
  pdf: { label: "PDF", icon: FileText },
  url: { label: "Link", icon: LinkIcon },
}

// Manual, user-curated notes/PDFs/links per folder — no auto-extraction, no
// completion tracking. Users add and remove these entirely by hand.
export function FolderResources({
  folder,
  userId,
  onUpdated,
}: {
  folder: WorkspaceCollectionDto
  userId: string
  onUpdated: (updated: WorkspaceCollectionDto) => void
}) {
  const resources = folder.resources || []
  const [open, setOpen] = useState(resources.length > 0)
  const [adding, setAdding] = useState(false)
  const [type, setType] = useState<FolderResourceType>("note")
  const [title, setTitle] = useState("")
  const [value, setValue] = useState("")
  const [saving, setSaving] = useState(false)

  const persist = async (next: FolderResource[]) => {
    const updated = await workspaceApi.updateCollection(folder._id, { userId, resources: next })
    onUpdated(updated)
  }

  const resetForm = () => {
    setAdding(false)
    setType("note")
    setTitle("")
    setValue("")
  }

  const addResource = async () => {
    if (saving || !title.trim() || (type !== "note" && !value.trim())) return
    setSaving(true)
    try {
      const resource: FolderResource = {
        id: newResourceId(),
        type,
        title: title.trim(),
        ...(type === "note" ? { content: value.trim() } : { url: value.trim() }),
        createdAt: new Date().toISOString(),
      }
      await persist([...resources, resource])
      resetForm()
      setOpen(true)
    } finally {
      setSaving(false)
    }
  }

  const removeResource = (id: string) => {
    persist(resources.filter((r) => r.id !== id))
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium cursor-pointer"
      >
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
        Resources
        {resources.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">({resources.length})</span>
        )}
        <ChevronDown className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3">
          {resources.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground">
              No resources yet — add important notes, PDFs, or links for this folder.
            </p>
          )}

          {resources.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {resources.map((r) => {
                const meta = TYPE_META[r.type]
                return (
                  <li
                    key={r.id}
                    className="group flex items-start gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2"
                  >
                    <meta.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 truncate text-sm font-medium hover:text-primary hover:underline"
                        >
                          <span className="truncate">{r.title}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <p className="text-sm font-medium">{r.title}</p>
                      )}
                      {r.content && (
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{r.content}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeResource(r.id)}
                      className="shrink-0 cursor-pointer rounded p-1 text-muted-foreground opacity-0 hover:bg-muted hover:text-destructive group-hover:opacity-100"
                      aria-label="Remove resource"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {adding ? (
            <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-background/60 p-3">
              <div className="flex gap-1">
                {(Object.keys(TYPE_META) as FolderResourceType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      type === t
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              />
              {type === "note" ? (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Write your note..."
                  rows={3}
                  className="resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
                />
              ) : (
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === "pdf" ? "https://... (PDF link)" : "https://..."}
                  className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
                />
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={saving || !title.trim() || (type !== "note" && !value.trim())}
                  onClick={addResource}
                >
                  {saving ? "Adding..." : "Add"}
                </Button>
                <Button size="sm" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-fit items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Add resource
            </button>
          )}
        </div>
      )}
    </div>
  )
}
