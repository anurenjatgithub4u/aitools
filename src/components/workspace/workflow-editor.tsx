"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Gauge,
  GraduationCap,
  LayoutTemplate,
  ListChecks,
  Plus,
  Workflow,
} from "lucide-react"
import { WorkflowStepCard } from "@/components/workspace/workflow-step-card"
import { WorkflowDiagram, buildWorkflowFlow, KIND_META } from "@/components/workspace/workflow-diagram"
import { Button } from "@/components/ui/button"
import type { WorkflowBranch, WorkflowStep, WorkspaceItemTypeData } from "@/types/workspace"

// Workflow editor redesign (FindurAI_Workflow_UX_Redesign.md): progressive
// disclosure, visual-first, one primary action per section. The diagram is
// never hand-drawn — it's generated live from the same steps the form edits.

const STUDENT_MODE_KEY = "findurai:workflow-student-mode"

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

type Tab = "form" | "diagram" | "preview"

function complexity(steps: WorkflowStep[]): { label: string; tint: string } {
  const advanced = steps.filter((s) => s.kind && s.kind !== "step").length
  if (steps.length <= 3 && advanced === 0) return { label: "Simple", tint: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" }
  if (steps.length <= 8 && advanced <= 2) return { label: "Moderate", tint: "text-amber-500 bg-amber-500/10 border-amber-500/30" }
  return { label: "Complex", tint: "text-rose-500 bg-rose-500/10 border-rose-500/30" }
}

function aiReadiness(typeData: WorkspaceItemTypeData, steps: WorkflowStep[], orphanedCount: number): number {
  let score = 0
  if (typeData.goal?.trim()) score += 20
  if (typeData.expectedResult?.trim()) score += 20
  if (steps.length > 0) {
    const withText = steps.filter((s) => s.text?.trim()).length
    score += Math.round((withText / steps.length) * 30)
    const withToolOrModel = steps.filter((s) => s.tool?.trim() || s.model?.trim()).length
    score += Math.round((withToolOrModel / steps.length) * 20)
  }
  if (orphanedCount === 0) score += 10
  return Math.min(100, score)
}

function readinessColor(score: number): string {
  if (score >= 70) return "text-emerald-500"
  if (score >= 40) return "text-amber-500"
  return "text-rose-500"
}

export function WorkflowEditor({
  typeData,
  onUpdateTypeData,
  onSaveAsTemplate,
  savingTemplate,
}: {
  typeData: WorkspaceItemTypeData
  onUpdateTypeData: (changes: Partial<WorkspaceItemTypeData>) => void
  onSaveAsTemplate?: () => void
  savingTemplate?: boolean
}) {
  const [tab, setTab] = useState<Tab>("form")
  const [studentMode, setStudentMode] = useState(false)
  const [warningsOpen, setWarningsOpen] = useState(true)

  useEffect(() => {
    try {
      setStudentMode(localStorage.getItem(STUDENT_MODE_KEY) === "1")
    } catch {
      /* ignore */
    }
  }, [])

  const toggleStudentMode = () => {
    setStudentMode((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STUDENT_MODE_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const steps = typeData.steps || []
  const setSteps = (next: WorkflowStep[]) => onUpdateTypeData({ steps: next })

  const { nodes, orphaned } = useMemo(() => buildWorkflowFlow(steps), [steps])

  const warnings = useMemo(() => {
    const w: string[] = []
    if (!typeData.goal?.trim()) w.push("No goal set — add one so the workflow has a clear purpose.")
    if (!typeData.expectedResult?.trim()) w.push("No expected result — describe what finishing this workflow produces.")
    if (steps.length === 0) w.push("No steps yet — add one below, or use Generate Steps.")
    if (orphaned.length > 0) {
      w.push(`${orphaned.length} step${orphaned.length > 1 ? "s are" : " is"} disconnected from the flow.`)
    }
    const missingTool = steps.filter(
      (s) => s.kind === "ai_call" && !s.tool?.trim() && !s.model?.trim()
    )
    if (missingTool.length > 0) {
      w.push(`${missingTool.length} AI Call step${missingTool.length > 1 ? "s" : ""} missing a tool or model.`)
    }
    const deadDecisions = nodes.filter((n) => n.step.kind === "decision" && !n.yes && !n.no)
    if (deadDecisions.length > 0) {
      w.push(`${deadDecisions.length} decision step${deadDecisions.length > 1 ? "s have" : " has"} no Yes/No branch yet.`)
    }
    return w
  }, [typeData.goal, typeData.expectedResult, steps, orphaned, nodes])

  const doneCount = steps.filter((s) => s.done).length
  const completion = steps.length ? Math.round((doneCount / steps.length) * 100) : 0
  const comp = complexity(steps)
  const readiness = aiReadiness(typeData, steps, orphaned.length)
  const timeEstimate = typeData.estimatedTime || (steps.length ? `~${steps.length * 5} min` : "—")

  // ── Step mutations ──────────────────────────────────────────────────────
  const updateStep = (id: string, changes: Partial<WorkflowStep>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...changes } : s)))
  }
  const moveStep = (id: string, dir: -1 | 1) => {
    const idx = steps.findIndex((s) => s.id === id)
    const target = idx + dir
    if (idx === -1 || target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setSteps(next)
  }
  const duplicateStep = (id: string) => {
    const idx = steps.findIndex((s) => s.id === id)
    if (idx === -1) return
    const copy: WorkflowStep = { ...steps[idx], id: newId() }
    const next = [...steps]
    next.splice(idx + 1, 0, copy)
    setSteps(next)
  }
  const deleteStep = (id: string) => setSteps(steps.filter((s) => s.id !== id))
  const addBelow = (id: string) => {
    const idx = steps.findIndex((s) => s.id === id)
    if (idx === -1) return
    const branch = steps[idx]?.branch
    const step: WorkflowStep = { id: newId(), text: "", done: false, indent: 0, branch }
    const next = [...steps]
    next.splice(idx + 1, 0, step)
    setSteps(next)
  }
  const addBranch = (decisionId: string, branch: WorkflowBranch) => {
    const idx = steps.findIndex((s) => s.id === decisionId)
    if (idx === -1) return
    const matchSet: WorkflowBranch[] = branch === "yes" || branch === "no" ? ["yes", "no"] : [branch]
    let insertAt = idx + 1
    while (insertAt < steps.length && steps[insertAt].branch && matchSet.includes(steps[insertAt].branch!)) {
      insertAt++
    }
    const step: WorkflowStep = { id: newId(), text: "", done: false, indent: 0, branch }
    const next = [...steps]
    next.splice(insertAt, 0, step)
    setSteps(next)
  }
  const addStep = () => setSteps([...steps, { id: newId(), text: "", done: false, indent: 0 }])

  const scrollToStep = (id: string) => {
    setTab("form")
    requestAnimationFrame(() => {
      document.getElementById(`wf-step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "form", label: "Form", icon: ListChecks },
    { id: "diagram", label: "Diagram", icon: Workflow },
    { id: "preview", label: "Preview", icon: Eye },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Wow stats strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip icon={ListChecks} label="Completion" value={`${completion}%`} />
        <StatChip icon={Clock} label="Time estimate" value={timeEstimate} />
        <StatChip
          icon={Gauge}
          label="Complexity"
          value={comp.label}
          valueClassName={comp.tint.split(" ")[0]}
        />
        <StatChip
          icon={Gauge}
          label="AI readiness"
          value={`${readiness}/100`}
          valueClassName={readinessColor(readiness)}
        />
      </div>

      {/* Validation banner */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5">
          <button
            onClick={() => setWarningsOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left cursor-pointer"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">
              {warnings.length} thing{warnings.length > 1 ? "s" : ""} to check
            </span>
            <ChevronDown
              className={`ml-auto h-3.5 w-3.5 text-amber-500 transition-transform ${warningsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {warningsOpen && (
            <ul className="flex flex-col gap-1 px-3 pb-2.5 text-xs text-amber-700 dark:text-amber-400">
              {warnings.map((w, i) => (
                <li key={i} className="flex gap-1.5">
                  <span>·</span> {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Tabs + Student Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                tab === t.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={toggleStudentMode}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
            studentMode
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40"
          }`}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Student Mode {studentMode ? "on" : "off"}
        </button>
      </div>

      {/* Form tab: step cards (+ pinned live diagram on large screens) */}
      {tab === "form" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-2.5">
            {steps.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No steps yet. Add one below, or use Generate Steps above.
              </p>
            )}
            {steps.map((step, i) => (
              <div key={step.id} id={`wf-step-${step.id}`}>
                <WorkflowStepCard
                  step={step}
                  number={i + 1}
                  studentMode={studentMode}
                  canMoveUp={i > 0}
                  canMoveDown={i < steps.length - 1}
                  onChange={(changes) => updateStep(step.id, changes)}
                  onMoveUp={() => moveStep(step.id, -1)}
                  onMoveDown={() => moveStep(step.id, 1)}
                  onAddBelow={() => addBelow(step.id)}
                  onDuplicate={() => duplicateStep(step.id)}
                  onDelete={() => deleteStep(step.id)}
                  onAddBranch={(branch) => addBranch(step.id, branch)}
                />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-fit gap-1.5" onClick={addStep}>
              <Plus className="h-3.5 w-3.5" /> Add Step
            </Button>

            {onSaveAsTemplate && steps.length >= 3 && (
              <button
                onClick={onSaveAsTemplate}
                disabled={savingTemplate}
                className="mt-1 flex w-fit items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer disabled:opacity-60"
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                {savingTemplate ? "Saving..." : "This looks reusable — save as a Template"}
              </button>
            )}
          </div>

          {/* Live diagram, pinned on desktop */}
          <div className="hidden rounded-xl border border-border/60 bg-muted/20 lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <div className="flex items-center gap-1.5 border-b border-border/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Workflow className="h-3 w-3" /> Live Diagram
              </div>
              <WorkflowDiagram
                goal={typeData.goal}
                expectedResult={typeData.expectedResult}
                steps={steps}
                onNodeClick={scrollToStep}
                compact
              />
            </div>
          </div>
        </div>
      )}

      {/* Diagram tab: full-size, understand-in-10-seconds view */}
      {tab === "diagram" && (
        <WorkflowDiagram
          goal={typeData.goal}
          expectedResult={typeData.expectedResult}
          steps={steps}
          onNodeClick={scrollToStep}
        />
      )}

      {/* Preview tab: read-only rendered document */}
      {tab === "preview" && (
        <PreviewDoc typeData={typeData} nodes={nodes} orphaned={orphaned} />
      )}
    </div>
  )
}

function StatChip({
  icon: Icon,
  label,
  value,
  valueClassName = "",
}: {
  icon: React.ElementType
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={`mt-0.5 text-sm font-semibold ${valueClassName}`}>{value}</p>
    </div>
  )
}

function StepLine({ step, prefix }: { step: WorkflowStep; prefix: string }) {
  const meta = KIND_META[step.kind || "step"]
  return (
    <li className="flex flex-col gap-0.5">
      <span className={step.done ? "text-muted-foreground line-through" : ""}>
        <span className="font-mono text-xs text-muted-foreground">{prefix}</span>{" "}
        <span className="font-medium">{step.text || "Untitled step"}</span>{" "}
        <span className="text-[10px] text-muted-foreground">({meta.label})</span>
      </span>
      {step.instruction && <p className="ml-4 text-xs text-muted-foreground">{step.instruction}</p>}
      {(step.tool || step.model) && (
        <p className="ml-4 text-[11px] text-muted-foreground">
          {[step.tool, step.model].filter(Boolean).join(" · ")}
        </p>
      )}
    </li>
  )
}

function PreviewDoc({
  typeData,
  nodes,
  orphaned,
}: {
  typeData: WorkspaceItemTypeData
  nodes: ReturnType<typeof buildWorkflowFlow>["nodes"]
  orphaned: ReturnType<typeof buildWorkflowFlow>["orphaned"]
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-background/40 p-4 text-sm">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Goal</p>
        <p className="mt-0.5">{typeData.goal || <span className="text-muted-foreground">Not set</span>}</p>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Steps</p>
        {nodes.length === 0 ? (
          <p className="text-muted-foreground">No steps yet.</p>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {nodes.map((n, i) => (
              <li key={n.step.id}>
                <StepLine step={n.step} prefix={`${i + 1}.`} />
                {(n.yes || n.no) && (
                  <div className="ml-4 mt-1.5 grid gap-2 sm:grid-cols-2">
                    {n.yes && (
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-500">
                          Yes{n.step.condition ? ` — ${n.step.condition}` : ""}
                        </p>
                        <ol className="mt-1 flex flex-col gap-1">
                          {n.yes.map((c, ci) => (
                            <StepLine key={c.step.id} step={c.step} prefix={`${i + 1}.${ci + 1}`} />
                          ))}
                        </ol>
                      </div>
                    )}
                    {n.no && (
                      <div>
                        <p className="text-[10px] font-semibold text-rose-500">No</p>
                        <ol className="mt-1 flex flex-col gap-1">
                          {n.no.map((c, ci) => (
                            <StepLine key={c.step.id} step={c.step} prefix={`${i + 1}.${ci + 1}`} />
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
                {n.loop && (
                  <div className="ml-4 mt-1.5">
                    <p className="text-[10px] font-semibold text-violet-500">Repeats</p>
                    <ol className="mt-1 flex flex-col gap-1">
                      {n.loop.map((c, ci) => (
                        <StepLine key={c.step.id} step={c.step} prefix={`↻ ${ci + 1}`} />
                      ))}
                    </ol>
                  </div>
                )}
                {n.parallel && (
                  <div className="ml-4 mt-1.5">
                    <p className="text-[10px] font-semibold text-blue-500">Runs in parallel</p>
                    <ol className="mt-1 flex flex-col gap-1">
                      {n.parallel.map((c, ci) => (
                        <StepLine key={c.step.id} step={c.step} prefix={`∥ ${ci + 1}`} />
                      ))}
                    </ol>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        {orphaned.length > 0 && (
          <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
            <FileText className="h-3 w-3" /> {orphaned.length} disconnected step(s) not shown above.
          </p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Expected Result
        </p>
        <p className="mt-0.5">
          {typeData.expectedResult || <span className="text-muted-foreground">Not set</span>}
        </p>
      </div>
    </div>
  )
}
