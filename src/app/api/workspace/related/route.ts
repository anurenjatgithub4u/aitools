import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceItem } from "@/models/WorkspaceItem";
import { Tool } from "@/models/Tool";

// Related content for an item: similar workspace items (shared tags/type)
// and directory tools that match its tags or are mentioned in its content.
// This is what turns saved notes into a connected AI workspace (MVP plan, Phase 3).

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId");
    const itemId = sp.get("itemId");
    if (!userId || !itemId) {
      return NextResponse.json({ error: "userId and itemId are required" }, { status: 400 });
    }

    const item: any = await WorkspaceItem.findOne({ _id: itemId, userId }).lean();
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const tags: string[] = item.tags || [];
    const alreadyRelated = new Set((item.relatedItems || []).map((r: any) => r.itemId));

    // Similar items: shared tags first, then same type as fallback
    const candidates: any[] = await WorkspaceItem.find({
      userId,
      archived: false,
      _id: { $ne: item._id },
      ...(tags.length > 0 ? { $or: [{ tags: { $in: tags } }, { type: item.type }] } : { type: item.type }),
    })
      .select("title emoji type tags")
      .limit(40)
      .lean();

    const scored = candidates
      .filter((c) => !alreadyRelated.has(String(c._id)))
      .map((c) => {
        const overlap = (c.tags || []).filter((t: string) => tags.includes(t)).length;
        return { c, score: overlap * 2 + (c.type === item.type ? 1 : 0) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ c }) => ({
        id: String(c._id),
        title: c.title,
        emoji: c.emoji || "📄",
        type: c.type,
      }));

    // Related directory tools: tag match, or tool name mentioned in title/content
    const text = `${item.title} ${item.markdownContent || ""}`.toLowerCase().slice(0, 20000);
    const toolCandidates: any[] = await Tool.find(
      tags.length > 0 ? { tags: { $in: tags.map((t) => new RegExp(`^${t}$`, "i")) } } : {}
    )
      .select("id name category rating")
      .limit(30)
      .lean();

    let tools = toolCandidates;
    if (tools.length < 4) {
      const all: any[] = await Tool.find({}).select("id name category rating").limit(400).lean();
      const mentioned = all.filter(
        (t) => t.name.length > 2 && text.includes(t.name.toLowerCase())
      );
      const seen = new Set(tools.map((t) => t.id));
      for (const m of mentioned) {
        if (!seen.has(m.id)) {
          tools.push(m);
          seen.add(m.id);
        }
      }
    }
    tools = tools
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4)
      .map((t) => ({ id: t.id, name: t.name, category: t.category }));

    return NextResponse.json({ items: scored, tools });
  } catch (error: any) {
    console.error("Workspace related error:", error);
    return NextResponse.json({ error: "Failed to load suggestions" }, { status: 500 });
  }
}
