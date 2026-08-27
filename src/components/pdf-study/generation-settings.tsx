"use client"

import {
  FLASHCARD_QUANTITY_OPTIONS,
  STUDY_PACK_COST_UNITS,
  QUESTION_QUANTITY_OPTIONS,
  QUIZ_QUANTITY_OPTIONS,
  STUDY_PACK_COUNTS,
} from "@/lib/pdf-study/config"
import type { DetailLevel, Difficulty, StudyMode } from "@/lib/pdf-study/types"

interface GenerationSettingsProps {
  mode: StudyMode
  detail: DetailLevel
  onDetailChange: (detail: DetailLevel) => void
  difficulty: Difficulty
  onDifficultyChange: (difficulty: Difficulty) => void
  quantity: number
  onQuantityChange: (quantity: number) => void
  disabled?: boolean
}

const DETAIL_OPTIONS: { value: DetailLevel; label: string; hint: string }[] = [
  { value: "quick", label: "Quick", hint: "Just the important concepts" },
  { value: "standard", label: "Standard", hint: "Balanced notes" },
  { value: "detailed", label: "Detailed", hint: "Definitions, examples, relationships" },
]

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "mixed", label: "Mixed" },
]

// Which settings each mode actually uses — irrelevant controls are never shown.
function settingsFor(mode: StudyMode) {
  switch (mode) {
    case "notes":
      return { detail: true, difficulty: false, quantity: false }
    case "flashcards":
    case "questions":
    case "quiz":
      return { detail: false, difficulty: true, quantity: true }
    case "study-pack":
      return { detail: true, difficulty: true, quantity: false }
  }
}

function quantityOptionsFor(mode: StudyMode): readonly number[] {
  if (mode === "quiz") return QUIZ_QUANTITY_OPTIONS
  if (mode === "flashcards") return FLASHCARD_QUANTITY_OPTIONS
  return QUESTION_QUANTITY_OPTIONS
}

export function GenerationSettings({
  mode,
  detail,
  onDetailChange,
  difficulty,
  onDifficultyChange,
  quantity,
  onQuantityChange,
  disabled,
}: GenerationSettingsProps) {
  const shows = settingsFor(mode)
  if (!shows.detail && !shows.difficulty && !shows.quantity) return null

  return (
    <fieldset disabled={disabled} className="space-y-5">
      <legend className="sr-only">Generation settings</legend>

      {shows.detail && (
        <SegmentedControl
          label="Detail"
          description={mode === "study-pack" ? "Applies to the notes in your pack" : undefined}
          options={DETAIL_OPTIONS.map((o) => ({ value: o.value, label: o.label, hint: o.hint }))}
          value={detail}
          onChange={(v) => onDetailChange(v as DetailLevel)}
        />
      )}

      {shows.difficulty && (
        <SegmentedControl
          label="Difficulty"
          description={
            mode === "study-pack" ? "Applies to flashcards, questions and quiz" : undefined
          }
          options={DIFFICULTY_OPTIONS}
          value={difficulty}
          onChange={(v) => onDifficultyChange(v as Difficulty)}
        />
      )}

      {shows.quantity && (
        <SegmentedControl
          label="How many"
          options={quantityOptionsFor(mode).map((n) => ({ value: String(n), label: String(n) }))}
          value={String(quantity)}
          onChange={(v) => onQuantityChange(Number(v))}
        />
      )}

      {mode === "study-pack" && (
        <p className="text-xs text-muted-foreground">
          A Study Pack generates notes, {STUDY_PACK_COUNTS.flashcards} flashcards,{" "}
          {STUDY_PACK_COUNTS.questions} questions and {STUDY_PACK_COUNTS.quiz} quiz questions, and
          counts as {STUDY_PACK_COST_UNITS} generations against your daily limit.
        </p>
      )}
    </fieldset>
  )
}

interface SegmentedOption {
  value: string
  label: string
  hint?: string
}

function SegmentedControl({
  label,
  description,
  options,
  value,
  onChange,
}: {
  label: string
  description?: string
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
}) {
  const activeHint = options.find((o) => o.value === value)?.hint

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2 mb-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>

      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex flex-wrap gap-1 rounded-xl border border-border/60 bg-card/40 p-1"
      >
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {activeHint && <p className="mt-2 text-xs text-muted-foreground">{activeHint}</p>}
    </div>
  )
}
