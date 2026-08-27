import { NextRequest, NextResponse } from "next/server";
import { callAI, hasAIProviderKey } from "@/lib/ai";

// AI Assistant for the Workspace (see FEATURE_WORKSPACE.md → AI Assistant,
// Workflow Generator, Prompt Generator). Routes through the shared AI
// provider abstraction (Gemini or OpenAI, see src/lib/ai.ts).

const TEXT_ACTIONS: Record<string, string> = {
  improve_writing:
    "Improve the writing of the following markdown content. Keep the meaning, structure and markdown formatting. Return ONLY the improved markdown.",
  generate_summary:
    "Write a concise summary (3-5 sentences) of the following markdown content. Return ONLY the summary as markdown.",
  suggest_improvements:
    "Suggest concrete improvements for the following content as a short markdown bullet list. Return ONLY the list.",
  generate_checklist:
    "Turn the following content into an actionable markdown checklist using '- [ ]' items. Return ONLY the checklist.",
  explain:
    "Explain the following content in simple terms as short markdown. Return ONLY the explanation.",
  continue_writing:
    "Continue writing the following markdown content in the same tone and style. Return ONLY the continuation (do not repeat the original).",
};

async function callGemini(prompt: string, json: boolean): Promise<string | null> {
  if (!hasAIProviderKey()) return null;
  try {
    return await callAI(prompt, { json });
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "";
    const content = typeof body.content === "string" ? body.content : "";
    const title = typeof body.title === "string" ? body.title : "";

    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable ✨ Enhance." },
        { status: 503 }
      );
    }

    if (action in TEXT_ACTIONS) {
      if (!content.trim()) {
        return NextResponse.json({ error: "Nothing to enhance yet — write some content first." }, { status: 400 });
      }
      const text = await callGemini(
        `${TEXT_ACTIONS[action]}\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 20000)}`,
        false
      );
      if (!text) return NextResponse.json({ error: "AI request failed" }, { status: 502 });
      return NextResponse.json({ result: text.trim() });
    }

    if (action === "suggest_meta") {
      if (!content.trim()) {
        return NextResponse.json({ error: "Paste some content first." }, { status: 400 });
      }
      const text = await callGemini(
        `You are helping a user save AI-related content into their workspace. Analyze the content and suggest metadata.
Return a JSON object exactly matching this schema:
{
  "title": "Short descriptive title (max 8 words)",
  "description": "One sentence describing what this is and why it's useful",
  "tags": ["3-6 short lowercase tags"],
  "aiTool": "The AI tool this relates to (e.g. ChatGPT, Claude, Cursor) or empty string",
  "category": "One of: prompt, workflow, playbook, knowledge, code, reference"
}

Content:
${content.slice(0, 15000)}`,
        true
      );
      if (!text) return NextResponse.json({ error: "AI request failed" }, { status: 502 });
      const meta = JSON.parse(text);
      return NextResponse.json({
        meta: {
          title: typeof meta.title === "string" ? meta.title.slice(0, 200) : "",
          description: typeof meta.description === "string" ? meta.description.slice(0, 500) : "",
          tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 8) : [],
          aiTool: typeof meta.aiTool === "string" ? meta.aiTool : "",
          category: typeof meta.category === "string" ? meta.category : "",
        },
      });
    }

    if (action === "generate_tags") {
      const text = await callGemini(
        `Generate 3-7 short lowercase tags for this content. Return a JSON array of strings only.\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 10000)}`,
        true
      );
      if (!text) return NextResponse.json({ error: "AI request failed" }, { status: 502 });
      const tags = JSON.parse(text);
      return NextResponse.json({ tags: Array.isArray(tags) ? tags.slice(0, 10) : [] });
    }

    if (action === "generate_workflow") {
      const goal = typeof body.goal === "string" && body.goal.trim() ? body.goal : title || content;
      if (!goal.trim()) {
        return NextResponse.json({ error: "Describe the workflow goal first." }, { status: 400 });
      }
      const text = await callGemini(
        `You are a workflow designer for AI power users. Create a practical step-by-step workflow for this goal: "${goal.slice(0, 500)}".
Prefer a straight-line (linear) sequence of plain "step" or "ai_call" steps. Only introduce a
"decision" step (with a "yes"/"no" branch on the steps right after it) if the task genuinely
forks — do not invent a branch just to use the feature.
Return a JSON object exactly matching this schema:
{
  "title": "Workflow title",
  "goal": "One sentence goal — what the user gets by finishing this, e.g. 'Complete one interview practice session'",
  "difficulty": "Beginner / Intermediate / Advanced",
  "estimatedTime": "e.g. 30 Minutes",
  "repeat": "e.g. Daily, Weekly, One-time — how often this workflow is meant to be run",
  "aiModels": ["ChatGPT", "Claude"],
  "toolsUsed": ["Tool 1"],
  "steps": [
    {
      "text": "Short step title",
      "kind": "step | decision | loop | parallel | ai_call | human_action | output",
      "purpose": "One sentence: why this step matters / what it gets you",
      "instruction": "The exact prompt to paste into an AI tool for this step (omit for human_action steps)",
      "tool": "Tool used, if any",
      "model": "AI model used, if any (only for ai_call steps)",
      "expectedOutput": "What good output from this step looks like",
      "estimatedTime": "e.g. 5 Minutes",
      "condition": "Only for decision steps: the yes/no question being asked",
      "branch": "yes | no | loop | parallel | null — only set on a step that belongs to the branch of the PRECEDING decision/loop/parallel step, otherwise null"
    }
  ],
  "expectedResult": "What the user ends up with — one concrete deliverable per line (2-4 lines)",
  "tags": ["tag1", "tag2"]
}`,
        true
      );
      if (!text) return NextResponse.json({ error: "AI request failed" }, { status: 502 });
      return NextResponse.json({ workflow: JSON.parse(text) });
    }

    if (action === "generate_prompt") {
      const task = typeof body.task === "string" && body.task.trim() ? body.task : title || content;
      if (!task.trim()) {
        return NextResponse.json({ error: "Describe the task first." }, { status: 400 });
      }
      const text = await callGemini(
        `You are a prompt engineer. Create a reusable, high-quality prompt for this task: "${task.slice(0, 500)}".
Return a JSON object exactly matching this schema:
{
  "title": "Prompt title",
  "purpose": "What this prompt is for",
  "systemPrompt": "The system prompt text",
  "userPrompt": "The user prompt text with {{variables}} where useful",
  "followUpPrompt": "A useful follow-up prompt",
  "debugPrompt": "A prompt to debug or refine bad outputs",
  "variables": ["variable1"],
  "expectedOutput": "What good output looks like",
  "tags": ["tag1", "tag2"]
}`,
        true
      );
      if (!text) return NextResponse.json({ error: "AI request failed" }, { status: 502 });
      return NextResponse.json({ prompt: JSON.parse(text) });
    }

    if (action === "generate_mission") {
      if (!title.trim()) {
        return NextResponse.json({ error: "This file needs a title first." }, { status: 400 });
      }
      const text = await callGemini(
        `You are helping fill in a task checklist for a workspace file so the user can track concrete progress on it.
Title: "${title}"
${content.trim() ? `Existing content:\n${content.slice(0, 4000)}` : "(no content written yet)"}

This file needs to become a "mission": a clear goal, a time estimate, a difficulty, and a 5-10 item task checklist of concrete, actionable steps — never vague topic names (bad: "Loops"; good: "Practice Loops", "Solve 10 Problems"), in logical order (learn -> practice -> apply -> review).

Return JSON only:
{
  "goal": "one sentence: what the user can do after completing this file",
  "estimatedTime": "e.g. '2 Hours', '45 Minutes'",
  "difficulty": "Beginner | Intermediate | Advanced",
  "tasks": ["5-10 short actionable task strings, logically ordered"]
}`,
        true
      );
      if (!text) return NextResponse.json({ error: "AI request failed" }, { status: 502 });
      const mission = JSON.parse(text);
      return NextResponse.json({
        mission: {
          goal: typeof mission.goal === "string" ? mission.goal.trim().slice(0, 300) : "",
          estimatedTime: typeof mission.estimatedTime === "string" ? mission.estimatedTime.trim().slice(0, 40) : "",
          difficulty: typeof mission.difficulty === "string" ? mission.difficulty.trim().slice(0, 30) : "",
          tasks: Array.isArray(mission.tasks)
            ? mission.tasks.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0).slice(0, 10)
            : [],
        },
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Workspace AI error:", error);
    return NextResponse.json({ error: "AI request failed. Please try again." }, { status: 500 });
  }
}
