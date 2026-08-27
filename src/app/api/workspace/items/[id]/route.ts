import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceItem, WORKSPACE_ITEM_TYPES, COMPLETION_STATUSES } from "@/models/WorkspaceItem";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const item = await WorkspaceItem.findOne({ _id: id, userId }).lean();
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("Workspace item GET error:", error);
    return NextResponse.json({ error: "Failed to load item" }, { status: 500 });
  }
}

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
    for (const key of ["title", "description", "emoji", "markdownContent"] as const) {
      if (typeof body[key] === "string") updates[key] = body[key];
    }
    if (typeof body.type === "string" && WORKSPACE_ITEM_TYPES.includes(body.type as any)) {
      updates.type = body.type;
    }
    if ("projectId" in body) {
      updates.projectId =
        typeof body.projectId === "string" && body.projectId ? body.projectId : null;
    }
    for (const key of ["collectionIds", "tags", "relatedItems"] as const) {
      if (Array.isArray(body[key])) updates[key] = body[key];
    }
    for (const key of ["favorite", "archived"] as const) {
      if (typeof body[key] === "boolean") updates[key] = body[key];
    }
    if (body.typeData && typeof body.typeData === "object") updates.typeData = body.typeData;
    if (COMPLETION_STATUSES.includes(body.completionStatus)) {
      updates.completionStatus = body.completionStatus;
      updates.completedAt = body.completionStatus === "completed" ? new Date() : null;
    }

    const item = await WorkspaceItem.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    ).lean();
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("Workspace item PATCH error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
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
    const item = await WorkspaceItem.findOneAndDelete({ _id: id, userId });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    // Remove dangling relationship references pointing at the deleted item
    await WorkspaceItem.updateMany({ userId }, { $pull: { relatedItems: { itemId: id } } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Workspace item DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
