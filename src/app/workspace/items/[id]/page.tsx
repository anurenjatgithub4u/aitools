"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bot,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Target,
  Trash2,
  X,
  Files,
  ArrowDown,
  ArrowUp,
} from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MarkdownView } from "@/components/workspace/markdown-view"
import { MentionTextarea } from "@/components/workspace/mention-textarea"
import { WorkflowEditor } from "@/components/workspace/workflow-editor"
import { WorkflowRunView } from "@/components/workspace/workflow-run-view"
import { workspaceApi, ITEM_TYPE_META, DEFAULT_TEMPLATES } from "@/lib/workspace"
import type { WorkflowStep, WorkspaceItemDto, WorkspaceProjectDto } from "@/types/workspace"

const ENHANCE_ACTIONS: { action: string; label: string }[] = [
  { action: "improve_writing", label: "Improve Writing" },
  { action: "generate_summary", label: "Generate Summary" },
  { action: "generate_tags", label: "Generate Tags" },
  { action: "suggest_improvements", label: "Suggest Improvements" },
  { action: "generate_checklist", label: "Generate Checklist" },
  { action: "explain", label: "Explain" },
  { action: "continue_writing", label: "Continue Writing" },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  )
}

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()

  const [item, setItem] = useState<WorkspaceItemDto | null>(null)
  const [projects, setProjects] = useState<WorkspaceProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [generatingStub, setGeneratingStub] = useState(false)

  const [mode, setMode] = useState<"edit" | "preview">("edit")
  const [workflowEditing, setWorkflowEditing] = useState(false)
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved")
  const [enhanceOpen, setEnhanceOpen] = useState(false)
  const [aiBusy, setAiBusy] = useState<string | null>(null)
  const [aiError, setAiError] = useState("")
  const [copied, setCopied] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [taskDraft, setTaskDraft] = useState("")
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskDraft, setNewTaskDraft] = useState("")
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [taskViewMode, setTaskViewMode] = useState<"input" | "review">("input")
  const [explanationDraft, setExplanationDraft] = useState("")
  const [evaluating, setEvaluating] = useState(false)
  const [evalError, setEvalError] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemRef = useRef<WorkspaceItemDto | null>(null)
  itemRef.current = item

  useEffect(() => {
    if (!user) return
    Promise.all([workspaceApi.getItem(id, user.uid), workspaceApi.listProjects(user.uid)])
      .then(([i, p]) => {
        setItem(i)
        setProjects(p)
        // Quietly move a fresh file from "not started" to "in progress" the
        // moment someone opens it — no button needed for this transition.
        // Only patch completionStatus into local state (not the full response):
        // this call can resolve after the user has already made other local
        // edits (e.g. completing the first task right after opening the
        // file), and merging the whole stale `updated` object back in would
        // clobber those edits with the pre-edit typeData.
        if ((i.completionStatus || "not_started") === "not_started") {
          workspaceApi
            .updateItem(id, { userId: user.uid, completionStatus: "in_progress" })
            .then((updated) =>
              setItem((prev) => (prev ? { ...prev, completionStatus: updated.completionStatus } : prev))
            )
            .catch(() => {})
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [user, id])

  // Stub items (title + description only, saved for token cost — see
  // /api/workspace/generate-item) get their real content filled in the
  // first time the user actually opens them, then it's cached forever via
  // generationState flipping to "generated". This effect is what makes that
  // happen: without it the page had no knowledge of generationState at all,
  // leaving stub files opened directly (not via the card grid's own manual
  // "Generate this" link) stuck showing an empty editor.
  useEffect(() => {
    if (!user || !item || item.generationState !== "stub") return
    setGeneratingStub(true)
    workspaceApi
      .generateItem(user.uid, item._id)
      .then((updated) => setItem((prev) => (prev && prev._id === updated._id ? updated : prev)))
      .catch(() => {})
      .finally(() => setGeneratingStub(false))
    // Only re-run when the item identity or its stub state actually changes —
    // not on every edit, or this would re-fire while the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, item?._id, item?.generationState])

  const persist = useCallback(async () => {
    const current = itemRef.current
    if (!user || !current) return
    setSaveState("saving")
    try {
      await workspaceApi.updateItem(current._id, {
        userId: user.uid,
        title: current.title,
        description: current.description,
        emoji: current.emoji,
        markdownContent: current.markdownContent,
        projectId: current.projectId as any,
        collectionIds: current.collectionIds,
        tags: current.tags,
        favorite: current.favorite,
        relatedItems: current.relatedItems,
        typeData: current.typeData,
        completionStatus: current.completionStatus,
      })
      setSaveState("saved")
    } catch {
      setSaveState("dirty")
    }
  }, [user])

  const update = useCallback(
    (changes: Partial<WorkspaceItemDto>) => {
      setItem((prev) => (prev ? { ...prev, ...changes } : prev))
      setSaveState("dirty")
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(persist, 800)
    },
    [persist]
  )

  const updateTypeData = useCallback(
    (changes: Record<string, unknown>) => {
      setItem((prev) =>
        prev ? { ...prev, typeData: { ...prev.typeData, ...changes } } : prev
      )
      setSaveState("dirty")
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(persist, 800)
    },
    [persist]
  )

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  if (notFound || !item)
    return <p className="text-sm text-muted-foreground">Item not found.</p>
  if (!user) return null

  const meta = ITEM_TYPE_META[item.type]
  const td = item.typeData || {}

  const runEnhance = async (action: string) => {
    setEnhanceOpen(false)
    setAiBusy(action)
    setAiError("")
    try {
      const res = await workspaceApi.ai({
        action,
        title: item.title,
        content: item.markdownContent,
      })
      if (action === "improve_writing" && res.result) {
        update({ markdownContent: res.result })
      } else if (action === "generate_summary" && res.result) {
        update({ description: res.result.replace(/\n+/g, " ").slice(0, 2000) })
      } else if (action === "generate_tags" && res.tags) {
        update({ tags: Array.from(new Set([...item.tags, ...res.tags])) })
      } else if (res.result) {
        update({ markdownContent: `${item.markdownContent}\n\n${res.result}` })
      }
    } catch (e: any) {
      setAiError(e.message || "AI request failed")
    } finally {
      setAiBusy(null)
    }
  }

  const generateForType = async () => {
    setAiBusy("generate")
    setAiError("")
    try {
      if (item.type === "workflow" || item.type === "playbook") {
        const res = await workspaceApi.ai({
          action: "generate_workflow",
          goal: td.goal || item.title,
        })
        const wf = res.workflow
        if (wf) {
          // Steps arrive as rich objects from the AI; fall back cleanly if an
          // older/plain string shape is ever returned.
          const steps: WorkflowStep[] = (wf.steps || []).map((s: any, i: number) => {
            if (typeof s === "string") {
              return { id: `${Date.now()}-${i}`, text: s, done: false, indent: 0 }
            }
            return {
              id: `${Date.now()}-${i}`,
              text: s.text || "",
              done: false,
              indent: 0,
              kind: s.kind || "step",
              purpose: s.purpose || undefined,
              instruction: s.instruction || undefined,
              tool: s.tool || undefined,
              model: s.model || undefined,
              expectedOutput: s.expectedOutput || undefined,
              estimatedTime: s.estimatedTime || undefined,
              condition: s.condition || undefined,
              branch: s.branch || undefined,
            }
          })
          updateTypeData({
            goal: wf.goal || td.goal,
            difficulty: wf.difficulty || td.difficulty,
            estimatedTime: wf.estimatedTime || td.estimatedTime,
            repeat: wf.repeat || td.repeat,
            aiModels: wf.aiModels || td.aiModels,
            toolsUsed: wf.toolsUsed || td.toolsUsed,
            steps: [...(td.steps || []), ...steps],
            expectedResult: wf.expectedResult || td.expectedResult,
          })
          if (wf.tags) update({ tags: Array.from(new Set([...item.tags, ...wf.tags])) })
        }
      } else if (item.type === "prompt") {
        const res = await workspaceApi.ai({
          action: "generate_prompt",
          task: td.purpose || item.title,
        })
        const p = res.prompt
        if (p) {
          updateTypeData({
            purpose: p.purpose || td.purpose,
            promptText:
              [
                p.systemPrompt && `## System Prompt\n${p.systemPrompt}`,
                p.userPrompt && `## User Prompt\n${p.userPrompt}`,
                p.followUpPrompt && `## Follow-up Prompt\n${p.followUpPrompt}`,
                p.debugPrompt && `## Debug Prompt\n${p.debugPrompt}`,
              ]
                .filter(Boolean)
                .join("\n\n") || td.promptText,
            variables: p.variables || td.variables,
            expectedOutput: p.expectedOutput || td.expectedOutput,
          })
          if (p.tags) update({ tags: Array.from(new Set([...item.tags, ...p.tags])) })
        }
      }
    } catch (e: any) {
      setAiError(e.message || "AI request failed")
    } finally {
      setAiBusy(null)
    }
  }

  // Fills in goal/estimatedTime/difficulty + a task checklist for any file
  // that doesn't have one yet — covers both AI-generated files the batch
  // generation prompt happened to skip, and files the user created manually
  // (workspaceApi.createItem never sets typeData at all).
  const generateMission = async () => {
    setAiBusy("mission")
    setAiError("")
    try {
      const res = await workspaceApi.ai({
        action: "generate_mission",
        title: item.title,
        content: item.markdownContent,
      })
      const m = res.mission
      if (m) {
        const tasks: WorkflowStep[] = (m.tasks || []).map((t: string, i: number) => ({
          id: `task-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          text: t,
          done: false,
          indent: 0,
        }))
        updateTypeData({
          goal: m.goal || td.goal,
          estimatedTime: m.estimatedTime || td.estimatedTime,
          difficulty: m.difficulty || td.difficulty,
          steps: tasks.length > 0 ? tasks : td.steps,
        })
      }
    } catch (e: any) {
      setAiError(e.message || "AI request failed")
    } finally {
      setAiBusy(null)
    }
  }

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(td.promptText || item.markdownContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const duplicate = async () => {
    const copy = await workspaceApi.createItem({
      userId: user.uid,
      title: `${item.title} (copy)`,
      type: item.type,
      description: item.description,
      emoji: item.emoji,
      projectId: item.projectId as any,
      collectionIds: item.collectionIds,
      tags: item.tags,
      markdownContent: item.markdownContent,
      typeData: item.typeData,
    } as any)
    router.push(`/workspace/items/${copy._id}`)
  }

  const saveAsTemplate = async () => {
    if (savingTemplate) return
    setSavingTemplate(true)
    try {
      const copy = await workspaceApi.createItem({
        userId: user.uid,
        title: `${item.title} (template)`,
        type: "template",
        description: item.description,
        emoji: item.emoji,
        tags: item.tags,
        markdownContent: item.markdownContent,
        typeData: item.typeData,
      } as any)
      router.push(`/workspace/items/${copy._id}`)
    } finally {
      setSavingTemplate(false)
    }
  }

  const trash = async () => {
    await workspaceApi.updateItem(item._id, { userId: user.uid, archived: true })
    router.push("/workspace")
  }

  const steps: WorkflowStep[] = td.steps || []
  const setSteps = (next: WorkflowStep[]) => updateTypeData({ steps: next })

  // Any file with a generated task checklist tracks completion automatically
  // from those tasks (workspace-generation-spec.md: "No manual progress
  // editing") — the binary Mark Complete toggle only applies to files without
  // one, e.g. a knowledge item with no generated tasks.
  const hasTasks = steps.length > 0
  const hasMissionMeta = !!(td.goal || td.estimatedTime || td.difficulty)
  const showMission = hasTasks || hasMissionMeta
  const doneTaskCount = steps.filter((s) => s.done).length
  const persistSteps = (nextSteps: WorkflowStep[]) => {
    const allDone = nextSteps.length > 0 && nextSteps.every((s) => s.done)
    const anyDone = nextSteps.some((s) => s.done)
    updateTypeData({ steps: nextSteps })
    update({ completionStatus: allDone ? "completed" : anyDone ? "in_progress" : "not_started" } as any)
  }
  const editTask = (taskId: string, text: string) => {
    if (!text.trim()) return
    persistSteps(steps.map((s) => (s.id === taskId ? { ...s, text: text.trim() } : s)))
  }
  const deleteTask = (taskId: string) => {
    persistSteps(steps.filter((s) => s.id !== taskId))
  }
  const addTask = (text: string) => {
    if (!text.trim()) return
    persistSteps([
      ...steps,
      { id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: text.trim(), done: false, indent: 0 },
    ])
  }

  // AI Task Evaluation spec: a task only becomes done via the Complete Task
  // button below, after AI reviews the user's explanation — direct clicks
  // just open/close that panel (undo of a done task is the one exception).
  const updateTaskFields = (taskId: string, fields: Partial<WorkflowStep>) => {
    updateTypeData({ steps: steps.map((s) => (s.id === taskId ? { ...s, ...fields } : s)) })
  }
  const toggleTaskPanel = (task: WorkflowStep) => {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null)
      return
    }
    setExpandedTaskId(task.id)
    setExplanationDraft(task.explanation || "")
    setEvalError("")
    setTaskViewMode(task.evaluation ? "review" : "input")
  }
  const goToInputMode = () => {
    setEvalError("")
    setTaskViewMode("input")
  }
  const runEvaluate = async (task: WorkflowStep) => {
    if (!user || !explanationDraft.trim() || evaluating) return
    setEvaluating(true)
    setEvalError("")
    try {
      const result = await workspaceApi.evaluateTask(user.uid, task.text, explanationDraft.trim(), item.title)
      updateTaskFields(task.id, { explanation: explanationDraft.trim(), evaluation: result })
      setTaskViewMode("review")
    } catch (e: any) {
      setEvalError(e?.message || "Evaluation failed. Try again.")
    } finally {
      setEvaluating(false)
    }
  }
  const completeTask = (task: WorkflowStep) => {
    persistSteps(steps.map((s) => (s.id === task.id ? { ...s, done: true } : s)))
    setExpandedTaskId(null)
  }
  const markTaskIncomplete = (task: WorkflowStep) => {
    persistSteps(steps.map((s) => (s.id === task.id ? { ...s, done: false } : s)))
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Main column */}
      <div className="min-w-0 flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <input
            value={item.emoji}
            onChange={(e) => update({ emoji: e.target.value.slice(0, 4) })}
            className="w-12 shrink-0 rounded-lg border border-transparent bg-transparent text-center text-3xl outline-none hover:border-border focus:border-border"
            aria-label="Item emoji"
          />
          <div className="min-w-0 flex-1">
            <input
              value={item.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Untitled"
              className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground"
            />
            <input
              value={item.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Add a short description..."
              className="mt-1 w-full bg-transparent text-sm text-muted-foreground outline-none"
            />
          </div>
        </div>

        {/* Project */}
        <div className="flex items-center gap-2">
          <FieldLabel>Project</FieldLabel>
          <select
            value={item.projectId || ""}
            onChange={(e) => update({ projectId: e.target.value || null } as any)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none dark:bg-input/30"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.emoji} {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{meta.label}</Badge>
          {showMission ? (
            <Badge
              variant={item.completionStatus === "completed" ? "default" : "secondary"}
              className="gap-1.5 py-1"
            >
              <Check className="h-3.5 w-3.5" />
              {item.completionStatus === "completed"
                ? "Completed"
                : item.completionStatus === "in_progress"
                ? "In Progress"
                : "Not Started"}
            </Badge>
          ) : (
            <Button
              variant={item.completionStatus === "completed" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() =>
                update({
                  completionStatus: item.completionStatus === "completed" ? "not_started" : "completed",
                } as any)
              }
            >
              <Check className="h-3.5 w-3.5" />
              {item.completionStatus === "completed" ? "Completed" : "Mark Complete"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => update({ favorite: !item.favorite })}
          >
            <Star
              className={`h-3.5 w-3.5 ${item.favorite ? "fill-yellow-400 text-yellow-400" : ""}`}
            />
            {item.favorite ? "Favorited" : "Favorite"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={duplicate}>
            <Files className="h-3.5 w-3.5" /> Duplicate
          </Button>
          {item.type === "prompt" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={copyPrompt}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Prompt"}
            </Button>
          )}
          {(item.type === "workflow" || item.type === "playbook" || item.type === "prompt") && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={generateForType}
              disabled={!!aiBusy}
            >
              {aiBusy === "generate" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {item.type === "prompt" ? "Generate Prompt" : "Generate Steps"}
            </Button>
          )}
          {!showMission && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={generateMission}
              disabled={!!aiBusy}
            >
              {aiBusy === "mission" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate Checklist
            </Button>
          )}
          {item.type === "playbook" && (
            <Button
              variant={td.solved ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => updateTypeData({ solved: !td.solved })}
            >
              <Check className="h-3.5 w-3.5" />
              {td.solved ? "Solved" : "Mark Solved"}
            </Button>
          )}
          <div className="relative">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setEnhanceOpen((o) => !o)}
              disabled={!!aiBusy}
            >
              {aiBusy && aiBusy !== "generate" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Enhance
            </Button>
            {enhanceOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
                {ENHANCE_ACTIONS.map((a) => (
                  <button
                    key={a.action}
                    onClick={() => runEnhance(a.action)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive"
            onClick={trash}
          >
            <Trash2 className="h-3.5 w-3.5" /> Trash
          </Button>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {saveState === "saving" ? "Saving..." : saveState === "dirty" ? "Unsaved" : "Saved"}
          </span>
        </div>
        {aiError && <p className="text-xs text-destructive">{aiError}</p>}

        {/* Mission: goal/time/difficulty + task checklist, for any item type
            (workspace-generation-spec.md) — completing tasks is what drives
            completionStatus above, not a separate manual toggle. */}
        {showMission && (
          <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
            <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
              {td.goal && (
                <div className="flex min-w-0 flex-1 basis-full items-start gap-2 sm:basis-auto">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm">{td.goal}</p>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {td.estimatedTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {td.estimatedTime}
                  </span>
                )}
                {td.difficulty && (
                  <span className="rounded-full border border-border px-2 py-0.5 font-medium">
                    {td.difficulty}
                  </span>
                )}
              </div>
            </div>

            {hasTasks && (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold">Progress</span>
                  <span className="text-muted-foreground">
                    {doneTaskCount}/{steps.length} Tasks Completed
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round((doneTaskCount / steps.length) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              {steps.map((task) => (
                <div key={task.id} className="flex flex-col">
                  <div className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-background/70">
                    <button
                      onClick={() => (task.done ? markTaskIncomplete(task) : toggleTaskPanel(task))}
                      className="mt-0.5 shrink-0 cursor-pointer"
                      aria-label={task.done ? "Mark task not done" : "Toggle task detail"}
                    >
                      {task.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {editingTaskId === task.id ? (
                      <input
                        autoFocus
                        value={taskDraft}
                        onChange={(e) => setTaskDraft(e.target.value)}
                        onBlur={() => {
                          editTask(task.id, taskDraft)
                          setEditingTaskId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur()
                          if (e.key === "Escape") {
                            setTaskDraft(task.text)
                            setEditingTaskId(null)
                          }
                        }}
                        className="min-w-0 flex-1 rounded border border-primary/40 bg-background px-1.5 py-0.5 text-sm outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => toggleTaskPanel(task)}
                        className="min-w-0 flex-1 text-left text-sm cursor-pointer"
                      >
                        <span className={task.done ? "text-muted-foreground line-through" : ""}>{task.text}</span>
                      </button>
                    )}
                    {editingTaskId !== task.id && (
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setTaskDraft(task.text)
                            setEditingTaskId(task.id)
                          }}
                          className="rounded p-1 hover:bg-muted cursor-pointer"
                          aria-label="Edit task"
                          title="Edit task"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="rounded p-1 hover:bg-muted hover:text-destructive cursor-pointer"
                          aria-label="Delete task"
                          title="Delete task"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {expandedTaskId === task.id && (
                    <div className="ml-6 mb-1.5 mt-1 flex flex-col gap-3 rounded-lg border border-border bg-background/60 p-3">
                      {taskViewMode === "review" && task.evaluation ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <Bot className="h-3.5 w-3.5" /> AI Review
                          </div>
                          <p className="flex items-start gap-1.5 text-sm">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            {task.evaluation.summary}
                          </p>
                          {task.evaluation.strengths.length > 0 && (
                            <ul className="flex flex-col gap-1">
                              {task.evaluation.strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" /> {s}
                                </li>
                              ))}
                            </ul>
                          )}
                          {task.evaluation.improvements.length > 0 && (
                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Suggestions
                              </p>
                              <ul className="flex flex-col gap-1">
                                {task.evaluation.improvements.map((s, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" /> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="font-semibold">Overall Progress</span>
                              <span className="text-muted-foreground">{task.evaluation.score}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${task.evaluation.score}%` }}
                              />
                            </div>
                          </div>
                          {task.done ? (
                            <Button size="sm" variant="outline" className="w-fit" onClick={() => markTaskIncomplete(task)}>
                              Mark as not done
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              {task.evaluation.canComplete && (
                                <Button size="sm" className="gap-1.5" onClick={() => completeTask(task)}>
                                  <Check className="h-3.5 w-3.5" /> Complete Task
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={goToInputMode}>
                                {task.evaluation.canComplete ? "Continue Improving" : "Improve & Re-evaluate"}
                              </Button>
                            </div>
                          )}
                        </>
                      ) : task.done ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" /> Completed
                          </p>
                          <Button size="sm" variant="outline" onClick={() => markTaskIncomplete(task)}>
                            Mark as not done
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <FieldLabel>Explain what you completed</FieldLabel>
                            <textarea
                              value={explanationDraft}
                              onChange={(e) => setExplanationDraft(e.target.value)}
                              placeholder="Briefly explain what you learned, built, or completed in 1-3 sentences..."
                              rows={3}
                              className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
                            />
                          </div>
                          {!explanationDraft.trim() && (
                            <p className="text-xs text-muted-foreground">
                              Complete the task and explain your work in a few sentences. AI will review it before
                              marking it as completed.
                            </p>
                          )}
                          {evalError && <p className="text-xs text-destructive">{evalError}</p>}
                          <Button
                            size="sm"
                            className="w-fit gap-1.5"
                            disabled={!explanationDraft.trim() || evaluating}
                            onClick={() => runEvaluate(task)}
                          >
                            {evaluating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            {evaluating ? "Evaluating…" : "Evaluate with AI"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {addingTask ? (
                <input
                  autoFocus
                  value={newTaskDraft}
                  onChange={(e) => setNewTaskDraft(e.target.value)}
                  placeholder="New task..."
                  onBlur={() => {
                    addTask(newTaskDraft)
                    setNewTaskDraft("")
                    setAddingTask(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur()
                    if (e.key === "Escape") {
                      setNewTaskDraft("")
                      setAddingTask(false)
                    }
                  }}
                  className="ml-2 mt-1 rounded border border-primary/40 bg-background px-2 py-1 text-sm outline-none"
                />
              ) : (
                <button
                  onClick={() => setAddingTask(true)}
                  className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-background/70 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add task
                </button>
              )}
            </div>
          </div>
        )}

        {/* Type-specific: prompt */}
        {item.type === "prompt" && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-1">
              <FieldLabel>Purpose</FieldLabel>
              <Input
                value={td.purpose || ""}
                onChange={(e) => updateTypeData({ purpose: e.target.value })}
                placeholder="What is this prompt for?"
              />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel>Prompt</FieldLabel>
              <textarea
                value={td.promptText || ""}
                onChange={(e) => updateTypeData({ promptText: e.target.value })}
                placeholder="The prompt itself. Use {{variables}} for reusable parts."
                rows={6}
                className="rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <FieldLabel>AI Model</FieldLabel>
                <Input
                  value={td.aiModel || ""}
                  onChange={(e) => updateTypeData({ aiModel: e.target.value })}
                  placeholder="e.g. Gemini 2.5, Claude"
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel>Variables (comma separated)</FieldLabel>
                <Input
                  value={(td.variables || []).join(", ")}
                  onChange={(e) =>
                    updateTypeData({
                      variables: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                    })
                  }
                  placeholder="topic, tone"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <FieldLabel>Example Input</FieldLabel>
                <textarea
                  value={td.exampleInput || ""}
                  onChange={(e) => updateTypeData({ exampleInput: e.target.value })}
                  rows={3}
                  className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel>Example Output</FieldLabel>
                <textarea
                  value={td.exampleOutput || ""}
                  onChange={(e) => updateTypeData({ exampleOutput: e.target.value })}
                  rows={3}
                  className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel>Expected Output</FieldLabel>
              <Input
                value={td.expectedOutput || ""}
                onChange={(e) => updateTypeData({ expectedOutput: e.target.value })}
                placeholder="What good output looks like"
              />
            </div>
          </div>
        )}

        {/* Type-specific: playbook */}
        {item.type === "playbook" && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-1">
              <FieldLabel>Goal</FieldLabel>
              <Input
                value={td.goal || ""}
                onChange={(e) => updateTypeData({ goal: e.target.value })}
                placeholder="What does this playbook accomplish?"
              />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel>Problem</FieldLabel>
              <textarea
                value={td.problem || ""}
                onChange={(e) => updateTypeData({ problem: e.target.value })}
                placeholder="The problem you were solving"
                rows={2}
                className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <FieldLabel>Difficulty</FieldLabel>
                <select
                  value={td.difficulty || ""}
                  onChange={(e) => updateTypeData({ difficulty: e.target.value })}
                  className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none dark:bg-input/30"
                >
                  <option value="">—</option>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel>Estimated Time</FieldLabel>
                <Input
                  value={td.estimatedTime || ""}
                  onChange={(e) => updateTypeData({ estimatedTime: e.target.value })}
                  placeholder="e.g. 2 hours"
                />
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel>AI Models</FieldLabel>
                <Input
                  value={(td.aiModels || []).join(", ")}
                  onChange={(e) =>
                    updateTypeData({
                      aiModels: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Gemini, Claude"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel>Tools Used</FieldLabel>
              <Input
                value={(td.toolsUsed || []).join(", ")}
                onChange={(e) =>
                  updateTypeData({
                    toolsUsed: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                  })
                }
                placeholder="Cursor, Figma, n8n"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Steps</FieldLabel>
              {steps.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No steps yet. Add one below or use “Generate Steps”.
                </p>
              )}
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={step.done}
                    onChange={(e) =>
                      setSteps(
                        steps.map((s) => (s.id === step.id ? { ...s, done: e.target.checked } : s))
                      )
                    }
                    className="h-4 w-4 accent-primary"
                  />
                  <input
                    value={step.text}
                    onChange={(e) =>
                      setSteps(
                        steps.map((s) => (s.id === step.id ? { ...s, text: e.target.value } : s))
                      )
                    }
                    className={`flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none hover:border-border focus:border-border ${
                      step.done ? "text-muted-foreground line-through" : ""
                    }`}
                  />
                  <button
                    onClick={() => {
                      if (i === 0) return
                      const next = [...steps]
                      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                      setSteps(next)
                    }}
                    className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (i === steps.length - 1) return
                      const next = [...steps]
                      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                      setSteps(next)
                    }}
                    className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                    disabled={i === steps.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setSteps(steps.filter((s) => s.id !== step.id))}
                    className="text-muted-foreground hover:text-destructive cursor-pointer"
                    aria-label="Remove step"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="mt-1 w-fit gap-1.5"
                onClick={() =>
                  setSteps([
                    ...steps,
                    { id: `${Date.now()}`, text: "", done: false, indent: 0 },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add Step
              </Button>
            </div>

            <div className="flex flex-col gap-1">
              <FieldLabel>Final Result</FieldLabel>
              <textarea
                value={td.finalResult || ""}
                onChange={(e) => updateTypeData({ finalResult: e.target.value })}
                placeholder="What you ended up with"
                rows={2}
                className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <FieldLabel>Lessons Learned</FieldLabel>
              <textarea
                value={td.lessonsLearned || ""}
                onChange={(e) => updateTypeData({ lessonsLearned: e.target.value })}
                placeholder="What you'd do differently next time"
                rows={2}
                className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              />
            </div>
          </div>
        )}

        {/* Type-specific: workflow — execution-first run view by default (Workflow
            Redesign spec), full structural editor available behind Edit. */}
        {item.type === "workflow" && (
          workflowEditing ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <FieldLabel>Edit Workflow</FieldLabel>
                <button
                  onClick={() => setWorkflowEditing(false)}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer"
                >
                  Done — back to Run View
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel>Goal</FieldLabel>
                <Input
                  value={td.goal || ""}
                  onChange={(e) => updateTypeData({ goal: e.target.value })}
                  placeholder="What does this workflow achieve?"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <FieldLabel>Estimated Time</FieldLabel>
                  <Input
                    value={td.estimatedTime || ""}
                    onChange={(e) => updateTypeData({ estimatedTime: e.target.value })}
                    placeholder="e.g. 30 minutes"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel>Repeat</FieldLabel>
                  <Input
                    value={td.repeat || ""}
                    onChange={(e) => updateTypeData({ repeat: e.target.value })}
                    placeholder="e.g. Daily, Weekly, One-time"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel>AI Models</FieldLabel>
                  <Input
                    value={(td.aiModels || []).join(", ")}
                    onChange={(e) =>
                      updateTypeData({
                        aiModels: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                      })
                    }
                    placeholder="ChatGPT, Claude"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <FieldLabel>Tools Used</FieldLabel>
                <Input
                  value={(td.toolsUsed || []).join(", ")}
                  onChange={(e) =>
                    updateTypeData({
                      toolsUsed: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Cursor, Figma, n8n"
                />
              </div>

              <WorkflowEditor
                typeData={item.typeData}
                onUpdateTypeData={updateTypeData}
                onSaveAsTemplate={saveAsTemplate}
                savingTemplate={savingTemplate}
              />

              <div className="flex flex-col gap-1">
                <FieldLabel>Expected Output</FieldLabel>
                <textarea
                  value={td.expectedResult || ""}
                  onChange={(e) => updateTypeData({ expectedResult: e.target.value })}
                  placeholder={"What you end up with — one per line, e.g.\nInterview Feedback\nRevision Notes"}
                  rows={3}
                  className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
                />
              </div>
            </div>
          ) : (
            <WorkflowRunView
              item={item}
              userId={user.uid}
              onUpdated={(updated) => setItem(updated)}
              onEdit={() => setWorkflowEditing(true)}
            />
          )
        )}

        {/* Markdown editor */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-1 border-b border-border px-3 py-2">
            <button
              onClick={() => setMode("edit")}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                mode === "edit" ? "bg-muted font-medium" : "text-muted-foreground"
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setMode("preview")}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                mode === "preview" ? "bg-muted font-medium" : "text-muted-foreground"
              }`}
            >
              Preview
            </button>
            <span className="ml-auto text-[10px] text-muted-foreground">Markdown supported</span>
          </div>
          {generatingStub ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Generating this file for the first time…</p>
            </div>
          ) : mode === "edit" ? (
            <>
              {!item.markdownContent && (
                <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5">
                  <span className="text-[11px] text-muted-foreground">Start faster:</span>
                  {DEFAULT_TEMPLATES.filter((t) => t.type === item.type)
                    .slice(0, 1)
                    .map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => update({ markdownContent: tpl.markdownContent })}
                        className="rounded-full border border-border px-2.5 py-1 text-[11px] transition-colors hover:border-primary/50 cursor-pointer"
                      >
                        {tpl.emoji} Insert {tpl.name} structure
                      </button>
                    ))}
                  <span className="text-[11px] text-muted-foreground">
                    Tip: type <kbd className="rounded border border-border px-1">@</kbd> to mention
                    an AI tool
                  </span>
                </div>
              )}
              <MentionTextarea
                value={item.markdownContent}
                onChange={(v) => update({ markdownContent: v })}
                placeholder="Write in markdown... type @ to mention AI tools like @Claude or @Cursor."
                rows={16}
                className="w-full resize-y bg-transparent px-4 py-3 font-mono text-sm outline-none"
              />
            </>
          ) : (
            <div className="px-4 py-3">
              <MarkdownView content={item.markdownContent} />
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
