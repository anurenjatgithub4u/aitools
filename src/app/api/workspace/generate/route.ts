import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceProject } from "@/models/WorkspaceProject";
import { WorkspaceCollection } from "@/models/WorkspaceCollection";
import { WorkspaceItem } from "@/models/WorkspaceItem";
import { MAX_FOLDER_ITEMS, normalizeItem, ensureItemMission } from "@/lib/workspace-generation";
import { callAI, hasAIProviderKey } from "@/lib/ai";
import { COMPLEXITY_SIZES, type Complexity } from "@/app/api/workspace/classify/route";
import { selectBlueprint, formatBlueprintForStructurePrompt, formatBlueprintForContentPrompt } from "@/lib/workspace-blueprints";

// AI-first execution redesign (workspace-execution-redesign-spec.md, Stage 2):
// one approved plan -> a full project workspace — nested folders (each tagged
// to a plan milestone), auto-generated folder READMEs, and goal-specific
// files, capped so only what's opened first is fully written up front.

const INTENTS = ["Learn", "Build", "Organize", "Create", "Research", "Plan", "Prepare", "Operate"];
const MAX_FOLDER_DEPTH = 3; // safety cap; the prompt asks for at most 2 levels

// Recursively normalizes a raw AI-generated folder node (title/icon/files/folders).
type FolderNode = { title: string; icon: string; purpose: string; milestone: string; items: any[]; children: FolderNode[] };

function normalizeFolderNode(raw: any, depth: number): FolderNode | null {
  if (!raw || typeof raw.title !== "string" || !raw.title.trim()) return null;
  const items = Array.isArray(raw.files) ? raw.files.slice(0, MAX_FOLDER_ITEMS) : [];
  const children: FolderNode[] =
    depth < MAX_FOLDER_DEPTH && Array.isArray(raw.folders)
      ? raw.folders
          .map((c: any) => normalizeFolderNode(c, depth + 1))
          .filter((c: FolderNode | null): c is FolderNode => c !== null)
          .slice(0, 8)
      : [];
  return {
    title: raw.title.trim().slice(0, 100),
    icon: typeof raw.icon === "string" && raw.icon ? raw.icon.slice(0, 8) : "📁",
    purpose: typeof raw.purpose === "string" ? raw.purpose.trim().slice(0, 200) : "",
    milestone: "",
    items,
    children,
  };
}

// Preview-confirm flow (workspace-preview-confirm-spec.md): when the client
// sends a user-approved plan + structure from /api/workspace/preview, we skip
// structure design entirely and only generate content that fills it — folder
// names/nesting/milestone tags are never re-derived, respecting whatever the
// user reviewed or corrected.
type PreviewNodeIn = { title: string; icon: string; purpose?: string; milestone?: string; folders?: PreviewNodeIn[] };
type PlanMilestoneIn = { title?: string; description?: string };
type PlanIn = {
  goal?: string;
  estimatedDuration?: string;
  expectedOutcome?: string;
  deliverables?: string[];
  suggestedTimeline?: string;
  milestones?: PlanMilestoneIn[];
};

function flattenPreview(nodes: PreviewNodeIn[] | undefined, parentId: string): { id: string; title: string; purpose: string }[] {
  if (!Array.isArray(nodes)) return [];
  const out: { id: string; title: string; purpose: string }[] = [];
  nodes.forEach((n, i) => {
    if (!n || typeof n.title !== "string" || !n.title.trim()) return;
    const id = `${parentId}.${i}`;
    out.push({ id, title: n.title.trim().slice(0, 100), purpose: typeof n.purpose === "string" ? n.purpose.slice(0, 160) : "" });
    out.push(...flattenPreview(n.folders, id));
  });
  return out;
}

function buildFolderNodeFromPreview(
  nodes: PreviewNodeIn[] | undefined,
  parentId: string,
  filesById: Record<string, any[]>,
  inheritedMilestone = ""
): FolderNode[] {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .filter((n) => n && typeof n.title === "string" && n.title.trim())
    .map((n, i) => {
      const id = `${parentId}.${i}`;
      const milestone = typeof n.milestone === "string" && n.milestone.trim() ? n.milestone.trim() : inheritedMilestone;
      return {
        title: n.title.trim().slice(0, 100),
        icon: typeof n.icon === "string" && n.icon ? n.icon.slice(0, 8) : "📁",
        purpose: typeof n.purpose === "string" ? n.purpose.slice(0, 200) : "",
        milestone,
        items: Array.isArray(filesById[id]) ? filesById[id].slice(0, MAX_FOLDER_ITEMS) : [],
        children: buildFolderNodeFromPreview(n.folders, id, filesById, milestone),
      };
    });
}

function composeReadme(purpose: string, itemTitles: string[], milestoneTitle?: string): string {
  const fileList = itemTitles.length > 0
    ? itemTitles.map((t) => `- ${t}`).join("\n")
    : "- Files will appear here as you add them.";
  return `## Purpose
${purpose || "This folder supports your goal — add files here as you work through it."}

## What Belongs Here
${fileList}

## Recommended Workflow
1. Start with the first file above and work through them in order.
2. Mark each file **Complete** as you finish it — this updates your Tracker and Roadmap automatically.
3. Use "Generate this" on any file marked "Not generated yet" before starting it.

## Completion Criteria
This folder is complete when every file above is marked Completed.

## Tips
- Revisit and update files as your understanding evolves — nothing here is fixed.${
    milestoneTitle ? `\n- This folder is part of the **${milestoneTitle}** milestone.` : ""
  }`;
}

function normalizePlanForSave(raw: PlanIn | undefined, goal: string) {
  const milestones = Array.isArray(raw?.milestones)
    ? raw!.milestones
        .filter((m): m is PlanMilestoneIn => !!m && typeof m.title === "string" && m.title.trim().length > 0)
        .slice(0, 15)
        .map((m, i) => ({
          id: `ms-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          title: m.title!.trim().slice(0, 100),
          description: typeof m.description === "string" ? m.description.trim().slice(0, 300) : "",
          order: i,
        }))
    : [];
  const deliverables = Array.isArray(raw?.deliverables)
    ? raw!.deliverables.filter((d): d is string => typeof d === "string" && d.trim().length > 0).map((d) => d.trim().slice(0, 150)).slice(0, 10)
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
    const userId = typeof body.userId === "string" ? body.userId : "";
    // V4 Step 10: a pasted syllabus/job description/doc may arrive as the
    // goal itself, not just generationRequirements.
    const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 3000) : "";
    if (!userId || !goal) {
      return NextResponse.json({ error: "userId and goal are required" }, { status: 400 });
    }
    const category = typeof body.category === "string" && body.category ? body.category.slice(0, 50) : null;
    // Expert Blueprint Library (Phase 2): a category with a matching blueprint
    // gets its stage/file-role guidance injected below instead of (structure)
    // or alongside (content) the hardcoded per-category guidance — purely
    // additive, categories without a blueprint yet keep prior behavior.
    const blueprint = selectBlueprint(category);
    const blueprintContentBlock = blueprint ? `\n\n${formatBlueprintForContentPrompt(blueprint)}` : "";
    // User Requirement Extraction: explicit instructions in the goal text
    // (topic/file hints, checklist style preferences) always outrank both the
    // blueprint's defaults and the model's own judgment.
    const explicitInstructionNote = `If the goal text mentions specific file/topic hints (e.g. "Authentication, Payments, API Testing") or checklist style preferences (e.g. "use action verbs", "avoid theory", "production-ready", "execution-focused"), honor them — explicit user instructions always take priority over the blueprint guidance above and your own defaults.`;
    // V4 Step 3/13: checklist item count scales with the complexity tier
    // (small 5-10, medium 8-10, large exactly 10) instead of one fixed range.
    const complexity: Complexity = body.complexity in COMPLEXITY_SIZES ? body.complexity : "medium";
    const depthChoice: "sample" | "detailed" | "complete" = ["sample", "detailed", "complete"].includes(body.depthChoice)
      ? body.depthChoice
      : "detailed";
    const [checklistMin, checklistMax] = COMPLEXITY_SIZES[complexity].checklistRange;
    const checklistCountText = checklistMin === checklistMax ? `exactly ${checklistMax}` : `${checklistMin}-${checklistMax}`;
    // Only used by the no-confirmedStructure fallback branch below, which
    // designs its own structure — the confirmedStructure branch already got
    // its folder count locked in during the preview step.
    const [folderTierMin, folderTierMax] = COMPLEXITY_SIZES[complexity].folderRange;
    const folderTarget =
      depthChoice === "sample" ? folderTierMin : depthChoice === "complete" ? folderTierMax : Math.round((folderTierMin + folderTierMax) / 2);
    const clarificationAnswers: { question: string; answer: string }[] = Array.isArray(body.clarificationAnswers)
      ? body.clarificationAnswers
          .filter((a: any) => a && typeof a.question === "string" && typeof a.answer === "string")
          .slice(0, 5)
          .map((a: any) => ({ question: a.question.slice(0, 200), answer: a.answer.slice(0, 100) }))
      : [];
    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable workspace generation." },
        { status: 503 }
      );
    }

    const confirmedStructure = body.confirmedStructure && typeof body.confirmedStructure === "object" ? body.confirmedStructure : null;
    // Workspace Generation V3: HOW to build each file, separate from the
    // goal/structure above which says WHAT the topic is. When present, the
    // fully-written files below must implement this structure directly
    // instead of the default short mission overview.
    const generationRequirements = typeof body.generationRequirements === "string" ? body.generationRequirements.trim().slice(0, 6000) : "";

    // Condensed prompt (~40% fewer tokens than original while preserving all structure)
    const clarificationBlock = clarificationAnswers.length > 0
      ? `\nUser answers (hard constraints):\n${clarificationAnswers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")}`
      : "";
    const requirementsBlock = generationRequirements
      ? `\n\nGENERATION REQUIREMENTS — the user specified exactly how every fully-written file should be structured. Follow this precisely for every fully-written file's markdownContent; do not substitute a shorter generic overview:\n"""\n${generationRequirements}\n"""\nFolder and file NAMES still come from the goal's real topic (never from this requirements text itself — it describes format, not subject matter). Every fully-written file must actually contain the sections/format this text asks for, filled with specific, non-generic content about the real topic — not placeholders.`
      : "";
    // Governs BOTH whether a file is "mission, not document" (default) or a
    // full detailed document (when the user asked for one) — these two must
    // never be stated as separate, conflicting rules in the same prompt, or
    // the model reliably follows the unconditional one and ignores the other.
    const missionFramingInstruction = generationRequirements
      ? `- Every fully-written file is a MISSION with its own "goal" (what the user can DO after finishing it), "estimatedTime", "difficulty", and a "tasks" checklist of ${checklistCountText} concrete, actionable steps — never vague topic names. Here "markdownContent" is NOT a short overview: it must be a full, detailed document implementing every section from the GENERATION REQUIREMENTS above, written specifically about this file's real topic — no placeholders, no generic filler. The tasks checklist still applies on top of this document.`
      : `- Every fully-written file is a MISSION, not a document: it needs its own "goal" (what the user can DO after finishing it), "estimatedTime", "difficulty", and a "tasks" checklist of ${checklistCountText} concrete, actionable steps — never vague topic names. Every task starts with a concrete action verb (Install, Configure, Build, Practice, Write, Test, Review, Measure, Analyze, Publish...) and represents one checkable, verifiable action — avoid "Learn X" / "Understand X" / "Think about X" / "Explore X" as a task itself, since those aren't actions you can verify were done; use them only as connective framing in "goal" or "markdownContent", never as a task string. Bad tasks: "Variables", "Loops", "Learn Python". Good tasks: "Install Python", "Write 5 Variable Assignment Examples", "Practice a For-Loop Exercise", "Solve 10 Problems", "Revise Notes". Each task should feel like something the user can actually check off, and the tasks should be in logical order (foundational action → practice → build/apply → review).\n- "markdownContent" is a short 2-3 sentence overview of the mission — what it's for and why it matters — not the content itself; the tasks ARE the content.`;

    let workspaceName: string;
    let icon: string;
    let description: string;
    let primaryIntent: string;
    let secondaryIntent: string;
    let executionFolders: FolderNode[];
    let knowledgeFolders: FolderNode[];
    let aiWorkflowItems: any[];
    let promptPackItems: any[];
    let planToSave: ReturnType<typeof normalizePlanForSave> | null = null;
    let scopeNote: string | null = null;

    if (confirmedStructure) {
      // Plan + structure already approved via preview — only generate content for it.
      workspaceName = typeof confirmedStructure.workspaceName === "string" && confirmedStructure.workspaceName.trim()
        ? confirmedStructure.workspaceName.trim().slice(0, 100)
        : goal.slice(0, 100);
      icon = typeof confirmedStructure.icon === "string" && confirmedStructure.icon ? confirmedStructure.icon.slice(0, 8) : "🎯";
      description = typeof confirmedStructure.description === "string" && confirmedStructure.description.trim()
        ? confirmedStructure.description.trim().slice(0, 500)
        : goal;
      primaryIntent = INTENTS.includes(confirmedStructure.primaryIntent) ? confirmedStructure.primaryIntent : "Organize";
      secondaryIntent = INTENTS.includes(confirmedStructure.secondaryIntent) ? confirmedStructure.secondaryIntent : primaryIntent;
      planToSave = normalizePlanForSave(confirmedStructure.plan, goal);

      const flatExecution = flattenPreview(confirmedStructure.executionFolders, "e");
      const flatKnowledge = flattenPreview(confirmedStructure.knowledgeFolders, "k");
      const allFolders = [...flatExecution, ...flatKnowledge];
      const firstFolderId = flatExecution[0]?.id;

      const contentPrompt = `You already agreed on this folder structure for the goal "${goal}"${category ? ` (category: ${category})` : ""}.${clarificationBlock}${requirementsBlock}
Do not rename, add, or remove folders — just generate file content for the ones listed.

Folders (id: title — purpose):
${allFolders.map((f) => `${f.id}: ${f.title}${f.purpose ? ` — ${f.purpose}` : ""}`).join("\n")}${blueprintContentBlock}

Capped generation — this is the token-saving core of the flow, follow it exactly:
- Every folder gets exactly ${MAX_FOLDER_ITEMS} files total (this is fixed, not a range).
- Folder ${firstFolderId} (the one the user opens first): all ${MAX_FOLDER_ITEMS} FULLY-WRITTEN with complete markdownContent/steps/promptText.
- Every other folder: exactly 1 FULLY-WRITTEN file, then exactly ${MAX_FOLDER_ITEMS - 1} STUB files where you set ONLY "title" and "description" — leave markdownContent/steps/promptText out entirely for stubs, don't waste effort writing content that will be discarded (it's filled in on demand the moment the user opens it).
- That's ${allFolders.length} folders × ${MAX_FOLDER_ITEMS} files = ${allFolders.length * MAX_FOLDER_ITEMS} files total across this response.
${missionFramingInstruction}
${explicitInstructionNote}

Return JSON only:
{
  "filesById": {
    "<folder id>": [{ "type": "knowledge|prompt|checklist|guide|roadmap", "title": "short", "description": "one sentence: what this file is", "goal": "one sentence: what the user can do after completing it — ONLY for the fully-written file(s)", "estimatedTime": "e.g. '3 Hours', '45 Minutes' — ONLY for the fully-written file(s)", "difficulty": "Beginner | Intermediate | Advanced — ONLY for the fully-written file(s)", "tasks": "ONLY for the fully-written file(s): array of 5-10 short actionable task strings, logically ordered", "markdownContent": "2-3 sentence overview, ONLY for the fully-written file(s) (empty for prompt)", "promptText": "only for the fully-written file if type=prompt" }]
  },
  "aiWorkflowItems": [{ "title": "...", "description": "one sentence", "steps": [{ "text": "short step title", "instruction": "the exact prompt to paste into an AI tool for this step, omit for non-AI steps" }] }],
  "promptPackItems": [{ "title": "...", "description": "one sentence", "promptText": "reusable prompt with {{variables}}", "goal": "one sentence: what the user can do after using this prompt", "estimatedTime": "e.g. '20 Minutes'", "difficulty": "Beginner | Intermediate | Advanced", "tasks": "5-10 short actionable task strings for actually putting this prompt to use, logically ordered" }]
}

Rules: every folder id above must have an entry in filesById. Never use "type": "workflow" inside filesById — the one and only workflow for this whole workspace goes in "aiWorkflowItems" (exactly 1, not more). 2-3 promptPackItems, each a mission with goal/estimatedTime/difficulty/tasks like the files above. Everything specific to "${goal}".`;

      let text: string;
      try {
        text = await callAI(contentPrompt);
      } catch (e: any) {
        return NextResponse.json({ error: `AI request failed: ${e.message}` }, { status: 502 });
      }
      const plan = JSON.parse(text);
      const filesById: Record<string, any[]> = plan.filesById && typeof plan.filesById === "object" ? plan.filesById : {};

      executionFolders = buildFolderNodeFromPreview(confirmedStructure.executionFolders, "e", filesById);
      if (executionFolders.length === 0) {
        executionFolders.push({ title: "Getting Started", icon: "📅", purpose: "", milestone: "", items: [], children: [] });
      }
      knowledgeFolders = buildFolderNodeFromPreview(confirmedStructure.knowledgeFolders, "k", filesById);
      aiWorkflowItems = Array.isArray(plan.aiWorkflowItems) ? plan.aiWorkflowItems.slice(0, 1) : [];
      promptPackItems = Array.isArray(plan.promptPackItems) ? plan.promptPackItems.slice(0, 5) : [];
      scopeNote = typeof confirmedStructure.scopeNote === "string" ? confirmedStructure.scopeNote : null;
    } else {
      // No plan was reviewed (e.g. direct call) — design structure and content together.
      const workflowGuidance = blueprint
        ? formatBlueprintForStructurePrompt(blueprint)
        : `- Learning: Roadmap → Months/Weeks → Modules/Practice
- Interview prep: Day-by-day with specific topics
- Content: Ideas, Calendar, Drafts, Publishing
- Startup: Research, Validation, Development, Launch
- Travel: Cities → Days, Hotels, Budget
- Fitness: Workout Plan, Nutrition, Progress
- Other: infer the best sequence`;
      const prompt = `Build a complete project workspace for: "${goal}"${category ? `\nCategory: ${category}` : ""}${clarificationBlock}${requirementsBlock}

Approach this the way an experienced practitioner who has actually achieved this exact goal many times would plan it for someone else — a teacher for a learning goal, a founder for a startup, a coach for a fitness goal, a researcher for a research goal — never as a generic assistant listing topics.

Design execution folders around the WORKFLOW this goal implies:
${workflowGuidance}

PRIORITY ORDER for deciding folders — follow strictly:
1. The user's own explicit instructions always win. If the goal text lists specific phases, folders, or section names, preserve every one of them as an execution folder, in the same relative order, using their given wording as-is or only lightly cleaned up for clarity — never replace them with different names, never drop one, and never substitute the framework above for what the user already specified.
2. Use the expert execution framework above to fill in anything the user didn't specify.
3. Only fall back to your own judgment for anything neither of the above covers.
If the user's explicit list is partial, keep those exactly as given and generate the remaining folders around them using the framework above, in a logical order.
If the user's explicit list has MORE phases than the folder target below allows, do not drop information: merge closely related phases into one well-named folder (e.g. "Authentication Testing" + "Authorization Testing" → "Security Verification"). Prioritize critical execution steps and real dependencies over nice-to-have ones when deciding what to merge — never merge away a phase that sounds mandatory for the goal to actually succeed. When you merge, set "scopeNote" to a short, friendly note, e.g. "Your prompt contained 22 suggested phases. To maintain a high-quality workspace, FindUrAI intelligently merged related phases into 15 execution-focused folders."

Every folder name must be practical and outcome-shaped — name what the user will DO or BUILD, not the textbook topic. Bad (generic or just a topic label): "Foundations", "Core Concepts", "Practical Application", "Implementation", "Review and Reflection", "Python Syntax". Good (names the outcome): "Build Your First Flutter App", "Write Your First Python Script", "Practice Loops & Conditionals".
Max 2 levels of nesting. This workspace's size was assessed as "${complexity}" (${depthChoice} depth) — target exactly ${folderTarget} top-level folders, a folder or two either way is fine (never fewer than 6, never more than 15). If the goal is broad or ambitious, don't try to cover everything: pick only the most essential, foundational folders that fit this target: a focused starting workspace beats an overwhelming one, and the user can add more manually or ask to expand later. If you had to meaningfully narrow the goal to fit, say so briefly in "scopeNote"; otherwise omit it.

Return JSON:
{
  "workspaceName": "short name",
  "icon": "emoji",
  "description": "one sentence",
  "primaryIntent": "one of ${INTENTS.join(", ")}",
  "secondaryIntent": "one of ${INTENTS.join(", ")}",
  "executionFolders": [
    { "title": "name — the real subject, not a generic label", "icon": "emoji",
      "files": [{ "type": "knowledge|prompt|checklist|guide|roadmap", "title": "short", "description": "one sentence: what this file is", "goal": "one sentence: what the user can do after completing it", "estimatedTime": "e.g. '3 Hours', '45 Minutes'", "difficulty": "Beginner | Intermediate | Advanced", "tasks": "${checklistCountText} short actionable task strings, logically ordered (learn -> practice -> apply -> review), never vague topic names", "markdownContent": "${generationRequirements ? "a full document implementing the generation requirements above" : "2-3 sentence overview"} (empty for prompt)", "promptText": "only if type=prompt" }],
      "folders": [] }
  ],
  "aiWorkflowItems": [{ "title": "...", "description": "one sentence", "steps": [{ "text": "short step title", "instruction": "the exact prompt to paste into an AI tool for this step, omit for non-AI steps" }] }],
  "promptPackItems": [{ "title": "...", "description": "one sentence", "promptText": "reusable prompt with {{variables}}", "goal": "one sentence: what the user can do after using this prompt", "estimatedTime": "e.g. '20 Minutes'", "difficulty": "Beginner | Intermediate | Advanced", "tasks": "${checklistCountText} short actionable task strings for actually putting this prompt to use, logically ordered" }],
  "knowledgeFolders": [{ "title": "...", "icon": "emoji", "files": [{ "type": "reference", "title": "...", "description": "one sentence", "goal": "one sentence", "estimatedTime": "e.g. '1 Hour'", "difficulty": "Beginner | Intermediate | Advanced", "tasks": "${checklistCountText} short actionable task strings", "markdownContent": "2-3 sentences" }] }],
  "scopeNote": "only if you had to narrow scope — see rule above"
}

Rules: target exactly ${folderTarget} executionFolders (never fewer than 6, never more than 15). Exactly 1 aiWorkflowItems, never more — never use "type": "workflow" inside a folder's "files", the one workflow belongs only in "aiWorkflowItems". 2-3 promptPackItems, each a mission with goal/estimatedTime/difficulty/tasks like the files above. 0-1 knowledgeFolders.
${missionFramingInstruction}
${explicitInstructionNote}${blueprintContentBlock}
Before returning, verify: folder names are outcome-shaped not textbook labels, no two folders cover the same ground, nothing was invented that the goal doesn't actually imply, the folder count matches the target above, and every explicit phase/folder/topic the user named is represented — in the same order, without silent drops or unrequested renames. Fix anything that fails before responding.
Capped generation: every folder gets exactly ${MAX_FOLDER_ITEMS} files total. For the FIRST executionFolder only, fully write all ${MAX_FOLDER_ITEMS}. For every other folder, fully write just its first file — the remaining ${MAX_FOLDER_ITEMS - 1} are stubs: set only "title" and "description", leave markdownContent/goal/estimatedTime/difficulty/tasks/promptText out entirely.`;

      let text: string;
      try {
        text = await callAI(prompt);
      } catch (e: any) {
        return NextResponse.json({ error: `AI request failed: ${e.message}` }, { status: 502 });
      }

      const plan = JSON.parse(text);

      workspaceName = typeof plan.workspaceName === "string" && plan.workspaceName.trim()
        ? plan.workspaceName.trim().slice(0, 100)
        : goal.slice(0, 100);
      icon = typeof plan.icon === "string" && plan.icon ? plan.icon.slice(0, 8) : "🎯";
      description = typeof plan.description === "string" && plan.description.trim()
        ? plan.description.trim().slice(0, 500)
        : goal;
      primaryIntent = INTENTS.includes(plan.primaryIntent) ? plan.primaryIntent : "Organize";
      secondaryIntent = INTENTS.includes(plan.secondaryIntent) ? plan.secondaryIntent : primaryIntent;

      executionFolders = Array.isArray(plan.executionFolders)
        ? plan.executionFolders
            .map((f: any) => normalizeFolderNode(f, 1))
            .filter((f: FolderNode | null): f is FolderNode => f !== null)
            .slice(0, 15)
        : [];
      if (executionFolders.length === 0) {
        executionFolders.push({ title: "Getting Started", icon: "📅", purpose: "", milestone: "", items: [], children: [] });
      }

      knowledgeFolders = Array.isArray(plan.knowledgeFolders)
        ? plan.knowledgeFolders
            .map((f: any) => normalizeFolderNode(f, 1))
            .filter((f: FolderNode | null): f is FolderNode => f !== null)
            .slice(0, 3)
        : [];

      aiWorkflowItems = Array.isArray(plan.aiWorkflowItems) ? plan.aiWorkflowItems.slice(0, 1) : [];
      promptPackItems = Array.isArray(plan.promptPackItems) ? plan.promptPackItems.slice(0, 5) : [];
      scopeNote = typeof plan.scopeNote === "string" && plan.scopeNote.trim() ? plan.scopeNote.trim().slice(0, 300) : null;
    }

    await connectDB();

    const project = await WorkspaceProject.create({
      userId,
      name: workspaceName,
      description,
      emoji: icon,
      color: "#8b5cf6",
      intent: "workspace",
      category,
      clarificationAnswers,
      plan: planToSave,
    });
    const projectId = String(project._id);
    const milestoneIdByTitle = new Map((planToSave?.milestones || []).map((m) => [m.title, m.id]));
    const milestoneTitleById = new Map((planToSave?.milestones || []).map((m) => [m.id, m.title]));

    let orderCounter = 0;
    let itemCount = 0;

    // Recursively creates a folder (+ its files, + its nested subfolders).
    // Capped generation (spec 5): every execution/knowledge folder gets ONE
    // fully-written example item, the rest as stubs — except `fullyGenerate`
    // folders (the one the user opens first, plus mandatory AI Workflows /
    // Prompt Packs) which get everything written in full. Each folder also
    // gets an auto-composed README and, when it belongs to a plan milestone,
    // that milestone's id — this is what drives the Roadmap page.
    async function createFolderTree(
      node: FolderNode,
      kind: string,
      parentId: string | null,
      opts: { fullyGenerate?: boolean; milestoneId?: string | null } = {}
    ) {
      const order = orderCounter++;
      const milestoneId = opts.milestoneId ?? (node.milestone ? milestoneIdByTitle.get(node.milestone) || null : null);

      const cap = opts.fullyGenerate || kind === "ai" ? Infinity : 1;
      const rawNormalizedItems = node.items
        .map((raw, i) => normalizeItem(raw, i >= cap))
        .filter((i): i is NonNullable<ReturnType<typeof normalizeItem>> => i !== null);
      // Every non-stub file must be a mission (workspace-generation-spec.md)
      // — the batched prompt above isn't reliably followed across 20-35
      // files in one response, so backfill anything it skipped.
      const normalizedItems = await Promise.all(rawNormalizedItems.map(ensureItemMission));

      const readme = composeReadme(
        node.purpose,
        normalizedItems.map((i) => i.title),
        milestoneId ? milestoneTitleById.get(milestoneId) : undefined
      );

      const folder = await WorkspaceCollection.create({
        userId,
        name: node.title,
        description: "",
        emoji: node.icon,
        color: "#8b5cf6",
        projectId,
        kind,
        order,
        parentId,
        readme,
        milestoneId,
      });
      const folderId = String(folder._id);

      const itemDocs = normalizedItems.map((i) => ({
        userId,
        ...i,
        emoji: "📄",
        projectId,
        collectionIds: [folderId],
        tags: [],
      }));
      if (itemDocs.length > 0) {
        await WorkspaceItem.insertMany(itemDocs);
        itemCount += itemDocs.length;
      }

      for (const child of node.children) {
        await createFolderTree(child, kind, folderId, { milestoneId });
      }
      return folder;
    }

    // Dashboard: fixed, always first, no AI-generated content.
    await WorkspaceCollection.create({
      userId,
      name: "Dashboard",
      description: "",
      emoji: "📍",
      color: "#8b5cf6",
      projectId,
      kind: "dashboard",
      order: orderCounter++,
      parentId: null,
      readme: "",
      milestoneId: null,
    });

    // The first execution folder (Overview / Week 1 / Month 1 equivalent) is
    // near-certain to be opened immediately, so it skips the stub cap.
    for (let i = 0; i < executionFolders.length; i++) {
      await createFolderTree(executionFolders[i], "execution", null, { fullyGenerate: i === 0 });
    }

    await createFolderTree(
      { title: "AI Workflows", icon: "🤖", purpose: "Reusable automations for this project.", milestone: "", items: aiWorkflowItems.map((i: any) => ({ ...i, type: "workflow" })), children: [] },
      "ai",
      null
    );
    await createFolderTree(
      { title: "Prompt Packs", icon: "💬", purpose: "Reusable prompts for this project.", milestone: "", items: promptPackItems.map((i: any) => ({ ...i, type: "prompt" })), children: [] },
      "ai",
      null
    );

    for (const folder of knowledgeFolders) {
      await createFolderTree(folder, "knowledge", null);
    }

    await createFolderTree({ title: "Notes", icon: "📝", purpose: "Free-form notes for anything that doesn't fit elsewhere.", milestone: "", items: [], children: [] }, "personal", null);
    await createFolderTree({ title: "Favorites", icon: "⭐", purpose: "Items you've starred for quick access.", milestone: "", items: [], children: [] }, "personal", null);
    await createFolderTree({ title: "Archive", icon: "📦", purpose: "Anything you've set aside but want to keep.", milestone: "", items: [], children: [] }, "archive", null);

    return NextResponse.json({
      project: { ...project.toObject(), _id: projectId },
      primaryIntent,
      secondaryIntent,
      folderCount: orderCounter,
      itemCount,
      scopeNote,
    });
  } catch (error: any) {
    console.error("Workspace generate error:", error);
    return NextResponse.json({ error: "Failed to generate workspace" }, { status: 500 });
  }
}
