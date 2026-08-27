import { NextRequest, NextResponse } from "next/server";
import { callAI, hasAIProviderKey } from "@/lib/ai";

// AI Task Evaluation spec: a task only becomes complete after the user
// explains what they did and AI reviews the explanation — this is the
// review call. No DB access here; the caller persists the result onto the
// task itself via the normal item update path.

function sanitizeStringList(value: unknown, max: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().slice(0, maxLen))
    .slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const taskText = typeof body.taskText === "string" ? body.taskText.trim().slice(0, 300) : "";
    const explanation = typeof body.explanation === "string" ? body.explanation.trim().slice(0, 2000) : "";
    const context = typeof body.context === "string" ? body.context.trim().slice(0, 300) : "";
    if (!userId || !taskText || !explanation) {
      return NextResponse.json({ error: "userId, taskText and explanation are required" }, { status: 400 });
    }
    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable this." },
        { status: 503 }
      );
    }

    const prompt = `A user is working through a task checklist${context ? ` for "${context}"` : ""}.

Task: "${taskText}"

The user's explanation of what they completed:
"""
${explanation}
"""

Evaluate this submission:
- Did the user actually answer the task?
- Is the explanation relevant to the task?
- Is anything important missing?
- Give encouraging, supportive feedback — never harsh or discouraging.
- Keep all feedback text under 120 words combined.
- Always include at least one actionable suggestion, even for a strong submission.
- Don't overwhelm the user — 2-4 short strengths/improvements max, not an essay.

Return JSON only, matching exactly this schema:
{
  "score": 0-100,
  "summary": "one short encouraging sentence on what they got right",
  "strengths": ["short phrase", "..."],
  "improvements": ["short actionable suggestion", "..."],
  "canComplete": true or false — true unless the explanation is off-topic, essentially empty of real content, or misses the core point of the task
}`;

    let text: string;
    try {
      text = await callAI(prompt);
    } catch (e: any) {
      return NextResponse.json({ error: `AI request failed: ${e.message}` }, { status: 502 });
    }
    const plan = JSON.parse(text);

    const score = typeof plan.score === "number" && Number.isFinite(plan.score) ? Math.max(0, Math.min(100, Math.round(plan.score))) : 0;
    const summary = typeof plan.summary === "string" ? plan.summary.trim().slice(0, 400) : "";
    const strengths = sanitizeStringList(plan.strengths, 5, 200);
    const improvements = sanitizeStringList(plan.improvements, 5, 200);
    const canComplete = plan.canComplete === true;

    return NextResponse.json({ score, summary, strengths, improvements, canComplete });
  } catch (error: any) {
    console.error("Evaluate task error:", error);
    return NextResponse.json({ error: "Failed to evaluate task" }, { status: 500 });
  }
}
