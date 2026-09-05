// Per-account daily caps for submitting and voting.
//
// Same shape as lib/jobs/rate-limit.ts and lib/pdf-tools/rate-limit.ts: an
// atomic conditional update in Mongo so two concurrent requests can't both slip
// past the cap, with an in-memory fallback so a database outage degrades to a
// weaker limit rather than to no limit.
//
// Both meters are account-keyed because both endpoints require auth. There is
// deliberately no anonymous tier: a hashed IP rotates with a VPN or a phone
// switching networks, which is fine as a spend meter but useless as a vote
// identity.

import mongoose, { Schema, models, model } from "mongoose";
import connectDB from "@/lib/db";
import { MAX_SUBMISSIONS_PER_DAY, MAX_VOTES_PER_DAY } from "./config";

export type Meter = "submit" | "vote";

interface UsageDoc {
  key: string;
  day: string;
  submitCount: number;
  voteCount: number;
  updatedAt: Date;
}

const ProductsUsageSchema = new Schema<UsageDoc>(
  {
    key: { type: String, required: true },
    day: { type: String, required: true },
    submitCount: { type: Number, default: 0 },
    voteCount: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "products_usage" }
);
ProductsUsageSchema.index({ key: 1, day: 1 }, { unique: true });
ProductsUsageSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 48 });

const ProductsUsage =
  (models.ProductsUsage as mongoose.Model<UsageDoc>) ||
  model<UsageDoc>("ProductsUsage", ProductsUsageSchema);

export function limitFor(meter: Meter): number {
  return meter === "submit" ? MAX_SUBMISSIONS_PER_DAY : MAX_VOTES_PER_DAY;
}

const memory = new Map<string, { day: string; submit: number; vote: number }>();

export interface ConsumeResult {
  allowed: boolean;
  used: number;
  limit: number;
}

export async function consume(uid: string, meter: Meter): Promise<ConsumeResult> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `auth:${uid}`;
  const limit = limitFor(meter);
  const field = meter === "submit" ? "submitCount" : "voteCount";

  try {
    await connectDB();
    const updated = await ProductsUsage.findOneAndUpdate(
      { key, day, [field]: { $lte: limit - 1 } },
      { $inc: { [field]: 1 }, $set: { updatedAt: new Date() } },
      { new: true, upsert: true }
    ).lean();
    return { allowed: true, used: (updated?.[field as keyof UsageDoc] as number) ?? 1, limit };
  } catch (e) {
    if ((e as { code?: number })?.code === 11000) {
      // The conditional update matched nothing and the upsert collided with the
      // existing day's row — the caller is over the cap.
      return { allowed: false, used: limit, limit };
    }
    console.error("[products:rate-limit] falling back to in-memory limit:", e);
    const existing = memory.get(key);
    const entry = existing && existing.day === day ? existing : { day, submit: 0, vote: 0 };
    memory.set(key, entry);
    if (entry[meter] + 1 > limit) return { allowed: false, used: entry[meter], limit };
    entry[meter] += 1;
    return { allowed: true, used: entry[meter], limit };
  }
}

/**
 * Give back a unit when the work didn't happen — e.g. a submission rejected as
 * a duplicate. Without this, a maker who fat-fingers the same URL twice burns
 * two of their five daily submissions. Mirrors refundGeneration() in
 * lib/pdf-study/rate-limit.ts.
 */
export async function refund(uid: string, meter: Meter): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `auth:${uid}`;
  const field = meter === "submit" ? "submitCount" : "voteCount";
  try {
    await connectDB();
    await ProductsUsage.updateOne({ key, day, [field]: { $gte: 1 } }, { $inc: { [field]: -1 } });
  } catch (e) {
    console.error("[products:rate-limit] refund failed:", e);
  }
}
