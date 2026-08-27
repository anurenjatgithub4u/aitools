import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceProject } from "@/models/WorkspaceProject";
import { WorkspaceCollection } from "@/models/WorkspaceCollection";
import { WorkspaceItem } from "@/models/WorkspaceItem";
import { toSteps, generateMission } from "@/lib/workspace-generation";
import { callAI, hasAIProviderKey } from "@/lib/ai";

// On-demand stub fill-in (workspace-preview-confirm-spec.md 5): a stub item
// (title + one-line description only) gets its full content generated the
// first time the user opens it — generated once, then cached forever.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const itemId = typeof body.itemId === "string" ? body.itemId : "";
    if (!userId || !itemId) {
      return NextResponse.json({ error: "userId and itemId are required" }, { status: 400 });
    }
    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable this." },
        { status: 503 }
      );
    }

    await connectDB();
    const item = await WorkspaceItem.findOne({ _id: itemId, userId }).lean();
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if ((item as any).generationState !== "stub") {
      return NextResponse.json({ item });
    }

    const [project, folder] = await Promise.all([
      (item as any).projectId ? WorkspaceProject.findOne({ _id: (item as any).projectId, userId }).lean() : null,
      (item as any).collectionIds?.[0]
        ? WorkspaceCollection.findOne({ _id: (item as any).collectionIds[0], userId }).lean()
        : null,
    ]);

    const type = (item as any).type;
    const prompt = `Generate full content for this workspace file. Project goal: "${
      (project as any)?.description || (project as any)?.name || "unspecified"
    }"${folder ? `\nFolder: "${(folder as any).name}"` : ""}
File: "${(item as any).title}" — ${(item as any).description}
Type: ${type}

This file is a MISSION, not a document — it needs its own goal, time estimate, difficulty, and a 5-10 item task checklist the user works through and checks off. Tasks must be concrete and actionable, never vague topic names (bad: "Loops"; good: "Practice Loops", "Solve 10 Problems"), in logical order (learn -> practice -> apply -> review).

Return JSON only:
{
  "markdownContent": "2-3 sentence overview of the mission — what it's for and why it matters (empty string for prompt type)",
  "goal": "one sentence: what the user can do after completing this file",
  "estimatedTime": "e.g. '3 Hours', '45 Minutes'",
  "difficulty": "Beginner | Intermediate | Advanced",
  "tasks": ["5-10 short actionable task strings, logically ordered"],
  "promptText": "only if type=prompt: a full reusable prompt with {{variables}}"
}`;

    let text: string;
    try {
      text = await callAI(prompt);
    } catch (e: any) {
      return NextResponse.json({ error: `AI request failed: ${e.message}` }, { status: 502 });
    }
    const plan = JSON.parse(text);

    const typeData: Record<string, unknown> = {};
    if (type === "prompt" && typeof plan.promptText === "string") typeData.promptText = plan.promptText;
    const rawTasks = Array.isArray(plan.tasks) ? plan.tasks : Array.isArray(plan.steps) ? plan.steps : null;
    if (rawTasks) typeData.steps = toSteps(rawTasks);
    if (typeof plan.goal === "string" && plan.goal.trim()) typeData.goal = plan.goal.trim().slice(0, 300);
    if (typeof plan.estimatedTime === "string" && plan.estimatedTime.trim()) {
      typeData.estimatedTime = plan.estimatedTime.trim().slice(0, 40);
    }
    if (typeof plan.difficulty === "string" && plan.difficulty.trim()) {
      typeData.difficulty = plan.difficulty.trim().slice(0, 30);
    }

    // Every generated file must be a mission — if the model skipped the
    // checklist this time, backfill it with a dedicated call rather than
    // leaving the file without one.
    const stepsArr = typeData.steps as unknown;
    if (!Array.isArray(stepsArr) || stepsArr.length === 0) {
      try {
        const mission = await generateMission(
          (item as any).title,
          typeof plan.markdownContent === "string" ? plan.markdownContent : ""
        );
        if (mission.tasks.length > 0) {
          typeData.steps = toSteps(mission.tasks);
          typeData.goal = typeData.goal || mission.goal;
          typeData.estimatedTime = typeData.estimatedTime || mission.estimatedTime;
          typeData.difficulty = typeData.difficulty || mission.difficulty;
        }
      } catch {
        /* best-effort — leave without a checklist rather than fail the whole request */
      }
    }

    const updated = await WorkspaceItem.findOneAndUpdate(
      { _id: itemId, userId },
      {
        $set: {
          markdownContent: typeof plan.markdownContent === "string" ? plan.markdownContent.slice(0, 2000) : "",
          typeData,
          generationState: "generated",
        },
      },
      { new: true }
    ).lean();

    return NextResponse.json({ item: updated });
  } catch (error: any) {
    console.error("Generate item error:", error);
    return NextResponse.json({ error: "Failed to generate item" }, { status: 500 });
  }
}
