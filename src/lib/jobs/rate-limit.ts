// Per-identity limits for job search and resume upload (spec §29).
//
// Mirrors the pattern used by the PDF and YouTube utilities: an atomic
// conditional update in Mongo, with an in-memory fallback so a database
// outage degrades to a weaker limit rather than removing the limit.

import mongoose, { Schema, models, model } from "mongoose";
import connectDB from "@/lib/db";
import {
  MAX_ANONYMOUS_RESUME_UPLOADS_PER_DAY,
  MAX_ANONYMOUS_SEARCHES_PER_DAY,
  MAX_AUTH_RESUME_UPLOADS_PER_DAY,
  MAX_AUTH_SEARCHES_PER_DAY,
} from "./config";

export type Tier = "anonymous" | "authenticated";
export type Meter = "search" | "resume";
export interface Identity { tier: Tier; id: string }

interface UsageDoc {
  key: string;
  day: string;
  searchCount: number;
  resumeCount: number;
  updatedAt: Date;
}

const JobsUsageSchema = new Schema<UsageDoc>(
  {
    key: { type: String, required: true },
    day: { type: String, required: true },
    searchCount: { type: Number, default: 0 },
    resumeCount: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "jobs_usage" }
);
JobsUsageSchema.index({ key: 1, day: 1 }, { unique: true });
JobsUsageSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 48 });

const JobsUsage =
  (models.JobsUsage as mongoose.Model<UsageDoc>) || model<UsageDoc>("JobsUsage", JobsUsageSchema);

/** Non-cryptographic, but keeps raw IPs out of the database. */
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

export function limitFor(tier: Tier, meter: Meter): number {
  if (meter === "search") {
    return tier === "authenticated" ? MAX_AUTH_SEARCHES_PER_DAY : MAX_ANONYMOUS_SEARCHES_PER_DAY;
  }
  return tier === "authenticated"
    ? MAX_AUTH_RESUME_UPLOADS_PER_DAY
    : MAX_ANONYMOUS_RESUME_UPLOADS_PER_DAY;
}

const memory = new Map<string, { day: string; search: number; resume: number }>();

export interface ConsumeResult { allowed: boolean; used: number; limit: number }

export async function consume(identity: Identity, meter: Meter): Promise<ConsumeResult> {
  const day = new Date().toISOString().slice(0, 10);
  const key = ownerKey(identity);
  const limit = limitFor(identity.tier, meter);
  const field = meter === "search" ? "searchCount" : "resumeCount";

  try {
    await connectDB();
    const updated = await JobsUsage.findOneAndUpdate(
      { key, day, [field]: { $lte: limit - 1 } },
      { $inc: { [field]: 1 }, $set: { updatedAt: new Date() } },
      { new: true, upsert: true }
    ).lean();
    return { allowed: true, used: (updated?.[field as keyof UsageDoc] as number) ?? 1, limit };
  } catch (e) {
    if ((e as { code?: number })?.code === 11000) {
      // The conditional update matched nothing and the upsert collided — the
      // caller is over the cap.
      return { allowed: false, used: limit, limit };
    }
    console.error("[jobs:rate-limit] falling back to in-memory limit:", e);
    const existing = memory.get(key);
    const entry = existing && existing.day === day ? existing : { day, search: 0, resume: 0 };
    memory.set(key, entry);
    if (entry[meter] + 1 > limit) return { allowed: false, used: entry[meter], limit };
    entry[meter] += 1;
    return { allowed: true, used: entry[meter], limit };
  }
}
