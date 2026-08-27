"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy, ExternalLink, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PACK_TOOLS, toolDeepLink, type PromptPack } from "@/lib/packs-shared"

// One-click run: copy the prompt to clipboard + open the right tool.
// Copy is the mechanism; deep-link prefill is a bonus where supported.

function trackRun(slug: string, ranOnce: React.MutableRefObject<boolean>) {
  if (ranOnce.current) return
  ranOnce.current = true
  fetch("/api/packs/stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, action: "run" }),
  }).catch(() => {})
}

export function RunPackButton({ pack }: { pack: PromptPack }) {
  const ranOnce = useRef(false)
  const [done, setDone] = useState(false)
  const first = pack.steps[0]
  const meta = PACK_TOOLS[first.tool] || PACK_TOOLS.chatgpt

  const run = async () => {
    try {
      await navigator.clipboard.writeText(first.promptText)
    } catch {
      /* clipboard can fail in odd contexts — the deep link still opens */
    }
    trackRun(pack.slug, ranOnce)
    setDone(true)
    setTimeout(() => setDone(false), 2500)
    window.open(toolDeepLink(first.tool, first.promptText), "_blank", "noopener")
  }

  return (
    <Button onClick={run} className="gap-2 rounded-full px-6">
      {done ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {done ? "Step 1 copied — paste it!" : `Run this pack in ${meta.label}`}
    </Button>
  )
}

export function PackStepActions({
  pack,
  stepNumber,
}: {
  pack: PromptPack
  stepNumber: number
}) {
  const ranOnce = useRef(false)
  const [copied, setCopied] = useState(false)
  const step = pack.steps.find((s) => s.stepNumber === stepNumber)
  if (!step) return null
  const meta = PACK_TOOLS[step.tool] || PACK_TOOLS.chatgpt

  const copy = async () => {
    await navigator.clipboard.writeText(step.promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const copyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(step.promptText)
    } catch {
      /* deep link still opens */
    }
    trackRun(pack.slug, ranOnce)
    window.open(toolDeepLink(step.tool, step.promptText), "_blank", "noopener")
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy prompt"}
      </Button>
      <Button size="sm" className="gap-1.5" onClick={copyAndOpen}>
        <ExternalLink className="h-3.5 w-3.5" />
        Copy &amp; open {meta.emoji} {meta.label}
      </Button>
    </div>
  )
}

// Hydrates live run/fork counts onto the statically-rendered page
export function PackLiveStats({ slug }: { slug: string }) {
  const [stats, setStats] = useState<{ runCount: number; forkCount: number } | null>(null)
  useEffect(() => {
    fetch(`/api/packs/stats?slugs=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => setStats(d.stats?.[slug] || { runCount: 0, forkCount: 0 }))
      .catch(() => {})
  }, [slug])
  if (!stats || (stats.runCount === 0 && stats.forkCount === 0)) return null
  return (
    <span className="text-xs text-muted-foreground">
      Run {stats.runCount} times · Remixed by {stats.forkCount}
    </span>
  )
}
