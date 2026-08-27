"use client"

import { AlertTriangle, Bookmark, BookmarkCheck, CheckCircle2, Clock, ExternalLink, MapPin, ShieldCheck } from "lucide-react"

// Job card (spec §19).
//
// Two things it is careful about:
//  - the score is labelled a match score, never a chance of being hired (§18)
//  - "Apply Now" opens the original posting; we don't claim an application was
//    submitted, only that the link was opened (§20)

export interface JobCardData {
  id: string
  title: string
  company: string
  companyLogo: string | null
  location: string
  workplaceType: string
  employmentType: string
  salary: { min: number | null; max: number | null; currency: string | null }
  jobUrl: string
  sourceName: string
  requiredSkills: string[]
  postedLabel: string
  verifiedLabel: string
  status: string
  matchScore: number
  reasons: string[]
  missingSkills: string[]
}

interface JobCardProps {
  job: JobCardData
  saved: boolean
  savePending: boolean
  onToggleSave: (job: JobCardData) => void
  onApplyClick: (job: JobCardData) => void
}

function scoreTone(score: number): string {
  if (score >= 80) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
  if (score >= 60) return "border-primary/40 bg-primary/10 text-primary"
  return "border-border bg-secondary/60 text-muted-foreground"
}

function formatSalary(salary: JobCardData["salary"]): string | null {
  if (salary.min === null && salary.max === null) return null
  const symbol = salary.currency === "INR" ? "₹" : salary.currency === "USD" ? "$" : ""
  const compact = (n: number) => (n >= 100_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString())
  if (salary.min !== null && salary.max !== null) return `${symbol}${compact(salary.min)} – ${symbol}${compact(salary.max)}`
  return `${symbol}${compact((salary.min ?? salary.max)!)}`
}

export function JobCard({ job, saved, savePending, onToggleSave, onApplyClick }: JobCardProps) {
  const salary = formatSalary(job.salary)

  return (
    <article className="rounded-2xl border border-border bg-background p-5 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug text-foreground">{job.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.company}
            <span className="mx-1.5">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {job.location}
            </span>
            {job.workplaceType !== "Unknown" && (
              <>
                <span className="mx-1.5">·</span>
                {job.workplaceType}
              </>
            )}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-center ${scoreTone(job.matchScore)}`}
          title="FindUrAI Match Score — how closely this role matches your profile, not a prediction of being hired"
        >
          <span className="block text-base font-bold tabular-nums leading-none">{job.matchScore}%</span>
          <span className="block text-[10px] font-medium uppercase tracking-wide opacity-80">Match</span>
        </span>
      </div>

      {/* Freshness — posted date and last verification are different things (§15) */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {job.postedLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-emerald-500" aria-hidden="true" />
          {job.verifiedLabel}
        </span>
        {salary && <span className="font-medium text-foreground">{salary}</span>}
        {job.status === "UNKNOWN" && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
            May have closed
          </span>
        )}
      </div>

      {job.requiredSkills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.requiredSkills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {(job.reasons.length > 0 || job.missingSkills.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {job.reasons.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-foreground">Why you match</p>
              <ul className="space-y-1">
                {job.reasons.slice(0, 3).map((reason) => (
                  <li key={reason} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" aria-hidden="true" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {job.missingSkills.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-foreground">Missing</p>
              <ul className="space-y-1">
                {job.missingSkills.slice(0, 3).map((skill) => (
                  <li key={skill} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" aria-hidden="true" />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        <a
          href={job.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onApplyClick(job)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Apply Now
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>

        <button
          type="button"
          onClick={() => onToggleSave(job)}
          disabled={savePending}
          aria-pressed={saved}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3.5 py-2 text-sm font-medium transition-colors hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {saved ? (
            <BookmarkCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          ) : (
            <Bookmark className="h-4 w-4" aria-hidden="true" />
          )}
          {saved ? "Saved" : "Save"}
        </button>

        <span className="ml-auto text-xs text-muted-foreground">{job.sourceName}</span>
      </div>
    </article>
  )
}
