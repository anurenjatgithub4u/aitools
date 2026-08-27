"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Sun, LogOut, LogIn, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-context"
import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { JOBS_FEATURE_ENABLED } from "@/lib/jobs/config"

const NAV_LINKS = [
  // Workspace is deliberately not in the nav. It's reached through the
  // homepage CTA instead, so the entry point is the funnel rather than a
  // top-level browse item.
  // Jobs is behind a flag while the feature is paused — see
  // JOBS_FEATURE_ENABLED in lib/jobs/config.ts.
  ...(JOBS_FEATURE_ENABLED ? [{ href: "/jobs", label: "Jobs" }] : []),
  { href: "/utilities", label: "Utilities" },
  { href: "/pdf", label: "PDF Tools" },
  { href: "/blog", label: "Blog" },
]

export function Header() {
  const { setTheme, theme } = useTheme()
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()
  const isHome = pathname === "/"
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close mobile menu on route change / resize back to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setMobileMenuOpen(false)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      setDropdownOpen(false)
      setMobileMenuOpen(false)
    } catch (error) {
      console.error("Failed to log out:", error)
    }
  }

  return (
    <header
      className={
        isHome
          ? "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-transparent dark:bg-transparent dark:backdrop-blur-none dark:supports-[backdrop-filter]:bg-transparent"
          : "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      }
    >
      <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
            <span className="font-bold text-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
              FindUrAI
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {loading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center focus:outline-none rounded-full cursor-pointer"
              >
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                    {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase() || "US"}
                  </AvatarFallback>
                </Avatar>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg focus:outline-none z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">My Account</div>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium leading-none text-foreground truncate">{user.displayName || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground mt-1 truncate">{user.email}</p>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted text-destructive cursor-pointer transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="gap-2 rounded-full px-4 cursor-pointer">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur px-4 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary hover:bg-muted rounded-lg px-3 py-2.5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary hover:bg-muted rounded-lg px-3 py-2.5 transition-colors"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
