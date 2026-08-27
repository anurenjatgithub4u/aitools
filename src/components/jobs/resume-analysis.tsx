"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, Lightbulb, Target } from "lucide-react"
import type { CandidateProfile, ResumeAnalysis } from "@/lib/jobs/types"

// Resume analysis panel (spec §5).
//
// Deliberately shows weaknesses as prominently as strengths. An inflated score
// with only positives reads well and helps nobody — the improvements list is
// the part that changes outcomes.

interface ResumeAnalysisPanelProps {
  analysis: ResumeAnalysis
  profile: CandidateProfile
}

/** Score bands. Kept blunt: a 62 shouldn't be dressed up as "very good". */
function scoreLabel(score: number): { label: string; tone: string } {
  if (score >= 85) return { label: "Excellent", tone: "text-emerald-500" };
  if (score >= 70) return { label: "Good", tone: "text-emerald-500" };
  if (score >= 55) return { label: "Fair", tone: "text-amber-500" };
  if (score >= 40) return { label: "Needs work", tone: "text-amber-500" };
  return { label: "Weak", tone: "text-destructive" };
}

function barTone(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-destructive";
}

const BREAKDOWN_LABELS: { key: keyof ResumeAnalysis["scoreBreakdown"]; label: string }[] = [
  { key: "atsCompatibility", label: "ATS compatibility" },
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "keywords", label: "Keywords" },
  { key: "formatting", label: "Formatting" },
  { key: "impact", label: "Impact" },
  { key: "jobTargeting", label: "Job targeting" },
];

export function ResumeAnalysisPanel({ analysis, profile }: ResumeAnalysisPanelProps) {
  const [open, setOpen] = useState(true)
  const { label, tone } = scoreLabel(analysis.resumeScore)

  return (
    <div className="rounded-2xl border border-border bg-background p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="text-4xl font-black tabular-nums text-foreground">
              {analysis.resumeScore}
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            <div className={`text-sm font-semibold ${tone}`}>{label}</div>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Your Resume</h2>
            <p className="text-sm text-muted-foreground">
              {profile.professionalTitle}
              {profile.yearsExperience > 0 && ` · ${profile.yearsExperience} years`}
              {profile.seniority !== "Unknown" && ` · ${profile.seniority}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? "Hide details" : "Show details"}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="mt-6 space-y-7 border-t border-border/60 pt-6">
          {/* Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Score breakdown</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {BREAKDOWN_LABELS.map(({ key, label: rowLabel }) => {
                const value = analysis.scoreBreakdown[key]
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-xs text-muted-foreground">{rowLabel}</span>
                    <div
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
                      role="meter"
                      aria-valuenow={value}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={rowLabel}
                    >
                      <div className={`h-full rounded-full ${barTone(value)}`} style={{ width: `${value}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                      {value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-7 md:grid-cols-2">
            {analysis.strengths.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-foreground mb-2.5">Strengths</h3>
                <ul className="space-y-2">
                  {analysis.strengths.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {analysis.improvements.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-foreground mb-2.5">Improvements</h3>
                <ul className="space-y-2">
                  {analysis.improvements.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {analysis.missingKeywords.length > 0 && (
            <section>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-2.5">
                <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
                Keywords worth adding
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missingKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </section>
          )}

          {profile.jobTitles.length > 0 && (
            <section>
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground mb-2.5">
                <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                Recommended job titles
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.jobTitles.map((title) => (
                  <span
                    key={title}
                    className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {title}
                  </span>
                ))}
              </div>
            </section>
          )}

          {analysis.atsAnalysis.issues.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-foreground mb-2.5">
                ATS issues <span className="font-normal text-muted-foreground">({analysis.atsAnalysis.score}/100)</span>
              </h3>
              <ul className="space-y-1.5">
                {analysis.atsAnalysis.issues.map((issue) => (
                  <li key={issue} className="text-sm text-muted-foreground">
                    · {issue}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
