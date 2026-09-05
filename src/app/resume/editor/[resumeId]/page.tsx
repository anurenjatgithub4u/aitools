"use client"

import { useState, useEffect, use } from "react"
import { useRouter, notFound } from "next/navigation"
import { ResumeData } from "@/types/resume"
import { getResumeById, saveResume, duplicateResume } from "@/lib/resume/storage"
import { EditorSidebar } from "@/components/resume/EditorSidebar"
import { ResumeCanvas } from "@/components/resume/ResumeCanvas"
import { AIPanel } from "@/components/resume/AIPanel"
import { ArrowLeft, Sparkles, SlidersHorizontal, ShieldCheck } from "lucide-react"
import { RESUME_BUILDER_ENABLED } from "@/lib/resume/config"

export default function ResumeEditorPage({ params }: { params: Promise<{ resumeId: string }> }) {
  if (!RESUME_BUILDER_ENABLED) notFound()

  const resolvedParams = use(params)
  const resumeId = resolvedParams.resumeId
  const router = useRouter()

  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("saved")
  const [mobileTab, setMobileTab] = useState<"editor" | "canvas" | "ai">("canvas")
  const [loading, setLoading] = useState(true)

  // Undo / Redo history state
  const [history, setHistory] = useState<ResumeData[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)

  // Load from local storage or create fallback
  useEffect(() => {
    if (!resumeId) return
    const existing = getResumeById(resumeId)
    if (existing) {
      setResumeData(existing)
      setHistory([existing])
      setHistoryIndex(0)
    } else {
      // Redirect to create if not found
      router.push("/resume/create")
    }
    setLoading(false)
  }, [resumeId, router])

  // Handle Updates & Auto-Save with history
  const handleUpdateResume = (updated: ResumeData, isHistoryAction = false) => {
    setResumeData(updated)
    setSaveStatus("saving")
    saveResume(updated)

    if (!isHistoryAction) {
      setHistory((prev) => {
        const nextHist = prev.slice(0, historyIndex + 1)
        return [...nextHist, updated]
      })
      setHistoryIndex((prev) => prev + 1)
    }

    setTimeout(() => setSaveStatus("saved"), 600)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1
      const targetState = history[newIdx]
      setHistoryIndex(newIdx)
      handleUpdateResume(targetState, true)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1
      const targetState = history[newIdx]
      setHistoryIndex(newIdx)
      handleUpdateResume(targetState, true)
    }
  }

  const handleDuplicate = () => {
    if (!resumeData) return
    const copy = duplicateResume(resumeData.id)
    if (copy) {
      router.push(`/resume/editor/${copy.id}`)
    }
  }

  const handleApplyAiImprovement = async (fieldPath: string, instruction: string) => {
    if (!resumeData) return
    setSaveStatus("saving")

    try {
      const targetText = fieldPath === "summary" ? resumeData.summary : ""
      const res = await fetch("/api/resume/ai-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "improveText",
          text: targetText,
          targetRole: resumeData.targetRole,
          instruction,
        }),
      })

      const data = await res.json()
      if (data.result) {
        if (fieldPath === "summary") {
          handleUpdateResume({ ...resumeData, summary: data.result })
        }
      }
    } catch (e) {
      console.error("AI improvement failed", e)
    } finally {
      setSaveStatus("saved")
    }
  }

  if (loading || !resumeData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Sparkles className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-medium">Opening FindUrAI Resume Editor...</p>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Mobile Top Controls Bar */}
      <div className="md:hidden h-12 bg-neutral-900 border-b border-neutral-800 px-3 flex items-center justify-between text-white shrink-0">
        <button
          onClick={() => router.push("/resume/create")}
          className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex gap-1 bg-neutral-800 p-1 rounded-lg">
          <button
            onClick={() => setMobileTab("editor")}
            className={`px-2.5 py-1 text-xs rounded font-semibold ${mobileTab === "editor" ? "bg-primary text-white" : "text-neutral-400"}`}
          >
            Edit
          </button>
          <button
            onClick={() => setMobileTab("canvas")}
            className={`px-2.5 py-1 text-xs rounded font-semibold ${mobileTab === "canvas" ? "bg-primary text-white" : "text-neutral-400"}`}
          >
            Canvas
          </button>
          <button
            onClick={() => setMobileTab("ai")}
            className={`px-2.5 py-1 text-xs rounded font-semibold ${mobileTab === "ai" ? "bg-primary text-white" : "text-neutral-400"}`}
          >
            AI Score
          </button>
        </div>
      </div>

      {/* Main 3-Column Desktop Grid Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Sidebar (3 Cols) */}
        <div
          className={`${
            mobileTab === "editor" ? "block" : "hidden"
          } md:block md:col-span-3 lg:col-span-3 h-full border-r border-border/60 z-10`}
        >
          <EditorSidebar
            data={resumeData}
            onChange={handleUpdateResume}
            onApplyAiImprovement={handleApplyAiImprovement}
          />
        </div>

        {/* Center Canvas (6 Cols) */}
        <div
          className={`${
            mobileTab === "canvas" ? "block" : "hidden"
          } md:block md:col-span-6 lg:col-span-6 h-full overflow-hidden`}
        >
          <ResumeCanvas
            data={resumeData}
            saveStatus={saveStatus}
            onUpdate={handleUpdateResume}
            onDuplicate={handleDuplicate}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
          />
        </div>

        {/* Right Sidebar AI Panel (3 Cols) */}
        <div
          className={`${
            mobileTab === "ai" ? "block" : "hidden"
          } md:block md:col-span-3 lg:col-span-3 h-full border-l border-border/60 z-10`}
        >
          <AIPanel
            data={resumeData}
            onFixSuggestion={(sugId, fixPrompt) => handleApplyAiImprovement("summary", fixPrompt)}
            onUpdateResume={handleUpdateResume}
          />
        </div>
      </div>
    </div>
  )
}
