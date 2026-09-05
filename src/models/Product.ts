// A product submitted by a maker to the community leaderboard.
//
// Separate collection from Tool on purpose. Tool has 14 required fields (rating,
// difficulty, best_for, pricing...), `verified` defaults to true, and it carries
// no field distinguishing seeded rows from submitted ones — so community
// products cannot be filtered back out of it once mixed in.

import mongoose, { Schema, models, model } from "mongoose";

export interface ProductDoc {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  website: string;
  category: string;
  submittedByUid: string;
  submitterName: string;
  upvoteCount: number;
  status: "live" | "removed";
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<ProductDoc>(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    // Unique: one listing per product. A resubmission of the same URL is
    // rejected with a 409 rather than quietly creating a duplicate row that
    // would split its votes.
    website: { type: String, required: true, unique: true },

    category: { type: String, required: true },

    // Who submitted it. Indexed so a maker's own submissions can be listed
    // (and so abuse can be traced to an account rather than an IP).
    submittedByUid: { type: String, required: true, index: true },
    submitterName: { type: String, default: "" },

    // Denormalized tally. The ProductVote collection is the source of truth;
    // this exists so the leaderboard can sort without an aggregation per read.
    upvoteCount: { type: Number, default: 0 },

    // Soft delete. Spam gets pulled by flipping this, which keeps the vote
    // rows intact and the action reversible.
    status: { type: String, enum: ["live", "removed"], default: "live" },
  },
  { timestamps: true, collection: "products" }
);

// The leaderboard's exact query shape: live products, highest votes first,
// newest breaking ties.
ProductSchema.index({ status: 1, upvoteCount: -1, createdAt: -1 });

// Same, narrowed by category for the filter chips.
ProductSchema.index({ status: 1, category: 1, upvoteCount: -1 });

export const Product =
  (models.Product as mongoose.Model<ProductDoc>) || model<ProductDoc>("Product", ProductSchema);
