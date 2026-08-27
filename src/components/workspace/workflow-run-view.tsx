"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  Circle,
  Clipboard,
  ClipboardCheck,
  Clock,
  PartyPopper,
  Pencil,
  Repeat as RepeatIcon,
  Sparkles,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkflowDiagram } from "@/components/workspace/workflow-diagram"
import { workspaceApi } from "@/lib/workspace"
import type { WorkspaceItemDto, WorkflowStep } from "@/types/workspace"

// Workflow Redesign spec: a workflow is an execution flow, not a document.
// Four sections — Overview (outcome first, no difficulty/complexity noise),
// Execution Flow (the live diagram, current step highlighted), Workflow
// Steps (one step's detail at a time — prompt + act buttons + mark complete),
// Completion (celebrate, then point at what's next). Step completion feeds
// the SAME item.completionStatus the rest of the app already tracks.

const AI_TARGETS = [
  { key: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
  { key: "claude", label: "Claude", url: "https://claude.ai/new" },
] as const

function stepNumber(steps: WorkflowStep[], id: string): number {
  return steps.findIndex((s) => s.id === id) + 1
}

export function WorkflowRunView({
  item,
  userId,
  onUpdated,
  onEdit,
}: {
  item: WorkspaceItemDto
  userId?: string
  onUpdated: (item: WorkspaceItemDto) => void
  onEdit: () => void
}) {
  const td = item.typeData || {}
  const steps: WorkflowStep[] = td.steps || []
  const doneCount = steps.filter((s) => s.done).length
  const allDone = steps.length > 0 && doneCount === steps.length
  const currentStep = steps.find((s) => !s.done) || null

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [nextWorkflow, setNextWorkflow] = useState<WorkspaceItemDto | null>(null)

  // Only an explicit click pins the selection — otherwise it tracks whichever
  // step is current, so it stays valid as steps are added/removed/completed.
  const effectiveSelectedId =
    selectedId && steps.some((s) => s.id === selectedId) ? selectedId : currentStep?.id || steps[0]?.id || null

  useEffect(() => {
    if (!allDone || !userId || !item.projectId) return
    workspaceApi
      .listItems(userId, { projectId: item.projectId, type: "workflow" })
      .then((items) => {
        const next = items.find((i) => i._id !== item._id && i.completionStatus !== "completed")
        setNextWorkflow(next || null)
      })
      .catch(() => {})
  }, [allDone, userId, item.projectId, item._id])

  const selectedStep = steps.find((s) => s.id === effectiveSelectedId) || null

  const persistSteps = async (nextSteps: WorkflowStep[]) => {
    if (!userId) return
    const allNowDone = nextSteps.length > 0 && nextSteps.every((s) => s.done)
    const anyDone = nextSteps.some((s) => s.done)
    const nextStatus = allNowDone ? "completed" : anyDone ? "in_progress" : "not_started"
    const updated = await workspaceApi.updateItem(item._id, {
      userId,
      typeData: { ...td, steps: nextSteps },
      completionStatus: nextStatus,
    })
    onUpdated(updated)
  }

  const toggleStep = (id: string) => {
    const nextSteps = steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    persistSteps(nextSteps)
    // Auto-advance to the next incomplete step after completing one.
    const justCompleted = nextSteps.find((s) => s.id === id)?.done
    if (justCompleted) {
      const next = nextSteps.find((s) => !s.done)
      if (next) setSelectedId(next.id)
    }
  }

  const handleCopy = async () => {
    if (!selectedStep?.instruction) return
    try {
      await navigator.clipboard.writeText(selectedStep.instruction)
      setCopied(selectedStep.id)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* ignore */
    }
  }

  const handleUseIn = (url: string) => {
    if (!selectedStep?.instruction) return
    navigator.clipboard.writeText(selectedStep.instruction).catch(() => {})
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const outcomeLines = (td.expectedResult || "").split("\n").map((l) => l.trim()).filter(Boolean)

  return (
    <div className="flex flex-col gap-4">
      {/* Completion — shown first so finishing never feels like a dead end */}
      {allDone && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold">Workflow Complete</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Steps Completed</p>
              <p className="mt-0.5 text-sm font-semibold">
                {doneCount}/{steps.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Completed On</p>
              <p className="mt-0.5 text-sm font-semibold">
                {(item.completedAt ? new Date(item.completedAt) : new Date()).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            {item.relatedItems.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">Related Notes</p>
                <p className="mt-0.5 text-sm font-semibold">{item.relatedItems.length}</p>
              </div>
            )}
          </div>
          {nextWorkflow && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-xs text-muted-foreground">Next Suggested Workflow</p>
                <p className="text-sm font-medium">{nextWorkflow.title}</p>
              </div>
              <Link href={`/workspace/items/${nextWorkflow._id}`}>
                <Button size="sm" className="gap-1.5">
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Section 1 — Overview: outcome first, no difficulty/complexity noise */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <span>{item.emoji}</span> {item.title}
            </h1>
            {(td.goal || item.description) && (
              <p className="mt-1.5 text-sm text-muted-foreground">{td.goal || item.description}</p>
            )}
          </div>
          <button
            onClick={onEdit}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {td.estimatedTime && (
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium">
              <Clock className="h-3 w-3 text-muted-foreground" /> {td.estimatedTime}
            </span>
          )}
          {td.repeat && (
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium">
              <RepeatIcon className="h-3 w-3 text-muted-foreground" /> {td.repeat}
            </span>
          )}
          {(td.aiModels || []).map((m) => (
            <span key={m} className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium">
              {m}
            </span>
          ))}
        </div>

        {outcomeLines.length > 0 && (
          <div className="mt-4 border-t border-border/60 pt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Target className="h-3 w-3" /> Expected Output
            </p>
            <ul className="flex flex-col gap-1">
              {outcomeLines.map((line, i) => (
                <li key={i} className="flex items-center gap-1.5 text-sm">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-primary" /> {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Section 2 — Execution Flow */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-1 flex items-center justify-between text-sm font-semibold text-muted-foreground">
          <span>Execution Flow</span>
          <span className="text-xs font-normal">
            {doneCount}/{steps.length} steps
          </span>
        </p>
        {steps.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No steps yet — click Edit to add some, or generate them with AI.
          </p>
        ) : (
          <WorkflowDiagram
            goal={undefined}
            expectedResult={undefined}
            steps={steps}
            onNodeClick={setSelectedId}
            currentStepId={currentStep?.id}
          />
        )}
      </div>

      {/* Section 3 — Workflow Steps: detail panel for the selected node */}
      {selectedStep && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step {stepNumber(steps, selectedStep.id)}
          </p>
          <h3 className={`text-base font-bold ${selectedStep.done ? "text-muted-foreground line-through" : ""}`}>
            {selectedStep.text || "Untitled step"}
          </h3>

          {selectedStep.purpose && (
            <p className="mt-2 text-sm text-muted-foreground">{selectedStep.purpose}</p>
          )}

          {selectedStep.instruction && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prompt</p>
              <p className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">{selectedStep.instruction}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {AI_TARGETS.map((t) => (
                  <Button key={t.key} size="sm" variant="outline" className="gap-1.5" onClick={() => handleUseIn(t.url)}>
                    <Sparkles className="h-3.5 w-3.5" /> Open {t.label}
                  </Button>
                ))}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
                  {copied === selectedStep.id ? (
                    <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Clipboard className="h-3.5 w-3.5" />
                  )}
                  {copied === selectedStep.id ? "Copied" : "Copy Prompt"}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-4 border-t border-border/60 pt-3 text-sm">
            {selectedStep.expectedOutput && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Expected Output
                </p>
                <p className="mt-0.5">{selectedStep.expectedOutput}</p>
              </div>
            )}
            {selectedStep.estimatedTime && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Estimated Time
                </p>
                <p className="mt-0.5">{selectedStep.estimatedTime}</p>
              </div>
            )}
          </div>

          <Button
            className="mt-4 gap-1.5"
            variant={selectedStep.done ? "outline" : "default"}
            onClick={() => toggleStep(selectedStep.id)}
          >
            {selectedStep.done ? (
              <>
                <Circle className="h-3.5 w-3.5" /> Mark Incomplete
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Mark Complete
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
