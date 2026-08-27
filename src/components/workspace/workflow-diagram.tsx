"use client"

import {
  Bot,
  User,
  GitFork,
  Repeat,
  Columns3,
  PackageCheck,
  CircleDot,
  Target,
  Flag,
  ChevronDown,
} from "lucide-react"
import type { WorkflowStep, WorkflowStepKind } from "@/types/workspace"

// Live workflow diagram — generated straight from the steps array, never
// hand-drawn (FindurAI_Workflow_UX_Redesign.md). A flat array is enough:
// `branch` attaches a step to the nearest preceding decision/loop/parallel
// step, so we can reconstruct a real flowchart without a graph database.

export interface FlowNode {
  step: WorkflowStep
  index: number
  yes?: FlowNode[]
  no?: FlowNode[]
  loop?: FlowNode[]
  parallel?: FlowNode[]
}

export function buildWorkflowFlow(steps: WorkflowStep[]): {
  nodes: FlowNode[]
  orphaned: { step: WorkflowStep; index: number }[]
} {
  const nodes: FlowNode[] = []
  const orphaned: { step: WorkflowStep; index: number }[] = []
  let i = 0
  while (i < steps.length) {
    const step = steps[i]
    if (step.branch) {
      // A branch step with no preceding decision/loop/parallel to attach to.
      orphaned.push({ step, index: i })
      i++
      continue
    }
    const node: FlowNode = { step, index: i }
    i++
    if (step.kind === "decision") {
      const yes: FlowNode[] = []
      const no: FlowNode[] = []
      while (i < steps.length && (steps[i].branch === "yes" || steps[i].branch === "no")) {
        const b = steps[i]
        ;(b.branch === "yes" ? yes : no).push({ step: b, index: i })
        i++
      }
      if (yes.length) node.yes = yes
      if (no.length) node.no = no
    } else if (step.kind === "loop") {
      const loop: FlowNode[] = []
      while (i < steps.length && steps[i].branch === "loop") {
        loop.push({ step: steps[i], index: i })
        i++
      }
      if (loop.length) node.loop = loop
    } else if (step.kind === "parallel") {
      const parallel: FlowNode[] = []
      while (i < steps.length && steps[i].branch === "parallel") {
        parallel.push({ step: steps[i], index: i })
        i++
      }
      if (parallel.length) node.parallel = parallel
    }
    nodes.push(node)
  }
  return { nodes, orphaned }
}

const KIND_META: Record<
  WorkflowStepKind,
  { icon: React.ElementType; tint: string; label: string }
> = {
  step: { icon: CircleDot, tint: "bg-slate-500/15 text-slate-500", label: "Step" },
  decision: { icon: GitFork, tint: "bg-amber-500/15 text-amber-500", label: "Decision" },
  loop: { icon: Repeat, tint: "bg-violet-500/15 text-violet-500", label: "Loop" },
  parallel: { icon: Columns3, tint: "bg-blue-500/15 text-blue-500", label: "Parallel" },
  ai_call: { icon: Bot, tint: "bg-emerald-500/15 text-emerald-500", label: "AI Call" },
  human_action: { icon: User, tint: "bg-orange-500/15 text-orange-500", label: "Human Action" },
  output: { icon: PackageCheck, tint: "bg-cyan-500/15 text-cyan-500", label: "Output" },
}

// Visible, directional connector — a thicker line with a trailing arrowhead
// so flow direction reads clearly at a glance, not just an implied top-down order.
function VLine({ height = "h-4" }: { height?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-0.5 ${height} bg-border`} />
      <ChevronDown className="-mt-1 h-3.5 w-3.5 text-border" strokeWidth={3} />
    </div>
  )
}

function DiagramNode({
  node,
  onClick,
  compact,
  current,
}: {
  node: FlowNode
  onClick?: (id: string) => void
  compact?: boolean
  current?: boolean
}) {
  const kind = node.step.kind || "step"
  const meta = KIND_META[kind]
  const Icon = meta.icon
  return (
    <button
      onClick={() => onClick?.(node.step.id)}
      className={`group flex w-full items-center gap-2 rounded-xl border bg-card px-3 py-2 text-left shadow-sm transition-all cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md ${
        node.step.done
          ? "border-emerald-500/40 opacity-70"
          : current
            ? "border-primary shadow-md shadow-primary/10 ring-2 ring-primary/20"
            : "border-border"
      } ${compact ? "max-w-[220px]" : "max-w-[260px]"}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          node.step.done
            ? "bg-emerald-500/15 text-emerald-500"
            : current
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {node.step.done ? "✓" : node.index + 1}
      </span>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-xs font-medium ${
            node.step.done ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {node.step.text || "Untitled step"}
        </span>
        {!compact && (
          <span className="block truncate text-[10px] text-muted-foreground">
            {current && !node.step.done ? "Current step" : meta.label}
          </span>
        )}
      </span>
    </button>
  )
}

function BranchColumn({
  label,
  tint,
  nodes,
  onClick,
  compact,
  currentStepId,
}: {
  label: string
  tint: string
  nodes: FlowNode[]
  onClick?: (id: string) => void
  compact?: boolean
  currentStepId?: string
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <span className={`mb-2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${tint}`}>
        {label}
      </span>
      <VLine height="h-3" />
      {nodes.map((n, i) => (
        <div key={n.step.id} className="flex w-full flex-col items-center">
          <DiagramNode node={n} onClick={onClick} compact={compact} current={n.step.id === currentStepId} />
          {i < nodes.length - 1 && <VLine height="h-3" />}
        </div>
      ))}
    </div>
  )
}

function RenderNode({
  node,
  onClick,
  compact,
  currentStepId,
}: {
  node: FlowNode
  onClick?: (id: string) => void
  compact?: boolean
  currentStepId?: string
}) {
  return (
    <div className="flex w-full flex-col items-center">
      <DiagramNode node={node} onClick={onClick} compact={compact} current={node.step.id === currentStepId} />

      {(node.yes || node.no) && (
        <>
          <VLine height="h-3" />
          <div className="flex w-full items-start justify-center gap-4">
            {node.yes && (
              <BranchColumn
                label={`Yes${node.step.condition ? ` · ${node.step.condition}` : ""}`}
                tint="bg-emerald-500/15 text-emerald-500"
                nodes={node.yes}
                onClick={onClick}
                compact={compact}
                currentStepId={currentStepId}
              />
            )}
            {node.no && (
              <BranchColumn
                label="No"
                tint="bg-rose-500/15 text-rose-500"
                nodes={node.no}
                onClick={onClick}
                compact={compact}
                currentStepId={currentStepId}
              />
            )}
          </div>
          <div className="my-1 h-3 w-px bg-border" />
        </>
      )}

      {node.loop && (
        <>
          <VLine height="h-3" />
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-violet-500/40 bg-violet-500/[0.03] p-3">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-500">
              <Repeat className="h-3 w-3" /> Repeats
            </span>
            {node.loop.map((n, i) => (
              <div key={n.step.id} className="flex flex-col items-center">
                <DiagramNode node={n} onClick={onClick} compact={compact} current={n.step.id === currentStepId} />
                {i < node.loop!.length - 1 && <VLine height="h-2" />}
              </div>
            ))}
          </div>
        </>
      )}

      {node.parallel && (
        <>
          <VLine height="h-3" />
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-blue-500/40 bg-blue-500/[0.03] p-3">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-500">
              <Columns3 className="h-3 w-3" /> Runs in parallel
            </span>
            <div className="flex flex-wrap items-start justify-center gap-3">
              {node.parallel.map((n) => (
                <DiagramNode key={n.step.id} node={n} onClick={onClick} compact={compact} current={n.step.id === currentStepId} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function WorkflowDiagram({
  goal,
  expectedResult,
  steps,
  onNodeClick,
  compact = false,
  currentStepId,
}: {
  goal?: string
  expectedResult?: string
  steps: WorkflowStep[]
  onNodeClick?: (stepId: string) => void
  compact?: boolean
  currentStepId?: string
}) {
  const { nodes, orphaned } = buildWorkflowFlow(steps)

  if (nodes.length === 0 && !goal && !expectedResult) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
        Add a goal and steps — the diagram draws itself.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-0 overflow-x-auto px-2 py-4">
      {goal && (
        <>
          <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Flag className="h-3 w-3" /> {goal}
          </span>
          <VLine height="h-4" />
        </>
      )}

      {nodes.map((node, i) => (
        <div key={node.step.id} className="flex w-full flex-col items-center">
          <RenderNode node={node} onClick={onNodeClick} compact={compact} currentStepId={currentStepId} />
          {i < nodes.length - 1 && <VLine height="h-4" />}
        </div>
      ))}

      {expectedResult && (
        <>
          <VLine height="h-4" />
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
            <Target className="h-3 w-3" /> {expectedResult}
          </span>
        </>
      )}

      {orphaned.length > 0 && (
        <div className="mt-5 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-destructive/40 bg-destructive/[0.03] p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">
            Disconnected steps
          </span>
          {orphaned.map(({ step }) => (
            <DiagramNode
              key={step.id}
              node={{ step, index: 0 }}
              onClick={onNodeClick}
              compact={compact}
              current={step.id === currentStepId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { KIND_META }
