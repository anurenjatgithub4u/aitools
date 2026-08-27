// Per-identity daily cap for PDF Utility operations (compress/split/merge
// combined — one meter, since they're equally cheap CPU operations, unlike
// pdf-study's AI calls which cost real money per generation).
//
// Mirrors the pattern used by src/lib/jobs/rate-limit.ts and
// src/lib/pdf-study/rate-limit.ts: an atomic conditional update in Mongo,
// with an in-memory fallback so a database outage degrades to a weaker
// per-instance limit rather than removing the limit entirely.

import mongoose, { Schema, models, model } from "mongoose";
import connectDB from "@/lib/db";
import { MAX_ANONYMOUS_OPERATIONS_PER_DAY, MAX_AUTH_OPERATIONS_PER_DAY } from "./config";

export type Tier = "anonymous" | "authenticated";
export interface Identity {
  tier: Tier;
  id: string;
}

interface UsageDoc {
  key: string;
  day: string;
  count: number;
  updatedAt: Date;
}

const PdfToolsUsageSchema = new Schema<UsageDoc>(
  {
    key: { type: String, required: true },
    day: { type: String, required: true },
    count: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "pdf_tools_usage" }
);
PdfToolsUsageSchema.index({ key: 1, day: 1 }, { unique: true });
PdfToolsUsageSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 48 });

const PdfToolsUsage =
  (models.PdfToolsUsage as mongoose.Model<UsageDoc>) ||
  model<UsageDoc>("PdfToolsUsage", PdfToolsUsageSchema);

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

function limitFor(tier: Tier): number {
  return tier === "authenticated" ? MAX_AUTH_OPERATIONS_PER_DAY : MAX_ANONYMOUS_OPERATIONS_PER_DAY;
}

const memory = new Map<string, { day: string; count: number }>();

export interface ConsumeResult {
  allowed: boolean;
  used: number;
  limit: number;
}

export async function consume(identity: Identity): Promise<ConsumeResult> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${identity.tier}:${identity.id}`;
  const limit = limitFor(identity.tier);

  try {
    await connectDB();
    const updated = await PdfToolsUsage.findOneAndUpdate(
      { key, day, count: { $lte: limit - 1 } },
      { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
      { new: true, upsert: true }
    ).lean();
    return { allowed: true, used: updated?.count ?? 1, limit };
  } catch (e) {
    if ((e as { code?: number })?.code === 11000) {
      // Conditional update matched nothing and the upsert collided — over cap.
      return { allowed: false, used: limit, limit };
    }
    console.error("[pdf-tools:rate-limit] falling back to in-memory limit:", e);
    const existing = memory.get(key);
    const entry = existing && existing.day === day ? existing : { day, count: 0 };
    memory.set(key, entry);
    if (entry.count + 1 > limit) return { allowed: false, used: entry.count, limit };
    entry.count += 1;
    return { allowed: true, used: entry.count, limit };
  }
}
