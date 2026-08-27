"use client"

import { useEffect, useRef, type KeyboardEvent } from "react"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { InterviewQuestion } from "@/lib/resume-interview/types"

interface InterviewSessionProps {
  question: InterviewQuestion
  questionNumber: number
  totalQuestions: number
  answer: string
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  loading: boolean
  error: string | null
}

export function InterviewSession({
  question,
  questionNumber,
  totalQuestions,
  answer,
  onAnswerChange,
  onSubmit,
  loading,
  error,
}: InterviewSessionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!loading) textareaRef.current?.focus()
  }, [question.id, loading])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (!loading && answer.trim()) onSubmit()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold text-foreground">
          Question {questionNumber} / {totalQuestions}
        </span>
        <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
          {question.isFollowUp ? "Follow-up" : question.type === "resume" ? "Based on your resume" : "Role knowledge"}
        </span>
        {question.topic && <span className="text-muted-foreground text-xs">{question.topic}</span>}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <p className="text-lg sm:text-xl font-medium leading-relaxed text-foreground">{question.text}</p>
      </div>

      <div className="space-y-3">
        <textarea
          ref={textareaRef}
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Type your answer…"
          rows={6}
          className="w-full rounded-xl border border-input bg-transparent p-4 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">⌘/Ctrl + Enter to submit</p>
          <Button onClick={onSubmit} disabled={loading || !answer.trim()} className="gap-2 cursor-pointer">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Thinking…" : "Submit Answer"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
