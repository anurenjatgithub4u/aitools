"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { workspaceApi, DEFAULT_TEMPLATES } from "@/lib/workspace"
import type { WorkspaceProjectDto } from "@/types/workspace"

type CreateKind =
  | "playbook"
  | "knowledge"
  | "prompt"
  | "workflow"
  | "project"
  | "collection"
  | "template"

const OPTIONS: { kind: CreateKind; label: string; emoji: string }[] = [
  { kind: "playbook", label: "New Playbook", emoji: "📘" },
  { kind: "prompt", label: "New Prompt", emoji: "💬" },
  { kind: "workflow", label: "New Workflow", emoji: "⚡" },
  { kind: "knowledge", label: "New AI Memory", emoji: "🧠" },
  { kind: "project", label: "New Project", emoji: "📁" },
  { kind: "collection", label: "New Resource", emoji: "📎" },
  { kind: "template", label: "New Template", emoji: "📐" },
]

export function QuickCreateDialog({
  userId,
  open,
  onOpenChange,
  initialKind,
}: {
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  initialKind?: CreateKind
}) {
  const router = useRouter()
  const [kind, setKind] = useState<CreateKind | null>(initialKind || null)
  const [title, setTitle] = useState("")
  const [projectId, setProjectId] = useState("")
  const [projects, setProjects] = useState<WorkspaceProjectDto[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setKind(initialKind || null)
      setTitle("")
      setProjectId("")
      setError("")
      workspaceApi.listProjects(userId).then(setProjects).catch(() => {})
    }
  }, [open, userId, initialKind])

  const isItem = kind && kind !== "project" && kind !== "collection"

  const create = async () => {
    if (!kind || !title.trim() || busy) return
    setBusy(true)
    setError("")
    try {
      if (kind === "project") {
        const project = await workspaceApi.createProject({ userId, name: title.trim() })
        onOpenChange(false)
        router.push(`/workspace/projects/${project._id}`)
      } else if (kind === "collection") {
        const collection = await workspaceApi.createCollection({ userId, name: title.trim() })
        onOpenChange(false)
        router.push(`/workspace/collections/${collection._id}`)
      } else {
        const template = DEFAULT_TEMPLATES.find((t) => t.type === kind)
        const item = await workspaceApi.createItem({
          userId,
          title: title.trim(),
          type: kind,
          projectId: projectId || undefined,
          markdownContent: kind === "template" ? "" : template?.markdownContent || "",
        } as any)
        onOpenChange(false)
        router.push(`/workspace/items/${item._id}`)
      }
    } catch (e: any) {
      setError(e.message || "Failed to create")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Create</DialogTitle>
          <DialogDescription>
            {kind
              ? `Name your new ${OPTIONS.find((o) => o.kind === kind)?.label.replace("New ", "").toLowerCase()}.`
              : "What do you want to create?"}
          </DialogDescription>
        </DialogHeader>

        {!kind ? (
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.kind}
                onClick={() => setKind(o.kind)}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm hover:border-primary/50 hover:bg-muted transition-colors cursor-pointer"
              >
                <span>{o.emoji}</span>
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Title..."
            />
            {isItem && projects.length > 0 && (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none dark:bg-input/30"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.emoji} {p.name}
                  </option>
                ))}
              </select>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setKind(null)}>
                Back
              </Button>
              <Button size="sm" onClick={create} disabled={!title.trim() || busy}>
                {busy ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function QuickCreateFab({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg"
        aria-label="Quick create"
      >
        <Plus className="h-5 w-5" />
      </Button>
      <QuickCreateDialog userId={userId} open={open} onOpenChange={setOpen} />
    </>
  )
}
