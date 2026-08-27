import { NextRequest, NextResponse } from "next/server"
import { callAI, hasAIProviderKey } from "@/lib/ai"
import { buildAnalyzePrompt } from "@/lib/resume-interview/prompts"
import { sanitizeAnalysis, sanitizeProfile } from "@/lib/resume-interview/sanitize"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const resumeText = typeof body.resumeText === "string" ? body.resumeText.trim().slice(0, 20_000) : ""

    if (!resumeText || resumeText.length < 50) {
      return NextResponse.json({ error: "resumeText is required and must be real resume content." }, { status: 400 })
    }
    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable this." },
        { status: 503 }
      )
    }

    const prompt = buildAnalyzePrompt(resumeText)
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

    const { profile: rawProfile, analysis: rawAnalysis } = parsed as { profile?: unknown; analysis?: unknown }
    const profile = sanitizeProfile(rawProfile)
    const analysis = sanitizeAnalysis(rawAnalysis)

    return NextResponse.json({ profile, analysis })
  } catch {
    return NextResponse.json({ error: "Something went wrong analyzing this resume." }, { status: 500 })
  }
}
