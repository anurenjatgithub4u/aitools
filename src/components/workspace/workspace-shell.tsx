"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  FolderKanban,
  BookOpen,
  Search,
  Menu,
  X,
} from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { CommandPalette } from "@/components/workspace/command-palette"
import { QuickCreateFab } from "@/components/workspace/quick-create"
import { ProjectSidebarTree } from "@/components/workspace/project-sidebar-tree"
import { workspaceApi } from "@/lib/workspace"

const NAV = [
  { href: "/workspace", label: "Home", icon: Home, color: "text-violet-500", exact: true },
  { href: "/workspace/prompts", label: "My Prompts", icon: BookOpen, color: "text-indigo-500" },
  { href: "/workspace/projects", label: "Projects", icon: FolderKanban, color: "text-blue-500" },
]

const SIDEBAR_MIN = 220
const SIDEBAR_MAX = 480
const SIDEBAR_DEFAULT = 224
const SIDEBAR_WIDTH_KEY = "workspace-sidebar-width"

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [resizing, setResizing] = useState(false)
  const [itemProjectId, setItemProjectId] = useState<string | null>(null)

  // A file's own page (/workspace/items/[id]) isn't under /workspace/projects/...,
  // so it doesn't match the path-based project lookup below — resolve the
  // item's project here instead, so the sidebar keeps showing that project's
  // folder tree instead of falling back to the generic nav.
  const itemMatch = pathname.match(/^\/workspace\/items\/([^/]+)/)
  const itemId = itemMatch ? itemMatch[1] : null

  useEffect(() => {
    if (!itemId || !user) {
      setItemProjectId(null)
      return
    }
    let cancelled = false
    workspaceApi
      .getItem(itemId, user.uid)
      .then((item) => {
        if (!cancelled) setItemProjectId(item.projectId || null)
      })
      .catch(() => {
        if (!cancelled) setItemProjectId(null)
      })
    return () => {
      cancelled = true
    }
  }, [itemId, user])

  // Ctrl+K / Cmd+K opens universal search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Persisted sidebar width (VS Code-style drag handle)
  useEffect(() => {
    const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
    if (saved && saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX) setSidebarWidth(saved)
  }, [])

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: MouseEvent) => {
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX))
      setSidebarWidth(next)
    }
    const onUp = () => {
      setResizing(false)
      setSidebarWidth((w) => {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w))
        return w
      })
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [resizing])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="text-4xl">🧠</span>
        <h1 className="text-2xl font-bold">FindurAI Workspace</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Your AI second brain. Organize, connect, search and reuse everything you create with AI —
          prompts, workflows, research and knowledge.
        </p>
        <Link href="/login">
          <Button className="rounded-full px-6">Sign in to open your workspace</Button>
        </Link>
      </div>
    )
  }

  const projectMatch = pathname.match(/^\/workspace\/projects\/([^/]+)/)
  const activeProjectId = (projectMatch && projectMatch[1] !== "" ? projectMatch[1] : null) || itemProjectId

  const nav = activeProjectId ? (
    <Suspense fallback={<div className="p-3 text-xs text-muted-foreground">Loading…</div>}>
      <ProjectSidebarTree userId={user.uid} projectId={activeProjectId} />
    </Suspense>
  ) : (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map(({ href, label, icon: Icon, color, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${active ? "" : color}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className={`mx-auto flex w-full max-w-7xl ${resizing ? "select-none cursor-col-resize" : ""}`}>
      {/* Desktop sidebar */}
      <aside
        className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-border/60 md:flex relative"
        style={{ width: sidebarWidth }}
      >
        <div className="flex flex-col gap-2 p-3 pb-0">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left text-xs">Search...</span>
            <kbd className="text-[10px] border border-border rounded px-1 py-0.5">⌘K</kbd>
          </button>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto">{nav}</div>
        <div
          onMouseDown={(e) => {
            e.preventDefault()
            setResizing(true)
          }}
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/30 ${
            resizing ? "bg-primary/40" : "bg-transparent"
          }`}
          aria-hidden
        />
      </aside>

      {/* Mobile sidebar */}
      <div className="fixed bottom-6 left-6 z-40 md:hidden">
        <Button
          size="icon"
          variant="outline"
          className="h-12 w-12 rounded-full shadow-lg bg-background"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Workspace menu"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border bg-background pb-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2 p-3 pb-0">
                  <button
                onClick={() => {
                  setSidebarOpen(false)
                  setSearchOpen(true)
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
              >
                <Search className="h-3.5 w-3.5" />
                Search workspace...
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>

      <CommandPalette userId={user.uid} open={searchOpen} onOpenChange={setSearchOpen} />
      <QuickCreateFab userId={user.uid} />
    </div>
  )
}
