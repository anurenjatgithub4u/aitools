// GET  /api/products — the leaderboard listing (public, cached).
// POST /api/products — submit a product (auth required, auto-publishes).

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Product } from "@/models/Product";
import { slugify } from "@/lib/seo";
import { requireUser } from "@/lib/products/auth";
import { consume, refund } from "@/lib/products/rate-limit";
import {
  PRODUCTS_ENABLED,
  isValidCategory,
  MAX_NAME_CHARS,
  MAX_TAGLINE_CHARS,
  MIN_DESCRIPTION_CHARS,
  MAX_DESCRIPTION_CHARS,
} from "@/lib/products/config";

// verifyFirebaseIdToken needs Node's crypto.
export const runtime = "nodejs";

function featureDisabled() {
  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}

// Accept "example.com" or "https://example.com" and normalize to a full URL.
// Same helper the older submissions route uses.
function normalizeWebsite(raw: string): string | null {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Slugs must be unique, and two products called "Notion AI" are perfectly
 * plausible — so append a counter rather than rejecting the second one.
 */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "product";
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await Product.exists({ slug: candidate });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function GET(req: NextRequest) {
  if (!PRODUCTS_ENABLED) return featureDisabled();

  try {
    await connectDB();
    const category = req.nextUrl.searchParams.get("category") || "";

    const filter: Record<string, unknown> = { status: "live" };
    if (category && isValidCategory(category)) filter.category = category;

    const products = await Product.find(filter)
      .select("slug name tagline website category upvoteCount submitterName createdAt")
      .sort({ upvoteCount: -1, createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json(
      { ok: true, products },
      // Public and identical for everyone — the caller's own votes are fetched
      // separately from /api/products/votes so this stays cacheable.
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("[products] list failed:", e);
    return NextResponse.json({ ok: false, error: "Failed to load products." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!PRODUCTS_ENABLED) return featureDisabled();

  // Submissions auto-publish straight to a public page, so an anonymous
  // endpoint here would be an open spam relay. An account is the cost of entry.
  const uid = await requireUser(req);
  if (!uid) {
    return NextResponse.json(
      { ok: false, error: "Sign in to submit a product." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(body.name);
  const tagline = str(body.tagline);
  const description = str(body.description);
  const rawWebsite = str(body.website);
  const category = str(body.category);

  if (!name || !tagline || !description || !rawWebsite || !category) {
    return NextResponse.json(
      { ok: false, error: "Name, tagline, description, website and category are all required." },
      { status: 400 }
    );
  }
  if (name.length > MAX_NAME_CHARS) {
    return NextResponse.json(
      { ok: false, error: `Name must be under ${MAX_NAME_CHARS} characters.` },
      { status: 400 }
    );
  }
  if (tagline.length > MAX_TAGLINE_CHARS) {
    return NextResponse.json(
      { ok: false, error: `Tagline must be under ${MAX_TAGLINE_CHARS} characters.` },
      { status: 400 }
    );
  }
  if (description.length < MIN_DESCRIPTION_CHARS) {
    return NextResponse.json(
      { ok: false, error: `Description must be at least ${MIN_DESCRIPTION_CHARS} characters.` },
      { status: 400 }
    );
  }
  if (!isValidCategory(category)) {
    return NextResponse.json({ ok: false, error: "Pick a valid category." }, { status: 400 });
  }

  const website = normalizeWebsite(rawWebsite);
  if (!website) {
    return NextResponse.json({ ok: false, error: "Enter a valid website URL." }, { status: 400 });
  }

  // Metered before the write so a script can't burn through inserts and get
  // rejected only afterwards.
  const quota = await consume(uid, "submit");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `You've hit the limit of ${quota.limit} submissions per day. Try again tomorrow.`,
      },
      { status: 429 }
    );
  }

  try {
    await connectDB();

    const duplicate = await Product.findOne({ website }).select("slug").lean();
    if (duplicate) {
      // Not the submitter's fault in the fat-finger case — hand the unit back.
      await refund(uid, "submit");
      return NextResponse.json(
        { ok: false, error: "That product is already on the leaderboard.", slug: duplicate.slug },
        { status: 409 }
      );
    }

    const product = await Product.create({
      slug: await uniqueSlug(name),
      name: name.slice(0, MAX_NAME_CHARS),
      tagline: tagline.slice(0, MAX_TAGLINE_CHARS),
      description: description.slice(0, MAX_DESCRIPTION_CHARS),
      website,
      category,
      submittedByUid: uid,
      submitterName: str(body.submitterName).slice(0, 60),
      upvoteCount: 0,
      status: "live",
    });

    return NextResponse.json({ ok: true, slug: product.slug }, { status: 201 });
  } catch (e) {
    await refund(uid, "submit");
    // The unique index on website can still fire if two submissions race.
    if ((e as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { ok: false, error: "That product is already on the leaderboard." },
        { status: 409 }
      );
    }
    console.error("[products] create failed:", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong while submitting. Please try again." },
      { status: 500 }
    );
  }
}
