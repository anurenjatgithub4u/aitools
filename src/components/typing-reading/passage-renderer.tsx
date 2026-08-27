"use client"

import { useMemo } from "react"
import type { WordStatus } from "@/lib/reading/alignment"
import { tokenizeForDisplay } from "@/lib/reading/normalize"

// Word-by-word passage rendering with read-aloud status colouring.
//
// Two accessibility decisions, per spec:
//  - colour is never the only signal. Each non-neutral state also carries an
//    underline style and a screen-reader label, so the passage is readable by
//    someone who can't distinguish red from green.
//  - the passage keeps its original punctuation and casing. Comparison happens
//    on a normalised copy; what's shown on screen is what was written.

interface PassageRendererProps {
  text: string
  /** Status per comparison-word index. Missing entries render as unread. */
  statuses: WordStatus[]
  /** Words up to here have been reached; used for the subtle reading cursor. */
  currentIndex?: number
  /** Larger type for the active reading screen. */
  size?: "reading" | "review"
}

const STATUS_CLASS: Record<WordStatus, string> = {
  correct:
    "text-emerald-600 dark:text-emerald-400 decoration-emerald-500/40 underline decoration-2 underline-offset-4",
  incorrect:
    "text-red-600 dark:text-red-400 decoration-red-500/50 underline decoration-2 decoration-wavy underline-offset-4",
  skipped:
    "text-muted-foreground/60 decoration-muted-foreground/40 line-through decoration-1",
  uncertain:
    "text-amber-600 dark:text-amber-400 decoration-amber-500/40 underline decoration-2 decoration-dotted underline-offset-4",
  // Extra words are things said that aren't in the passage — they have no
  // position here, so they never render.
  extra: "",
}

const STATUS_LABEL: Record<WordStatus, string> = {
  correct: "correct",
  incorrect: "incorrect",
  skipped: "skipped",
  uncertain: "unclear",
  extra: "",
}

export function PassageRenderer({ text, statuses, currentIndex = -1, size = "reading" }: PassageRendererProps) {
  // Tokenising is pure and the passage rarely changes, so this stays out of
  // the render path on every recognition update.
  const { tokens } = useMemo(() => tokenizeForDisplay(text), [text])

  const textSize =
    size === "reading"
      ? "text-lg sm:text-2xl leading-[1.9] sm:leading-[2]"
      : "text-base sm:text-lg leading-[1.9]"

  return (
    <p className={`${textSize} text-foreground/90 whitespace-pre-line`}>
      {tokens.map((token, i) => {
        const status = token.compareIndex >= 0 ? statuses[token.compareIndex] : undefined
        const isCursor = token.compareIndex >= 0 && token.compareIndex === currentIndex

        // Untouched words stay in the passage's normal colour — highlighting
        // everything would leave nothing for the actual feedback to stand out
        // against.
        const className = status
          ? STATUS_CLASS[status]
          : isCursor
            ? "text-foreground bg-primary/10 rounded px-0.5"
            : "text-foreground/80"

        return (
          // Keying on the status (not just the word's position) remounts this
          // span the moment a word flips from unmarked to marked, which is
          // what makes the reveal animation below actually play. A plain CSS
          // transition on a class swap doesn't animate text-decoration
          // changes consistently across browsers, so the underline/wavy
          // underline would otherwise just snap in with no transition at all
          // — the scale+fade on a fresh mount masks that snap instead of
          // fighting a property that won't animate.
          <span key={`${token.raw}-${i}-${status ?? "pending"}`}>
            <span
              className={`inline-block transition-colors duration-300 ${
                status
                  ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-90 motion-safe:duration-300 motion-safe:ease-out"
                  : ""
              } ${className}`}
              // Only annotate words with a state; a label on every word would
              // make the passage unbearable to listen to.
              aria-label={status ? `${token.raw}, ${STATUS_LABEL[status]}` : undefined}
              title={status ? STATUS_LABEL[status] : undefined}
            >
              {token.raw}
            </span>
            {i < tokens.length - 1 ? " " : ""}
          </span>
        )
      })}
    </p>
  )
}

/** Legend for the review screen — the second, non-colour signal explained. */
export function StatusLegend() {
  const items: { status: WordStatus; label: string }[] = [
    { status: "correct", label: "Correct" },
    { status: "incorrect", label: "Misread" },
    { status: "uncertain", label: "Unclear" },
    { status: "skipped", label: "Skipped" },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map(({ status, label }) => (
        <span key={status} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`font-medium ${STATUS_CLASS[status]}`}>Word</span>
          {label}
        </span>
      ))}
    </div>
  )
}
