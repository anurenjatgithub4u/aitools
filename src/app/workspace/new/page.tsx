"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderTree,
  Loader2,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { workspaceApi } from "@/lib/workspace"
import type { ClarificationAnswer, PreviewFolderNode, PreviewStructure } from "@/types/workspace"

const EXAMPLES = [
  "Learn AI Engineering in 6 months",
  "Manage my content ideas for 2 months",
  "Build an AI SaaS",
  "Crack FAANG interviews",
  "Plan a Europe trip",
]

type Question = { question: string; options: string[]; multiSelect?: boolean }

// V4 Step 4: the depth-choice question is appended by /api/workspace/classify
// (not hand-built here) so its exact text lives there — matched by text since
// it's just one more entry in the same clarificationAnswers array everything
// else already flows through. Defaults to "detailed" per spec when skipped
// or never asked (e.g. small-complexity goals don't get this question at all).
const DEPTH_QUESTION_TEXT = "How detailed would you like your workspace?"
function deriveDepthChoice(finalAnswers: { question: string; answer: string }[]): "sample" | "detailed" | "complete" {
  const answer = finalAnswers.find((a) => a.question === DEPTH_QUESTION_TEXT)?.answer || ""
  if (answer.startsWith("Sample")) return "sample"
  if (answer.startsWith("Complete")) return "complete"
  return "detailed"
}
type Step = "input" | "classifying" | "direct_answer" | "ambiguous" | "clarify" | "previewing" | "preview" | "generating"

const PREVIEW_MESSAGES = [
  "Understanding your goal…",
  "Mapping out the milestones…",
  "Sketching the folder structure…",
  "Matching files to each phase…",
  "Almost ready to review…",
]

const GENERATE_MESSAGES = [
  "Setting up your workspace…",
  "Writing your folder guides…",
  "Generating your first files…",
  "Wiring up your tracker & roadmap…",
  "Putting on the finishing touches…",
]

function LoadingState({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    setIndex(0)
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 1800)
    return () => clearInterval(id)
  }, [messages])
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/20" />
        <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </span>
      </div>
      <p key={index} className="animate-in fade-in text-base font-medium text-foreground/80 duration-300">
        {messages[index]}
      </p>
      <div className="flex gap-2">
        {messages.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? "w-5 bg-primary" : "w-2 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function PreviewTree({ nodes, depth = 0 }: { nodes: PreviewFolderNode[]; depth?: number }) {
  return (
    <div className={`flex flex-col gap-3 ${depth > 0 ? "ml-2.5 border-l border-border/50 pl-4" : ""}`}>
      {nodes.map((n, i) => (
        <div key={i}>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <span>{n.icon}</span> {n.title}
          </p>
          {n.purpose && <p className="ml-6 text-xs text-muted-foreground">{n.purpose}</p>}
          {n.exampleFiles && n.exampleFiles.length > 0 && (
            <ul className="ml-2.5 mt-1.5 flex flex-col gap-1 border-l border-border/40 pl-3.5">
              {n.exampleFiles.map((f, fi) => (
                <li key={fi} className="flex items-center gap-1.5 text-xs text-foreground/70">
                  <FileText className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                  {f}
                </li>
              ))}
            </ul>
          )}
          {n.folders.length > 0 && (
            <div className="mt-2">
              <PreviewTree nodes={n.folders} depth={depth + 1} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function GenerateWorkspacePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [goal, setGoal] = useState("")
  const [step, setStep] = useState<Step>("input")
  const [error, setError] = useState("")

  const [category, setCategory] = useState<string | null>(null)
  const [complexity, setComplexity] = useState<"small" | "medium" | "large" | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<ClarificationAnswer[]>([])
  const [directAnswer, setDirectAnswer] = useState("")
  const [disambiguation, setDisambiguation] = useState<Question | null>(null)
  const [ambiguousRetried, setAmbiguousRetried] = useState(false)

  const [customOpen, setCustomOpen] = useState(false)
  const [customText, setCustomText] = useState("")
  const [customAdded, setCustomAdded] = useState(false)
  const [multiSelected, setMultiSelected] = useState<string[]>([])

  const [preview, setPreview] = useState<PreviewStructure | null>(null)
  const [correction, setCorrection] = useState("")
  // Workspace Generation V3: kept separate from `goal` on purpose — goal is
  // WHAT the topic is (drives folder/file naming), this is HOW it should be
  // structured (drives section format/depth). Mixing the two into one field
  // is what caused generic, topic-less folder names when a user pasted a
  // pure format spec into the goal box.
  const [generationRequirements, setGenerationRequirements] = useState("")
  const [requirementsOpen, setRequirementsOpen] = useState(false)

  // Prefill from ?goal=... (e.g. the homepage "See the difference" CTA) —
  // read directly off the URL instead of useSearchParams so this page
  // doesn't need a Suspense boundary.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("goal")
    if (q && q.trim()) setGoal(q.trim().slice(0, 300))
  }, [])

  const reset = () => {
    setStep("input")
    setError("")
    setCategory(null)
    setComplexity(null)
    setQuestions([])
    setQuestionIndex(0)
    setAnswers([])
    setDirectAnswer("")
    setDisambiguation(null)
    setAmbiguousRetried(false)
    setCustomOpen(false)
    setCustomText("")
    setCustomAdded(false)
    setMultiSelected([])
    setPreview(null)
    setCorrection("")
    setGenerationRequirements("")
    setRequirementsOpen(false)
  }

  const applyClassification = (result: {
    intent: "workspace" | "direct_answer" | "ambiguous"
    category?: string
    complexity?: "small" | "medium" | "large"
    directAnswer?: string
    disambiguationQuestion?: Question
    clarificationQuestions?: Question[]
  }) => {
    if (result.intent === "direct_answer") {
      setDirectAnswer(result.directAnswer || "")
      setStep("direct_answer")
      return
    }
    if (result.intent === "ambiguous" && result.disambiguationQuestion) {
      setDisambiguation(result.disambiguationQuestion)
      setStep("ambiguous")
      return
    }
    // workspace
    const qs = result.clarificationQuestions || []
    setCategory(result.category || "other")
    setComplexity(result.complexity || null)
    setQuestions(qs)
    setQuestionIndex(0)
    setAnswers([])
    setMultiSelected([])
    if (qs.length === 0) {
      runPreview(result.category || "other", [])
    } else {
      setStep("clarify")
    }
  }

  const classify = async (text: string, forceWorkspace = false) => {
    setStep("classifying")
    setError("")
    try {
      const result = await workspaceApi.classifyGoal(text, forceWorkspace)
      applyClassification(result)
    } catch (e: any) {
      setError(e.message || "Something went wrong understanding your goal.")
      setStep("input")
    }
  }

  const handleContinue = () => {
    if (!goal.trim() || step === "classifying") return
    classify(goal.trim())
  }

  const handleDisambiguationPick = (option: string) => {
    if (ambiguousRetried) {
      classify(goal.trim(), true)
      return
    }
    setAmbiguousRetried(true)
    classify(`${goal.trim()} — ${option}`)
  }

  const handleUpsell = () => classify(goal.trim(), true)

  const advanceQuestion = (qa: ClarificationAnswer) => {
    const next = [...answers, qa]
    setAnswers(next)
    setCustomOpen(false)
    setCustomText("")
    setCustomAdded(false)
    setMultiSelected([])
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex(questionIndex + 1)
    } else {
      runPreview(category || "other", next)
    }
  }

  const handleClarificationPick = (option: string) => {
    advanceQuestion({ question: questions[questionIndex].question, answer: option })
  }

  const toggleMultiOption = (option: string) => {
    setMultiSelected((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]))
  }

  const handleMultiContinue = () => {
    if (multiSelected.length === 0) return
    advanceQuestion({ question: questions[questionIndex].question, answer: multiSelected.join(", ") })
  }

  const handleAddCustomOption = () => {
    const value = customText.trim()
    if (!value) return
    setQuestions((prev) => prev.map((q, i) => (i === questionIndex ? { ...q, options: [...q.options, value] } : q)))
    setCustomAdded(true)
    if (questions[questionIndex]?.multiSelect) {
      setMultiSelected((prev) => [...prev, value])
      setCustomOpen(false)
      setCustomText("")
    } else {
      handleClarificationPick(value)
    }
  }

  const handleSkip = () => runPreview(category || "other", answers)

  const runPreview = async (cat: string, finalAnswers: ClarificationAnswer[], correctionText = "", prev: PreviewStructure | null = null) => {
    setStep("previewing")
    setError("")
    try {
      const result = await workspaceApi.previewWorkspace(goal.trim(), {
        category: cat,
        complexity: complexity || undefined,
        depthChoice: deriveDepthChoice(finalAnswers),
        clarificationAnswers: finalAnswers,
        correction: correctionText || undefined,
        previousStructure: prev || undefined,
        generationRequirements: generationRequirements.trim() || undefined,
      })
      setCategory(cat)
      setAnswers(finalAnswers)
      setPreview(result)
      setCorrection("")
      setStep("preview")
    } catch (e: any) {
      setError(e.message || "Something went wrong previewing your workspace.")
      setStep("input")
    }
  }

  const handleCorrectionSubmit = () => {
    if (!correction.trim() || !preview) return
    runPreview(category || "other", answers, correction.trim(), preview)
  }

  // Direct field editing (spec: "The plan must be editable. Any user edits
  // should automatically update the generated workspace.") — edits happen
  // locally on the reviewed plan; the next generate call uses whatever is
  // in state, so nothing further is needed to "apply" an edit. Milestones
  // still flow through into the saved plan (Dashboard/Tracker/Roadmap use
  // them) — they're just no longer hand-edited on this screen.
  const updateWorkspaceMeta = (changes: Partial<Pick<PreviewStructure, "workspaceName" | "icon">>) => {
    setPreview((prev) => (prev ? { ...prev, ...changes } : prev))
  }

  const handleConfirm = () => generate(category || "other", answers, preview)

  const generate = async (cat: string, finalAnswers: ClarificationAnswer[], confirmedStructure: PreviewStructure | null) => {
    if (!user) return
    setStep("generating")
    setError("")
    try {
      const result = await workspaceApi.generateWorkspace(user.uid, goal.trim(), {
        category: cat,
        complexity: complexity || undefined,
        depthChoice: deriveDepthChoice(finalAnswers),
        clarificationAnswers: finalAnswers,
        confirmedStructure: confirmedStructure || undefined,
        generationRequirements: generationRequirements.trim() || undefined,
      })
      if (result.scopeNote) {
        try {
          sessionStorage.setItem(`findurai:scope-note:${result.project._id}`, result.scopeNote)
        } catch {
          /* ignore */
        }
      }
      router.push(`/workspace/projects/${result.project._id}`)
    } catch (e: any) {
      setError(e.message || "Something went wrong generating your workspace.")
      setStep("input")
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="text-4xl">✨</span>
        <h1 className="text-xl font-bold">Sign in to generate a workspace</h1>
        <Link href="/login">
          <Button className="rounded-full px-6">Sign in</Button>
        </Link>
      </div>
    )
  }

  const loading = step === "classifying" || step === "previewing" || step === "generating"

  // Group execution folders under the phase (milestone) they belong to, so
  // the preview reads as a journey rather than a flat pile of folders.
  const phasedExecutionFolders: { milestone: string; folders: PreviewFolderNode[] }[] = []
  const unphasedExecutionFolders: PreviewFolderNode[] = []
  if (preview) {
    for (const m of preview.plan.milestones) {
      const group = preview.executionFolders.filter((f) => f.milestone === m.title)
      if (group.length > 0) phasedExecutionFolders.push({ milestone: m.title, folders: group })
    }
    const phasedTitles = new Set(preview.plan.milestones.map((m) => m.title))
    unphasedExecutionFolders.push(...preview.executionFolders.filter((f) => !phasedTitles.has(f.milestone || "")))
  }

  return (
    <div
      className={`mx-auto flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-10 py-10 px-4 ${
        step === "preview" ? "max-w-3xl" : "max-w-2xl"
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
          <Sparkles className="h-10 w-10" />
        </div>
        <h1 className="font-display text-5xl font-bold tracking-tight">
          {step === "input" || step === "classifying"
            ? "What are you trying to achieve?"
            : step === "direct_answer"
              ? "Here's your answer"
              : step === "ambiguous"
                ? "Quick check"
                : step === "clarify"
                  ? "A couple quick questions"
                  : step === "previewing"
                    ? "Sketching the structure"
                    : step === "preview"
                      ? "Here's the shape"
                      : "Building your workspace"}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl">
          {step === "input" || step === "classifying"
            ? "Describe your goal and AI will build you a personalized workspace with folders, templates, and starter content — skipping the blank page entirely."
            : step === "direct_answer"
              ? "This looked like a quick question, not a multi-step project — so here's a direct answer."
              : step === "ambiguous"
                ? "Just so your workspace comes out right."
                : step === "clarify"
                  ? "Tap the option that fits best — this shapes the workspace AI builds for you."
                  : step === "previewing"
                    ? "A cheap first pass — no full content yet."
                    : step === "preview"
                      ? "Anything to change before we build it out?"
                      : "Applying everything you confirmed."}
        </p>
      </div>

      {(step === "input" || step === "classifying") && (
        <>
          <div className="w-full rounded-2xl border border-border/50 bg-card/60 p-6 shadow-xl backdrop-blur-sm sm:p-8">
            <div className="flex flex-col gap-4">
              <Textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Learn AI Engineering in 6 months, or Plan a marketing campaign..."
                rows={3}
                disabled={loading}
                className="resize-none text-center text-lg border-primary/20 bg-background/50 focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/50 transition-all rounded-xl p-4"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleContinue()
                  }
                }}
              />
              {error && <p className="text-sm text-destructive font-medium text-center">{error}</p>}
              <Button
                onClick={handleContinue}
                disabled={!goal.trim() || loading}
                size="lg"
                className="w-full gap-2 rounded-xl py-6 text-lg font-semibold shadow-md transition-all hover:shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0"
              >
                {step === "classifying" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Understanding your goal…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" /> Continue
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="w-full">
            {requirementsOpen ? (
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-4">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <Wand2 className="h-3.5 w-3.5 text-primary" /> Custom structure requirements (optional)
                </p>
                <Textarea
                  value={generationRequirements}
                  onChange={(e) => setGenerationRequirements(e.target.value)}
                  placeholder="Paste an exact section list, folder format, or template every file should follow — sections, ordering, depth. Your goal above should still say WHAT the topic is; put HOW you want it structured here."
                  rows={5}
                  disabled={loading}
                  className="resize-none border-primary/20 bg-background/50 text-sm"
                />
              </div>
            ) : (
              <button
                onClick={() => setRequirementsOpen(true)}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 cursor-pointer"
              >
                <Wand2 className="h-3 w-3" /> Add custom structure requirements (optional)
              </button>
            )}
          </div>

          <div className="flex w-full flex-col items-center gap-4">
            <p className="text-sm font-medium text-muted-foreground">Try one of these examples</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setGoal(ex)}
                  disabled={loading}
                  className="rounded-full border border-border/50 bg-background/40 px-4 py-2 text-sm text-foreground/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {step === "direct_answer" && (
        <div className="flex w-full flex-col gap-5">
          <div className="w-full rounded-2xl border border-border/50 bg-card/60 p-6 shadow-xl backdrop-blur-sm sm:p-8">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">{directAnswer}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleUpsell}
              size="lg"
              className="gap-2 rounded-xl px-8 py-6 text-base font-semibold shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0"
            >
              <Sparkles className="h-5 w-5" /> Turn this into a full workspace?
            </Button>
            <button onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Ask something else
            </button>
          </div>
        </div>
      )}

      {step === "ambiguous" && disambiguation && (
        <div className="flex w-full flex-col items-center gap-5">
          <p className="text-lg font-medium">{disambiguation.question}</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {disambiguation.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleDisambiguationPick(opt)}
                disabled={loading}
                className="rounded-full border border-border/60 bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
              >
                {opt}
              </button>
            ))}
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          <button onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Start over
          </button>
        </div>
      )}

      {step === "clarify" && questions[questionIndex] && (
        <div className="flex w-full flex-col items-center gap-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Question {questionIndex + 1} of {questions.length}
          </p>
          <p className="text-lg font-medium text-center">{questions[questionIndex].question}</p>
          {questions[questionIndex].multiSelect && (
            <p className="-mt-3 text-xs text-muted-foreground">Tap all that apply</p>
          )}
          <div className="flex flex-wrap justify-center gap-2.5">
            {questions[questionIndex].options.map((opt) => {
              const isMulti = questions[questionIndex].multiSelect
              const selected = isMulti && multiSelected.includes(opt)
              return (
                <button
                  key={opt}
                  onClick={() => (isMulti ? toggleMultiOption(opt) : handleClarificationPick(opt))}
                  className={`flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-card hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {opt}
                </button>
              )
            })}
            {!customAdded && !customOpen && (
              <button
                onClick={() => setCustomOpen(true)}
                className="flex items-center gap-1 rounded-full border border-dashed border-border/60 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> Add your own option
              </button>
            )}
          </div>
          {customOpen && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type your own answer..."
                onKeyDown={(e) => e.key === "Enter" && handleAddCustomOption()}
                className="w-64 rounded-full border border-primary/30 bg-background px-4 py-2 text-sm outline-none focus:border-primary/60"
              />
              <Button size="sm" disabled={!customText.trim()} onClick={handleAddCustomOption}>
                Use this
              </Button>
            </div>
          )}
          {questions[questionIndex].multiSelect && (
            <Button
              onClick={handleMultiContinue}
              disabled={multiSelected.length === 0}
              size="lg"
              className="gap-2 rounded-xl px-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <button onClick={handleSkip} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Skip — just generate something reasonable <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {step === "previewing" && (
        <div className="flex flex-col items-center gap-4">
          <LoadingState messages={PREVIEW_MESSAGES} />
          {error && <p className="text-sm text-destructive font-medium text-center">{error}</p>}
        </div>
      )}

      {step === "preview" && preview && (
        <div className="flex w-full flex-col gap-5 text-left">
          {/* Workspace name */}
          <div className="flex items-center gap-2">
            <input
              value={preview.icon}
              onChange={(e) => updateWorkspaceMeta({ icon: e.target.value.slice(0, 4) })}
              className="w-11 shrink-0 rounded-lg border border-transparent bg-transparent text-center text-2xl outline-none hover:border-border focus:border-border"
              aria-label="Workspace icon"
            />
            <input
              value={preview.workspaceName}
              onChange={(e) => updateWorkspaceMeta({ workspaceName: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-xl font-bold outline-none"
              aria-label="Workspace name"
            />
          </div>

          {/* Sample structure notice — a light, professional framing instead of
              an editable plan/deliverables/milestones document; the goal is to
              get people looking at (and trusting) the folder structure below,
              not filling out a form. */}
          <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-xl backdrop-blur-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderTree className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">This is a sample folder structure</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Shaped around your goal
                {preview.plan.estimatedDuration && (
                  <span className="mx-1.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 align-middle text-xs font-semibold text-primary">
                    <CalendarClock className="h-3 w-3" /> {preview.plan.estimatedDuration}
                  </span>
                )}
                . You can rename, add, or remove folders and files once your workspace is created — treat this
                as a starting point, not a final plan.
              </p>
            </div>
          </div>

          {/* Folder structure — read-only preview, shaped by the plan above */}
          <div className="w-full rounded-2xl border border-border/50 bg-card/40 p-6">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <FolderTree className="h-4 w-4" /> Folder Structure
            </p>
            <div className="flex flex-col gap-4">
              {phasedExecutionFolders.map((group, i) => (
                <div key={group.milestone}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    Phase {i + 1} · {group.milestone}
                  </p>
                  <PreviewTree nodes={group.folders} />
                </div>
              ))}
              {unphasedExecutionFolders.length > 0 && (
                <div>
                  {phasedExecutionFolders.length > 0 && (
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Other
                    </p>
                  )}
                  <PreviewTree nodes={unphasedExecutionFolders} />
                </div>
              )}
            </div>
            {preview.knowledgeFolders.length > 0 && (
              <div className="mt-3 border-t border-border/60 pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Workspace Assets
                </p>
                <PreviewTree nodes={preview.knowledgeFolders} />
              </div>
            )}

            {/* Correction field lives right under the structure it edits */}
            <div className="mt-5 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <Wand2 className="h-3.5 w-3.5 text-primary" /> Anything bigger to change before we build it out?
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                  placeholder="Add a folder for X, remove Y, make it more beginner-focused..."
                  onKeyDown={(e) => e.key === "Enter" && handleCorrectionSubmit()}
                  disabled={loading}
                  className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:border-primary/50 disabled:opacity-50"
                />
                <Button variant="outline" disabled={!correction.trim() || loading} onClick={handleCorrectionSubmit}>
                  Update
                </Button>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive font-medium text-center">{error}</p>}

          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              size="lg"
              className="gap-2 rounded-xl px-8 py-6 text-base font-semibold shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Looks good, build it <ChevronRight className="h-5 w-5" />
                </>
              )}
            </Button>
            <button onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Start over
            </button>
          </div>
        </div>
      )}

      {step === "generating" && (
        <div className="flex flex-col items-center gap-4">
          <LoadingState messages={GENERATE_MESSAGES} />
          {error && <p className="text-sm text-destructive font-medium text-center">{error}</p>}
        </div>
      )}
    </div>
  )
}
