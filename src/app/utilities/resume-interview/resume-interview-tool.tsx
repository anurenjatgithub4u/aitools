"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { ResumeUpload } from "@/components/resume-interview/resume-upload"
import { AnalysisView } from "@/components/resume-interview/analysis-view"
import { RoleModePicker } from "@/components/resume-interview/role-mode-picker"
import { InterviewSession } from "@/components/resume-interview/interview-session"
import { ReportView } from "@/components/resume-interview/report-view"
import type {
  InterviewMode,
  InterviewQuestion,
  InterviewReport,
  InterviewTurn,
  ResumeAnalysis,
  ResumeProfile,
} from "@/lib/resume-interview/types"

type Screen = "upload" | "review" | "interview" | "report"

export function ResumeInterviewTool() {
  const [screen, setScreen] = useState<Screen>("upload")

  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadBusyLabel, setUploadBusyLabel] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [profile, setProfile] = useState<ResumeProfile | null>(null)
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)

  const [targetRole, setTargetRole] = useState("")
  const [mode, setMode] = useState<InterviewMode>("standard")
  const [starting, setStarting] = useState(false)
  // Snapshotted once the interview actually starts, so the rest of the
  // session stays consistent even if the picker state above could somehow
  // change later (the picker is unmounted once screen === "interview", but
  // this removes the footgun regardless of how that invariant might shift).
  const [activeRole, setActiveRole] = useState("")
  const [activeMode, setActiveMode] = useState<InterviewMode>("standard")

  const [history, setHistory] = useState<InterviewTurn[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null)
  const [answer, setAnswer] = useState("")
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(10)
  const [interviewLoading, setInterviewLoading] = useState(false)
  const [interviewError, setInterviewError] = useState<string | null>(null)

  const [report, setReport] = useState<InterviewReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const resetAll = () => {
    setScreen("upload")
    setProfile(null)
    setAnalysis(null)
    setTargetRole("")
    setHistory([])
    setCurrentQuestion(null)
    setAnswer("")
    setReport(null)
    setUploadError(null)
  }

  const handleFileSelected = async (file: File) => {
    setUploadError(null)
    setUploadBusy(true)
    setUploadBusyLabel("Reading your resume…")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const extractRes = await fetch("/api/resume-interview/extract", { method: "POST", body: formData })
      const extractData = await extractRes.json()
      if (!extractRes.ok) throw new Error(extractData.error || "Couldn't read this file.")

      setUploadBusyLabel("Analyzing your experience…")
      const analyzeRes = await fetch("/api/resume-interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: extractData.text }),
      })
      const analyzeData = await analyzeRes.json()
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Couldn't analyze this resume.")

      setProfile(analyzeData.profile)
      setAnalysis(analyzeData.analysis)
      setTargetRole(analyzeData.profile.suggestedRole)
      setScreen("review")
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      setUploadBusy(false)
    }
  }

  const startInterview = async () => {
    if (!profile) return
    setStarting(true)
    setInterviewError(null)
    try {
      const res = await fetch("/api/resume-interview/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, targetRole, mode, history: [] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't start the interview.")
      setActiveRole(targetRole)
      setActiveMode(mode)
      setHistory([])
      setCurrentQuestion(data.nextQuestion)
      setQuestionNumber(data.questionNumber)
      setTotalQuestions(data.totalQuestions)
      setAnswer("")
      setScreen("interview")
    } catch (e) {
      setInterviewError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      setStarting(false)
    }
  }

  const submitAnswer = async () => {
    if (!profile || !currentQuestion || !answer.trim()) return
    setInterviewLoading(true)
    setInterviewError(null)
    try {
      const res = await fetch("/api/resume-interview/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          targetRole: activeRole,
          mode: activeMode,
          history,
          currentQuestion,
          currentAnswer: answer,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Something went wrong evaluating your answer.")

      const updatedHistory = data.evaluatedTurn ? [...history, data.evaluatedTurn] : history
      setHistory(updatedHistory)

      if (data.done) {
        setCurrentQuestion(null)
        await generateReport(updatedHistory)
      } else {
        setCurrentQuestion(data.nextQuestion)
        setQuestionNumber(data.questionNumber)
        setTotalQuestions(data.totalQuestions)
        setAnswer("")
      }
    } catch (e) {
      setInterviewError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      setInterviewLoading(false)
    }
  }

  const generateReport = async (finalHistory: InterviewTurn[]) => {
    if (!profile) return
    setReportLoading(true)
    try {
      const res = await fetch("/api/resume-interview/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, targetRole: activeRole, history: finalHistory }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't generate your report.")
      setReport(data.report)
      setScreen("report")
    } catch (e) {
      setInterviewError(e instanceof Error ? e.message : "Something went wrong generating your report.")
      setScreen("review")
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {screen !== "upload" && (
        <button
          onClick={resetAll}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Start over with a new resume
        </button>
      )}

      {screen === "upload" && (
        <div className="rounded-2xl border border-border bg-background p-6 sm:p-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight mb-1">Upload your resume</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ll analyze your experience and prepare a mock interview based on what you&apos;ve actually written.
            </p>
          </div>
          <ResumeUpload onFileSelected={handleFileSelected} busy={uploadBusy} busyLabel={uploadBusyLabel} error={uploadError} />
        </div>
      )}

      {screen === "review" && profile && analysis && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-background p-6 sm:p-10">
            <AnalysisView analysis={analysis} />
          </div>
          <RoleModePicker
            suggestedRole={profile.suggestedRole}
            targetRole={targetRole}
            onTargetRoleChange={setTargetRole}
            mode={mode}
            onModeChange={setMode}
            onStart={startInterview}
            starting={starting}
          />
          {interviewError && <p className="text-sm text-destructive">{interviewError}</p>}
        </div>
      )}

      {screen === "interview" && currentQuestion && (
        <div className="rounded-2xl border border-border bg-background p-6 sm:p-10">
          <InterviewSession
            question={currentQuestion}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={submitAnswer}
            loading={interviewLoading || reportLoading}
            error={interviewError}
          />
        </div>
      )}

      {screen === "report" && report && (
        <div className="rounded-2xl border border-border bg-background p-6 sm:p-10">
          <ReportView
            report={report}
            onPracticeAgain={() => setScreen("review")}
            onNewResume={resetAll}
          />
        </div>
      )}
    </div>
  )
}
