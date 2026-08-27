"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Bookmark, ChevronLeft, ChevronRight, RotateCcw, Shuffle, ThumbsUp } from "lucide-react"
import {
  downloadFileName,
  downloadText,
  flashcardsToCsv,
  flashcardsToMarkdown,
  toPlainText,
} from "@/lib/pdf-study/export"
import type { FlashcardsResult } from "@/lib/pdf-study/types"
import { CopyButton, DownloadButton, PrintButton, ResultActions, SourcePages } from "./result-actions"

export function FlashcardsView({
  flashcards,
  fileName,
}: {
  flashcards: FlashcardsResult
  fileName: string
}) {
  const cards = flashcards.cards
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i))
  const [position, setPosition] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [known, setKnown] = useState<Set<string>>(new Set())
  const [review, setReview] = useState<Set<string>>(new Set())

  // Deck state (order, progress, known/review marks) is per-generation. The
  // parent gives this component a key derived from the generated set, so a new
  // set remounts it and the state resets without an effect.

  const card = cards[order[position]]

  const go = useCallback(
    (delta: number) => {
      setPosition((p) => Math.min(Math.max(p + delta, 0), order.length - 1))
      setRevealed(false)
    },
    [order.length]
  )

  const shuffle = () => {
    const shuffled = [...order]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setOrder(shuffled)
    setPosition(0)
    setRevealed(false)
  }

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  // Keyboard control for the deck: arrows to move, space/enter to flip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return
      if (e.key === "ArrowRight") go(1)
      else if (e.key === "ArrowLeft") go(-1)
      else if (e.key === " " || e.key === "Enter") {
        // Only hijack space/enter when the deck itself has focus, so other
        // buttons on the page keep their normal activation behaviour.
        if (target?.closest("[data-flashcard-surface]")) {
          e.preventDefault()
          setRevealed((r) => !r)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go])

  const markdown = useMemo(() => () => flashcardsToMarkdown(flashcards), [flashcards])

  if (!card) return null

  return (
    <div className="space-y-6">
      <ResultActions>
        <CopyButton getText={() => toPlainText(markdown())} />
        <DownloadButton
          label="CSV"
          onDownload={() =>
            downloadText(
              flashcardsToCsv(flashcards),
              downloadFileName(fileName, "flashcards", "csv"),
              "text/csv"
            )
          }
        />
        <DownloadButton
          label="Markdown"
          onDownload={() =>
            downloadText(markdown(), downloadFileName(fileName, "flashcards", "md"), "text/markdown")
          }
        />
        <PrintButton />
      </ResultActions>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Card {position + 1} of {order.length}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ThumbsUp className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {known.size} known
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            {review.size} to review
          </span>
        </div>
      </div>

      {/* Flip surface */}
      <div
        data-flashcard-surface
        role="button"
        tabIndex={0}
        aria-live="polite"
        aria-label={
          revealed
            ? `Answer: ${card.answer}. Press space to hide.`
            : `Question: ${card.question}. Press space to show the answer.`
        }
        onClick={() => setRevealed((r) => !r)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            setRevealed((r) => !r)
          }
        }}
        className="flex min-h-[16rem] sm:min-h-[18rem] cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-6 sm:p-10 text-center transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {revealed ? "Answer" : "Question"}
        </span>

        <p className="text-lg sm:text-xl font-semibold leading-relaxed text-foreground max-w-2xl">
          {revealed ? card.answer : card.question}
        </p>

        {!revealed && (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
            Show answer
          </span>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {card.topic && <span className="text-xs text-muted-foreground">{card.topic}</span>}
          <SourcePages pages={card.sourcePages} />
        </div>
      </div>

      {/* Deck controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DeckButton onClick={() => go(-1)} disabled={position === 0} label="Previous card">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </DeckButton>
          <DeckButton
            onClick={() => go(1)}
            disabled={position >= order.length - 1}
            label="Next card"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </DeckButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => toggle(known, setKnown, card.id)}
            aria-pressed={known.has(card.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              known.has(card.id)
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background hover:border-primary/40 hover:text-primary"
            }`}
          >
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
            Known
          </button>

          <button
            type="button"
            onClick={() => toggle(review, setReview, card.id)}
            aria-pressed={review.has(card.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              review.has(card.id)
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-border bg-background hover:border-amber-500/40"
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
            Review
          </button>

          <button
            type="button"
            onClick={shuffle}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
            Shuffle
          </button>

          <button
            type="button"
            onClick={() => {
              setOrder(cards.map((_, i) => i))
              setPosition(0)
              setRevealed(false)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset order
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: use the arrow keys to move between cards, and space to flip the one in focus.
      </p>
    </div>
  )
}

function DeckButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  )
}
