import { NextRequest, NextResponse } from "next/server";
import { callAI, hasAIProviderKey } from "@/lib/ai";
import { COMPLEXITY_SIZES, type Complexity } from "@/app/api/workspace/classify/route";
import { selectBlueprint, formatBlueprintForStructurePrompt } from "@/lib/workspace-blueprints";
import { MAX_FOLDER_ITEMS } from "@/lib/workspace-generation";

type DepthChoice = "sample" | "detailed" | "complete";

// Workspace Generation V4 Step 3/4: the complexity tier decides the folder
// count range; the user's Sample/Detailed/Complete pick decides where in
// that range to land — computed here in code so it's deterministic, not
// re-derived by the model on every call.
function resolveFolderTarget(complexity: Complexity, depthChoice: DepthChoice): number {
  const [tierMin, tierMax] = COMPLEXITY_SIZES[complexity].folderRange;
  if (depthChoice === "sample") return tierMin;
  if (depthChoice === "complete") return tierMax;
  return Math.round((tierMin + tierMax) / 2);
}

// AI-first execution redesign (workspace-execution-redesign-spec.md, Stage 1):
// analyze the goal and produce a reviewable EXECUTION PLAN — goal, duration,
// outcome, milestones, deliverables, timeline — plus a structure-only folder
// tree tagged to those milestones. No file content yet; cheap and correctable.

const INTENTS = ["Learn", "Build", "Organize", "Create", "Research", "Plan", "Prepare", "Operate"];
const MAX_PREVIEW_DEPTH = 3;

export type PreviewNode = {
  title: string;
  icon: string;
  purpose: string;
  milestone: string;
  exampleFiles: string[];
  folders: PreviewNode[];
};

function normalizePreviewNode(raw: any, depth: number): PreviewNode | null {
  if (!raw || typeof raw.title !== "string" || !raw.title.trim()) return null;
  const folders: PreviewNode[] =
    depth < MAX_PREVIEW_DEPTH && Array.isArray(raw.folders)
      ? raw.folders
          .map((c: any) => normalizePreviewNode(c, depth + 1))
          .filter((c: PreviewNode | null): c is PreviewNode => c !== null)
          .slice(0, 8)
      : [];
  // Capped at MAX_FOLDER_ITEMS, not an arbitrary smaller number — every
  // execution folder actually gets exactly this many files at generation
  // time (see generate/route.ts), so the preview must show the same count
  // the user will actually receive, not an undersold sample of it.
  const exampleFiles: string[] = Array.isArray(raw.exampleFiles)
    ? raw.exampleFiles
        .filter((f: unknown): f is string => typeof f === "string" && f.trim().length > 0)
        .map((f: string) => f.trim().slice(0, 80))
        .slice(0, MAX_FOLDER_ITEMS)
    : [];
  return {
    title: raw.title.trim().slice(0, 100),
    icon: typeof raw.icon === "string" && raw.icon ? raw.icon.slice(0, 8) : "📁",
    purpose: typeof raw.purpose === "string" ? raw.purpose.trim().slice(0, 160) : "",
    milestone: typeof raw.milestone === "string" ? raw.milestone.trim().slice(0, 100) : "",
    exampleFiles,
    folders,
  };
}

function normalizePlan(raw: any, goal: string) {
  const milestones = Array.isArray(raw?.milestones)
    ? raw.milestones
        .filter((m: any) => m && typeof m.title === "string" && m.title.trim())
        .slice(0, 15)
        .map((m: any) => ({
          title: m.title.trim().slice(0, 100),
          description: typeof m.description === "string" ? m.description.trim().slice(0, 300) : "",
        }))
    : [];
  const deliverables = Array.isArray(raw?.deliverables)
    ? raw.deliverables
        .filter((d: unknown): d is string => typeof d === "string" && d.trim().length > 0)
        .map((d: string) => d.trim().slice(0, 150))
        .slice(0, 10)
    : [];
  return {
    goal: typeof raw?.goal === "string" && raw.goal.trim() ? raw.goal.trim().slice(0, 300) : goal,
    estimatedDuration: typeof raw?.estimatedDuration === "string" ? raw.estimatedDuration.trim().slice(0, 60) : "",
    expectedOutcome: typeof raw?.expectedOutcome === "string" ? raw.expectedOutcome.trim().slice(0, 500) : "",
    deliverables,
    suggestedTimeline: typeof raw?.suggestedTimeline === "string" ? raw.suggestedTimeline.trim().slice(0, 800) : "",
    milestones,
    deadline: null as string | null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // V4 Step 10: users sometimes paste a full syllabus/job description/doc
    // as the goal itself, not just generationRequirements — 300 chars would
    // silently truncate that before it ever reaches the prompt.
    const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 3000) : "";
    if (!goal) {
      return NextResponse.json({ error: "goal is required" }, { status: 400 });
    }
    const category = typeof body.category === "string" && body.category ? body.category.slice(0, 50) : null;
    // Expert Blueprint Library (Phase 2): a category with a matching blueprint
    // gets its stage-role sequence used as structure-design guidance instead
    // of the hardcoded per-category workflow list below — purely additive,
    // categories without a blueprint yet keep the exact prior behavior.
    const blueprint = selectBlueprint(category);
    const complexity: Complexity = body.complexity in COMPLEXITY_SIZES ? body.complexity : "medium";
    const depthChoice: DepthChoice = ["sample", "detailed", "complete"].includes(body.depthChoice) ? body.depthChoice : "detailed";
    const folderTarget = resolveFolderTarget(complexity, depthChoice);
    const clarificationAnswers: { question: string; answer: string }[] = Array.isArray(body.clarificationAnswers)
      ? body.clarificationAnswers
          .filter((a: any) => a && typeof a.question === "string" && typeof a.answer === "string")
          .slice(0, 6)
          .map((a: any) => ({ question: a.question.slice(0, 200), answer: a.answer.slice(0, 100) }))
      : [];
    const correction = typeof body.correction === "string" ? body.correction.trim().slice(0, 300) : "";
    const previousStructure = body.previousStructure && typeof body.previousStructure === "object" ? body.previousStructure : null;
    // Workspace Generation V3: kept separate from `goal` on purpose. `goal`
    // is WHAT the actual subject/topic is — it must always drive folder and
    // file naming. `generationRequirements` is HOW the user wants it built —
    // an explicit section list, format, or template. Collapsing both into
    // one field is what previously produced generic, topic-less folder names
    // (e.g. "Foundations", "Core Concepts") whenever a user pasted a pure
    // format spec with no topic into the goal box.
    const generationRequirements = typeof body.generationRequirements === "string" ? body.generationRequirements.trim().slice(0, 6000) : "";

    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable this." },
        { status: 503 }
      );
    }

    const clarificationBlock = clarificationAnswers.length > 0
      ? `\nUser answers (hard constraints):\n${clarificationAnswers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")}`
      : "";
    const correctionBlock = correction && previousStructure
      ? `\n\nCurrent plan + structure (the user may have already hand-edited some fields — respect those edits, only change what the correction below implies):\n${JSON.stringify(previousStructure)}\n\nThe user wants this change: "${correction}"\nApply the change and return the full updated plan + structure — keep everything else that still fits.`
      : "";
    const requirementsBlock = generationRequirements
      ? `\n\nThe user also gave GENERATION REQUIREMENTS — instructions for HOW the workspace should be built (a format, section list, or template), separate from the GOAL above which says WHAT the actual topic/subject is:\n"""\n${generationRequirements}\n"""\nUse the GOAL to determine the real subject matter — folder, milestone, and file names must be specific to that subject, never generic placeholder names like "Foundations" or "Core Concepts" (unless the requirements below literally ask for that exact wording). Use these requirements to shape structure, ordering, and depth: if they specify an explicit hierarchy, phase list, or section format, follow it precisely rather than substituting your own template. Do not let the requirements replace the topic — a requirements block describing HOW to format 20 sections is not itself a topic to build folders about.`
      : "";
    // Phases (milestones) and folders are different concepts — a phase is a
    // major stage of the journey, a folder is one unit of work inside it.
    // Left unconstrained, the model defaults to one phase per folder, which
    // turns a 12-15 folder large workspace into 12-15 disconnected "Phase 1"
    // through "Phase 15" entries instead of a real roadmap.
    const phaseGuidance = complexity === "large"
      ? "This is a LARGE workspace — group all execution folders under 5-6 major phases total, never one phase per folder. Aim for roughly 2-3 folders per phase. A workspace with 12+ folders spread across 12+ separate phases reads as a random list, not a journey; 5-6 real milestones is what makes it feel like a structured roadmap the user can see the shape of at a glance."
      : complexity === "medium"
      ? "Group folders into 4-5 phases where it genuinely fits — give a folder its own phase only when it's truly a distinct milestone, not by default just because it's a separate folder."
      : "At this size most folders can be their own phase, but still group 2 folders under one phase whenever they're really part of the same milestone rather than inventing a phase per folder.";

    const workflowGuidance = blueprint
      ? formatBlueprintForStructurePrompt(blueprint)
      : `- Learning: Roadmap → Months/Weeks → Modules/Practice
- Interview prep: Day-by-day with specific topics
- Content: Ideas, Calendar, Drafts, Publishing
- Startup: Research, Validation, Development, Launch
- Travel: Cities → Days, Hotels, Budget
- Fitness: Workout Plan, Nutrition, Progress
- Other: infer the best sequence`;

    const prompt = `Analyze this goal and produce a reviewable EXECUTION PLAN before any workspace is built: "${goal}"${category ? `\nCategory: ${category}` : ""}${clarificationBlock}${requirementsBlock}${correctionBlock}

Approach this the way an experienced practitioner who has actually achieved this exact goal many times would plan it for someone else — a teacher for a learning goal, a founder for a startup, a coach for a fitness goal, a researcher for a research goal, a hiring manager for interview prep — never as a generic assistant listing topics. That practitioner's mental model of "what actually needs to happen, in what order" is what this plan should capture.

Read the ENTIRE goal text, not just the first sentence — extract the primary goal, any secondary goals, and constraints mentioned anywhere in it: time/duration, experience level, industry, technology, and desired output style. If the goal mixes several related asks (e.g. "teach me Flutter, help me build an app, and prepare me for interviews"), integrate them into ONE coherent plan — never split it into unrelated parts. If the goal (or the generation requirements above) is a large paste — a course syllabus, job description, research paper, or documentation — read and understand it, extract the real underlying goal, and build the plan around that; never copy chunks of the pasted text verbatim into folder names, purposes, or milestones.

Never invent technologies, frameworks, tools, or skills that aren't actually implied by the goal — every folder and file must trace back to something the user actually asked for. If the goal is too vague to plan confidently, favor a smaller, more conservative structure over guessing at unrelated specifics.

First, understand the goal deeply: scope, realistic duration, what "done" looks like, and the natural milestones/phases it breaks into. Design milestones and execution folders around the WORKFLOW the goal implies, never its literal wording:
${workflowGuidance}

PRIORITY ORDER for deciding folders — follow strictly:
1. The user's own explicit instructions always win. If the goal text lists specific phases, folders, or section names (e.g. "Generate a workspace containing these phases: Product Validation, Security, Deployment..."), preserve every one of them as an execution folder, in the same relative order, using their given wording as-is or only lightly cleaned up for clarity — never replace them with different names, never drop one, and never substitute the framework above for what the user already specified.
2. Use the expert execution framework above to fill in anything the user didn't specify — additional folders needed to round out a complete plan, or the entire structure if the user gave no explicit list at all.
3. Only fall back to your own judgment for anything neither of the above covers.
If the user's explicit list is partial (e.g. only "Security, Deployment, Marketing"), keep those exactly as given and generate the remaining folders around them using the framework above, in a logical order that makes sense alongside the ones the user specified.
If the user's explicit list has MORE phases than the folder target below allows, EVERY phase must still be represented — losing one entirely is a failure. Never simply pick the "most important" ones and silently discard the rest. Instead: (a) first use up to the tier's own maximum (never the target alone — see the size rule below for the real ceiling) before merging anything, since that alone may fit them all; (b) only if phases still remain unfit, merge closely related ones into one well-named folder (e.g. "Authentication Testing" + "Authorization Testing" → "Security Verification"; "Landing Page" + "Marketing Assets" + "Product Hunt" → "Marketing Preparation") so each folder still traces back to every phase it absorbed; (c) prioritize keeping critical execution steps and real dependencies as their own folder, merging nice-to-have ones together first — never merge away or drop a phase that sounds mandatory for the goal to actually succeed. If NO merging was actually needed (the user's list already fits), omit "scopeNote" entirely — do not add a reflective note just because phases existed. Only set "scopeNote" when merging genuinely happened, with a short, friendly note stating the accurate original and final counts, e.g. "Your prompt contained 22 suggested phases. To maintain a high-quality workspace, FindUrAI intelligently merged related phases into 15 execution-focused folders."
If the goal mentions specific file/topic hints (e.g. "Authentication, Payments, API Testing") or checklist style preferences (e.g. "use action verbs", "avoid theory", "production-ready", "execution-focused"), reflect those in exampleFiles now — the file-content generation pass that follows this preview will also honor them.

Every milestone AND every folder name must be practical and outcome-shaped — name what the user will DO or BUILD, not the textbook topic. Bad (generic, topic-less, could apply to any goal): "Introduction", "Basics", "Core Concepts", "Foundations", "Practical Application", "Implementation", "Review and Reflection". Also bad (specific but still just a noun-phrase topic label, not an outcome): "Python Syntax", "Flutter Widgets". Good (names the real subject AND the outcome/action): "Build Your First Flutter App", "Master Navigation", "Publish Your First App", "Write Your First Python Script", "Practice Loops & Conditionals". Every name should make the user think "I know exactly what I'll walk away with," not "I know what topic this covers."

Think of the milestones as sequential PHASES of a journey — each one a distinct stage the user moves through in order. The app numbers and labels these as "Phase 1", "Phase 2", etc. automatically in the UI, so milestone titles must be the clean stage NAME ONLY (e.g. "Build Your First Flutter App", not "Phase 1: Build Your First Flutter App") — never prefix them with "Phase 1:" or a number yourself. Every milestone must end up with at least one execution folder; broader phases (e.g. one covering several sub-domains) can have 2-3. Each top-level execution folder belongs to exactly one milestone (tag it with that milestone's exact title in the "milestone" field). When a phase spans several distinct sub-topics (e.g. "Core Domains" covering network security, web security, cloud security), nest those as subfolders inside one themed parent folder rather than flattening them — max 2 levels of nesting, and only nest when it genuinely breaks the parent down further.

This workspace's size was already assessed as "${complexity}" (${depthChoice} depth) — target exactly ${folderTarget} total execution folders across all phases, a folder or two either way is fine but don't drift far from ${folderTarget}. ${phaseGuidance} Most goals fit this folder target without leaving anything important out.
EXCEPTION: if the user gave an explicit phase/folder list longer than this target, you may drift up to (never beyond) the size tier's hard ceiling stated in the Rules below to fit more of their phases as their own folder before you need to merge any — accommodating their explicit list takes priority over hitting the target exactly.
Only when the goal is genuinely broad or sprawling relative to its own target, AND the user did NOT give an explicit phase list (e.g. "become an expert in everything about X"), should you actually leave out real topics/areas to fit it — pick only the most essential, foundational ones. A focused starting workspace the user can actually finish beats an overwhelming one that tries to cover everything at once; they can always add more folders manually or ask to expand a specific phase later.
Set "scopeNote" whenever either of these happened: (a) you had to leave out topics a thorough treatment of the broad goal above would otherwise include, or (b) you merged phases from the user's explicit list per the merging rule above — in both cases say so briefly and encouragingly (e.g. "This is a big goal — I've focused this workspace on the core fundamentals to get you started." or the phase-merge example above). For any normally-scoped goal that fits without cutting or merging anything, omit "scopeNote" entirely.

Every folder needs:
- a one-line "purpose" — what it's for and how the user should use it, specific enough to judge fit without seeing file content yet. Avoid generic filler like "resources for this topic" — name the actual subject matter (e.g. for a folder covering Python basics: "Variables, data types, and basic operators you need before writing your first script").
- "exampleFiles": exactly ${MAX_FOLDER_ITEMS} realistic file titles — this folder will actually contain exactly ${MAX_FOLDER_ITEMS} files once generated, and this preview must show all of them, not a shorter sample. Specific to the goal's real subject matter, not placeholders (e.g. for a Python basics folder: ["Python Variables & Data Types", "Practice: 10 Beginner Exercises", "Common Beginner Mistakes", "Debugging Your First Script", "Mini Project: Temperature Converter"] — NOT generic titles like "Guide 1" or "Resource A").

Before returning, verify your own output: the real goal (not just its first sentence) is reflected; the size matches what was requested; every folder name is practical and outcome-shaped, not a textbook label; no two folders cover the same ground; nothing was invented that the user didn't actually ask for; and any explicit user instructions (structure, sections, resources, difficulty, timeline, and especially any explicit list of phases/folders/topics the user named) were preserved — in the same order, without silent drops or unrequested renames — rather than overridden by your own template or the framework above. If something fails this check, fix it before responding — don't return a first draft that fails it.

Return JSON only:
{
  "workspaceName": "short specific name",
  "icon": "one emoji",
  "primaryIntent": "one of ${INTENTS.join(", ")}",
  "secondaryIntent": "one of ${INTENTS.join(", ")}",
  "plan": {
    "goal": "one-sentence restatement of what the user is trying to achieve",
    "estimatedDuration": "e.g. '6 months', '7 days', '3 weeks'",
    "expectedOutcome": "1-2 sentences: what the user will concretely have/be able to do when this is finished",
    "deliverables": ["3-6 concrete tangible outputs this plan produces, e.g. 'A working MVP', 'Completed NCERT Biology revision'"],
    "suggestedTimeline": "2-4 sentences summarizing how the milestones map to the timeline",
    "milestones": [
      { "title": "short milestone name naming the real topic, e.g. 'Python Syntax & Variables' or 'Week 1-2: Rate Limiters'", "description": "one sentence: what this milestone accomplishes" }
    ]
  },
  "executionFolders": [
    { "title": "name — the real subject, not a generic label", "icon": "emoji", "purpose": "one-line purpose", "milestone": "must exactly match one plan.milestones[].title", "exampleFiles": ["exactly ${MAX_FOLDER_ITEMS} specific realistic file titles"], "folders": [ /* optional nested subfolders, same shape */ ] }
  ],
  "knowledgeFolders": [
    { "title": "e.g. Resources, Cheat Sheets — only if genuinely useful", "icon": "emoji", "purpose": "one-line purpose", "milestone": "", "exampleFiles": ["exactly ${MAX_FOLDER_ITEMS} specific realistic file titles"], "folders": [] }
  ],
  "scopeNote": "only if you had to narrow a broad goal to fit the size limits — see rule above"
}

Rules: milestones covering the full plan, each named after the real topic it covers, never a generic phase label. Every milestone gets 1-3 execution folders tagged to it (never zero), and the total across all phases must land on exactly ${folderTarget} execution folders (a folder or two either way is acceptable, but never fewer than 6, never more than 15). 0-1 knowledgeFolders, omit entirely if not useful. exampleFiles are titles only, not real content — no markdown body, no full file generation yet — but every folder must show exactly ${MAX_FOLDER_ITEMS} of them, matching the real file count the folder will get when generated.`;

    let text: string;
    try {
      text = await callAI(prompt);
    } catch (e: any) {
      return NextResponse.json({ error: `AI request failed: ${e.message}` }, { status: 502 });
    }

    const raw = JSON.parse(text);

    const workspaceName = typeof raw.workspaceName === "string" && raw.workspaceName.trim()
      ? raw.workspaceName.trim().slice(0, 100)
      : goal.slice(0, 100);
    const icon = typeof raw.icon === "string" && raw.icon ? raw.icon.slice(0, 8) : "🎯";
    const primaryIntent = INTENTS.includes(raw.primaryIntent) ? raw.primaryIntent : "Organize";
    const secondaryIntent = INTENTS.includes(raw.secondaryIntent) ? raw.secondaryIntent : primaryIntent;
    const plan = normalizePlan(raw.plan, goal);
    const description = plan.expectedOutcome || goal;

    const executionFolders: PreviewNode[] = Array.isArray(raw.executionFolders)
      ? raw.executionFolders
          .map((f: any) => normalizePreviewNode(f, 1))
          .filter((f: PreviewNode | null): f is PreviewNode => f !== null)
          .slice(0, 15)
      : [];
    if (executionFolders.length === 0) {
      executionFolders.push({ title: "Getting Started", icon: "📅", purpose: "Your starting point.", milestone: plan.milestones[0]?.title || "", exampleFiles: [], folders: [] });
    }
    const knowledgeFolders: PreviewNode[] = Array.isArray(raw.knowledgeFolders)
      ? raw.knowledgeFolders
          .map((f: any) => normalizePreviewNode(f, 1))
          .filter((f: PreviewNode | null): f is PreviewNode => f !== null)
          .slice(0, 2)
      : [];

    const scopeNote = typeof raw.scopeNote === "string" && raw.scopeNote.trim() ? raw.scopeNote.trim().slice(0, 300) : null;

    return NextResponse.json({
      workspaceName,
      icon,
      description,
      primaryIntent,
      secondaryIntent,
      plan,
      executionFolders,
      knowledgeFolders,
      scopeNote,
    });
  } catch (error: any) {
    console.error("Workspace preview error:", error);
    return NextResponse.json({ error: "Failed to preview workspace" }, { status: 500 });
  }
}
