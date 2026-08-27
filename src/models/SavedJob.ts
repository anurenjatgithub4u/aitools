// Saved / bookmarked jobs (spec §21, §28).

import mongoose, { Schema, models, model } from "mongoose";

export interface SavedJobDoc {
  userId: string;
  jobId: string;
  savedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavedJobSchema = new Schema<SavedJobDoc>(
  {
    userId: { type: String, required: true, index: true },
    jobId: { type: String, required: true },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "saved_jobs" }
);

// Unique so saving twice is a no-op at the database level rather than
// depending on the UI disabling the button (spec §21).
SavedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export const SavedJob =
  (models.SavedJob as mongoose.Model<SavedJobDoc>) || model<SavedJobDoc>("SavedJob", SavedJobSchema);
