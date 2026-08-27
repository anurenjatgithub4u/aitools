import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { WorkspaceCollection } from "@/models/WorkspaceCollection";
import { WorkspaceItem } from "@/models/WorkspaceItem";

type Params = { params: Promise<{ id: string }> };

// Duplicates a folder, every descendant subfolder (unlimited nesting, same
// BFS as the cascade delete), and every item filed directly under any of
// them — a real Finder/Notion-style "Duplicate", not just an empty shell.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const source = await WorkspaceCollection.findOne({ _id: id, userId }).lean();
    if (!source) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const toDuplicate: any[] = [source];
    let frontier = [id];
    while (frontier.length > 0) {
      const children = await WorkspaceCollection.find({ userId, parentId: { $in: frontier } }).lean();
      if (children.length === 0) break;
      toDuplicate.push(...children);
      frontier = children.map((c: any) => String(c._id));
    }
    const oldIds = toDuplicate.map((f: any) => String(f._id));

    const items = await WorkspaceItem.find({
      userId,
      collectionIds: { $in: oldIds },
    }).lean();

    // Pre-generate new ids so cross-references (parentId, collectionIds) can
    // be remapped in one pass regardless of insertion order.
    const idMap = new Map<string, any>();
    for (const f of toDuplicate) idMap.set(String(f._id), new mongoose.Types.ObjectId());

    const newFolders = toDuplicate.map((f: any) => ({
      _id: idMap.get(String(f._id)),
      userId,
      name: String(f._id) === id ? `${f.name} (Copy)` : f.name,
      description: f.description,
      emoji: f.emoji,
      color: f.color,
      favorite: false,
      projectId: f.projectId,
      kind: f.kind,
      order: String(f._id) === id ? f.order + 1 : f.order,
      parentId: f.parentId ? idMap.get(String(f.parentId)) || f.parentId : null,
      readme: f.readme,
      milestoneId: f.milestoneId,
      resources: f.resources || [],
    }));
    const createdFolders = await WorkspaceCollection.insertMany(newFolders);

    if (items.length > 0) {
      const newItems = items.map((it: any) => ({
        userId: it.userId,
        title: it.title,
        description: it.description,
        emoji: it.emoji,
        type: it.type,
        projectId: it.projectId,
        collectionIds: (it.collectionIds || []).map((cid: string) => idMap.get(cid)?.toString() || cid),
        tags: it.tags,
        markdownContent: it.markdownContent,
        favorite: false,
        archived: it.archived,
        typeData: it.typeData,
        generationState: it.generationState,
        completionStatus: "not_started",
        completedAt: null,
        relatedItems: [],
      }));
      await WorkspaceItem.insertMany(newItems);
    }

    const newRoot = createdFolders.find((f: any) => String(f._id) === String(idMap.get(id)));
    return NextResponse.json({
      collection: newRoot,
      duplicatedFolders: createdFolders.length,
      duplicatedItems: items.length,
    });
  } catch (error: any) {
    console.error("Workspace collection duplicate error:", error);
    return NextResponse.json({ error: "Failed to duplicate collection" }, { status: 500 });
  }
}
