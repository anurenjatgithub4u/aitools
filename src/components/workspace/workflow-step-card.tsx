"use client"

import {
  ArrowDown,
  ArrowUp,
  Copy,
  Trash2,
  CornerDownRight,
} from "lucide-react"
import type { WorkflowStep, WorkflowStepKind, WorkflowBranch } from "@/types/workspace"
import { KIND_META } from "@/components/workspace/workflow-diagram"

const KIND_OPTIONS: { value: WorkflowStepKind; label: string }[] = [
  { value: "step", label: "Step" },
  { value: "decision", label: "Decision (If / Else)" },
  { value: "loop", label: "Loop" },
  { value: "parallel", label: "Parallel" },
  { value: "ai_call", label: "AI Call" },
  { value: "human_action", label: "Human Action" },
  { value: "output", label: "Output" },
]

const BRANCH_LABEL: Record<WorkflowBranch, { label: string; tint: string }> = {
  yes: { label: "Yes branch", tint: "bg-emerald-500/15 text-emerald-500" },
  no: { label: "No branch", tint: "bg-rose-500/15 text-rose-500" },
  loop: { label: "Loop step", tint: "bg-violet-500/15 text-violet-500" },
  parallel: { label: "Parallel step", tint: "bg-blue-500/15 text-blue-500" },
}

export function WorkflowStepCard({
  step,
  number,
  studentMode,
  canMoveUp,
  canMoveDown,
  onChange,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  onDuplicate,
  onDelete,
  onAddBranch,
}: {
  step: WorkflowStep
  number: number
  studentMode: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (changes: Partial<WorkflowStep>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddBelow: () => void
  onDuplicate: () => void
  onDelete: () => void
  onAddBranch: (branch: WorkflowBranch) => void
}) {
  const kind = step.kind || "step"
  const meta = KIND_META[kind]
  const Icon = meta.icon
  const branchMeta = step.branch ? BRANCH_LABEL[step.branch] : null

  return (
    <div
      className={`rounded-xl border bg-card p-3 transition-colors ${
        step.done ? "border-emerald-500/30" : "border-border"
      }`}
    >
      {/* Header row */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="checkbox"
          checked={step.done}
          onChange={(e) => onChange({ done: e.target.checked })}
          className="h-4 w-4 shrink-0 accent-primary"
          aria-label="Mark step done"
        />
        <span className="text-[11px] font-mono text-muted-foreground">{number}</span>

        {branchMeta && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${branchMeta.tint}`}>
            {branchMeta.label}
          </span>
        )}

        {studentMode ? (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.tint}`}>
            <Icon className="h-3 w-3" /> {meta.label}
          </span>
        ) : (
          <select
            value={kind}
            onChange={(e) => onChange({ kind: e.target.value as WorkflowStepKind })}
            className={`rounded-full border-none px-2 py-0.5 text-[10px] font-medium outline-none ${meta.tint}`}
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            aria-label="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
            aria-label="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDuplicate}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Duplicate step"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive cursor-pointer"
            aria-label="Delete step"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        value={step.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Step title..."
        className={`w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none hover:border-border focus:border-border ${
          step.done ? "text-muted-foreground line-through" : ""
        }`}
      />

      {/* Advanced fields — hidden in Student Mode (progressive disclosure) */}
      {!studentMode && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-2">
          <textarea
            value={step.instruction || ""}
            onChange={(e) => onChange({ instruction: e.target.value })}
            placeholder="Prompt / instruction for this step..."
            rows={2}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus-visible:border-ring dark:bg-input/30"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <input
              value={step.tool || ""}
              onChange={(e) => onChange({ tool: e.target.value })}
              placeholder="Tool"
              className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus-visible:border-ring dark:bg-input/30"
            />
            <input
              value={step.model || ""}
              onChange={(e) => onChange({ model: e.target.value })}
              placeholder="AI model"
              className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus-visible:border-ring dark:bg-input/30"
            />
            <input
              value={step.expectedOutput || ""}
              onChange={(e) => onChange({ expectedOutput: e.target.value })}
              placeholder="Expected output"
              className="col-span-2 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus-visible:border-ring dark:bg-input/30 sm:col-span-1"
            />
          </div>
          {kind === "decision" && (
            <input
              value={step.condition || ""}
              onChange={(e) => onChange({ condition: e.target.value })}
              placeholder="Condition question (e.g. Is the draft under 500 words?)"
              className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-xs outline-none focus-visible:border-amber-500/50"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
        <button
          onClick={onAddBelow}
          className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer"
        >
          <CornerDownRight className="h-3 w-3" /> Add Below
        </button>
        {!studentMode && kind === "decision" && (
          <>
            <button
              onClick={() => onAddBranch("yes")}
              className="rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
            >
              + Yes step
            </button>
            <button
              onClick={() => onAddBranch("no")}
              className="rounded-full border border-rose-500/30 bg-rose-500/5 px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-500/10 cursor-pointer"
            >
              + No step
            </button>
          </>
        )}
        {!studentMode && kind === "loop" && (
          <button
            onClick={() => onAddBranch("loop")}
            className="rounded-full border border-violet-500/30 bg-violet-500/5 px-2.5 py-1 text-[11px] font-medium text-violet-600 hover:bg-violet-500/10 cursor-pointer"
          >
            + Loop step
          </button>
        )}
        {!studentMode && kind === "parallel" && (
          <button
            onClick={() => onAddBranch("parallel")}
            className="rounded-full border border-blue-500/30 bg-blue-500/5 px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-500/10 cursor-pointer"
          >
            + Parallel step
          </button>
        )}
      </div>
    </div>
  )
}
