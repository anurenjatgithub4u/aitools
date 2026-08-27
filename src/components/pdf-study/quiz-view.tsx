"use client"

import { useMemo, useState } from "react"
import { Check, RotateCcw, X } from "lucide-react"
import { downloadFileName, downloadText, quizToMarkdown, toPlainText } from "@/lib/pdf-study/export"
import type { QuizResult } from "@/lib/pdf-study/types"
import { CopyButton, DownloadButton, PrintButton, ResultActions, SourcePages } from "./result-actions"

type Phase = "answering" | "reviewing" | "complete"

export function QuizView({ quiz, fileName }: { quiz: QuizResult; fileName: string }) {
  const questions = quiz.questions
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [phase, setPhase] = useState<Phase>("answering")
  const [submitted, setSubmitted] = useState(false)

  const reset = () => {
    setIndex(0)
    setSelected(null)
    setAnswers(questions.map(() => null))
    setPhase("answering")
    setSubmitted(false)
  }

  // An attempt is per-generation. The parent keys this component on the
  // generated quiz, so new questions remount it and no in-progress attempt can
  // be graded against a stale answer key.

  const score = useMemo(
    () =>
      answers.reduce<number>(
        (sum, a, i) => (a !== null && a === questions[i].correctAnswer ? sum + 1 : sum),
        0
      ),
    [answers, questions]
  )

  const markdown = () => quizToMarkdown(quiz)
  const question = questions[index]

  const submit = () => {
    if (selected === null) return
    const next = [...answers]
    next[index] = selected
    setAnswers(next)
    setSubmitted(true)
  }

  const advance = () => {
    if (index >= questions.length - 1) {
      setPhase("complete")
      return
    }
    setIndex(index + 1)
    setSelected(null)
    setSubmitted(false)
  }

  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0
  // Deliberately neutral — this is practice, not an assessment.
  const verdict = percentage >= 80 ? "Excellent" : percentage >= 60 ? "Good" : "Keep practicing"

  const actions = (
    <ResultActions>
      <CopyButton getText={() => toPlainText(markdown())} />
      <DownloadButton
        label="Markdown"
        onDownload={() =>
          downloadText(markdown(), downloadFileName(fileName, "quiz", "md"), "text/markdown")
        }
      />
      <PrintButton />
    </ResultActions>
  )

  // ---- results screen ----
  if (phase === "complete") {
    return (
      <div className="space-y-6">
        {actions}

        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <h3 className="text-lg font-bold tracking-tight">Quiz complete</h3>
          <p className="mt-6 text-5xl font-black tracking-tight text-primary tabular-nums">
            {score} / {questions.length}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">{percentage}%</p>
          <p className="mt-1 text-sm text-muted-foreground">{verdict}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPhase("reviewing")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Review answers
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- review screen ----
  if (phase === "reviewing") {
    return (
      <div className="space-y-6">
        {actions}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Reviewing all {questions.length} questions — you scored {score}/{questions.length}
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
        </div>

        <ol className="space-y-4">
          {questions.map((q, qi) => {
            const answer = answers[qi]
            const correct = answer === q.correctAnswer
            return (
              <li key={q.id} className="rounded-2xl border border-border bg-card/40 p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      correct ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
                    }`}
                    aria-hidden="true"
                  >
                    {correct ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-relaxed">
                      {qi + 1}. {q.question}
                    </p>
                    <p className="sr-only">{correct ? "You answered correctly." : "You answered incorrectly."}</p>

                    <ul className="mt-3 space-y-1.5">
                      {q.options.map((option, oi) => {
                        const isCorrect = oi === q.correctAnswer
                        const isChosen = oi === answer
                        return (
                          <li
                            key={oi}
                            className={`rounded-lg border px-3 py-2 text-sm ${
                              isCorrect
                                ? "border-emerald-500/30 bg-emerald-500/10"
                                : isChosen
                                  ? "border-rose-500/30 bg-rose-500/10"
                                  : "border-border/50"
                            }`}
                          >
                            <span className="font-mono text-xs text-muted-foreground mr-2">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {option}
                            {isCorrect && (
                              <span className="ml-2 text-xs font-semibold text-emerald-600">
                                Correct answer
                              </span>
                            )}
                            {isChosen && !isCorrect && (
                              <span className="ml-2 text-xs font-semibold text-rose-600">
                                Your answer
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>

                    {q.explanation && (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {q.explanation}
                      </p>
                    )}
                    <div className="mt-2">
                      <SourcePages pages={q.sourcePages} />
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  // ---- answering screen: one question at a time ----
  return (
    <div className="space-y-6">
      {actions}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">
          Question {index + 1} of {questions.length}
        </p>
        <div
          className="h-1.5 w-32 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={questions.length}
          aria-label="Quiz progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h3 className="text-lg sm:text-xl font-bold leading-relaxed">{question.question}</h3>

        <div role="radiogroup" aria-label="Answer options" className="mt-6 space-y-2.5">
          {question.options.map((option, oi) => {
            const isSelected = selected === oi
            const isCorrect = oi === question.correctAnswer
            // Correctness styling only appears after submitting — the answer is
            // never revealed while the user is still choosing.
            const showResult = submitted
            return (
              <button
                key={oi}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={submitted}
                onClick={() => setSelected(oi)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  showResult && isCorrect
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : showResult && isSelected
                      ? "border-rose-500/40 bg-rose-500/10"
                      : isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-card/70"
                } ${submitted ? "cursor-default" : "cursor-pointer"}`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    isSelected ? "border-primary" : "border-muted-foreground/40"
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                <span className="flex-1">{option}</span>
                {showResult && isCorrect && (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                )}
                {showResult && isSelected && !isCorrect && (
                  <X className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>

        {submitted && (
          <div className="mt-5 rounded-xl border border-border/60 bg-secondary/40 p-4" role="status">
            <p
              className={`text-sm font-bold ${
                selected === question.correctAnswer ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {selected === question.correctAnswer ? "Correct" : "Incorrect"}
            </p>
            {question.explanation && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {question.explanation}
              </p>
            )}
            <div className="mt-2">
              <SourcePages pages={question.sourcePages} />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {submitted ? (
            <button
              type="button"
              onClick={advance}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {index >= questions.length - 1 ? "See your score" : "Next question"}
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={selected === null}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Submit answer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
