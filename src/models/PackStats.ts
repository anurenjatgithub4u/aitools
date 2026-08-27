import mongoose, { Schema, Document } from "mongoose";

// Live counters for Prompt Packs (run/fork social proof). Pack content itself
// is static JSON in content/packs — only the numbers live in Mongo.
export interface IPackStats extends Document {
  slug: string;
  runCount: number;
  forkCount: number;
}

const PackStatsSchema = new Schema<IPackStats>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    runCount: { type: Number, default: 0 },
    forkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const PackStats =
  mongoose.models.PackStats || mongoose.model<IPackStats>("PackStats", PackStatsSchema);
