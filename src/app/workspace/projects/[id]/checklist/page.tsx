"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth-context"
import { workspaceApi } from "@/lib/workspace"
import { onProjectDataChanged } from "@/lib/workspace-events"
import type { WorkspaceItemDto, WorkspaceProjectDto } from "@/types/workspace"

export default function ProjectChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [project, setProject] = useState<WorkspaceProjectDto | null>(null)
  const [items, setItems] = useState<WorkspaceItemDto[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const [projects, projectItems] = await Promise.all([
        workspaceApi.listProjects(user.uid),
        workspaceApi.listItems(user.uid, { projectId: id, type: "workflow" }),
      ])
      setProject(projects.find((p) => p._id === id) || null)
      setItems(projectItems)
    } finally {
      setLoading(false)
    }
  }, [user, id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => onProjectDataChanged(load), [load])

  const toggleStep = async (item: WorkspaceItemDto, stepId: string) => {
    if (!user) return
    const steps = (item.typeData?.steps || []).map((s) => (s.id === stepId ? { ...s, done: !s.done } : s))
    setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, typeData: { ...i.typeData, steps } } : i)))
    try {
      await workspaceApi.updateItem(item._id, { userId: user.uid, typeData: { ...item.typeData, steps } })
    } catch {
      load()
    }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />
  if (!project) return <p className="text-sm text-muted-foreground">Project not found.</p>

  const withSteps = items.filter((i) => (i.typeData?.steps || []).length > 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">✅ Checklist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every workflow step across {project.name}, in one place.
        </p>
      </div>

      {withSteps.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No workflow steps yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {withSteps.map((item) => {
            const steps = item.typeData?.steps || []
            const done = steps.filter((s) => s.done).length
            return (
              <div key={item._id}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  {item.title}
                  <span className="font-normal text-muted-foreground">
                    ({done}/{steps.length})
                  </span>
                </h2>
                <div className="flex flex-col gap-1 rounded-xl border border-border/60 p-2">
                  {steps.map((step) => (
                    <label
                      key={step.id}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={step.done}
                        onChange={() => toggleStep(item, step.id)}
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      <span className={step.done ? "text-muted-foreground line-through" : ""}>{step.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
