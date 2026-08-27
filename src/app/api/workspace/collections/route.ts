import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceCollection, COLLECTION_KINDS } from "@/models/WorkspaceCollection";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const query: Record<string, unknown> = { userId };
    const projectId = sp.get("projectId");
    if (projectId) query.projectId = projectId;

    const collections = await WorkspaceCollection.find(query)
      .sort({ order: 1, updatedAt: -1 })
      .lean();
    return NextResponse.json({ collections });
  } catch (error: any) {
    console.error("Workspace collections GET error:", error);
    return NextResponse.json({ error: "Failed to load collections" }, { status: 500 });
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
    const collection = await WorkspaceCollection.create({
      userId,
      name: name.slice(0, 100),
      description: typeof body.description === "string" ? body.description.slice(0, 1000) : "",
      emoji: typeof body.emoji === "string" && body.emoji ? body.emoji.slice(0, 8) : "🗂️",
      color: typeof body.color === "string" ? body.color : "#6366f1",
      projectId: typeof body.projectId === "string" && body.projectId ? body.projectId : null,
      kind: COLLECTION_KINDS.includes(body.kind) ? body.kind : null,
      order: typeof body.order === "number" ? body.order : 0,
      parentId: typeof body.parentId === "string" && body.parentId ? body.parentId : null,
      readme: typeof body.readme === "string" ? body.readme.slice(0, 5000) : "",
      milestoneId: typeof body.milestoneId === "string" && body.milestoneId ? body.milestoneId : null,
    });
    return NextResponse.json({ collection });
  } catch (error: any) {
    console.error("Workspace collections POST error:", error);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}
