"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GitFork, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-context"
import { workspaceApi } from "@/lib/workspace"
import { packToMarkdown, PACK_TOOLS, type PromptPack } from "@/lib/packs-shared"

// Remix/Fork: turns an official pack into the user's own editable workflow
// (a WorkspaceItem of type "workflow" — shows up in My Workflows, the graph,
// and the existing editor with steps as a checklist).
export function ForkPackButton({ pack }: { pack: PromptPack }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (loading) return null

  if (!user) {
    return (
      <Link href="/login">
        <Button variant="outline" className="gap-2 rounded-full">
          <GitFork className="h-4 w-4" /> Sign in to Remix
        </Button>
      </Link>
    )
  }

  const fork = async () => {
    if (busy) return
    setBusy(true)
    try {
      const item = await workspaceApi.createItem({
        userId: user.uid,
        title: pack.title.replace(/\s*\(\d{4}\)\s*$/, "") + " — my remix",
        type: "workflow",
        emoji: "🧬",
        description: pack.description,
        tags: [...pack.roleTags, ...pack.toolTags, "remix"],
        markdownContent: packToMarkdown(pack),
        typeData: {
          sourcePackSlug: pack.slug,
          goal: pack.description,
          toolsUsed: pack.toolTags.map((t) => PACK_TOOLS[t]?.label || t),
          steps: pack.steps.map((s) => ({
            id: `pack-${pack.slug}-${s.stepNumber}`,
            text: `${s.title} (${PACK_TOOLS[s.tool]?.label || s.tool})`,
            done: false,
            indent: 0,
          })),
          packSteps: pack.steps,
        },
      } as any)
      fetch("/api/packs/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: pack.slug, action: "fork" }),
      }).catch(() => {})
      router.push(`/workspace/items/${item._id}`)
    } catch {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" onClick={fork} disabled={busy} className="gap-2 rounded-full">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitFork className="h-4 w-4" />}
      {busy ? "Remixing..." : "Remix into My Workflows"}
    </Button>
  )
}
