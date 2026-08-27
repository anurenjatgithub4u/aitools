import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceStackTool } from "@/models/WorkspaceStackTool";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const tools = await WorkspaceStackTool.find({ userId })
      .sort({ usageCount: -1, updatedAt: -1 })
      .lean();
    return NextResponse.json({ tools });
  } catch (error: any) {
    console.error("Workspace stack GET error:", error);
    return NextResponse.json({ error: "Failed to load AI stack" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!userId || !name) {
      return NextResponse.json({ error: "userId and name are required" }, { status: 400 });
    }
    const existing = await WorkspaceStackTool.findOne({
      userId,
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (existing) {
      return NextResponse.json({ error: "This tool is already in your stack." }, { status: 409 });
    }
    const tool = await WorkspaceStackTool.create({
      userId,
      name: name.slice(0, 60),
      emoji: typeof body.emoji === "string" && body.emoji ? body.emoji.slice(0, 8) : "🤖",
      color: typeof body.color === "string" ? body.color : "#8b5cf6",
    });
    return NextResponse.json({ tool });
  } catch (error: any) {
    console.error("Workspace stack POST error:", error);
    return NextResponse.json({ error: "Failed to add tool" }, { status: 500 });
  }
}
