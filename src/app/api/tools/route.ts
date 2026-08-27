import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Tool } from "@/models/Tool";

// In-memory cache: survives across requests on a warm server/lambda so most
// page loads skip the DB round trip entirely.
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
let cache: { data: unknown; ts: number } | null = null;

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json(cache.data, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }

    await connectDB();
    // lean() returns plain objects (faster, no hydration); exclude the large
    // embedding vectors that lean() would otherwise leak into the payload.
    const tools = await Tool.find({})
      .select("-embedding")
      .sort({ trendingScore: -1 })
      .lean();

    cache = { data: tools, ts: Date.now() };

    return NextResponse.json(tools, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error: any) {
    console.error("API error fetching tools:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tools from database" },
      { status: 500 }
    );
  }
}
