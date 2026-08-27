"use client"

import { useCallback, useMemo, useState } from "react"
import { AlertCircle, Info, Loader2, RotateCcw, Search } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { SearchEntry, type EntryMode } from "@/components/jobs/search-entry"
import { ResumeAnalysisPanel } from "@/components/jobs/resume-analysis"
import { JobCard, type JobCardData } from "@/components/jobs/job-card"
import { JobFilters, applyFilters, DEFAULT_FILTERS, type FilterState } from "@/components/jobs/job-filters"
import type { CandidateProfile, ResumeAnalysis } from "@/lib/jobs/types"

interface ApiError {
  message: string
  hint?: string
}

interface SearchResponse {
  jobs: JobCardData[]
  nearbyJobs: JobCardData[]
  servedFromCache: boolean
  refreshFailed: boolean
  jobsConsidered: number
}

function track(event: string, params: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  try {
    gtag?.(event, params)
  } catch {
    /* analytics must never break the tool */
  }
}

export function JobsTool() {
  const { user } = useAuth()

  const [mode, setMode] = useState<EntryMode>("resume")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [results, setResults] = useState<SearchResponse | null>(null)

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [savePending, setSavePending] = useState<Set<string>>(new Set())

  const idToken = useCallback(async () => {
    if (!user) return undefined
    return user.getIdToken().catch(() => undefined)
  }, [user])

  // ---- search -------------------------------------------------------------
  const runSearch = useCallback(
    async (payload: { profile?: CandidateProfile; description?: string; force?: boolean }) => {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch("/api/jobs/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, idToken: await idToken() }),
        })
        const data = await res.json()

        if (!res.ok || !data.ok) {
          setError({ message: data.error ?? "We couldn't search right now.", hint: data.hint })
          return
        }

        if (data.profile) setProfile(data.profile)
        setResults({
          jobs: data.jobs ?? [],
          nearbyJobs: data.nearbyJobs ?? [],
          servedFromCache: !!data.servedFromCache,
          refreshFailed: !!data.refreshFailed,
          jobsConsidered: data.jobsConsidered ?? 0,
        })
        setFilters(DEFAULT_FILTERS)
        track("jobs_search_completed", { results: (data.jobs ?? []).length })
      } catch {
        setError({ message: "We couldn't reach the server.", hint: "Check your connection and try again." })
      } finally {
        setBusy(false)
      }
    },
    [idToken]
  )

  // ---- resume upload → analysis → search ----------------------------------
  const handleResume = useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      setResults(null)
      setAnalysis(null)
      track("jobs_resume_uploaded")

      try {
        const form = new FormData()
        form.append("file", file)
        const token = await idToken()
        if (token) form.append("idToken", token)

        const res = await fetch("/api/resume/analyze", { method: "POST", body: form })
        const data = await res.json()

        if (!res.ok || !data.ok) {
          setError({ message: data.error ?? "Resume analysis failed.", hint: data.hint })
          setBusy(false)
          return
        }

        setProfile(data.profile)
        setAnalysis(data.analysis)
        // Chain straight into the search — a profile with no jobs beside it
        // isn't what the user came for.
        await runSearch({ profile: data.profile })
      } catch {
        setError({ message: "We couldn't reach the server.", hint: "Check your connection and try again." })
        setBusy(false)
      }
    },
    [idToken, runSearch]
  )

  const handleManual = useCallback(
    async (description: string) => {
      setResults(null)
      setAnalysis(null)
      track("jobs_manual_search")
      await runSearch({ description })
    },
    [runSearch]
  )

  // ---- save / apply -------------------------------------------------------
  const toggleSave = useCallback(
    async (job: JobCardData) => {
      if (!user) {
        setError({ message: "Sign in to save jobs.", hint: "Saved jobs are tied to your account." })
        return
      }
      const wasSaved = saved.has(job.id)
      setSavePending((prev) => new Set(prev).add(job.id))

      try {
        const token = await idToken()
        const res = await fetch(`/api/jobs/${job.id}/save`, {
          method: wasSaved ? "DELETE" : "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          setSaved((prev) => {
            const next = new Set(prev)
            if (wasSaved) next.delete(job.id)
            else next.add(job.id)
            return next
          })
        }
      } catch {
        /* leave the toggle unchanged — the button reflects server state only */
      } finally {
        setSavePending((prev) => {
          const next = new Set(prev)
          next.delete(job.id)
          return next
        })
      }
    },
    [idToken, saved, user]
  )

  const handleApplyClick = useCallback((job: JobCardData) => {
    // Fire-and-forget: the link opens regardless, and a failed beacon must
    // never delay the user reaching the posting.
    fetch(`/api/jobs/${job.id}/apply-click`, { method: "POST" }).catch(() => {})
    track("jobs_apply_clicked")
  }, [])

  // ---- derived ------------------------------------------------------------
  const visibleJobs = useMemo(
    () => (results ? applyFilters(results.jobs, filters) : []),
    [results, filters]
  )

  const reset = () => {
    setProfile(null)
    setAnalysis(null)
    setResults(null)
    setError(null)
    setFilters(DEFAULT_FILTERS)
  }

  const showEntry = !results || busy

  return (
    <div className="space-y-6">
      {showEntry && (
        <SearchEntry
          mode={mode}
          onModeChange={setMode}
          onResumeSelected={handleResume}
          onManualSearch={handleManual}
          busy={busy}
          error={error}
        />
      )}

      {busy && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-5 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          {analysis ? "Finding jobs that match your profile…" : "Reading and analysing…"}
        </div>
      )}

      {analysis && profile && !busy && <ResumeAnalysisPanel analysis={analysis} profile={profile} />}

      {results && !busy && (
        <>
          {/* Spec §30: a failed refresh degrades to cached jobs with a notice,
              never to an empty page. */}
          {results.refreshFailed && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-amber-700 dark:text-amber-400">
                We couldn&apos;t refresh jobs right now. Showing recently discovered jobs instead.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {visibleJobs.length > 0 ? "Recommended Jobs" : "Results"}
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => profile && runSearch({ profile, force: true })}
                disabled={busy || !profile}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Refresh
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                New search
              </button>
            </div>
          </div>

          {results.jobs.length > 0 && (
            <JobFilters
              jobs={results.jobs}
              filters={filters}
              onChange={setFilters}
              resultCount={visibleJobs.length}
            />
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <div>
                <p className="font-medium text-destructive">{error.message}</p>
                {error.hint && <p className="mt-0.5 text-destructive/80">{error.hint}</p>}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {visibleJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                saved={saved.has(job.id)}
                savePending={savePending.has(job.id)}
                onToggleSave={toggleSave}
                onApplyClick={handleApplyClick}
              />
            ))}
          </div>

          {/* Empty state (spec §34) */}
          {visibleJobs.length === 0 && (
            <div className="rounded-2xl border border-border bg-card/40 p-8 text-center">
              <h3 className="text-base font-bold text-foreground">No strong matches found.</h3>
              <p className="mt-2 text-sm text-muted-foreground">Try:</p>
              <ul className="mt-2 inline-block space-y-1 text-left text-sm text-muted-foreground">
                <li>· Expanding your location</li>
                <li>· Adding more job titles</li>
                <li>· Removing strict requirements</li>
                <li>· Improving your resume</li>
              </ul>
            </div>
          )}

          {/* Nearby matches (spec §34) */}
          {results.nearbyJobs.length > 0 && (
            <section className="pt-2">
              <h3 className="mb-3 text-base font-bold tracking-tight text-foreground">
                Nearby matches
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  weaker fit, but worth a look
                </span>
              </h3>
              <div className="space-y-4">
                {results.nearbyJobs.slice(0, 5).map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    saved={saved.has(job.id)}
                    savePending={savePending.has(job.id)}
                    onToggleSave={toggleSave}
                    onApplyClick={handleApplyClick}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Spec §35 — never claim to cover the whole internet. */}
          <p className="flex items-start gap-2 rounded-xl border border-border/50 bg-card/40 px-4 py-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            FindUrAI found these from the sources we currently monitor — company career pages and
            applicant tracking systems. It isn&apos;t every job on the internet.
            {results.servedFromCache && " These results came from our recent index."}
          </p>
        </>
      )}
    </div>
  )
}
