"use client"

import { useMemo, useRef, useState } from "react"
import { AlertCircle, FileText } from "lucide-react"
import {
  downloadFileName,
  downloadText,
  studyPackToMarkdown,
} from "@/lib/pdf-study/export"
import type { StudyPackResult } from "@/lib/pdf-study/types"
import { NotesView } from "./notes-view"
import { FlashcardsView } from "./flashcards-view"
import { QuestionsView } from "./questions-view"
import { QuizView } from "./quiz-view"
import { DownloadButton, PrintButton, ResultActions } from "./result-actions"

type TabId = "notes" | "flashcards" | "questions" | "quiz"

const TAB_LABELS: Record<TabId, string> = {
  notes: "Notes",
  flashcards: "Flashcards",
  questions: "Q&A",
  quiz: "Quiz",
}

interface ResultsWorkspaceProps {
  results: StudyPackResult
  fileName: string
  /** Modes that were requested but came back empty. */
  partial?: string[]
}

export function ResultsWorkspace({ results, fileName, partial = [] }: ResultsWorkspaceProps) {
  // Only tabs with content are shown, so a single-mode generation renders as
  // one tab rather than three empty ones.
  const available = useMemo(
    () => (["notes", "flashcards", "questions", "quiz"] as TabId[]).filter((tab) => results[tab]),
    [results]
  )

  const [requestedTab, setRequestedTab] = useState<TabId>(available[0] ?? "notes")
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({})

  // Derived rather than synced in an effect: if a regenerated result no longer
  // has the tab that was open, the first available one is shown immediately —
  // no extra render pass, and no stale tab flashing in between.
  const active: TabId = available.includes(requestedTab) ? requestedTab : (available[0] ?? "notes")

  const title =
    results.notes?.title ||
    results.flashcards?.title ||
    results.questions?.title ||
    results.quiz?.title ||
    "Your study materials"

  const isPack = available.length > 1

  // Left/right arrows move between tabs, per the WAI-ARIA tabs pattern.
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = available.indexOf(active)
    let nextIndex: number | null = null
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % available.length
    else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + available.length) % available.length
    else if (e.key === "Home") nextIndex = 0
    else if (e.key === "End") nextIndex = available.length - 1
    if (nextIndex === null) return

    e.preventDefault()
    const nextTab = available[nextIndex]
    setRequestedTab(nextTab)
    tabRefs.current[nextTab]?.focus()
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Generated from {fileName}</span>
        </p>
      </header>

      {partial.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            We couldn&apos;t generate {partial.join(", ")} from this document — everything else is
            below. You can try again for the missing part.
          </span>
        </div>
      )}

      {isPack && (
        <ResultActions>
          <DownloadButton
            label="Export all as Markdown"
            onDownload={() =>
              downloadText(
                studyPackToMarkdown(results),
                downloadFileName(fileName, "study-pack", "md"),
                "text/markdown"
              )
            }
          />
          <PrintButton />
        </ResultActions>
      )}

      {available.length > 1 && (
        <div
          role="tablist"
          aria-label="Study material"
          onKeyDown={onTabKeyDown}
          className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card/40 p-1 print:hidden"
        >
          {available.map((tab) => {
            const selected = tab === active
            return (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[tab] = el
                }}
                type="button"
                role="tab"
                id={`tab-${tab}`}
                aria-selected={selected}
                aria-controls={`panel-${tab}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setRequestedTab(tab)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            )
          })}
        </div>
      )}

      {available.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          hidden={tab !== active}
          tabIndex={0}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        >
          {tab === "notes" && results.notes && (
            <NotesView notes={results.notes} fileName={fileName} />
          )}
          {tab === "flashcards" && results.flashcards && (
            <FlashcardsView
              key={results.flashcards.cards[0]?.id ?? "flashcards"}
              flashcards={results.flashcards}
              fileName={fileName}
            />
          )}
          {tab === "questions" && results.questions && (
            <QuestionsView questions={results.questions} fileName={fileName} />
          )}
          {tab === "quiz" && results.quiz && (
            <QuizView
              key={results.quiz.questions[0]?.id ?? "quiz"}
              quiz={results.quiz}
              fileName={fileName}
            />
          )}
        </div>
      ))}
    </div>
  )
}
