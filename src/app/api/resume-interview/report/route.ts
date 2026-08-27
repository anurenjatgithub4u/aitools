import { NextRequest, NextResponse } from "next/server"
import { callAI, hasAIProviderKey } from "@/lib/ai"
import { buildReportPrompt } from "@/lib/resume-interview/prompts"
import { sanitizeProfile, sanitizeReport } from "@/lib/resume-interview/sanitize"
import type { InterviewTurn } from "@/lib/resume-interview/types"

function isValidTurn(t: unknown): t is InterviewTurn {
  if (!t || typeof t !== "object") return false
  const o = t as Record<string, unknown>
  return !!o.question && typeof o.answer === "string" && !!o.evaluation
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const profile = sanitizeProfile(body.profile)
    const targetRole = typeof body.targetRole === "string" && body.targetRole.trim() ? body.targetRole.trim().slice(0, 80) : profile.suggestedRole
    const history: InterviewTurn[] = Array.isArray(body.history) ? body.history.filter(isValidTurn) : []

    if (history.length === 0) {
      return NextResponse.json({ error: "No interview history to report on." }, { status: 400 })
    }
    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable this." },
        { status: 503 }
      )
    }

    const prompt = buildReportPrompt(profile, targetRole, history)
    let text: string
    try {
      text = await callAI(prompt)
    } catch (e) {
      const message = e instanceof Error ? e.message : "AI request failed"
      return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 502 })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: "AI returned an unreadable response. Please try again." }, { status: 502 })
    }

    const report = sanitizeReport(parsed)
    return NextResponse.json({ report })
  } catch {
    return NextResponse.json({ error: "Something went wrong generating the report." }, { status: 500 })
  }
}
