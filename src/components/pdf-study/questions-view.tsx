"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  downloadFileName,
  downloadText,
  questionsToMarkdown,
  toPlainText,
} from "@/lib/pdf-study/export"
import type { QuestionsResult, StudyQuestion } from "@/lib/pdf-study/types"
import { CopyButton, DownloadButton, PrintButton, ResultActions, SourcePages } from "./result-actions"

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
}

export function QuestionsView({
  questions,
  fileName,
}: {
  questions: QuestionsResult
  fileName: string
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    const next = new Set(open)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpen(next)
  }

  const markdown = () => questionsToMarkdown(questions)

  return (
    <div className="space-y-6">
      <ResultActions>
        <CopyButton getText={() => toPlainText(markdown())} />
        <DownloadButton
          label="Markdown"
          onDownload={() =>
            downloadText(markdown(), downloadFileName(fileName, "questions", "md"), "text/markdown")
          }
        />
        <DownloadButton
          label="Text"
          onDownload={() =>
            downloadText(
              toPlainText(markdown()),
              downloadFileName(fileName, "questions", "txt"),
              "text/plain"
            )
          }
        />
        <PrintButton />
      </ResultActions>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {questions.questions.length} {questions.questions.length === 1 ? "question" : "questions"}
        </p>
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setOpen(new Set(questions.questions.map((q) => q.id)))}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Expand all
          </button>
          <span className="text-border" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            onClick={() => setOpen(new Set())}
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Collapse all
          </button>
        </div>
      </div>

      <ol className="space-y-3">
        {questions.questions.map((question, index) => (
          <QuestionItem
            key={question.id}
            question={question}
            index={index}
            expanded={open.has(question.id)}
            onToggle={() => toggle(question.id)}
          />
        ))}
      </ol>
    </div>
  )
}

function QuestionItem({
  question,
  index,
  expanded,
  onToggle,
}: {
  question: StudyQuestion
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const panelId = `qa-panel-${question.id}`

  return (
    <li className="rounded-2xl border border-border bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-start gap-3 p-4 sm:p-5 text-left transition-colors hover:bg-card/70 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="mt-0.5 font-mono text-xs font-bold text-muted-foreground tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground leading-relaxed">
            {question.question}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${
                DIFFICULTY_STYLES[question.difficulty] ?? DIFFICULTY_STYLES.medium
              }`}
            >
              {question.difficulty}
            </span>
            <span className="text-xs text-muted-foreground capitalize">{question.kind}</span>
            {question.topic && (
              <span className="text-xs text-muted-foreground">· {question.topic}</span>
            )}
          </span>
        </span>

        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-border/60 px-4 sm:px-5 py-4 space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {question.answer}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SourcePages pages={question.sourcePages} />
            <CopyButton getText={() => question.answer} label="Copy answer" />
          </div>
        </div>
      )}
    </li>
  )
}
