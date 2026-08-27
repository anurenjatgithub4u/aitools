"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Trash2, TrendingUp } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { workspaceApi } from "@/lib/workspace"
import type { StackToolDto } from "@/types/workspace"

const SUGGESTED = [
  { name: "Claude", emoji: "🟠" },
  { name: "ChatGPT", emoji: "🟢" },
  { name: "Gemini", emoji: "🔷" },
  { name: "Cursor", emoji: "⌨️" },
  { name: "Perplexity", emoji: "🔍" },
  { name: "VS Code", emoji: "💙" },
  { name: "Midjourney", emoji: "🎨" },
  { name: "n8n", emoji: "🔗" },
]

export default function AiStackPage() {
  const { user } = useAuth()
  const [tools, setTools] = useState<StackToolDto[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("🤖")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!user) return
    try {
      setTools(await workspaceApi.listStack(user.uid))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const add = async (toolName: string, toolEmoji: string) => {
    if (!user || !toolName.trim()) return
    setError("")
    try {
      const tool = await workspaceApi.addStackTool({
        userId: user.uid,
        name: toolName.trim(),
        emoji: toolEmoji,
      })
      setTools((prev) => [...prev, tool])
      setName("")
      setEmoji("🤖")
    } catch (e: any) {
      setError(e.message || "Failed to add tool")
    }
  }

  const bump = async (tool: StackToolDto) => {
    if (!user) return
    setTools((prev) =>
      prev
        .map((t) => (t._id === tool._id ? { ...t, usageCount: t.usageCount + 1 } : t))
        .sort((a, b) => b.usageCount - a.usageCount)
    )
    await workspaceApi
      .updateStackTool(tool._id, { userId: user.uid, incrementUsage: true })
      .catch(() => load())
  }

  const remove = async (tool: StackToolDto) => {
    if (!user) return
    setTools((prev) => prev.filter((t) => t._id !== tool._id))
    await workspaceApi.removeStackTool(tool._id, user.uid).catch(() => load())
  }

  const inStack = new Set(tools.map((t) => t.name.toLowerCase()))
  const maxUsage = Math.max(1, ...tools.map((t) => t.usageCount))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">🤖 My AI Stack</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The AI tools you actually work with. Tap a tool each time you use it — your Insights get
          smarter.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
          className="w-14 text-center"
          aria-label="Tool emoji"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add(name, emoji)}
          placeholder="Add a tool (e.g. Claude)"
          className="max-w-xs"
        />
        <Button onClick={() => add(name, emoji)} disabled={!name.trim()} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {SUGGESTED.some((s) => !inStack.has(s.name.toLowerCase())) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Quick add:</span>
          {SUGGESTED.filter((s) => !inStack.has(s.name.toLowerCase())).map((s) => (
            <button
              key={s.name}
              onClick={() => add(s.name, s.emoji)}
              className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-primary/50 hover:bg-muted cursor-pointer"
            >
              {s.emoji} {s.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : tools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Your stack is empty — add the tools above to start tracking your AI usage.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <div key={tool._id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tool.emoji}</span>
                <h3 className="flex-1 truncate text-sm font-semibold">{tool.name}</h3>
                <button
                  onClick={() => remove(tool)}
                  className="text-muted-foreground hover:text-destructive cursor-pointer"
                  aria-label={`Remove ${tool.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Used {tool.usageCount} times</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => bump(tool)}
                >
                  <TrendingUp className="h-3 w-3" /> Used it
                </Button>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${(tool.usageCount / maxUsage) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
