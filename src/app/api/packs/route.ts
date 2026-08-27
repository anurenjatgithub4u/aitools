import { NextResponse } from "next/server";
import { getAllPacks } from "@/lib/packs";

// Pack summaries for client surfaces (workspace home quick picker).
export async function GET() {
  const packs = getAllPacks().map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    benefit: p.benefit,
    roleTags: p.roleTags,
    toolTags: p.toolTags,
    stepCount: p.steps.length,
    lastVerifiedModel: p.lastVerifiedModel,
    lastVerifiedDate: p.lastVerifiedDate,
  }));
  return NextResponse.json({ packs });
}
