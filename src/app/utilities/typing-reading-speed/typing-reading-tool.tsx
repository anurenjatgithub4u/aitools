"use client"

import { useState } from "react"
import { Keyboard, BookOpen } from "lucide-react"
import { TypingPractice } from "@/components/typing-reading/typing-practice"
import { ReadingPractice } from "@/components/typing-reading/reading-practice"
import { ProgressDashboard } from "@/components/typing-reading/progress-dashboard"

type Mode = "typing" | "reading"

export function TypingReadingTool() {
  const [mode, setMode] = useState<Mode>("typing")

  return (
    <div className="space-y-12">
      <div>
        <div role="tablist" aria-label="Practice mode" className="inline-flex rounded-full border border-border p-1 bg-card">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "typing"}
            onClick={() => setMode("typing")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              mode === "typing" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard className="h-4 w-4" />
            Typing
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "reading"}
            onClick={() => setMode("reading")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              mode === "reading" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Reading
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 sm:p-10">
        {mode === "typing" ? <TypingPractice /> : <ReadingPractice />}
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 sm:p-10">
        <ProgressDashboard />
      </div>
    </div>
  )
}
