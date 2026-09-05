// GET /api/products/votes — which products the caller has already upvoted.
//
// Deliberately separate from GET /api/products: that response is identical for
// everyone and cached at the edge, so per-user state can't live in it. This one
// is small, private, and never cached.

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductVote } from "@/models/ProductVote";
import { requireUser } from "@/lib/products/auth";
import { PRODUCTS_ENABLED } from "@/lib/products/config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!PRODUCTS_ENABLED) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const uid = await requireUser(req);
  // Not an error — a signed-out visitor simply has no votes yet.
  if (!uid) return NextResponse.json({ ok: true, slugs: [] });

  try {
    await connectDB();
    const votes = await ProductVote.find({ userId: uid }).select("productId").lean();
    if (votes.length === 0) return NextResponse.json({ ok: true, slugs: [] });

    // The UI keys off slugs, the votes store _ids — translate here so the
    // client never has to know about database ids.
    const products = await Product.find({ _id: { $in: votes.map((v) => v.productId) } })
      .select("slug")
      .lean();

    return NextResponse.json(
      { ok: true, slugs: products.map((p) => p.slug) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    console.error("[products] votes lookup failed:", e);
    return NextResponse.json({ ok: false, error: "Failed to load votes." }, { status: 500 });
  }
}
