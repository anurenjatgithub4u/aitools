import { NextRequest, NextResponse } from "next/server"
import { callAI, hasAIProviderKey } from "@/lib/ai"
import { buildEvaluationPrompt, buildNextQuestionPrompt } from "@/lib/resume-interview/prompts"
import { sanitizeEvaluation, sanitizeProfile, sanitizeQuestion } from "@/lib/resume-interview/sanitize"
import { buildQuestionSchedule, decideNextStep } from "@/lib/resume-interview/schedule"
import { INTERVIEW_MODES, type InterviewMode, type InterviewQuestion, type InterviewTurn } from "@/lib/resume-interview/types"

function isValidTurn(t: unknown): t is InterviewTurn {
  if (!t || typeof t !== "object") return false
  const o = t as Record<string, unknown>
  return !!o.question && typeof o.answer === "string" && !!o.evaluation
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const mode: InterviewMode = INTERVIEW_MODES.some((m) => m.value === body.mode) ? body.mode : "standard"
    const modeConfig = INTERVIEW_MODES.find((m) => m.value === mode)!
    const totalQuestions = modeConfig.questionCount

    const profile = sanitizeProfile(body.profile)
    const targetRole = typeof body.targetRole === "string" && body.targetRole.trim() ? body.targetRole.trim().slice(0, 80) : profile.suggestedRole
    const history: InterviewTurn[] = Array.isArray(body.history) ? body.history.filter(isValidTurn) : []
    const currentQuestion: InterviewQuestion | undefined = body.currentQuestion && typeof body.currentQuestion === "object" ? body.currentQuestion : undefined
    const currentAnswer: string | undefined = typeof body.currentAnswer === "string" ? body.currentAnswer.trim().slice(0, 4000) : undefined

    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable this." },
        { status: 503 }
      )
    }

    const schedule = buildQuestionSchedule(mode, totalQuestions)

    let updatedHistory = history
    let evaluatedTurn: InterviewTurn | null = null

    // If an answer to a previous question was submitted, evaluate it first —
    // the follow-up decision below depends on that evaluation.
    if (currentQuestion && typeof currentAnswer === "string") {
      const evalPrompt = buildEvaluationPrompt(currentQuestion, currentAnswer || "(no answer provided)")
      let evalText: string
      try {
        evalText = await callAI(evalPrompt)
      } catch (e) {
        const message = e instanceof Error ? e.message : "AI request failed"
        return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 502 })
      }
      let evalParsed: unknown
      try {
        evalParsed = JSON.parse(evalText)
      } catch {
        return NextResponse.json({ error: "AI returned an unreadable response. Please try again." }, { status: 502 })
      }
      const evaluation = sanitizeEvaluation(evalParsed)
      evaluatedTurn = { question: currentQuestion, answer: currentAnswer || "", evaluation }
      updatedHistory = [...history, evaluatedTurn]
    }

    const decision = decideNextStep(schedule, updatedHistory)

    if (decision.done) {
      return NextResponse.json({
        evaluatedTurn,
        nextQuestion: null,
        done: true,
        questionNumber: totalQuestions,
        totalQuestions,
      })
    }

    const questionPrompt = buildNextQuestionPrompt({
      profile,
      targetRole,
      type: decision.type,
      isFollowUp: decision.isFollowUp,
      history: updatedHistory,
      questionNumber: decision.scheduleIndex + 1,
      totalQuestions,
    })

    let questionText: string
    try {
      questionText = await callAI(questionPrompt)
    } catch (e) {
      const message = e instanceof Error ? e.message : "AI request failed"
      return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 502 })
    }
    let questionParsed: unknown
    try {
      questionParsed = JSON.parse(questionText)
    } catch {
      return NextResponse.json({ error: "AI returned an unreadable response. Please try again." }, { status: 502 })
    }

    const nextQuestion = sanitizeQuestion(questionParsed, decision.type, decision.isFollowUp)

    return NextResponse.json({
      evaluatedTurn,
      nextQuestion,
      done: false,
      questionNumber: decision.scheduleIndex + 1,
      totalQuestions,
    })
  } catch {
    return NextResponse.json({ error: "Something went wrong running the interview." }, { status: 500 })
  }
}
