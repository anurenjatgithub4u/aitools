// Search history (spec §22). Enables "recent searches" and "search again",
// and records which crawler runs a search paid for.

import mongoose, { Schema, models, model } from "mongoose";
import type { CandidateProfile, SearchType } from "@/lib/jobs/types";

export interface JobSearchDoc {
  searchId: string;
  /** `${tier}:${id}` — a uid when signed in, a hashed IP otherwise, so no raw
   *  address is ever written (spec §29). */
  ownerKey: string;
  userId: string | null;
  searchType: SearchType;
  profile: CandidateProfile;
  searchQueries: string[];
  crawlerRunIds: string[];
  jobsFound: number;
  servedFromCache: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JobSearchSchema = new Schema<JobSearchDoc>(
  {
    searchId: { type: String, required: true, unique: true, index: true },
    ownerKey: { type: String, required: true, index: true },
    userId: { type: String, default: null, index: true },
    searchType: { type: String, required: true },
    // Shape owned by lib/jobs/types.ts and validated by the sanitiser on the
    // way in, not by Mongoose.
    profile: { type: Schema.Types.Mixed, required: true },
    searchQueries: { type: [String], default: [] },
    crawlerRunIds: { type: [String], default: [] },
    jobsFound: { type: Number, default: 0 },
    servedFromCache: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "job_searches" }
);

// Cache lookups scan recent searches for the same queries (spec §25).
JobSearchSchema.index({ searchQueries: 1, createdAt: -1 });

export const JobSearch =
  (models.JobSearch as mongoose.Model<JobSearchDoc>) || model<JobSearchDoc>("JobSearch", JobSearchSchema);
