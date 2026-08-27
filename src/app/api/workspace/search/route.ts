import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceItem } from "@/models/WorkspaceItem";
import { WorkspaceProject } from "@/models/WorkspaceProject";
import { WorkspaceCollection } from "@/models/WorkspaceCollection";
import { Tool } from "@/models/Tool";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId");
    const q = (sp.get("q") || "").trim();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [items, projects, collections, tools] = await Promise.all([
      WorkspaceItem.find({
        userId,
        archived: false,
        $or: [{ title: rx }, { description: rx }, { markdownContent: rx }, { tags: rx }],
      })
        .select("title emoji type")
        .limit(20)
        .lean(),
      WorkspaceProject.find({ userId, $or: [{ name: rx }, { description: rx }] })
        .select("name emoji")
        .limit(5)
        .lean(),
      WorkspaceCollection.find({ userId, $or: [{ name: rx }, { description: rx }] })
        .select("name emoji")
        .limit(5)
        .lean(),
      Tool.find({ $or: [{ name: rx }, { category: rx }] })
        .select("id name")
        .limit(5)
        .lean(),
    ]);

    const results = [
      ...(projects as any[]).map((p) => ({
        id: String(p._id),
        title: p.name,
        emoji: p.emoji || "📁",
        kind: "project",
        href: `/workspace/projects/${p._id}`,
      })),
      ...(collections as any[]).map((c) => ({
        id: String(c._id),
        title: c.name,
        emoji: c.emoji || "🗂️",
        kind: "collection",
        href: `/workspace/collections/${c._id}`,
      })),
      ...(items as any[]).map((i) => ({
        id: String(i._id),
        title: i.title,
        emoji: i.emoji || "📄",
        kind: i.type,
        href: `/workspace/items/${i._id}`,
      })),
      ...(tools as any[]).map((t) => ({
        id: t.id,
        title: t.name,
        emoji: "🌐",
        kind: "tool",
        href: `/tool/${t.id}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Workspace search GET error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
