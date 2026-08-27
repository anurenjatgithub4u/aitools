"use client"

import { useState } from "react"
import { Copy, Check, ChevronDown } from "lucide-react"
import type { TopicPromptPack } from "@/lib/topics"

export function PromptPackCard({ pack }: { pack: TopicPromptPack }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)

  const copy = (text: string, i: number) => {
    navigator.clipboard.writeText(text)
    setCopied(i)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 text-left cursor-pointer"
      >
        <span className="text-xl">💬</span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold">{pack.title}</h4>
          <p className="text-xs text-muted-foreground">{pack.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
          {pack.prompts.length} prompts
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {pack.prompts.map((p, i) => (
            <div key={i} className="rounded-lg bg-muted/50 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{p.title}</span>
                <button
                  onClick={() => copy(p.text, i)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary cursor-pointer"
                >
                  {copied === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied === i ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
