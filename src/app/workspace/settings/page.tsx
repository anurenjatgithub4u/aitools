"use client"

import Link from "next/link"
import { LayoutTemplate, Trash2, Waypoints, LogOut } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function WorkspaceSettingsPage() {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">⚙️ Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account and workspace options.</p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <Avatar className="h-12 w-12 border border-border">
          <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
          <AvatarFallback className="bg-primary/10 font-medium text-primary">
            {(user.displayName || user.email || "U").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.displayName || "User"}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => logout()}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
      </div>

      <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2">
        {[
          { href: "/workspace/templates", label: "Templates", icon: LayoutTemplate },
          { href: "/workspace/graph", label: "Connections (full graph view)", icon: Waypoints },
          { href: "/workspace/trash", label: "Trash", icon: Trash2 },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            {label}
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Theme follows the site setting — use the sun/moon toggle in the header. AI features use
        the Gemini API configured by the site.
      </p>
    </div>
  )
}
