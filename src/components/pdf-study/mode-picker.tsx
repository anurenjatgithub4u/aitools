"use client"

import type { ComponentType } from "react"
import { BookOpen, CheckCircle2, HelpCircle, Layers, Library } from "lucide-react"
import type { StudyMode } from "@/lib/pdf-study/types"

interface ModeOption {
  mode: StudyMode
  label: string
  blurb: string
  icon: ComponentType<{ className?: string }>
}

// Adding a sixth output mode later means adding one entry here plus its
// settings and view — nothing else on the page needs to change.
const MODES: ModeOption[] = [
  { mode: "notes", label: "Notes", blurb: "Study summary", icon: BookOpen },
  { mode: "flashcards", label: "Flashcards", blurb: "Practice recall", icon: Layers },
  { mode: "questions", label: "Q&A", blurb: "Test yourself", icon: HelpCircle },
  { mode: "quiz", label: "Quiz", blurb: "Multiple choice", icon: CheckCircle2 },
  { mode: "study-pack", label: "Study Pack", blurb: "Everything", icon: Library },
]

interface ModePickerProps {
  value: StudyMode
  onChange: (mode: StudyMode) => void
  disabled?: boolean
}

export function ModePicker({ value, onChange, disabled }: ModePickerProps) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-base font-bold tracking-tight mb-3">What do you want to create?</legend>
      <div
        role="radiogroup"
        aria-label="Output type"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        {MODES.map(({ mode, label, blurb, icon: Icon }) => {
          const selected = value === mode
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(mode)}
              className={`group flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/60 bg-card/40 hover:border-primary/30 hover:bg-card/60"
              }`}
            >
              <span
                className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-colors ${
                  selected
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-secondary/60 border-border/60 text-muted-foreground group-hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>
                  {label}
                </span>
                <span className="block text-xs text-muted-foreground">{blurb}</span>
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
