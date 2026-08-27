import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Submission } from "@/models/Submission";

// Accept "example.com" or "https://example.com" and normalize to a full URL.
// Returns null if the result still isn't a parseable URL.
function normalizeWebsite(raw: string): string | null {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

function faviconFor(website: string): string {
  try {
    const { hostname } = new URL(website);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return "";
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const rawWebsite = typeof body.website === "string" ? body.website.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";

    if (!name || !description || !rawWebsite || !category) {
      return NextResponse.json(
        { error: "Name, description, website, and category are required." },
        { status: 400 }
      );
    }
    if (name.length > 100) {
      return NextResponse.json({ error: "Name must be under 100 characters." }, { status: 400 });
    }
    if (description.length < 20) {
      return NextResponse.json(
        { error: "Description must be at least 20 characters so reviewers have enough context." },
        { status: 400 }
      );
    }

    const website = normalizeWebsite(rawWebsite);
    if (!website) {
      return NextResponse.json({ error: "Please enter a valid website URL." }, { status: 400 });
    }

    // Prevent duplicate spam submissions of the same tool while a prior one is still pending.
    const existing = await Submission.findOne({ website, status: "pending" });
    if (existing) {
      return NextResponse.json(
        { error: "This tool has already been submitted and is awaiting review." },
        { status: 409 }
      );
    }

    const email = typeof body.submitterEmail === "string" ? body.submitterEmail.trim() : "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const newSubmission = await Submission.create({
      name: name.slice(0, 100),
      description: description.slice(0, 2000),
      website,
      logo: faviconFor(website),
      category: category.slice(0, 60),
      pricing: typeof body.pricing === "string" ? body.pricing : "Free Trial",
      free_plan: Boolean(body.free_plan),
      api: Boolean(body.api),
      mobile: Boolean(body.mobile),
      opensource: Boolean(body.opensource),
      best_for: typeof body.best_for === "string" ? body.best_for.trim().slice(0, 200) : "",
      difficulty: typeof body.difficulty === "string" ? body.difficulty : "Beginner",
      tags: toStringArray(body.tags),
      features: toStringArray(body.features),
      pros: toStringArray(body.pros),
      cons: toStringArray(body.cons),
      submitterName: typeof body.submitterName === "string" ? body.submitterName.trim().slice(0, 100) : "",
      submitterEmail: email,
      searchQuery: typeof body.searchQuery === "string" ? body.searchQuery.trim() : "",
      source: body.source === "web_search_suggestion" ? "web_search_suggestion" : "manual_form",
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      message: "Thanks! Your tool has been submitted for review.",
      submissionId: newSubmission._id,
    });
  } catch (error: any) {
    console.error("API error creating submission:", error);
    return NextResponse.json(
      { error: "Something went wrong while submitting. Please try again." },
      { status: 500 }
    );
  }
}
