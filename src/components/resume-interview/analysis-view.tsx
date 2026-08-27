"use client"

import { CheckCircle2, Lightbulb, XCircle } from "lucide-react"
import { PerformanceBar } from "@/components/typing-reading/performance-bar"
import type { ResumeAnalysis } from "@/lib/resume-interview/types"

const BREAKDOWN_LABELS: { key: keyof ResumeAnalysis["breakdown"]; label: string }[] = [
  { key: "atsReadiness", label: "ATS Readiness" },
  { key: "clarity", label: "Clarity" },
  { key: "experiencePresentation", label: "Experience Presentation" },
  { key: "technicalSkills", label: "Technical Skills" },
  { key: "achievementStrength", label: "Achievement Strength" },
  { key: "projectQuality", label: "Project Quality" },
  { key: "relevanceToRole", label: "Relevance to Target Role" },
  { key: "formatting", label: "Formatting / Structure" },
]

export function AnalysisView({ analysis }: { analysis: ResumeAnalysis }) {
  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm font-semibold text-primary mb-1">Resume Score</p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tabular-nums tracking-tight">{analysis.overallScore}</span>
          <span className="text-xl text-muted-foreground">/ 100</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-5">
        {BREAKDOWN_LABELS.map(({ key, label }) => (
          <PerformanceBar key={key} label={label} value={`${analysis.breakdown[key]}`} percent={analysis.breakdown[key]} />
        ))}
      </div>

      {analysis.strengths.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Strengths</h3>
          <div className="space-y-3">
            {analysis.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-4">
                <CheckCircle2 className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.weaknesses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Weaknesses</h3>
          <div className="space-y-3">
            {analysis.weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-4">
                <XCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{w.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{w.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.suggestions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Improvement Suggestions</h3>
          <div className="space-y-4">
            {analysis.suggestions.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-start gap-2.5 mb-3">
                  <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-foreground">{s.problem}</p>
                </div>
                <div className="pl-6.5 space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Why it matters: </span>
                    {s.whyItMatters}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Suggested improvement: </span>
                    {s.suggestedImprovement}
                  </p>
                  {s.example && (
                    <p className="text-muted-foreground italic border-l-2 border-border pl-3">{s.example}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
