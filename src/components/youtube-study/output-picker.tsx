"use client"

import type { ComponentType } from "react"
import { BookOpen, GraduationCap, Layers, Library, ListChecks, MessageSquare, Sparkles, Zap } from "lucide-react"
import type { OutputType } from "@/lib/youtube-study/types"
import { MVP_OUTPUT_TYPES } from "@/lib/youtube-study/config"
import { OUTPUT_DESCRIPTIONS, OUTPUT_LABELS } from "@/lib/youtube-study/outputs"

// Output selection (spec §13). The four MVP types are live; the rest are shown
// as coming soon rather than hidden, because the design is already built for
// them and the roadmap is worth signalling.

const ICONS: Record<OutputType, ComponentType<{ className?: string }>> = {
  "smart-notes": BookOpen,
  "study-guide": GraduationCap,
  "chatgpt-prompt": Sparkles,
  "claude-prompt": MessageSquare,
  "key-takeaways": ListChecks,
  quiz: ListChecks,
  flashcards: Layers,
  playbook: Library,
}

const ORDER: OutputType[] = [
  "smart-notes",
  "study-guide",
  "chatgpt-prompt",
  "claude-prompt",
  "key-takeaways",
  "quiz",
  "flashcards",
  "playbook",
]

function isLive(type: OutputType): boolean {
  return (MVP_OUTPUT_TYPES as readonly string[]).includes(type)
}

interface OutputPickerProps {
  value: OutputType
  onChange: (type: OutputType) => void
  disabled?: boolean
  /** Types already generated for this video — free to revisit (spec §18). */
  ready?: OutputType[]
}

export function OutputPicker({ value, onChange, disabled, ready = [] }: OutputPickerProps) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-base font-bold tracking-tight mb-3">
        What do you want to create?
      </legend>

      <div
        role="radiogroup"
        aria-label="Output type"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {ORDER.map((type) => {
          const Icon = ICONS[type]
          const live = isLive(type)
          const selected = value === type && live
          const cached = ready.includes(type)

          return (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={!live}
              onClick={() => live && onChange(type)}
              className={`group relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                !live
                  ? "cursor-not-allowed border-border/40 bg-card/20 opacity-60"
                  : selected
                    ? "cursor-pointer border-primary bg-primary/5 shadow-sm"
                    : "cursor-pointer border-border/60 bg-card/40 hover:border-primary/30 hover:bg-card/60"
              }`}
            >
              <span
                className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-colors ${
                  selected
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-secondary/60 border-border/60 text-muted-foreground group-hover:text-primary"
                }`}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>

              <span className="text-sm font-semibold text-foreground">{OUTPUT_LABELS[type]}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {OUTPUT_DESCRIPTIONS[type]}
              </span>

              {!live && (
                <span className="absolute right-2.5 top-2.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                  Soon
                </span>
              )}
              {cached && live && (
                <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                  <Zap className="h-2.5 w-2.5" aria-hidden="true" />
                  Ready
                </span>
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
