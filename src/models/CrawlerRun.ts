// Crawler run ledger (spec §23, §24).
//
// Every crawl attempt is recorded before it starts and updated after, so spend
// against the $0.10 budget is auditable rather than inferred. A run that
// crashes still leaves a row.

import mongoose, { Schema, models, model } from "mongoose";

export type CrawlerRunStatus = "STARTED" | "SUCCEEDED" | "FAILED" | "REJECTED";

export interface CrawlerRunDoc {
  provider: string;
  /** Provider-side run id where one exists; null for the free ATS crawler. */
  runId: string | null;
  searchId: string;
  status: CrawlerRunStatus;
  query: string;
  startedAt: Date;
  completedAt: Date | null;
  requestedResults: number;
  returnedResults: number;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const CrawlerRunSchema = new Schema<CrawlerRunDoc>(
  {
    provider: { type: String, required: true, index: true },
    runId: { type: String, default: null },
    searchId: { type: String, required: true, index: true },
    status: { type: String, default: "STARTED", index: true },
    query: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    requestedResults: { type: Number, default: 0 },
    returnedResults: { type: Number, default: 0 },
    estimatedCostUsd: { type: Number, default: 0 },
    actualCostUsd: { type: Number, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true, collection: "crawler_runs" }
);

// Daily spend rollups.
CrawlerRunSchema.index({ createdAt: -1 });

export const CrawlerRun =
  (models.CrawlerRun as mongoose.Model<CrawlerRunDoc>) ||
  model<CrawlerRunDoc>("CrawlerRun", CrawlerRunSchema);
