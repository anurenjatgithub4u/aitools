// POST   /api/products/:slug/vote — upvote
// DELETE /api/products/:slug/vote — remove your upvote
//
// The ProductVote collection is the source of truth; Product.upvoteCount is a
// denormalized tally kept in step with it. The counter is only ever moved when
// the vote row actually changed, so a double-click, a replayed request or a
// retry can't inflate the number.

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductVote } from "@/models/ProductVote";
import { requireUser } from "@/lib/products/auth";
import { consume } from "@/lib/products/rate-limit";
import { PRODUCTS_ENABLED } from "@/lib/products/config";

export const runtime = "nodejs";

function featureDisabled() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}

function unauthenticated() {
  return NextResponse.json({ ok: false, error: "Sign in to upvote." }, { status: 401 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!PRODUCTS_ENABLED) return featureDisabled();

  const uid = await requireUser(req);
  if (!uid) return unauthenticated();

  const { slug } = await params;

  try {
    await connectDB();
    const product = await Product.findOne({ slug, status: "live" }).select("_id").lean();
    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
    }

    const productId = String(product._id);

    // Upsert rather than insert: the unique index would throw on a second vote,
    // and a double-click shouldn't surface as an error.
    const result = await ProductVote.updateOne(
      { userId: uid, productId },
      { $setOnInsert: { userId: uid, productId } },
      { upsert: true }
    );

    // upsertedCount is 1 only when this call actually created the vote. On a
    // repeat click it's 0, and the counter is left alone.
    const isNewVote = result.upsertedCount === 1;

    if (isNewVote) {
      // Only meter real votes — re-clicking your own vote shouldn't cost quota.
      const quota = await consume(uid, "vote");
      if (!quota.allowed) {
        await ProductVote.deleteOne({ userId: uid, productId });
        return NextResponse.json(
          { ok: false, error: `Daily vote limit of ${quota.limit} reached.` },
          { status: 429 }
        );
      }
      await Product.updateOne({ _id: productId }, { $inc: { upvoteCount: 1 } });
    }

    const fresh = await Product.findById(productId).select("upvoteCount").lean();
    return NextResponse.json({ ok: true, voted: true, upvoteCount: fresh?.upvoteCount ?? 0 });
  } catch (e) {
    console.error("[products] vote failed:", e);
    return NextResponse.json({ ok: false, error: "Could not record your vote." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!PRODUCTS_ENABLED) return featureDisabled();

  const uid = await requireUser(req);
  if (!uid) return unauthenticated();

  const { slug } = await params;

  try {
    await connectDB();
    const product = await Product.findOne({ slug, status: "live" }).select("_id").lean();
    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
    }

    const productId = String(product._id);
    const result = await ProductVote.deleteOne({ userId: uid, productId });

    // Same guard in reverse: only decrement when a vote was really removed, and
    // never below zero.
    if (result.deletedCount === 1) {
      await Product.updateOne({ _id: productId, upvoteCount: { $gte: 1 } }, { $inc: { upvoteCount: -1 } });
    }

    const fresh = await Product.findById(productId).select("upvoteCount").lean();
    return NextResponse.json({ ok: true, voted: false, upvoteCount: fresh?.upvoteCount ?? 0 });
  } catch (e) {
    console.error("[products] unvote failed:", e);
    return NextResponse.json({ ok: false, error: "Could not remove your vote." }, { status: 500 });
  }
}
