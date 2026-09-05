// One upvote by one account on one product.
//
// Mirrors SavedJob: the compound unique index makes "one vote per person" a
// database invariant rather than something the UI is trusted to enforce. That
// matters more here than for a private bookmark — this number is the ranking.

import mongoose, { Schema, models, model } from "mongoose";

export interface ProductVoteDoc {
  userId: string;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVoteSchema = new Schema<ProductVoteDoc>(
  {
    // Firebase uid, verified server-side before any write — never taken from
    // the request body.
    userId: { type: String, required: true, index: true },

    // The Product's _id as a string. Keyed on _id rather than slug so a future
    // rename can't orphan or duplicate votes.
    productId: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: "product_votes" }
);

ProductVoteSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const ProductVote =
  (models.ProductVote as mongoose.Model<ProductVoteDoc>) ||
  model<ProductVoteDoc>("ProductVote", ProductVoteSchema);
