"use client"

import { AlertTriangle, RotateCcw, Sparkles, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PerformanceBar } from "@/components/typing-reading/performance-bar"
import type { InterviewReport } from "@/lib/resume-interview/types"

const BREAKDOWN_LABELS: { key: keyof InterviewReport["breakdown"]; label: string }[] = [
  { key: "resumeKnowledge", label: "Resume Knowledge" },
  { key: "technicalKnowledge", label: "Technical Knowledge" },
  { key: "problemSolving", label: "Problem Solving" },
  { key: "communication", label: "Communication" },
  { key: "answerDepth", label: "Answer Depth" },
]

interface ReportViewProps {
  report: InterviewReport
  onPracticeAgain: () => void
  onNewResume: () => void
}

export function ReportView({ report, onPracticeAgain, onNewResume }: ReportViewProps) {
  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm font-semibold text-primary mb-1">Interview Complete</p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tabular-nums tracking-tight">{report.overallScore}</span>
          <span className="text-xl text-muted-foreground">/ 100</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-5">
        {BREAKDOWN_LABELS.map(({ key, label }) => (
          <PerformanceBar key={key} label={label} value={`${report.breakdown[key]}`} percent={report.breakdown[key]} />
        ))}
      </div>

      {report.strongestAreas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Strongest Areas</h3>
          <div className="space-y-3">
            {report.strongestAreas.map((a, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{a.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.weakestAreas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Weakest Areas</h3>
          <div className="space-y-3">
            {report.weakestAreas.map((a, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{a.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.struggledQuestions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Questions You Struggled With</h3>
          <div className="space-y-4">
            {report.struggledQuestions.map((q, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-2">
                <p className="text-sm font-medium text-foreground">{q.question}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Your answer: </span>
                  {q.answerSummary}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">What was missing: </span>
                  {q.whatWasMissing}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Better approach: </span>
                  {q.betterApproach}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.resumeRiskAreas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Resume Risk Areas</h3>
          <div className="space-y-3">
            {report.resumeRiskAreas.map((r, i) => (
              <div key={i} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-foreground">&ldquo;{r.claim}&rdquo;</p>
                </div>
                <p className="text-sm text-muted-foreground pl-6">{r.issue}</p>
                <p className="text-sm text-muted-foreground pl-6">
                  <span className="font-medium text-foreground">Recommendation: </span>
                  {r.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.practicePlan.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Your Next Practice Areas
          </h3>
          <ol className="space-y-2">
            {report.practicePlan.map((p, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {i + 1}
                </span>
                <span className="text-foreground">{p}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button size="lg" onClick={onPracticeAgain} className="gap-2 cursor-pointer">
          <Sparkles className="h-4 w-4" />
          Practice Weak Areas
        </Button>
        <Button size="lg" variant="outline" onClick={onNewResume} className="gap-2 cursor-pointer">
          <RotateCcw className="h-4 w-4" />
          Analyze a Different Resume
        </Button>
      </div>
    </div>
  )
}
