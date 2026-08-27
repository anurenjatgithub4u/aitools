import { NextRequest, NextResponse } from "next/server";
import { callAI, hasAIProviderKey } from "@/lib/ai";

// Intent Classifier (workspace-generation-v2-spec.md, 3.1/3.2/7), extended by
// Workspace Generation V4: a richer 13-category taxonomy, a confidence score
// that gates whether we generate or ask first, and Small/Medium/Large
// complexity sizing so the folder/file counts fit the goal's real scope
// instead of one fixed range for everything from "Learn Git" to "Become an
// AI Engineer".

const INTENTS = ["workspace", "direct_answer", "ambiguous"] as const;
const CATEGORIES = [
  "learning",
  "interview_preparation",
  "certification",
  "side_project",
  "startup",
  "business",
  "content_creation",
  "research",
  "product_development",
  "productivity",
  "career_roadmap",
  "planning",
  "general_workspace",
];

// Complexity tiers (V4 Step 3) — exact folder/file/checklist counts are
// decided here in code, not left to the model to remember correctly; the
// model only has to pick which tier fits, which it's reliable at.
export const COMPLEXITY_SIZES = {
  small: { folderRange: [6, 8], checklistRange: [5, 8] },
  medium: { folderRange: [8, 10], checklistRange: [8, 10] },
  large: { folderRange: [10, 15], checklistRange: [8, 10] },
} as const;
export type Complexity = keyof typeof COMPLEXITY_SIZES;
const CONFIDENCE_THRESHOLD = 70;

function sanitizeQuestions(
  raw: unknown,
  max: number
): { question: string; options: string[]; multiSelect: boolean }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (q): q is { question: string; options: unknown; multiSelect?: unknown } =>
        !!q && typeof q.question === "string" && q.question.trim().length > 0 && Array.isArray(q.options)
    )
    .slice(0, max)
    .map((q) => ({
      question: q.question.trim().slice(0, 200),
      options: (q.options as unknown[])
        .filter((o: unknown): o is string => typeof o === "string" && o.trim().length > 0)
        .map((o: string) => o.trim().slice(0, 60))
        .slice(0, 4),
      multiSelect: q.multiSelect === true,
    }))
    .filter((q) => q.options.length >= 2);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 3000) : "";
    const forceWorkspace = body.forceWorkspace === true;
    if (!goal) {
      return NextResponse.json({ error: "goal is required" }, { status: 400 });
    }
    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable this." },
        { status: 503 }
      );
    }

    const prompt = `Classify this prompt for an AI workspace generator: "${goal}"
${forceWorkspace ? '\nThe user has already chosen to turn this into a workspace — always return intent "workspace", pick the closest category, and generate clarification questions. Do not return direct_answer or ambiguous.\n' : ""}
Read the ENTIRE prompt, not just the first sentence — extract the primary goal, any secondary goals, and constraints (time/duration, experience level, industry, technology, output style) buried later in the text. If the prompt mixes several related asks (e.g. "teach me Flutter, help me build an app, and prepare me for interviews"), treat it as ONE integrated goal, not several — never split one prompt into multiple intents. If the prompt is a large paste (a course syllabus, job description, research paper, or documentation), understand and summarize it internally to extract the real goal — never treat the raw pasted text itself as the goal or copy it into your output.

Decide exactly one intent:
- "workspace": a multi-session goal, roadmap, or project spanning multiple days/weeks/months with real structure. Categories: ${CATEGORIES.join(", ")}.
- "direct_answer": a single-turn exchange with no multi-step structure to organize into folders — factual/conceptual questions phrased as a question ("what is X", "explain Y", "X vs Y"), casual conversation ("hello", "good morning", "who are you", "thank you"), one-off utility requests ("translate this", "what's 2+2", "what's the weather"). This applies whenever the prompt is phrased as a QUESTION or request for an explanation, even if it names a topic that would otherwise be ambiguous (e.g. "what is Flutter" is direct_answer, not ambiguous — the question phrasing already tells you what they want: an explanation).
- "ambiguous": the prompt is JUST a bare topic name or short phrase with no question phrasing and no other context — not asking "what is X", just stating "X" (e.g. "System Design", "Flutter", "AI", "Java", "React" on their own). Its SHAPE is genuinely unclear — could plausibly be learning, interview prep, a project, or job prep — and picking wrong would produce a badly-shaped workspace. Use this whenever your own confidence would be below ${CONFIDENCE_THRESHOLD}.

Never invent technologies, frameworks, roadmaps, or skills unrelated to what the user actually asked for. If you are unsure what the user means, prefer "ambiguous" over guessing — a wrong guess produces a workspace full of hallucinated, irrelevant content.

Return JSON only, matching exactly this schema:
{
  "intent": "workspace" | "direct_answer" | "ambiguous",
  "confidence": 0-100 — how sure you are this intent/category is correct; be honest, not optimistic,
  "category": "one of ${CATEGORIES.join(", ")} — only if intent is workspace, the closest fit",
  "complexity": "small | medium | large — only if intent is workspace. small: a single focused topic/skill/quick project (e.g. 'Learn Git', 'Learn SQL', 'Resume Preparation'). medium: a broader skill area with real depth (e.g. 'Flutter Development', 'React', 'Backend Development', 'Android Development', 'AWS'). large: a sprawling multi-domain goal (e.g. 'Become an AI Engineer', 'Become a Full Stack Developer', 'Crack System Design Interviews', 'Launch a SaaS', 'Build a Startup')",
  "directAnswer": "a clear, complete, conversational 2-4 sentence answer — only if intent is direct_answer",
  "disambiguationQuestion": { "question": "one short clarifying question — for a bare topic like this, default to something like 'What is your goal with [topic]?'", "options": ["Learn", "Interview Prep", "Project", "Job Preparation", "Build Product"] },
  "clarificationQuestions": [
    { "question": "short question", "options": ["2-4 short tappable options"], "multiSelect": false }
  ]
}

Rules for clarificationQuestions (only present when intent is workspace):
- Exactly 2 questions, never more — each one should meaningfully change the shape of the generated workspace. (A third, fixed question about workspace depth is appended automatically outside this list — don't generate one yourself.)
- Every option must be a short tappable label (2-6 words), never a full sentence, never requiring free text.
- Default to "multiSelect": true unless the question has exactly one right answer by nature — skill level, timeline, team size, urgency, and stage are the only questions that should be single-select, since the user can only truly be at one level or on one timeline at once. Every other question — topics/areas to focus on, tools already used, and especially goal/priority questions ("What is your primary goal?", "What do you want to focus on?", "What's your priority area?") — should be "multiSelect": true, because real users usually care about more than one thing at a time (e.g. someone prepping for interviews often wants technical skills AND interview technique AND mock practice, not just one). When set to true, the user taps as many options as apply, then presses Continue; when false, tapping one option immediately advances.
- Tailor questions to the category: learning -> current skill level, time available, primary goal. interview_preparation -> target company/level, timeline, topics to focus on. certification -> which certification, timeline, current experience. side_project / product_development -> tech/stack familiarity, timeline, solo vs team. startup / business -> stage/idea maturity, timeline, solo vs team. content_creation -> platform/format, posting cadence, audience stage. research -> scope/length, timeline, format. career_roadmap -> current background, target role, urgency. planning / productivity / general_workspace -> current level/experience, time available, primary goal. Adapt sensibly for anything else.
- Omit "directAnswer" unless intent is direct_answer. Omit "disambiguationQuestion" unless intent is ambiguous. Omit "clarificationQuestions"/"complexity" (or return an empty array/omit) unless intent is workspace.`;

    let text: string;
    try {
      text = await callAI(prompt);
    } catch (e: any) {
      return NextResponse.json({ error: `AI request failed: ${e.message}` }, { status: 502 });
    }
    const plan = JSON.parse(text);

    let intent: (typeof INTENTS)[number] = INTENTS.includes(plan.intent) ? plan.intent : "workspace";
    const category = CATEGORIES.includes(plan.category) ? plan.category : "general_workspace";
    const complexity: Complexity = plan.complexity in COMPLEXITY_SIZES ? plan.complexity : "medium";
    const confidence = typeof plan.confidence === "number" && Number.isFinite(plan.confidence) ? Math.max(0, Math.min(100, plan.confidence)) : 100;

    // V4 Step 2 + Step 11: low confidence overrides a "workspace" verdict —
    // ask before generating rather than risk a badly-shaped or hallucinated
    // workspace. Never downgrades direct_answer (that's already the safe path).
    if (!forceWorkspace && intent === "workspace" && confidence < CONFIDENCE_THRESHOLD) {
      intent = "ambiguous";
    }

    if (intent === "direct_answer") {
      return NextResponse.json({
        intent,
        directAnswer:
          typeof plan.directAnswer === "string" && plan.directAnswer.trim()
            ? plan.directAnswer.trim().slice(0, 2000)
            : "Here's a quick answer — but I couldn't generate the full detail. Try turning this into a workspace instead.",
      });
    }

    if (intent === "ambiguous") {
      const dq = sanitizeQuestions([plan.disambiguationQuestion], 1)[0];
      if (!dq) {
        // Fall back to workspace if the model couldn't produce a real question.
        return NextResponse.json({ intent: "workspace", category, complexity, clarificationQuestions: [] });
      }
      return NextResponse.json({ intent, disambiguationQuestion: dq });
    }

    // V4 Step 4: for medium/large workspaces, reserve one question slot for
    // an explicit depth choice (Sample/Detailed/Complete) instead of letting
    // the model design its own third question for this.
    const reserveDepthSlot = complexity !== "small";
    const clarificationQuestions = sanitizeQuestions(plan.clarificationQuestions, reserveDepthSlot ? 2 : 3);
    if (reserveDepthSlot) {
      clarificationQuestions.push({
        question: "How detailed would you like your workspace?",
        options: ["Sample", "Detailed (Recommended)", "Complete"],
        multiSelect: false,
      });
    }

    return NextResponse.json({
      intent: "workspace",
      category,
      complexity,
      clarificationQuestions,
    });
  } catch (error: any) {
    console.error("Workspace classify error:", error);
    return NextResponse.json({ error: "Failed to classify goal" }, { status: 500 });
  }
}
