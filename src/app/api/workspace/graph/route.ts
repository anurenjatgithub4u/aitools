import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceItem } from "@/models/WorkspaceItem";
import { WorkspaceProject } from "@/models/WorkspaceProject";
import type { GraphData, GraphEdge, GraphNode } from "@/types/workspace";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const [projects, items] = await Promise.all([
      WorkspaceProject.find({ userId }).lean(),
      WorkspaceItem.find({ userId, archived: false })
        .select("title emoji type projectId relatedItems")
        .lean(),
    ]);

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const known = new Set<string>();

    for (const p of projects as any[]) {
      const id = String(p._id);
      nodes.push({ id, label: p.name, kind: "project", emoji: p.emoji || "📁" });
      known.add(id);
    }
    for (const item of items as any[]) {
      const id = String(item._id);
      nodes.push({ id, label: item.title, kind: item.type, emoji: item.emoji || "📄" });
      known.add(id);
    }
    for (const item of items as any[]) {
      const id = String(item._id);
      if (item.projectId && known.has(item.projectId)) {
        edges.push({ source: id, target: item.projectId, relation: "belongs_to" });
      }
      for (const rel of item.relatedItems || []) {
        if (rel?.itemId && known.has(rel.itemId)) {
          edges.push({ source: id, target: rel.itemId, relation: rel.relation || "related_to" });
        }
      }
    }

    const graph: GraphData = { nodes, edges };
    return NextResponse.json(graph);
  } catch (error: any) {
    console.error("Workspace graph GET error:", error);
    return NextResponse.json({ error: "Failed to build graph" }, { status: 500 });
  }
}
