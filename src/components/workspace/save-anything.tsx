"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Link2, ClipboardPaste, Upload, Loader2, Sparkles, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { workspaceApi } from "@/lib/workspace"
import type { WorkspaceItemType } from "@/types/workspace"

type Mode = "link" | "paste" | "upload"

const CATEGORY_TO_TYPE: Record<string, WorkspaceItemType> = {
  prompt: "prompt",
  workflow: "workflow",
  playbook: "playbook",
  knowledge: "knowledge",
  code: "code",
  reference: "reference",
}

export function SaveAnythingDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("paste")
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [error, setError] = useState("")

  const [url, setUrl] = useState("")
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [emoji, setEmoji] = useState("📄")
  const [itemType, setItemType] = useState<WorkspaceItemType>("knowledge")

  const reset = () => {
    setUrl("")
    setContent("")
    setTitle("")
    setDescription("")
    setTags([])
    setEmoji("📄")
    setItemType("knowledge")
    setError("")
  }

  const fetchLink = async () => {
    if (!url.trim() || busy) return
    setBusy(true)
    setError("")
    try {
      const meta = await workspaceApi.extractUrl(url.trim())
      setTitle(meta.title)
      setDescription(meta.description)
      setEmoji(meta.emoji)
      setTags(meta.tags)
      setItemType(meta.kind === "docs" ? "reference" : "bookmark")
      setUrl(meta.url)
    } catch (e: any) {
      setError(e.message || "Could not read that link — you can still save it.")
      setItemType("bookmark")
      setEmoji("🔗")
      if (!title) setTitle(url.trim())
    } finally {
      setBusy(false)
    }
  }

  const suggest = async () => {
    if (!content.trim() || aiBusy) return
    setAiBusy(true)
    setError("")
    try {
      const meta = await workspaceApi.suggestMeta(content)
      if (meta.title) setTitle(meta.title)
      if (meta.description) setDescription(meta.description)
      if (meta.tags.length) setTags(meta.tags)
      const t = CATEGORY_TO_TYPE[meta.category]
      if (t) setItemType(t)
      if (meta.aiTool) setTags((prev) => Array.from(new Set([...prev, meta.aiTool.toLowerCase()])))
    } catch (e: any) {
      setError(e.message || "AI suggestion failed — fill the fields manually.")
    } finally {
      setAiBusy(false)
    }
  }

  const onFile = async (file: File) => {
    setError("")
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      setError("Only .md and .txt files are supported for now — PDFs are coming soon.")
      return
    }
    const text = await file.text()
    setContent(text)
    setTitle(file.name.replace(/\.(md|markdown|txt)$/i, ""))
    setEmoji("📄")
    setItemType("knowledge")
  }

  const save = async () => {
    if (busy) return
    const finalTitle = title.trim() || (mode === "link" ? url.trim() : "Untitled")
    if (mode === "link" && !url.trim()) return
    if (mode !== "link" && !content.trim() && !title.trim()) return
    setBusy(true)
    setError("")
    try {
      const isPrompt = itemType === "prompt"
      const item = await workspaceApi.createItem({
        userId,
        title: finalTitle,
        type: itemType,
        description,
        emoji,
        tags,
        markdownContent:
          mode === "link"
            ? `[${finalTitle}](${url.trim()})\n\n${description}`
            : isPrompt
              ? ""
              : content,
        typeData: {
          ...(mode === "link" ? { url: url.trim() } : {}),
          ...(isPrompt ? { promptText: content } : {}),
        },
      } as any)
      onOpenChange(false)
      reset()
      router.push(`/workspace/items/${item._id}`)
    } catch (e: any) {
      setError(e.message || "Save failed")
    } finally {
      setBusy(false)
    }
  }

  const modes: { id: Mode; label: string; icon: React.ElementType }[] = [
    { id: "paste", label: "Paste", icon: ClipboardPaste },
    { id: "link", label: "Link", icon: Link2 },
    { id: "upload", label: "Upload", icon: Upload },
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save to Workspace</DialogTitle>
          <DialogDescription>
            Prompts, AI chats, links, GitHub repos, YouTube videos, markdown — everything AI
            belongs here.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                mode === id ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {mode === "link" && (
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLink()}
                placeholder="https://github.com/... or youtube.com/..."
                className="flex-1"
                autoFocus
              />
              <Button variant="outline" onClick={fetchLink} disabled={!url.trim() || busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
              </Button>
            </div>
          )}

          {mode === "paste" && (
            <>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste a prompt, an AI conversation, notes — anything."
                rows={6}
                autoFocus
                className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-fit gap-1.5"
                onClick={suggest}
                disabled={!content.trim() || aiBusy}
              >
                {aiBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Suggest title, tags & type with AI
              </Button>
            </>
          )}

          {mode === "upload" && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center transition-colors hover:border-primary/40">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm">
                {content ? `Loaded: ${title || "file"}` : "Click to choose a .md or .txt file"}
              </span>
              <span className="text-[10px] text-muted-foreground">PDF support coming soon</span>
              <input
                type="file"
                accept=".md,.markdown,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
          )}

          {(title || mode !== "link" || tags.length > 0) && (
            <>
              <div className="flex gap-2">
                <Input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                  className="w-14 text-center"
                  aria-label="Emoji"
                />
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="flex-1"
                />
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as WorkspaceItemType)}
                  className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none dark:bg-input/30"
                >
                  {(
                    ["knowledge", "prompt", "playbook", "workflow", "bookmark", "reference", "code"] as const
                  ).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {description && (
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                />
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <Badge key={t} variant="outline" className="gap-1 text-[11px]">
                      #{t}
                      <button
                        onClick={() => setTags(tags.filter((x) => x !== t))}
                        className="cursor-pointer hover:text-destructive"
                        aria-label={`Remove tag ${t}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={save} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save to Workspace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SaveAnythingButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 cursor-pointer"
      >
        <Plus className="h-4 w-4" /> Save Anything
      </button>
      <SaveAnythingDialog userId={userId} open={open} onOpenChange={setOpen} />
    </>
  )
}
