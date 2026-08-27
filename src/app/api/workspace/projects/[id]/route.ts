import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceProject } from "@/models/WorkspaceProject";
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
    for (const key of ["name", "description", "emoji", "color"] as const) {
      if (typeof body[key] === "string") updates[key] = body[key];
    }
    if (typeof body.favorite === "boolean") updates.favorite = body.favorite;
    if ("deadline" in body) {
      // Guard against `plan` being null (projects generated before the plan
      // field existed) — $set on a dot-path under a null field would error.
      const existing = await WorkspaceProject.findOne({ _id: id, userId }).select("plan").lean();
      const currentPlan = (existing as any)?.plan || {
        goal: "",
        estimatedDuration: "",
        expectedOutcome: "",
        deliverables: [],
        suggestedTimeline: "",
        milestones: [],
        deadline: null,
      };
      updates.plan = {
        ...currentPlan,
        deadline: typeof body.deadline === "string" && body.deadline ? body.deadline : null,
      };
    }

    const project = await WorkspaceProject.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    ).lean();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error: any) {
    console.error("Workspace project PATCH error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
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
    const project = await WorkspaceProject.findOneAndDelete({ _id: id, userId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    // Items keep existing but lose their project link
    await WorkspaceItem.updateMany({ userId, projectId: id }, { $set: { projectId: null } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Workspace project DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
