"use client"

import { useEffect, useRef, useState } from "react"

// Textarea with @tool autocomplete: typing "@cla" suggests Claude etc. from the
// AI directory and inserts a markdown link to the tool page (MVP plan, Phase 3).

interface DirTool {
  id: string
  name: string
  category?: string
}

let toolsCache: DirTool[] | null = null
let toolsPromise: Promise<DirTool[]> | null = null

async function loadTools(): Promise<DirTool[]> {
  if (toolsCache) return toolsCache
  if (!toolsPromise) {
    toolsPromise = fetch("/api/tools")
      .then((r) => r.json())
      .then((data) => {
        toolsCache = Array.isArray(data)
          ? data.map((t: any) => ({ id: t.id, name: t.name, category: t.category }))
          : []
        return toolsCache
      })
      .catch(() => {
        toolsPromise = null
        return []
      })
  }
  return toolsPromise
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 16,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [tools, setTools] = useState<DirTool[]>([])
  const [menu, setMenu] = useState<{ start: number; query: string } | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    loadTools().then(setTools)
  }, [])

  const matches = menu
    ? tools
        .filter((t) => t.name.toLowerCase().includes(menu.query.toLowerCase()))
        .slice(0, 6)
    : []

  const detectMention = (text: string, caret: number) => {
    const before = text.slice(0, caret)
    const m = before.match(/(^|[\s(])@([\w.-]{0,30})$/)
    if (m) {
      setMenu({ start: caret - m[2].length - 1, query: m[2] })
      setActive(0)
    } else {
      setMenu(null)
    }
  }

  const insert = (tool: DirTool) => {
    if (!menu || !ref.current) return
    const caret = ref.current.selectionStart
    const link = `[@${tool.name}](/tool/${tool.id})`
    const next = value.slice(0, menu.start) + link + " " + value.slice(caret)
    onChange(next)
    setMenu(null)
    const pos = menu.start + link.length + 1
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          detectMention(e.target.value, e.target.selectionStart)
        }}
        onKeyDown={(e) => {
          if (!menu || matches.length === 0) return
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, matches.length - 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault()
            insert(matches[active])
          } else if (e.key === "Escape") {
            setMenu(null)
          }
        }}
        onBlur={() => setTimeout(() => setMenu(null), 150)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      {menu && matches.length > 0 && (
        <div className="absolute left-4 top-10 z-20 w-64 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Mention an AI tool
          </p>
          {matches.map((t, i) => (
            <button
              key={t.id}
              onMouseDown={(e) => {
                e.preventDefault()
                insert(t)
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm cursor-pointer ${
                i === active ? "bg-muted" : ""
              }`}
            >
              <span className="font-medium">@{t.name}</span>
              {t.category && (
                <span className="ml-auto text-[10px] text-muted-foreground">{t.category}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
