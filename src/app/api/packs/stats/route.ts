import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { PackStats } from "@/models/PackStats";

// GET /api/packs/stats?slugs=a,b,c → { stats: { a: {runCount, forkCount}, ... } }
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const slugsParam = req.nextUrl.searchParams.get("slugs") || "";
    const slugs = slugsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
    const query = slugs.length > 0 ? { slug: { $in: slugs } } : {};
    const rows = await PackStats.find(query).lean();
    const stats: Record<string, { runCount: number; forkCount: number }> = {};
    for (const r of rows as any[]) {
      stats[r.slug] = { runCount: r.runCount || 0, forkCount: r.forkCount || 0 };
    }
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Pack stats GET error:", error);
    return NextResponse.json({ stats: {} });
  }
}

// POST { slug, action: "run" | "fork" } → increments the counter
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const slug = typeof body.slug === "string" ? body.slug.slice(0, 200) : "";
    const action = body.action === "fork" ? "fork" : "run";
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }
    const inc = action === "fork" ? { forkCount: 1 } : { runCount: 1 };
    const row = await PackStats.findOneAndUpdate(
      { slug },
      { $inc: inc },
      { new: true, upsert: true }
    ).lean();
    return NextResponse.json({
      stats: { runCount: (row as any).runCount, forkCount: (row as any).forkCount },
    });
  } catch (error) {
    console.error("Pack stats POST error:", error);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }
}
