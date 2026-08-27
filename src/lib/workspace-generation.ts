import { WORKSPACE_ITEM_TYPES } from "@/models/WorkspaceItem";
import { callAI } from "@/lib/ai";
import type { WorkflowStep } from "@/types/workspace";

// Shared helpers for AI-generated workspace content — used by both the
// initial full-workspace generation and single-folder regeneration.

export const STARTER_ITEM_TYPES = new Set([
  "knowledge", "prompt", "workflow", "idea", "research", "reference", "guide", "checklist", "roadmap",
]);
// Safety ceiling on files per folder (Workspace Generation V3: max 5 files
// per folder) — the real workspace-wide size target is enforced via the
// generate prompt's explicit total-count instruction, not this constant alone.
export const MAX_FOLDER_ITEMS = 5;

// Accepts either plain strings (checklist steps) or { text, instruction }
// objects (workflow steps — instruction is the prompt shown in the Run View
// with Open ChatGPT/Claude/Copy Prompt actions).
interface ParsedStep {
  text: string;
  instruction: string | undefined;
}

function parseStep(s: unknown): ParsedStep | null {
  if (typeof s === "string") {
    const text = s.trim();
    return text ? { text, instruction: undefined } : null;
  }
  if (s && typeof s === "object" && typeof (s as any).text === "string") {
    const text = (s as any).text.trim();
    if (!text) return null;
    const instruction = typeof (s as any).instruction === "string" ? (s as any).instruction.trim() : undefined;
    return { text, instruction: instruction || undefined };
  }
  return null;
}

export function toSteps(steps: unknown): WorkflowStep[] {
  if (!Array.isArray(steps)) return [];
  return steps
    .map(parseStep)
    .filter((s): s is ParsedStep => s !== null)
    .slice(0, 10)
    .map((s, i) => ({
      id: `gen-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      text: s.text,
      done: false,
      indent: 0,
      instruction: s.instruction,
    }));
}

// asStub=true forces the item into a title+description-only placeholder,
// regardless of what content the model returned — the "one example file per
// folder, rest as stubs" cap (workspace-preview-confirm-spec.md 5).
//
// Every generated file is a "mission" (workspace-generation-spec.md), not
// just prose: it carries its own goal/estimatedTime/difficulty plus a 5-10
// item task checklist (`typeData.steps`, reusing the same step shape the
// workflow redesign already built) — completing tasks is how file/folder/
// workspace progress rolls up, not a separate manual toggle.
export function normalizeItem(raw: any, asStub = false) {
  if (!raw || typeof raw.title !== "string" || !raw.title.trim()) return null;
  const type = STARTER_ITEM_TYPES.has(raw.type) && WORKSPACE_ITEM_TYPES.includes(raw.type) ? raw.type : "knowledge";
  const typeData: Record<string, unknown> = {};
  if (!asStub) {
    if (type === "prompt" && typeof raw.promptText === "string") typeData.promptText = raw.promptText;
    const rawTasks = Array.isArray(raw.steps) ? raw.steps : Array.isArray(raw.tasks) ? raw.tasks : null;
    if (rawTasks) typeData.steps = toSteps(rawTasks);
    if (typeof raw.goal === "string" && raw.goal.trim()) typeData.goal = raw.goal.trim().slice(0, 300);
    if (typeof raw.estimatedTime === "string" && raw.estimatedTime.trim()) {
      typeData.estimatedTime = raw.estimatedTime.trim().slice(0, 40);
    }
    if (typeof raw.difficulty === "string" && raw.difficulty.trim()) {
      typeData.difficulty = raw.difficulty.trim().slice(0, 30);
    }
  }
  return {
    title: String(raw.title).trim().slice(0, 200),
    description: typeof raw.description === "string" ? raw.description.slice(0, 2000) : "",
    type,
    markdownContent: asStub ? "" : typeof raw.markdownContent === "string" ? raw.markdownContent : "",
    typeData,
    generationState: asStub ? "stub" : "generated",
  };
}

// Direct, single-item AI call for goal/estimatedTime/difficulty/tasks —
// used as a backfill whenever a batched generation prompt happened to skip
// a file's checklist, and by the "Generate Checklist" button for files that
// never had one (manually created files, older items, etc.).
export async function generateMission(
  title: string,
  content: string
): Promise<{ goal: string; estimatedTime: string; difficulty: string; tasks: string[] }> {
  const prompt = `You are helping fill in a task checklist for a workspace file so the user can track concrete progress on it.
Title: "${title}"
${content.trim() ? `Existing content:\n${content.slice(0, 4000)}` : "(no content written yet)"}

This file needs to become a "mission": a clear goal, a time estimate, a difficulty, and a 5-10 item task checklist of concrete, actionable steps — never vague topic names (bad: "Loops"; good: "Practice Loops", "Solve 10 Problems"), in logical order (learn -> practice -> apply -> review).

Return JSON only:
{
  "goal": "one sentence: what the user can do after completing this file",
  "estimatedTime": "e.g. '2 Hours', '45 Minutes'",
  "difficulty": "Beginner | Intermediate | Advanced",
  "tasks": ["5-10 short actionable task strings, logically ordered"]
}`;
  // callAI already retries transient 429/503s internally, but a malformed
  // (non-JSON) response isn't — so retry once here too, since a single flaky
  // response otherwise permanently strands a file without a checklist.
  let parsed: any;
  try {
    parsed = JSON.parse(await callAI(prompt));
  } catch {
    parsed = JSON.parse(await callAI(prompt));
  }
  return {
    goal: typeof parsed.goal === "string" ? parsed.goal.trim().slice(0, 300) : "",
    estimatedTime: typeof parsed.estimatedTime === "string" ? parsed.estimatedTime.trim().slice(0, 40) : "",
    difficulty: typeof parsed.difficulty === "string" ? parsed.difficulty.trim().slice(0, 30) : "",
    tasks: Array.isArray(parsed.tasks)
      ? parsed.tasks.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0).slice(0, 10)
      : [],
  };
}

// Guarantees a normalized, non-stub item ends up with a checklist — every
// generated file must be a mission (workspace-generation-spec.md), and the
// batched generation prompt alone isn't reliable enough across 20-35 files
// in one response to promise that on its own. Best-effort: on AI failure,
// returns the item unchanged rather than blocking the whole batch.
export async function ensureItemMission<
  T extends { title: string; markdownContent: string; typeData: Record<string, unknown>; generationState: string }
>(item: T): Promise<T> {
  if (item.generationState !== "generated") return item;
  const steps = item.typeData.steps;
  if (Array.isArray(steps) && steps.length > 0) return item;
  try {
    const mission = await generateMission(item.title, item.markdownContent);
    if (mission.tasks.length === 0) return item;
    return {
      ...item,
      typeData: {
        ...item.typeData,
        goal: item.typeData.goal || mission.goal,
        estimatedTime: item.typeData.estimatedTime || mission.estimatedTime,
        difficulty: item.typeData.difficulty || mission.difficulty,
        steps: toSteps(mission.tasks),
      },
    };
  } catch {
    return item;
  }
}

