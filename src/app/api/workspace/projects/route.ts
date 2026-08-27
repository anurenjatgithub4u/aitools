import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceProject } from "@/models/WorkspaceProject";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const projects = await WorkspaceProject.find({ userId }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error("Workspace projects GET error:", error);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
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
    const project = await WorkspaceProject.create({
      userId,
      name: name.slice(0, 100),
      description: typeof body.description === "string" ? body.description.slice(0, 1000) : "",
      emoji: typeof body.emoji === "string" && body.emoji ? body.emoji.slice(0, 8) : "📁",
      color: typeof body.color === "string" ? body.color : "#8b5cf6",
    });
    return NextResponse.json({ project });
  } catch (error: any) {
    console.error("Workspace projects POST error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
