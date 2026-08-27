import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceCollection } from "@/models/WorkspaceCollection";
import { WorkspaceItem } from "@/models/WorkspaceItem";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const updates: Record<string, unknown> = {};
    for (const key of ["name", "description", "emoji", "color", "readme"] as const) {
      if (typeof body[key] === "string") updates[key] = body[key];
    }
    if (typeof body.favorite === "boolean") updates.favorite = body.favorite;
    if (typeof body.order === "number") updates.order = body.order;
    if ("parentId" in body) {
      updates.parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;
    }
    if ("milestoneId" in body) {
      updates.milestoneId = typeof body.milestoneId === "string" && body.milestoneId ? body.milestoneId : null;
    }
    if (Array.isArray(body.resources)) updates.resources = body.resources;

    const collection = await WorkspaceCollection.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    ).lean();
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
    return NextResponse.json({ collection });
  } catch (error: any) {
    console.error("Workspace collection PATCH error:", error);
    return NextResponse.json({ error: "Failed to update collection" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const collection = await WorkspaceCollection.findOne({ _id: id, userId }).lean();
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Cascade: gather every descendant folder (unlimited nesting) so deleting
    // a parent (e.g. "Month 1") also removes its subfolders (e.g. "Week 1-4").
    // Items inside are unlinked, not deleted — same non-destructive pattern as
    // deleting a project.
    const idsToDelete = [id];
    let frontier = [id];
    while (frontier.length > 0) {
      const children = await WorkspaceCollection.find({ userId, parentId: { $in: frontier } })
        .select("_id")
        .lean();
      const childIds = children.map((c: any) => String(c._id));
      if (childIds.length === 0) break;
      idsToDelete.push(...childIds);
      frontier = childIds;
    }

    await WorkspaceCollection.deleteMany({ _id: { $in: idsToDelete }, userId });
    await WorkspaceItem.updateMany(
      { userId },
      { $pull: { collectionIds: { $in: idsToDelete } } }
    );
    return NextResponse.json({ success: true, deletedFolderIds: idsToDelete });
  } catch (error: any) {
    console.error("Workspace collection DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 });
  }
}
