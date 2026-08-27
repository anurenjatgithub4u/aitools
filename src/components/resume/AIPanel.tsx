"use client"

import React, { useState } from "react"
import { ResumeData, ResumeScore, JobMatchAnalysis } from "@/types/resume"
import { Sparkles, CheckCircle2, AlertTriangle, Target, Wand2, ShieldCheck, RefreshCw } from "lucide-react"

interface AIPanelProps {
  data: ResumeData
  onFixSuggestion?: (suggestionId: string, fixPrompt: string) => void
  onUpdateResume?: (updated: ResumeData) => void
}

export function AIPanel({ data, onFixSuggestion, onUpdateResume }: AIPanelProps) {
  const [jobDescription, setJobDescription] = useState(data.jobDescription || "")
  const [analyzingJd, setAnalyzingJd] = useState(false)
  const [analyzingScore, setAnalyzingScore] = useState(false)
  const [score, setScore] = useState<ResumeScore>(
    data.score || {
      total: 84,
      breakdown: { content: 88, relevance: 82, structure: 91, clarity: 84, formatting: 90 },
      suggestions: [
        {
          id: "sug_1",
          category: "content",
          title: "Add your LinkedIn URL",
          description: "Including your LinkedIn profile URL increases recruiter engagement by up to 40%.",
          fixPrompt: "Add LinkedIn profile URL placeholder",
        },
        {
          id: "sug_2",
          category: "structure",
          title: "Add 2-3 measurable achievements",
          description: "Bullets containing metrics (e.g. 'improved performance by 25%') make your experience stand out.",
          fixPrompt: "Incorporate action-oriented achievement metrics",
        },
        {
          id: "sug_3",
          category: "relevance",
          title: "Make summary more role-specific",
          description: "Tailor your professional summary specifically to your target title.",
          fixPrompt: "Tailor summary to target role",
        },
      ],
    }
  )

  const [matchAnalysis, setMatchAnalysis] = useState<JobMatchAnalysis | null>(
    data.jobMatch || null
  )

  const handleRefreshScore = async () => {
    setAnalyzingScore(true)
    try {
      const res = await fetch("/api/resume/ai-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyzeScore", resume: data }),
      })
      const resData = await res.json()
      if (resData.score) {
        setScore(resData.score)
      }
    } catch (e) {
      console.error("Failed to analyze score", e)
    } finally {
      setAnalyzingScore(false)
    }
  }

  const handleAnalyzeJobMatch = async () => {
    if (!jobDescription.trim()) return
    setAnalyzingJd(true)
    try {
      const res = await fetch("/api/resume/ai-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "matchJobDescription", resume: data, jobDescription }),
      })
      const resData = await res.json()
      if (resData.analysis) {
        setMatchAnalysis(resData.analysis)
      }
    } catch (e) {
      console.error("Failed to analyze job match", e)
    } finally {
      setAnalyzingJd(false)
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-card border-l border-border/60 overflow-y-auto p-4 space-y-6 select-none">
      {/* Resume Score Card */}
      <div className="rounded-2xl border border-border/80 bg-background/60 p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-xs font-bold text-foreground">FindUrAI Resume Score</h3>
              <p className="text-[10px] text-muted-foreground">AI-based ATS & Quality Assessment</p>
            </div>
          </div>
          <button
            onClick={handleRefreshScore}
            disabled={analyzingScore}
            className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Recalculate Score"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzingScore ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Score Gauge */}
        <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-foreground">{score.total}</span>
            <span className="text-xs text-muted-foreground font-semibold">/ 100</span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {score.total >= 85 ? "Great Draft" : score.total >= 70 ? "Good Candidate" : "Needs Polish"}
          </span>
        </div>

        {/* Category Progress Bars */}
        <div className="space-y-2 text-[11px]">
          {Object.entries(score.breakdown).map(([cat, val]) => (
            <div key={cat} className="space-y-1">
              <div className="flex justify-between text-muted-foreground capitalize">
                <span>{cat}</span>
                <span className="font-semibold text-foreground">{val}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${val}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions list */}
        {score.suggestions?.length > 0 && (
          <div className="pt-2 border-t border-border/60 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Fix Suggestions ({score.suggestions.length})
            </span>
            <div className="space-y-2">
              {score.suggestions.map((sug) => (
                <div key={sug.id} className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-xs text-foreground leading-snug">{sug.title}</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{sug.description}</p>
                  <button
                    onClick={() => onFixSuggestion && onFixSuggestion(sug.id, sug.fixPrompt)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                  >
                    <Wand2 className="w-3 h-3" />
                    Fix with AI
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Job Description Analyzer (MVP Lite) */}
      <div className="rounded-2xl border border-border/80 bg-background/60 p-4 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-xs font-bold text-foreground">Job Description Matcher</h3>
            <p className="text-[10px] text-muted-foreground">Compare resume against target posting</p>
          </div>
        </div>

        <div>
          <textarea
            rows={3}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste target job description text here..."
            className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleAnalyzeJobMatch}
            disabled={analyzingJd || !jobDescription.trim()}
            className="w-full mt-2 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {analyzingJd ? "Analyzing Match..." : "Analyze Match Score"}
          </button>
        </div>

        {matchAnalysis && (
          <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-foreground">Job Match Result</span>
              <span className="text-sm font-extrabold text-indigo-400">{matchAnalysis.matchScore}%</span>
            </div>

            {/* Matching Skills */}
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-400">Matching Skills</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {matchAnalysis.matchingSkills.map((sk, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Keywords */}
            {matchAnalysis.missingKeywords?.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-400">Missing Keywords</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {matchAnalysis.missingKeywords.map((kw, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                      ⚠ {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
