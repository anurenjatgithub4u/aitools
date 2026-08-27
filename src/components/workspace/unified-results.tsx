"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Loader2, Sparkles, Target } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { workspaceApi } from "@/lib/workspace"

// Unified Search (FindUrAI_Unified_Search_Workspace_Vision.md):
// one query surfaces the user's own playbooks/workflows/prompts/templates/resources
// grouped by type, plus an AI Starter Kit as the Best Match — above directory tools.

interface WsResult {
  id: string
  title: string
  emoji: string
  kind: string
  href: string
}

interface StarterKit {
  title: string
  description: string
  steps: string[]
  prompts: { title: string; promptText: string }[]
  tools: { id: string; name: string; category: string; inDirectory: boolean }[]
  resources: { title: string; url: string }[]
  tags: string[]
}

const GROUPS: { key: string; label: string; kinds: string[] }[] = [
  { key: "playbooks", label: "📖 Playbooks", kinds: ["playbook"] },
  { key: "workflows", label: "⚡ Workflows", kinds: ["workflow"] },
  { key: "prompts", label: "💬 Prompts", kinds: ["prompt"] },
  { key: "templates", label: "📄 Templates", kinds: ["template"] },
  {
    key: "resources",
    label: "📚 Resources",
    kinds: ["knowledge", "bookmark", "reference", "research", "code", "idea", "decision", "collection", "project"],
  },
]

const FILTERS = ["All", "Playbooks", "Workflows", "Prompts", "Tools", "Templates", "Resources"]

export function UnifiedResults({
  query,
  onToolsVisibility,
}: {
  query: string
  onToolsVisibility?: (visible: boolean) => void
}) {
  const { user } = useAuth()
  const router = useRouter()
  const [results, setResults] = useState<WsResult[]>([])
  const [filter, setFilter] = useState("All")
  const [kit, setKit] = useState<StarterKit | null>(null)
  const [kitLoading, setKitLoading] = useState(false)
  const [kitError, setKitError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const lastQuery = useRef("")

  useEffect(() => {
    setKit(null)
    setKitError("")
    setSaved(false)
    setFilter("All")
    if (!user || !query.trim()) {
      setResults([])
      return
    }
    lastQuery.current = query
    workspaceApi
      .search(user.uid, query.trim())
      .then((r) => {
        if (lastQuery.current === query) setResults(r.filter((x) => x.kind !== "tool"))
      })
      .catch(() => setResults([]))
  }, [user, query])

  useEffect(() => {
    onToolsVisibility?.(filter === "All" || filter === "Tools")
  }, [filter, onToolsVisibility])

  const generateKit = async () => {
    if (kitLoading) return
    setKitLoading(true)
    setKitError("")
    try {
      const res = await fetch("/api/workspace/starter-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setKit(data.kit)
    } catch (e: any) {
      setKitError(e.message || "Could not build the Starter Kit")
    } finally {
      setKitLoading(false)
    }
  }

  // One-click save: prompts become prompt items, everything lands in one playbook
  const saveKit = async () => {
    if (!user || !kit || saving) return
    setSaving(true)
    try {
      const promptItems = await Promise.all(
        kit.prompts.map((p) =>
          workspaceApi.createItem({
            userId: user.uid,
            title: p.title,
            type: "prompt",
            emoji: "💬",
            tags: kit.tags,
            typeData: { promptText: p.promptText },
          } as any)
        )
      )
      const toolLines = kit.tools
        .map((t) => (t.inDirectory ? `- [@${t.name}](/tool/${t.id})` : `- ${t.name}`))
        .join("\n")
      const resourceLines = kit.resources.map((r) => `- [${r.title}](${r.url})`).join("\n")
      const playbook = await workspaceApi.createItem({
        userId: user.uid,
        title: kit.title,
        type: "playbook",
        emoji: "🎯",
        description: kit.description,
        tags: kit.tags,
        markdownContent: `## AI Tools Used\n\n${toolLines}\n\n## Resources\n\n${resourceLines}\n`,
        typeData: {
          goal: query,
          steps: kit.steps.map((s, i) => ({
            id: `kit-${Date.now()}-${i}`,
            text: s,
            done: false,
            indent: 0,
          })),
        },
        relatedItems: promptItems.map((p) => ({ itemId: p._id, relation: "uses" })),
      } as any)
      setSaved(true)
      router.push(`/workspace/items/${playbook._id}`)
    } catch {
      setKitError("Saving failed — please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (!query.trim()) return null

  const visibleGroups = GROUPS.filter(
    (g) =>
      (filter === "All" || filter === g.label.split(" ")[1]) &&
      results.some((r) => g.kinds.includes(r.kind))
  )
  const showKitCard = filter === "All" || filter === "Playbooks"

  return (
    <div className="mb-8 flex flex-col gap-5">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              filter === f
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 🎯 Best Match — AI Starter Kit */}
      {showKitCard && (
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold">
                Best Match: AI Starter Kit for “{query}”
              </h3>
              <p className="text-xs text-muted-foreground">
                A complete solution — playbook, prompts, tools and resources in one click.
              </p>
            </div>
            {!kit && (
              <Button onClick={generateKit} disabled={kitLoading} className="gap-2 rounded-full">
                {kitLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {kitLoading ? "Assembling kit..." : "Generate Starter Kit"}
              </Button>
            )}
          </div>

          {kitError && <p className="mt-2 text-xs text-destructive">{kitError}</p>}

          {kit && (
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <h4 className="text-base font-bold">{kit.title}</h4>
                <p className="text-xs text-muted-foreground">{kit.description}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Workflow
                  </p>
                  <ol className="flex flex-col gap-1 text-sm">
                    {kit.steps.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary font-semibold">{i + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Prompts included
                    </p>
                    <div className="flex flex-col gap-1 text-sm">
                      {kit.prompts.map((p) => (
                        <span key={p.title}>💬 {p.title}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      AI Tools
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {kit.tools.map((t) =>
                        t.inDirectory ? (
                          <Link key={t.name} href={`/tool/${t.id}`}>
                            <Badge variant="secondary" className="cursor-pointer hover:bg-primary/10">
                              🤖 {t.name}
                            </Badge>
                          </Link>
                        ) : (
                          <Badge key={t.name} variant="outline">
                            {t.name}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                  {kit.resources.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Resources
                      </p>
                      <div className="flex flex-col gap-1 text-xs">
                        {kit.resources.map((r) => (
                          <a
                            key={r.url}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            📚 {r.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {user ? (
                <Button onClick={saveKit} disabled={saving || saved} className="w-fit gap-2 rounded-full">
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : saved ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {saved ? "Saved!" : saving ? "Saving kit..." : "Save Entire Starter Kit"}
                </Button>
              ) : (
                <Link href="/login">
                  <Button variant="outline" className="w-fit rounded-full">
                    Sign in to save this kit
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grouped workspace results */}
      {visibleGroups.map((g) => (
        <div key={g.key}>
          <h3 className="mb-2 text-sm font-semibold">{g.label} · from your workspace</h3>
          <div className="flex flex-wrap gap-2">
            {results
              .filter((r) => g.kinds.includes(r.kind))
              .slice(0, 6)
              .map((r) => (
                <Link
                  key={`${r.kind}-${r.id}`}
                  href={r.href}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:border-primary/40"
                >
                  <span>{r.emoji}</span>
                  <span className="max-w-[240px] truncate">{r.title}</span>
                </Link>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
