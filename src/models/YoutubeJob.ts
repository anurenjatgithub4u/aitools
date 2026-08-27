// Async processing job (spec §19, §20, §21).
//
// The HTTP request that starts an analysis returns immediately with a jobId;
// the work continues in the background and the client polls. That matters for
// an hour-long transcript, where extraction can comfortably outlive a request
// timeout.
//
// Per-chunk state lives on the job so a failed chunk can be retried on its own
// rather than restarting the video (spec §21).

import mongoose, { Schema, models, model } from "mongoose";
import type { ChunkJobState, JobStatus, OutputType, VideoErrorCode } from "@/lib/youtube-study/types";

export interface YoutubeJobDoc {
  jobId: string;
  videoId: string;
  /** `${tier}:${id}` — matches the rate-limit key so concurrency can be
   *  counted per identity without storing a raw IP. */
  ownerKey: string;
  status: JobStatus;
  outputType: OutputType;
  attemptCount: number;
  chunks: ChunkJobState[];
  chunksTotal: number;
  chunksDone: number;
  errorCode?: VideoErrorCode;
  /** Internal only — never serialised to the client (spec §33). */
  errorDetail?: string;
  /** Set once the job produced something, so the client can fetch the result. */
  completedOutputType?: OutputType;
  startedAt: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const YoutubeJobSchema = new Schema<YoutubeJobDoc>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    videoId: { type: String, required: true, index: true },
    ownerKey: { type: String, required: true, index: true },
    status: { type: String, required: true, default: "QUEUED", index: true },
    outputType: { type: String, required: true },
    attemptCount: { type: Number, default: 0 },
    chunks: {
      type: [
        {
          _id: false,
          chunkIndex: { type: Number, required: true },
          status: { type: String, default: "pending" },
          attemptCount: { type: Number, default: 0 },
          error: { type: String },
        },
      ],
      default: [],
    },
    chunksTotal: { type: Number, default: 0 },
    chunksDone: { type: Number, default: 0 },
    errorCode: { type: String },
    errorDetail: { type: String },
    completedOutputType: { type: String },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
  },
  { timestamps: true, collection: "youtube_jobs" }
);

// Counting a user's in-flight jobs is the hot query for concurrency limits.
YoutubeJobSchema.index({ ownerKey: 1, status: 1 });

// Jobs are ephemeral records of work, not user content — discard after a day.
YoutubeJobSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const YoutubeJob =
  (models.YoutubeJob as mongoose.Model<YoutubeJobDoc>) ||
  model<YoutubeJobDoc>("YoutubeJob", YoutubeJobSchema);
