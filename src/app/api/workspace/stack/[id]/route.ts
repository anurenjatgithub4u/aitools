import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceStackTool } from "@/models/WorkspaceStackTool";

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
    for (const key of ["name", "emoji", "color"] as const) {
      if (typeof body[key] === "string") updates[key] = body[key];
    }
    const inc = body.incrementUsage === true ? { $inc: { usageCount: 1 } } : {};
    const tool = await WorkspaceStackTool.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates, ...inc },
      { new: true }
    ).lean();
    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    return NextResponse.json({ tool });
  } catch (error: any) {
    console.error("Workspace stack PATCH error:", error);
    return NextResponse.json({ error: "Failed to update tool" }, { status: 500 });
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
    const tool = await WorkspaceStackTool.findOneAndDelete({ _id: id, userId });
    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Workspace stack DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove tool" }, { status: 500 });
  }
}
