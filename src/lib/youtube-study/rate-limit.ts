// Server-side quotas and abuse protection (spec §27, §28, §32).
//
// Two separate meters, because the two operations have very different costs:
//
//   "video"  — full analysis: transcript fetch, chunking, N extraction calls,
//              a merge call. This is what we actually need to ration.
//   "output" — one call against an already-cached knowledge representation.
//              Cheap, so a much higher allowance is reasonable.
//
// A user switching from Notes to Study Guide on a video they already analysed
// should not burn a video credit — that would punish exactly the behaviour the
// caching architecture exists to make cheap (spec §18).
//
// Identity helpers are shared with the PDF utility so both features hash IPs
// the same way and neither writes a raw address to the database.

import mongoose, { Schema, models, model } from "mongoose";
import connectDB from "@/lib/db";
import {
  MAX_ANONYMOUS_OUTPUTS_PER_DAY,
  MAX_ANONYMOUS_VIDEOS_PER_DAY,
  MAX_AUTH_OUTPUTS_PER_DAY,
  MAX_AUTH_VIDEOS_PER_DAY,
  MAX_CONCURRENT_JOBS,
  JOB_STALE_MS,
} from "./config";

export type UsageTier = "anonymous" | "authenticated";
export type MeterKind = "video" | "output";

export interface Identity {
  tier: UsageTier;
  id: string;
}

interface UsageDoc {
  key: string;
  day: string;
  videoCount: number;
  outputCount: number;
  requestIds: string[];
  updatedAt: Date;
}

const YoutubeUsageSchema = new Schema<UsageDoc>(
  {
    key: { type: String, required: true },
    day: { type: String, required: true },
    videoCount: { type: Number, default: 0 },
    outputCount: { type: Number, default: 0 },
    // Idempotency keys already served today, so a double-submit doesn't buy a
    // second pipeline run. Capped so the document stays small.
    requestIds: { type: [String], default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "youtube_study_usage" }
);

YoutubeUsageSchema.index({ key: 1, day: 1 }, { unique: true });
YoutubeUsageSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 48 });

const YoutubeUsage =
  (models.YoutubeStudyUsage as mongoose.Model<UsageDoc>) ||
  model<UsageDoc>("YoutubeStudyUsage", YoutubeUsageSchema);

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Non-cryptographic, but enough that a raw IP never lands in the database. */
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

export function ownerKey(identity: Identity): string {
  return `${identity.tier}:${identity.id}`;
}

export function limitFor(tier: UsageTier, meter: MeterKind): number {
  if (meter === "video") {
    return tier === "authenticated" ? MAX_AUTH_VIDEOS_PER_DAY : MAX_ANONYMOUS_VIDEOS_PER_DAY;
  }
  return tier === "authenticated" ? MAX_AUTH_OUTPUTS_PER_DAY : MAX_ANONYMOUS_OUTPUTS_PER_DAY;
}

// ---------------------------------------------------------------------------
// In-memory fallback — weaker (per instance) but better than no limit at all
// ---------------------------------------------------------------------------

const memory = new Map<string, { day: string; video: number; output: number; requestIds: Set<string> }>();

function memoryConsume(
  key: string,
  day: string,
  meter: MeterKind,
  limit: number,
  requestId: string
): ConsumeResult {
  const existing = memory.get(key);
  const entry =
    existing && existing.day === day
      ? existing
      : { day, video: 0, output: 0, requestIds: new Set<string>() };
  memory.set(key, entry);

  if (entry.requestIds.has(requestId)) {
    return { allowed: false, duplicate: true, used: entry[meter], limit };
  }
  if (entry[meter] + 1 > limit) {
    return { allowed: false, duplicate: false, used: entry[meter], limit };
  }
  entry[meter] += 1;
  entry.requestIds.add(requestId);
  return { allowed: true, duplicate: false, used: entry[meter], limit };
}

// ---------------------------------------------------------------------------

export interface ConsumeResult {
  allowed: boolean;
  duplicate: boolean;
  used: number;
  limit: number;
}

/**
 * Atomically reserves one unit against today's allowance for the given meter.
 *
 * The reservation happens BEFORE the expensive work, so a request still in
 * flight already counts — otherwise two parallel submissions could each read a
 * stale count and slip past the cap together.
 */
export async function consume(
  identity: Identity,
  meter: MeterKind,
  requestId: string
): Promise<ConsumeResult> {
  const day = utcDay();
  const key = ownerKey(identity);
  const limit = limitFor(identity.tier, meter);
  const field = meter === "video" ? "videoCount" : "outputCount";

  try {
    await connectDB();
    const updated = await YoutubeUsage.findOneAndUpdate(
      { key, day, [field]: { $lte: limit - 1 }, requestIds: { $ne: requestId } },
      {
        $inc: { [field]: 1 },
        $push: { requestIds: { $each: [requestId], $slice: -80 } },
        $set: { updatedAt: new Date() },
      },
      { new: true, upsert: true }
    ).lean();

    return {
      allowed: true,
      duplicate: false,
      used: (updated?.[field as keyof UsageDoc] as number) ?? 1,
      limit,
    };
  } catch (e) {
    // A duplicate-key error means the conditional update matched nothing and
    // the upsert then collided — the caller is either over the cap or
    // replaying a requestId. Read back to say which.
    if ((e as { code?: number })?.code === 11000) {
      try {
        const existing = await YoutubeUsage.findOne({ key, day }).lean();
        return {
          allowed: false,
          duplicate: !!existing?.requestIds?.includes(requestId),
          used: (existing?.[field as keyof UsageDoc] as number) ?? 0,
          limit,
        };
      } catch {
        /* fall through to memory */
      }
    } else {
      console.error("[youtube-study] usage tracking unavailable, using in-memory limit:", e);
    }
    return memoryConsume(key, day, meter, limit, requestId);
  }
}

/** Returns a unit when work fails before producing anything. */
export async function refund(identity: Identity, meter: MeterKind): Promise<void> {
  const day = utcDay();
  const key = ownerKey(identity);
  const field = meter === "video" ? "videoCount" : "outputCount";
  try {
    await connectDB();
    await YoutubeUsage.updateOne({ key, day, [field]: { $gte: 1 } }, { $inc: { [field]: -1 } });
  } catch {
    const entry = memory.get(key);
    if (entry && entry.day === day) entry[meter] = Math.max(0, entry[meter] - 1);
  }
}

/**
 * Caps simultaneous in-flight jobs per identity (spec §28).
 *
 * Jobs that stalled past JOB_STALE_MS are excluded: a serverless function can
 * be killed mid-run, and without this a few dead jobs would permanently lock
 * a user out of the feature.
 */
export async function hasJobCapacity(identity: Identity): Promise<boolean> {
  try {
    await connectDB();
    const { YoutubeJob } = await import("@/models/YoutubeJob");
    const active = await YoutubeJob.countDocuments({
      ownerKey: ownerKey(identity),
      status: { $nin: ["COMPLETED", "FAILED"] },
      updatedAt: { $gt: new Date(Date.now() - JOB_STALE_MS) },
    });
    return active < MAX_CONCURRENT_JOBS;
  } catch (e) {
    // Don't lock users out because the database hiccuped.
    console.error("[youtube-study] job capacity check failed, allowing:", e);
    return true;
  }
}
