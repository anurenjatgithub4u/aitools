"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PillGroup } from "@/components/typing-reading/pill-group"
import { COMMON_ROLES, INTERVIEW_MODES, type InterviewMode } from "@/lib/resume-interview/types"

interface RoleModePickerProps {
  suggestedRole: string
  targetRole: string
  onTargetRoleChange: (role: string) => void
  mode: InterviewMode
  onModeChange: (mode: InterviewMode) => void
  onStart: () => void
  starting: boolean
}

export function RoleModePicker({ suggestedRole, targetRole, onTargetRoleChange, mode, onModeChange, onStart, starting }: RoleModePickerProps) {
  const isCustom = !COMMON_ROLES.includes(targetRole)
  const [showCustomInput, setShowCustomInput] = useState(isCustom)

  return (
    <div className="rounded-2xl border border-border bg-background p-6 sm:p-10 space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-1">Prepare Your Interview</h2>
        <p className="text-sm text-muted-foreground">
          Based on your resume, we&apos;d suggest <span className="font-medium text-foreground">{suggestedRole}</span> — change it if you&apos;re targeting something else.
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Target role</p>
        <PillGroup
          options={[...COMMON_ROLES.map((r) => ({ value: r, label: r })), { value: "__custom__", label: "Custom" }]}
          value={showCustomInput ? "__custom__" : targetRole}
          onChange={(v) => {
            if (v === "__custom__") {
              setShowCustomInput(true)
            } else {
              setShowCustomInput(false)
              onTargetRoleChange(v)
            }
          }}
          ariaLabel="Target role"
        />
        {showCustomInput && (
          <input
            type="text"
            value={targetRole}
            onChange={(e) => onTargetRoleChange(e.target.value)}
            placeholder="e.g. Machine Learning Engineer"
            className="mt-3 h-10 w-full max-w-xs rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Interview length</p>
        <div className="flex flex-wrap gap-3">
          {INTERVIEW_MODES.map((m) => {
            const active = m.value === mode
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => onModeChange(m.value)}
                className={`text-left rounded-xl border px-4 py-3 transition-colors cursor-pointer ${
                  active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/30"
                }`}
              >
                <p className="text-sm font-semibold">{m.label}</p>
                <p className={`text-xs mt-0.5 ${active ? "text-background/70" : "text-muted-foreground"}`}>
                  {m.questionCount} questions · {m.duration}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <Button size="lg" onClick={onStart} disabled={starting || !targetRole.trim()} className="cursor-pointer px-6">
        {starting ? "Preparing your interview…" : "Start Interview"}
      </Button>
    </div>
  )
}
