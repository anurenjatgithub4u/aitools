import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceProject } from "@/models/WorkspaceProject";
import { WorkspaceCollection } from "@/models/WorkspaceCollection";
import { WorkspaceItem } from "@/models/WorkspaceItem";
import { FolderRegenerationLog } from "@/models/FolderRegenerationLog";
import { MAX_FOLDER_ITEMS, normalizeItem, ensureItemMission } from "@/lib/workspace-generation";
import { callAI, hasAIProviderKey } from "@/lib/ai";

// Post-generation correction loop (workspace-generation-v2-spec.md 3.4):
// a cheap, targeted regeneration of a single folder's direct items — not a
// full workspace regeneration — optionally guided by a one-line reason.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const folderId = typeof body.folderId === "string" ? body.folderId : "";
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : "";
    if (!userId || !projectId || !folderId) {
      return NextResponse.json({ error: "userId, projectId and folderId are required" }, { status: 400 });
    }
    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable regeneration." },
        { status: 503 }
      );
    }

    await connectDB();
    const [project, folder, existingItems] = await Promise.all([
      WorkspaceProject.findOne({ _id: projectId, userId }).lean(),
      WorkspaceCollection.findOne({ _id: folderId, userId, projectId }).lean(),
      WorkspaceItem.find({ userId, projectId, collectionIds: folderId }).select("title type").lean(),
    ]);
    if (!project || !folder) {
      return NextResponse.json({ error: "Project or folder not found" }, { status: 404 });
    }

    const prompt = `You are regenerating ONE folder inside an existing AI-generated project workspace. Do not change anything else.

Project goal: "${(project as any).description || (project as any).name}"
Folder being regenerated: "${(folder as any).name}"
${
  (existingItems as any[]).length > 0
    ? `Current contents to replace (they clearly weren't a good fit):\n${(existingItems as any[])
        .map((i) => `- [${i.type}] ${i.title}`)
        .join("\n")}`
    : "This folder is currently empty."
}
${reason ? `The user's feedback on why the current content is wrong: "${reason}"` : ""}

Generate 1-${MAX_FOLDER_ITEMS} replacement files for this folder that genuinely fix the problem described (or, if no reason was given, are simply a stronger fit for the folder's purpose within the project). Return JSON only:
{
  "files": [
    {
      "type": "knowledge, prompt, workflow, checklist, guide, roadmap, idea, research, or reference",
      "title": "short title",
      "description": "one sentence",
      "markdownContent": "2-5 sentences of genuinely useful, specific content (empty string for prompt/workflow/checklist types)",
      "promptText": "only if type=prompt: a full reusable prompt with {{variables}}",
      "steps": ["only if type=workflow or checklist: 3-6 short concrete step strings"]
    }
  ]
}`;

    let text: string;
    try {
      text = await callAI(prompt);
    } catch (e: any) {
      return NextResponse.json({ error: `AI request failed: ${e.message}` }, { status: 502 });
    }
    const plan = JSON.parse(text);
    const files = Array.isArray(plan.files) ? plan.files.slice(0, MAX_FOLDER_ITEMS) : [];

    const rawNormalized = files
      .map((f: any) => normalizeItem(f))
      .filter((i: any): i is NonNullable<ReturnType<typeof normalizeItem>> => i !== null);
    const normalized = await Promise.all(rawNormalized.map(ensureItemMission));
    const itemDocs = normalized.map((i) => ({
      userId,
      ...i,
      emoji: "📄",
      projectId,
      collectionIds: [folderId],
      tags: [],
    }));

    await WorkspaceItem.deleteMany({ userId, projectId, collectionIds: folderId });
    if (itemDocs.length > 0) {
      await WorkspaceItem.insertMany(itemDocs);
    }
    await FolderRegenerationLog.create({
      userId,
      projectId,
      folderId,
      folderName: (folder as any).name,
      reason,
    });

    const items = await WorkspaceItem.find({ userId, projectId, collectionIds: folderId }).lean();
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Regenerate folder error:", error);
    return NextResponse.json({ error: "Failed to regenerate folder" }, { status: 500 });
  }
}
