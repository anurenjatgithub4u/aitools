"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  FilePlus,
  FolderPlus,
  Pencil,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
  Zap,
} from "lucide-react"
import { workspaceApi, taskUnits } from "@/lib/workspace"
import { notifyProjectDataChanged, onProjectDataChanged } from "@/lib/workspace-events"
import { useConfirm } from "@/components/confirm-dialog-context"
import { CircularProgress } from "@/components/ui/circular-progress"
import type { WorkspaceCollectionDto, WorkspaceItemDto, WorkspaceItemType, WorkspaceProjectDto } from "@/types/workspace"

type RootAddKind = "folder" | "file" | "workflow" | "note" | "prompt" | null

const ROOT_ADD_OPTIONS: {
  kind: Exclude<RootAddKind, null>
  label: string
  icon: React.ElementType
  itemType?: WorkspaceItemType
  emoji?: string
}[] = [
  { kind: "folder", label: "Folder", icon: FolderPlus },
  { kind: "file", label: "File", icon: FilePlus, itemType: "knowledge", emoji: "📄" },
  { kind: "workflow", label: "Workflow", icon: Zap, itemType: "workflow", emoji: "🔁" },
  { kind: "note", label: "Note", icon: StickyNote, itemType: "knowledge", emoji: "📝" },
  { kind: "prompt", label: "Prompt", icon: Sparkles, itemType: "prompt", emoji: "✨" },
]

const KIND_ORDER: Record<string, number> = {
  dashboard: 0,
  execution: 1,
  ai: 2,
  knowledge: 3,
  personal: 4,
  archive: 5,
}

interface TreeCtx {
  basePath: string
  activeFolder: string | null
  activeItemId: string | null
  expanded: Set<string>
  toggleExpand: (id: string) => void
  childrenOf: Map<string | null, WorkspaceCollectionDto[]>
  itemsOf: Map<string, WorkspaceItemDto[]>
  renamingId: string | null
  setRenamingId: (id: string | null) => void
  addingUnder: string | null
  setAddingUnder: (id: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onAddSubfolder: (parentId: string, name: string) => void
  onAddFile: (folderId: string, title: string) => void
  draggedId: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDropOn: (targetId: string) => void
}

function FolderRow({ folder, depth, ctx }: { folder: WorkspaceCollectionDto; depth: number; ctx: TreeCtx }) {
  const children = ctx.childrenOf.get(folder._id) || []
  const items = ctx.itemsOf.get(folder._id) || []
  const hasChildren = children.length > 0 || items.length > 0
  const taskTotals = items.reduce(
    (acc, item) => {
      const u = taskUnits(item)
      return { done: acc.done + u.done, total: acc.total + u.total }
    },
    { done: 0, total: 0 }
  )
  const folderPct = taskTotals.total > 0 ? Math.round((taskTotals.done / taskTotals.total) * 100) : 0
  const isExpanded = ctx.expanded.has(folder._id)
  const isActive = ctx.activeFolder === folder._id
  const isRenaming = ctx.renamingId === folder._id
  const isAdding = ctx.addingUnder === folder._id
  const [draft, setDraft] = useState(folder.name)
  const [addKind, setAddKind] = useState<"folder" | "file" | null>(null)
  const [addDraft, setAddDraft] = useState("")

  const isDragging = ctx.draggedId === folder._id

  return (
    <div>
      <div
        draggable={!isRenaming}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move"
          ctx.onDragStart(folder._id)
        }}
        onDragEnd={ctx.onDragEnd}
        onDragOver={(e) => {
          if (ctx.draggedId && ctx.draggedId !== folder._id) e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          ctx.onDropOn(folder._id)
        }}
        className={`group flex items-center gap-1 rounded-lg pr-1 text-sm transition-colors ${
          isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        } ${isDragging ? "opacity-40" : ""}`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <button
          onClick={() => hasChildren && ctx.toggleExpand(folder._id)}
          className={`flex h-5 w-4 shrink-0 items-center justify-center ${hasChildren ? "cursor-pointer" : "opacity-0"}`}
          aria-label="Toggle expand"
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </button>

        {isRenaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft.trim() && draft.trim() !== folder.name) ctx.onRename(folder._id, draft.trim())
              ctx.setRenamingId(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") {
                setDraft(folder.name)
                ctx.setRenamingId(null)
              }
            }}
            className="min-w-0 flex-1 rounded border border-primary/40 bg-background px-1 py-0.5 text-sm outline-none"
          />
        ) : (
          <Link
            href={`${ctx.basePath}?folder=${folder._id}`}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5"
            title={folder.name}
          >
            <span className="shrink-0">{folder.emoji}</span>
            <span className="truncate">{folder.name}</span>
          </Link>
        )}

        {!isRenaming && (
          <span title={`${folderPct}% complete`} className="shrink-0">
            <CircularProgress pct={folderPct} size={16} strokeWidth={2} showLabel={false} />
          </span>
        )}

        {!isRenaming && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => {
                ctx.setAddingUnder(isAdding ? null : folder._id)
                setAddKind(null)
                setAddDraft("")
              }}
              className="rounded p-0.5 hover:bg-background cursor-pointer"
              aria-label="Add inside"
              title="Add subfolder or file"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={() => {
                setDraft(folder.name)
                ctx.setRenamingId(folder._id)
              }}
              className="rounded p-0.5 hover:bg-background cursor-pointer"
              aria-label="Rename"
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => ctx.onDuplicate(folder._id)}
              className="rounded p-0.5 hover:bg-background cursor-pointer"
              aria-label="Duplicate"
              title="Duplicate"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              onClick={() => ctx.onDelete(folder._id, folder.name)}
              className="rounded p-0.5 hover:bg-background hover:text-destructive cursor-pointer"
              aria-label="Delete"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="flex flex-col gap-1 py-1" style={{ paddingLeft: `${(depth + 1) * 14 + 4}px` }}>
          {!addKind ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAddKind("folder")}
                className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground cursor-pointer"
              >
                <FolderPlus className="h-3 w-3" /> Subfolder
              </button>
              <button
                onClick={() => setAddKind("file")}
                className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground cursor-pointer"
              >
                <FilePlus className="h-3 w-3" /> File
              </button>
            </div>
          ) : (
            <input
              autoFocus
              value={addDraft}
              onChange={(e) => setAddDraft(e.target.value)}
              placeholder={addKind === "folder" ? "Subfolder name..." : "File title..."}
              onKeyDown={(e) => {
                if (e.key === "Enter" && addDraft.trim()) {
                  if (addKind === "folder") ctx.onAddSubfolder(folder._id, addDraft.trim())
                  else ctx.onAddFile(folder._id, addDraft.trim())
                  ctx.setAddingUnder(null)
                }
                if (e.key === "Escape") ctx.setAddingUnder(null)
              }}
              onBlur={() => ctx.setAddingUnder(null)}
              className="min-w-0 rounded border border-primary/40 bg-background px-1.5 py-0.5 text-xs outline-none"
            />
          )}
        </div>
      )}

      {hasChildren && isExpanded && (
        <div className="relative">
          <div className="absolute top-0 bottom-0 border-l border-border/50" style={{ left: `${depth * 14 + 12}px` }} />
          {children.map((child) => (
            <FolderRow key={child._id} folder={child} depth={depth + 1} ctx={ctx} />
          ))}
          {items.map((item) => (
            <Link
              key={item._id}
              href={`/workspace/items/${item._id}`}
              className={`flex items-center gap-1.5 rounded-lg py-1.5 pr-1 text-sm transition-colors ${
                ctx.activeItemId === item._id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              style={{ paddingLeft: `${(depth + 1) * 14 + 24}px` }}
              title={item.title}
            >
              <span className="shrink-0">{item.emoji || "📄"}</span>
              <span className="truncate">{item.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function ProjectSidebarTree({ userId, projectId }: { userId: string; projectId: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeFolder = searchParams.get("folder")
  const confirm = useConfirm()
  const [project, setProject] = useState<WorkspaceProjectDto | null>(null)
  const [folders, setFolders] = useState<WorkspaceCollectionDto[]>([])
  const [items, setItems] = useState<WorkspaceItemDto[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [addingUnder, setAddingUnder] = useState<string | null>(null)
  const [isProjectExpanded, setIsProjectExpanded] = useState(true)
  const [renamingProject, setRenamingProject] = useState(false)
  const [projectDraft, setProjectDraft] = useState("")
  const [addingRootOpen, setAddingRootOpen] = useState(false)
  const [addingRootKind, setAddingRootKind] = useState<RootAddKind>(null)
  const [rootDraft, setRootDraft] = useState("")
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    return Promise.all([
      workspaceApi.listProjects(userId),
      workspaceApi.listCollections(userId, { projectId }),
      workspaceApi.listItems(userId, { projectId }),
    ])
      .then(([projects, projectFolders, projectItems]) => {
        setProject(projects.find((p) => p._id === projectId) || null)
        setFolders(projectFolders)
        setItems(projectItems)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, projectId])

  useEffect(() => onProjectDataChanged(load), [userId, projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const basePath = `/workspace/projects/${projectId}`
  const activeItemMatch = pathname.match(/^\/workspace\/items\/([^/]+)/)
  const activeItemId = activeItemMatch ? activeItemMatch[1] : null
  const isDashboard = pathname === basePath && !activeFolder
  const isOverview = pathname === `${basePath}/overview`
  const isRoadmap = pathname === `${basePath}/roadmap`
  const isTracker = pathname === `${basePath}/tracker`
  const isChecklist = pathname === `${basePath}/checklist`

  const linkClass = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
      active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`

  const sorted = useMemo(
    () => [...folders].sort((a, b) => (KIND_ORDER[a.kind || ""] ?? 9) - (KIND_ORDER[b.kind || ""] ?? 9) || a.order - b.order),
    [folders]
  )
  const dashboard = sorted.find((f) => f.kind === "dashboard")
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, WorkspaceCollectionDto[]>()
    for (const f of sorted) {
      const key = f.parentId || null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(f)
    }
    return map
  }, [sorted])

  const itemsOf = useMemo(() => {
    const map = new Map<string, WorkspaceItemDto[]>()
    for (const i of items) {
      for (const cid of i.collectionIds) {
        if (!map.has(cid)) map.set(cid, [])
        map.get(cid)!.push(i)
      }
    }
    return map
  }, [items])

  const roots = (kind: string) => (childrenOf.get(null) || []).filter((f) => f.kind === kind)

  // Group top-level execution folders under the phase (milestone) they
  // belong to, so the journey the plan describes is visible in the tree —
  // not just a flat pile of folders.
  const milestones = [...(project?.plan?.milestones || [])].sort((a, b) => a.order - b.order)
  const executionRoots = roots("execution")
  const phasedFolders = new Map<string, WorkspaceCollectionDto[]>()
  const unphasedFolders: WorkspaceCollectionDto[] = []
  for (const f of executionRoots) {
    if (f.milestoneId && milestones.some((m) => m.id === f.milestoneId)) {
      if (!phasedFolders.has(f.milestoneId)) phasedFolders.set(f.milestoneId, [])
      phasedFolders.get(f.milestoneId)!.push(f)
    } else {
      unphasedFolders.push(f)
    }
  }
  const assetFolders = [...roots("ai"), ...roots("knowledge"), ...roots("personal"), ...roots("archive")]

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onRename = async (id: string, name: string) => {
    setFolders((prev) => prev.map((f) => (f._id === id ? { ...f, name } : f)))
    try {
      await workspaceApi.updateCollection(id, { userId, name })
      notifyProjectDataChanged()
    } catch {
      load()
    }
  }

  const onDelete = async (id: string, name: string) => {
    if (!(await confirm(`Delete "${name}"? Subfolders are removed too — items inside are kept but unfiled.`))) return
    try {
      await workspaceApi.deleteCollection(id, userId)
      if (activeFolder === id) router.push(basePath)
      load()
      notifyProjectDataChanged()
    } catch {
      load()
    }
  }

  const onAddSubfolder = async (parentId: string, name: string) => {
    try {
      const parent = folders.find((f) => f._id === parentId)
      await workspaceApi.createCollection({
        userId,
        name,
        projectId,
        parentId,
        kind: parent?.kind || "execution",
        emoji: "📁",
      })
      setExpanded((prev) => new Set(prev).add(parentId))
      load()
      notifyProjectDataChanged()
    } catch {
      /* ignore */
    }
  }

  const onAddFile = async (folderId: string, title: string) => {
    try {
      await workspaceApi.createItem({ userId, title, type: "knowledge", projectId, collectionIds: [folderId] })
      load()
      notifyProjectDataChanged()
    } catch {
      /* ignore */
    }
  }

  const onRenameProject = async (name: string) => {
    setProject((prev) => (prev ? { ...prev, name } : prev))
    try {
      await workspaceApi.updateProject(projectId, { userId, name })
      notifyProjectDataChanged()
    } catch {
      load()
    }
  }

  const onAddRootFolder = async (name: string) => {
    try {
      await workspaceApi.createCollection({ userId, name, projectId, parentId: null, kind: "execution", emoji: "📁" })
      load()
      notifyProjectDataChanged()
    } catch {
      /* ignore */
    }
  }

  // Root-level files never require a folder (workspace-system-v2 spec) — they
  // land with no collectionIds and surface in Overview's "Unfiled" section.
  const onAddRootItem = async (itemType: WorkspaceItemType, emoji: string, title: string) => {
    try {
      await workspaceApi.createItem({ userId, title, type: itemType, projectId, collectionIds: [], emoji })
      notifyProjectDataChanged()
    } catch {
      /* ignore */
    }
  }

  const onDuplicate = async (id: string) => {
    try {
      await workspaceApi.duplicateCollection(id, userId)
      load()
      notifyProjectDataChanged()
    } catch {
      /* ignore */
    }
  }

  const onDragStart = (id: string) => setDraggedId(id)
  const onDragEnd = () => setDraggedId(null)

  // Reordering is scoped to siblings sharing the same parent — dragging
  // across phases/kinds would also require reassigning milestoneId/kind,
  // which is a bigger, separate change than simple reordering.
  const onDropOn = async (targetId: string) => {
    const fromId = draggedId
    setDraggedId(null)
    if (!fromId || fromId === targetId) return
    const dragged = folders.find((f) => f._id === fromId)
    const target = folders.find((f) => f._id === targetId)
    if (!dragged || !target) return
    if ((dragged.parentId || null) !== (target.parentId || null)) return

    const siblings = [...(childrenOf.get(dragged.parentId || null) || [])]
    const fromIdx = siblings.findIndex((f) => f._id === fromId)
    const toIdx = siblings.findIndex((f) => f._id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = siblings.splice(fromIdx, 1)
    siblings.splice(toIdx, 0, moved)
    const updates = siblings.map((f, i) => ({ id: f._id, order: i }))

    setFolders((prev) =>
      prev.map((f) => {
        const u = updates.find((x) => x.id === f._id)
        return u ? { ...f, order: u.order } : f
      })
    )
    try {
      await Promise.all(updates.map((u) => workspaceApi.updateCollection(u.id, { userId, order: u.order })))
      notifyProjectDataChanged()
    } catch {
      load()
    }
  }

  const ctx: TreeCtx = {
    basePath,
    activeFolder,
    activeItemId,
    expanded,
    toggleExpand,
    childrenOf,
    itemsOf,
    renamingId,
    setRenamingId,
    addingUnder,
    setAddingUnder,
    onRename,
    onDelete,
    onDuplicate,
    onAddSubfolder,
    onAddFile,
    draggedId,
    onDragStart,
    onDragEnd,
    onDropOn,
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!project) return null

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      <Link
        href="/workspace/projects"
        className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> All Projects
      </Link>

      <div className="group mb-2 flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-muted transition-colors">
        <button
          onClick={() => setIsProjectExpanded((prev) => !prev)}
          className="flex h-5 w-4 shrink-0 items-center justify-center cursor-pointer"
          aria-label="Toggle expand"
        >
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isProjectExpanded ? "rotate-90" : ""}`} />
        </button>

        {renamingProject ? (
          <input
            autoFocus
            value={projectDraft}
            onChange={(e) => setProjectDraft(e.target.value)}
            onBlur={() => {
              if (projectDraft.trim() && projectDraft.trim() !== project.name) onRenameProject(projectDraft.trim())
              setRenamingProject(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur()
              if (e.key === "Escape") {
                setProjectDraft(project.name)
                setRenamingProject(false)
              }
            }}
            className="min-w-0 flex-1 rounded border border-primary/40 bg-background px-1 py-0.5 text-sm outline-none"
          />
        ) : (
          <button
            onClick={() => setIsProjectExpanded((prev) => !prev)}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left cursor-pointer"
          >
            <span className="text-lg shrink-0">{project.emoji}</span>
            <span className="truncate text-sm font-semibold text-foreground">{project.name}</span>
          </button>
        )}

        {!renamingProject && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => {
                setAddingRootOpen((o) => !o)
                setAddingRootKind(null)
                setRootDraft("")
              }}
              className="rounded p-0.5 hover:bg-background cursor-pointer"
              aria-label="Add to project"
              title="Add to project"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setProjectDraft(project.name)
                setRenamingProject(true)
              }}
              className="rounded p-0.5 hover:bg-background cursor-pointer"
              aria-label="Rename project"
              title="Rename"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {addingRootOpen && (
        <div className="mb-2 pl-6">
          {!addingRootKind ? (
            <div className="flex flex-wrap items-center gap-1">
              {ROOT_ADD_OPTIONS.map((opt) => (
                <button
                  key={opt.kind}
                  onClick={() => setAddingRootKind(opt.kind)}
                  className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground cursor-pointer"
                >
                  <opt.icon className="h-3 w-3" /> {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <input
              autoFocus
              value={rootDraft}
              onChange={(e) => setRootDraft(e.target.value)}
              placeholder={`${ROOT_ADD_OPTIONS.find((o) => o.kind === addingRootKind)?.label || ""} name...`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && rootDraft.trim()) {
                  const opt = ROOT_ADD_OPTIONS.find((o) => o.kind === addingRootKind)
                  if (opt?.kind === "folder") onAddRootFolder(rootDraft.trim())
                  else if (opt?.itemType) onAddRootItem(opt.itemType, opt.emoji || "📄", rootDraft.trim())
                  setAddingRootOpen(false)
                  setAddingRootKind(null)
                }
                if (e.key === "Escape") {
                  setAddingRootOpen(false)
                  setAddingRootKind(null)
                }
              }}
              onBlur={() => {
                setAddingRootOpen(false)
                setAddingRootKind(null)
              }}
              className="min-w-0 rounded border border-primary/40 bg-background px-1.5 py-0.5 text-xs outline-none"
            />
          )}
        </div>
      )}

      {isProjectExpanded && (
        <div className="flex flex-col gap-0.5">
          {dashboard && (
            <>
              <div className="flex items-center gap-2 px-2.5 py-1 text-sm font-medium text-foreground">
                <span>{dashboard.emoji}</span> Dashboard
              </div>
              <div className="ml-4 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                <Link href={basePath} className={linkClass(isDashboard)}>
                  Dashboard
                </Link>
                <Link href={`${basePath}/overview`} className={linkClass(isOverview)}>
                  Overview
                </Link>
                <Link href={`${basePath}/roadmap`} className={linkClass(isRoadmap)}>
                  Roadmap
                </Link>
                <Link href={`${basePath}/tracker`} className={linkClass(isTracker)}>
                  Tracker
                </Link>
                <Link href={`${basePath}/checklist`} className={linkClass(isChecklist)}>
                  Checklist
                </Link>
              </div>
            </>
          )}

          {/* Execution folders — grouped into the journey's phases */}
          {executionRoots.length > 0 && (
            <div>
              <div className="my-2 h-px bg-border/60" />
              {milestones.map((m, i) => {
                const group = phasedFolders.get(m.id) || []
                if (group.length === 0) return null
                return (
                  <div key={m.id} className="mb-1">
                    <p className="mb-1 mt-2 truncate px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Phase {i + 1} · {m.title}
                    </p>
                    {group.map((folder) => (
                      <FolderRow key={folder._id} folder={folder} depth={0} ctx={ctx} />
                    ))}
                  </div>
                )
              })}
              {unphasedFolders.length > 0 && (
                <div className="mb-1">
                  {milestones.length > 0 && (
                    <p className="mb-1 mt-2 px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Other
                    </p>
                  )}
                  {unphasedFolders.map((folder) => (
                    <FolderRow key={folder._id} folder={folder} depth={0} ctx={ctx} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI / Knowledge / Personal / Archive — the fixed workspace assets */}
          {assetFolders.length > 0 && (
            <div>
              <div className="my-2 h-px bg-border/60" />
              <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Workspace Assets
              </p>
              {assetFolders.map((folder) => (
                <FolderRow key={folder._id} folder={folder} depth={0} ctx={ctx} />
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
