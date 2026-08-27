import { NextRequest, NextResponse, after } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceItem, WORKSPACE_ITEM_TYPES } from "@/models/WorkspaceItem";
import { generateMission, toSteps } from "@/lib/workspace-generation";

function sanitizeStrings(value: unknown, max = 40): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max);
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const query: Record<string, unknown> = { userId };
    query.archived = sp.get("archived") === "true";

    const type = sp.get("type");
    if (type && WORKSPACE_ITEM_TYPES.includes(type as any)) query.type = type;

    const projectId = sp.get("projectId");
    if (projectId) query.projectId = projectId;

    const collectionId = sp.get("collectionId");
    if (collectionId) query.collectionIds = collectionId;

    if (sp.get("favorite") === "true") query.favorite = true;

    const tag = sp.get("tag");
    if (tag) query.tags = tag;

    const q = sp.get("q");
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: rx }, { description: rx }, { markdownContent: rx }, { tags: rx }];
    }

    const limit = Math.min(parseInt(sp.get("limit") || "200", 10) || 200, 500);
    const items = await WorkspaceItem.find(query).sort({ updatedAt: -1 }).limit(limit).lean();
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Workspace items GET error:", error);
    return NextResponse.json({ error: "Failed to load items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const type = typeof body.type === "string" ? body.type : "";
    if (!userId || !title) {
      return NextResponse.json({ error: "userId and title are required" }, { status: 400 });
    }
    if (!WORKSPACE_ITEM_TYPES.includes(type as any)) {
      return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
    }

    // Avoid duplicate titles like five "New Workflow" cards (MVP plan, Phase 5):
    // append a counter when the exact title already exists for this user.
    let finalTitle = title.slice(0, 200);
    const clash = await WorkspaceItem.countDocuments({ userId, title: finalTitle });
    if (clash > 0) {
      const similar = await WorkspaceItem.countDocuments({
        userId,
        title: new RegExp(`^${finalTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( \\d+)?$`),
      });
      finalTitle = `${finalTitle} ${similar + 1}`.slice(0, 200);
    }

    const typeData = body.typeData && typeof body.typeData === "object" ? body.typeData : {};
    const item = await WorkspaceItem.create({
      userId,
      title: finalTitle,
      description: typeof body.description === "string" ? body.description.slice(0, 2000) : "",
      emoji: typeof body.emoji === "string" && body.emoji ? body.emoji.slice(0, 8) : "📄",
      type,
      projectId: typeof body.projectId === "string" && body.projectId ? body.projectId : null,
      collectionIds: sanitizeStrings(body.collectionIds),
      tags: sanitizeStrings(body.tags),
      markdownContent: typeof body.markdownContent === "string" ? body.markdownContent : "",
      relatedItems: Array.isArray(body.relatedItems) ? body.relatedItems : [],
      typeData,
    });

    // Every file must be a mission (workspace-generation-spec.md), including
    // ones the user creates manually with no AI involved — backfill goal/
    // estimatedTime/difficulty/tasks in the background so creating a file
    // stays instant; the item picks up the checklist next time it's loaded.
    const existingSteps = (typeData as Record<string, unknown>).steps;
    if (!Array.isArray(existingSteps) || existingSteps.length === 0) {
      const itemId = String(item._id);
      after(async () => {
        try {
          const mission = await generateMission(finalTitle, item.markdownContent || "");
          if (mission.tasks.length === 0) return;
          await WorkspaceItem.updateOne(
            {
              _id: itemId,
              userId,
              $or: [{ "typeData.steps": { $exists: false } }, { "typeData.steps": { $size: 0 } }],
            },
            {
              $set: {
                "typeData.goal": mission.goal,
                "typeData.estimatedTime": mission.estimatedTime,
                "typeData.difficulty": mission.difficulty,
                "typeData.steps": toSteps(mission.tasks),
              },
            }
          );
        } catch {
          /* best-effort — the Generate Checklist button covers this file if it fails */
        }
      });
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("Workspace items POST error:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
