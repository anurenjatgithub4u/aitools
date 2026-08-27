"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { workspaceApi } from "@/lib/workspace"

// Paste-to-import for AI conversations (ChatGPT, Claude, Gemini, Cursor...)
export function ImportConversationButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [source, setSource] = useState("ChatGPT")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const importConversation = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    setError("")
    try {
      let tags: string[] = ["imported", source.toLowerCase()]
      try {
        const res = await workspaceApi.ai({
          action: "generate_tags",
          title: title || "AI conversation",
          content: text.slice(0, 8000),
        })
        if (res.tags?.length) tags = Array.from(new Set([...tags, ...res.tags]))
      } catch {
        // AI tagging is optional — import must work without it
      }
      const item = await workspaceApi.createItem({
        userId,
        title: title.trim() || `${source} conversation — ${new Date().toLocaleDateString()}`,
        type: "knowledge",
        emoji: "💬",
        tags,
        markdownContent: `> Imported from ${source}\n\n${text}`,
        typeData: { aiModel: source },
      } as any)
      setOpen(false)
      router.push(`/workspace/items/${item._id}`)
    } catch (e: any) {
      setError(e.message || "Import failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="rounded-full gap-2" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" /> Import Conversation
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import AI Conversation</DialogTitle>
            <DialogDescription>
              Paste a conversation from ChatGPT, Claude, Gemini or Cursor. It becomes searchable
              AI Memory.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none dark:bg-input/30"
              >
                {["ChatGPT", "Claude", "Gemini", "Perplexity", "Cursor", "Other"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="flex-1"
              />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the conversation here..."
              rows={10}
              className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button onClick={importConversation} disabled={!text.trim() || busy} className="gap-2">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? "Importing..." : "Import to AI Memory"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
