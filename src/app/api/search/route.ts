import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const EMBED_MODEL = "gemini-embedding-001";
const RERANK_MODEL = "gemini-2.5-flash";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const TOP_K = 40;       // vector candidates
const RERANK_K = 24;    // candidates sent to the LLM
const MAX_RESULTS = 24;

// Fields returned to the client (everything the card needs, minus the vector).
const PROJECTION = { embedding: 0 } as const;

function norm(q: string) {
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const cleaned = norm(q);
  if (!cleaned) return NextResponse.json({ results: [], mode: "empty" });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ fallback: true, reason: "no_api_key" });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const tools = db.collection("tools");
    const cache = db.collection("searchcache");

    // 1) Cache hit → return ordered tools straight away.
    const cached = await cache.findOne({ q: cleaned });
    if (cached && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS) {
      const docs = await tools.find({ id: { $in: cached.ids } }, { projection: PROJECTION }).toArray();
      const byId = new Map(docs.map((d) => [d.id, d]));
      const ordered = (cached.ids as string[]).map((id) => byId.get(id)).filter(Boolean);
      return NextResponse.json({ results: ordered, mode: "cache" });
    }

    const genAI = new GoogleGenerativeAI(key);

    // 2) Embed the query.
    let queryVec: number[];
    try {
      const embRes = await genAI.getGenerativeModel({ model: EMBED_MODEL }).embedContent(cleaned);
      queryVec = embRes.embedding.values;
    } catch {
      return NextResponse.json({ fallback: true, reason: "embed_failed" });
    }

    // 3) Vector recall (in-app cosine over all embedded tools).
    const all = await tools
      .find({ embedding: { $exists: true } }, { projection: { embedding: 1, id: 1, name: 1, best_for: 1, category: 1, primaryCategory: 1, toolType: 1, rating: 1, trendingScore: 1, description: 1 } })
      .toArray();

    if (all.length === 0) return NextResponse.json({ fallback: true, reason: "no_embeddings" });

    const candidates = all
      .map((t) => ({ t, score: cosine(queryVec, t.embedding as number[]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    // 4) LLM rerank of the top candidates. Falls back to vector order on failure.
    let orderedIds: string[];
    try {
      const rerankModel = genAI.getGenerativeModel({
        model: RERANK_MODEL,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          temperature: 0,
        },
      });
      const shortlist = candidates.slice(0, RERANK_K).map(({ t }) => ({
        id: t.id,
        name: t.name,
        category: t.primaryCategory || t.category,
        type: t.toolType,
        best_for: t.best_for,
        rating: t.rating,
      }));
      const prompt = `You rank AI tools for a directory search. Return ONLY the ids of tools that genuinely help with the user's query, ordered most to least relevant. Include general-purpose assistants (e.g. ChatGPT, Claude, Gemini, Perplexity) when they would genuinely help with the task. Drop tools that are not relevant. Among similarly relevant tools, prefer well-known and higher-rated ones. Return between 3 and ${MAX_RESULTS} ids.\n\nUser query: "${cleaned}"\n\nCandidate tools (JSON):\n${JSON.stringify(shortlist)}`;

      const res = await rerankModel.generateContent(prompt);
      const parsed = JSON.parse(res.response.text());
      const valid = new Set(candidates.map(({ t }) => t.id));
      orderedIds = (Array.isArray(parsed) ? parsed : []).filter((id: string) => valid.has(id));
      if (orderedIds.length === 0) throw new Error("empty rerank");
    } catch {
      // Vector-only fallback (still semantic, just no LLM reasoning).
      orderedIds = candidates.slice(0, MAX_RESULTS).map(({ t }) => t.id);
    }

    orderedIds = orderedIds.slice(0, MAX_RESULTS);

    // 5) Cache + return full tool docs in ranked order.
    await cache.updateOne(
      { q: cleaned },
      { $set: { q: cleaned, ids: orderedIds, updatedAt: new Date() } },
      { upsert: true }
    );

    const docs = await tools.find({ id: { $in: orderedIds } }, { projection: PROJECTION }).toArray();
    const byId = new Map(docs.map((d) => [d.id, d]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);

    return NextResponse.json({ results: ordered, mode: "hybrid" });
  } catch (e: any) {
    console.error("/api/search error:", e?.message || e);
    return NextResponse.json({ fallback: true, reason: "error" });
  }
}
