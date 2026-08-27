// Discovered job postings (spec §10, §28).
//
// One collection holds jobs from every crawler. `source` + `sourceJobId` and
// the dedup `fingerprint` are what keep the same role from appearing twice
// when it arrives from two providers (spec §16).

import mongoose, { Schema, models, model } from "mongoose";
import type { EmploymentType, JobStatus, PostedAtPrecision, WorkplaceType } from "@/lib/jobs/types";

export interface JobDoc {
  title: string;
  company: string;
  companyLogo: string | null;
  description: string;

  location: string;
  country: string | null;
  city: string | null;

  employmentType: EmploymentType;
  workplaceType: WorkplaceType;

  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;

  requiredSkills: string[];
  preferredSkills: string[];

  experienceMin: number | null;
  experienceMax: number | null;

  jobUrl: string;
  /** Tracking params stripped — the level-2 dedup key (spec §16). */
  canonicalUrl: string;

  source: string;
  sourceName: string;
  sourceJobId: string;
  /** company + title + location hash — the level-3 dedup key. */
  fingerprint: string;

  postedAt: Date | null;
  postedAtPrecision: PostedAtPrecision;
  discoveredAt: Date;
  lastCheckedAt: Date;

  status: JobStatus;
  isActive: boolean;
  /** Consecutive crawls where this job was expected but absent (spec §14). */
  missCount: number;

  /** Search terms that surfaced this job — powers cache lookups (spec §25). */
  queryKeys: string[];

  applyClicks: number;

  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<JobDoc>(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    companyLogo: { type: String, default: null },
    description: { type: String, default: "" },

    location: { type: String, default: "" },
    country: { type: String, default: null },
    city: { type: String, default: null },

    employmentType: { type: String, default: "Unknown" },
    workplaceType: { type: String, default: "Unknown" },

    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    salaryCurrency: { type: String, default: null },

    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },

    experienceMin: { type: Number, default: null },
    experienceMax: { type: Number, default: null },

    jobUrl: { type: String, required: true },
    canonicalUrl: { type: String, required: true },

    source: { type: String, required: true },
    sourceName: { type: String, default: "" },
    sourceJobId: { type: String, required: true },
    fingerprint: { type: String, required: true },

    postedAt: { type: Date, default: null },
    postedAtPrecision: { type: String, default: "unknown" },
    discoveredAt: { type: Date, default: Date.now },
    lastCheckedAt: { type: Date, default: Date.now },

    status: { type: String, default: "ACTIVE" },
    isActive: { type: Boolean, default: true },
    missCount: { type: Number, default: 0 },

    queryKeys: { type: [String], default: [] },
    applyClicks: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "jobs" }
);

// --- dedup keys (spec §16, §28) -------------------------------------------
// Unique so a concurrent upsert of the same posting collides rather than
// inserting a duplicate.
JobSchema.index({ source: 1, sourceJobId: 1 }, { unique: true });
JobSchema.index({ canonicalUrl: 1 });
JobSchema.index({ fingerprint: 1 });

// --- query paths (spec §28) -----------------------------------------------
JobSchema.index({ isActive: 1, location: 1 });
JobSchema.index({ isActive: 1, title: 1 });
JobSchema.index({ isActive: 1, queryKeys: 1, discoveredAt: -1 });
JobSchema.index({ postedAt: -1 });
JobSchema.index({ lastCheckedAt: 1 });
JobSchema.index({ company: 1 });

export const Job = (models.Job as mongoose.Model<JobDoc>) || model<JobDoc>("Job", JobSchema);
