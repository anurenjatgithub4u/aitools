// Server-side daily generation limits and duplicate-submit protection.
//
// The client also disables its Generate button, but that is a UX nicety — this
// is the enforcement. Counters live in MongoDB (already used across the app)
// so the limit holds across serverless instances, with an in-memory fallback
// so a database outage degrades to a weaker limit instead of taking the
// utility down.

import mongoose, { Schema, models, model } from "mongoose";
import connectDB from "@/lib/db";
import {
  MAX_ANONYMOUS_GENERATIONS_PER_DAY,
  MAX_AUTH_GENERATIONS_PER_DAY,
} from "./config";

export type UsageTier = "anonymous" | "authenticated";

interface UsageDoc {
  key: string;
  day: string;
  count: number;
  requestIds: string[];
  updatedAt: Date;
}

const PdfStudyUsageSchema = new Schema<UsageDoc>(
  {
    // `${tier}:${identifier}` — a uid for signed-in users, a hashed IP otherwise.
    key: { type: String, required: true },
    day: { type: String, required: true }, // YYYY-MM-DD in UTC
    count: { type: Number, default: 0 },
    // Idempotency keys already served today, so a double-submit doesn't buy a
    // second AI call. Capped to keep the document small.
    requestIds: { type: [String], default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "pdf_study_usage" }
);

PdfStudyUsageSchema.index({ key: 1, day: 1 }, { unique: true });
// Counters are only meaningful for the current day; expire them after two so
// the collection doesn't grow without bound.
PdfStudyUsageSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 48 });

const PdfStudyUsage =
  (models.PdfStudyUsage as mongoose.Model<UsageDoc>) ||
  model<UsageDoc>("PdfStudyUsage", PdfStudyUsageSchema);

// ---------------------------------------------------------------------------
// In-memory fallback (per instance — weaker, but better than no limit at all)
// ---------------------------------------------------------------------------

const memory = new Map<string, { day: string; count: number; requestIds: Set<string> }>();

function memoryConsume(key: string, day: string, cost: number, limit: number, requestId: string) {
  const existing = memory.get(key);
  const entry = existing && existing.day === day ? existing : { day, count: 0, requestIds: new Set<string>() };
  memory.set(key, entry);

  if (entry.requestIds.has(requestId)) {
    return { allowed: false, duplicate: true, used: entry.count, limit };
  }
  if (entry.count + cost > limit) {
    return { allowed: false, duplicate: false, used: entry.count, limit };
  }
  entry.count += cost;
  entry.requestIds.add(requestId);
  return { allowed: true, duplicate: false, used: entry.count, limit };
}

// ---------------------------------------------------------------------------

export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

// Hashed so raw IPs are never written to the database.
export function hashIdentifier(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function clientIdentifier(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
  return hashIdentifier(ip);
}

export function limitForTier(tier: UsageTier): number {
  return tier === "authenticated" ? MAX_AUTH_GENERATIONS_PER_DAY : MAX_ANONYMOUS_GENERATIONS_PER_DAY;
}

export interface ConsumeResult {
  allowed: boolean;
  duplicate: boolean;
  used: number;
  limit: number;
}

/**
 * Atomically reserves `cost` units against today's allowance.
 *
 * The reservation happens before the AI call, so a request that is in flight
 * still counts — otherwise parallel submissions could each see an old count
 * and slip past the cap together.
 */
export async function consumeGeneration(
  identity: { tier: UsageTier; id: string },
  requestId: string,
  cost: number
): Promise<ConsumeResult> {
  const day = utcDay();
  const key = `${identity.tier}:${identity.id}`;
  const limit = limitForTier(identity.tier);

  // A single request costing more than the whole daily allowance can never be
  // served; without this the upsert below would let a first-time caller through.
  if (cost > limit) return { allowed: false, duplicate: false, used: 0, limit };

  try {
    await connectDB();

    // One conditional update does the whole thing: it only matches when the
    // caller is under the cap and this requestId hasn't been served, so
    // concurrent requests can't both pass the check.
    const updated = await PdfStudyUsage.findOneAndUpdate(
      { key, day, count: { $lte: limit - cost }, requestIds: { $ne: requestId } },
      {
        $inc: { count: cost },
        $push: { requestIds: { $each: [requestId], $slice: -50 } },
        $set: { updatedAt: new Date() },
        // key/day are seeded from the filter's equality conditions on insert —
        // repeating them in $setOnInsert would conflict with that.
      },
      { new: true, upsert: true }
    ).lean();

    return { allowed: true, duplicate: false, used: updated?.count ?? cost, limit };
  } catch (e) {
    // A duplicate-key error means the conditional update didn't match an
    // existing document and the upsert then collided with it — i.e. the caller
    // is either over the cap or replaying a requestId. Read back to say which.
    const isDuplicateKey = (e as { code?: number })?.code === 11000;
    if (isDuplicateKey) {
      try {
        const existing = await PdfStudyUsage.findOne({ key, day }).lean();
        const used = existing?.count ?? 0;
        const duplicate = !!existing?.requestIds?.includes(requestId);
        return { allowed: false, duplicate, used, limit };
      } catch {
        // fall through to the in-memory path
      }
    } else {
      console.error("[pdf-study] usage tracking unavailable, falling back to in-memory limit:", e);
    }
    return memoryConsume(key, day, cost, limit, requestId);
  }
}

/** Returns units to the allowance when a generation fails before producing anything. */
export async function refundGeneration(
  identity: { tier: UsageTier; id: string },
  cost: number
): Promise<void> {
  const day = utcDay();
  const key = `${identity.tier}:${identity.id}`;
  try {
    await connectDB();
    await PdfStudyUsage.updateOne({ key, day, count: { $gte: cost } }, { $inc: { count: -cost } });
  } catch {
    const entry = memory.get(key);
    if (entry && entry.day === day) entry.count = Math.max(0, entry.count - cost);
  }
}
