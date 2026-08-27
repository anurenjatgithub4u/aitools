import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceItem } from "@/models/WorkspaceItem";
import { WorkspaceProject } from "@/models/WorkspaceProject";
import { WorkspaceCollection } from "@/models/WorkspaceCollection";
import type { WorkspaceInsights } from "@/types/workspace";

// Aggregated stats powering the dashboard + Insights page (FEATURE_REDESIGN_2.0.md)

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const [items, projectCount, resourceCount] = await Promise.all([
      WorkspaceItem.find({ userId, archived: false })
        .select("title emoji type tags typeData projectId relatedItems createdAt updatedAt")
        .lean(),
      WorkspaceProject.countDocuments({ userId }),
      WorkspaceCollection.countDocuments({ userId }),
    ]);

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const byType = (t: string) => (items as any[]).filter((i) => i.type === t);
    const playbooks = byType("playbook");
    const prompts = byType("prompt");
    const workflows = byType("workflow");
    const memory = byType("knowledge");

    const solved = playbooks.filter((p) => p.typeData?.solved);
    const weeklyCreated = (items as any[]).filter(
      (i) => new Date(i.createdAt).getTime() > weekAgo
    ).length;
    const weeklyUpdated = (items as any[]).filter(
      (i) => new Date(i.updatedAt).getTime() > weekAgo
    ).length;
    const weeklySolved = solved.filter(
      (p) => new Date(p.updatedAt).getTime() > weekAgo
    ).length;

    // Rough heuristic: every reusable asset saves time each time it exists to be reused.
    const hoursSaved =
      Math.round((playbooks.length * 2 + workflows.length * 1.5 + prompts.length * 0.5) * 10) / 10;

    const tagCounts = new Map<string, number>();
    for (const item of items as any[]) {
      for (const tag of item.tags || []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const edgeCount = (items as any[]).reduce(
      (acc, i) => acc + (i.projectId ? 1 : 0) + (i.relatedItems?.length || 0),
      0
    );

    const insights: WorkspaceInsights = {
      counts: {
        playbooks: playbooks.length,
        prompts: prompts.length,
        workflows: workflows.length,
        memory: memory.length,
        projects: projectCount,
        resources: resourceCount,
        total: items.length,
      },
      hoursSaved,
      weeklyCreated,
      weeklyUpdated,
      weeklySolved,
      solvedProblems: solved
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6)
        .map((p) => ({
          id: String(p._id),
          title: p.title,
          emoji: p.emoji || "📘",
          updatedAt: p.updatedAt,
        })),
      topTags,
      graphSize: items.length + projectCount + edgeCount,
    };

    return NextResponse.json(insights);
  } catch (error: any) {
    console.error("Workspace insights GET error:", error);
    return NextResponse.json({ error: "Failed to load insights" }, { status: 500 });
  }
}
