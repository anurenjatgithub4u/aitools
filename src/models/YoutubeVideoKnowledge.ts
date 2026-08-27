// Cached knowledge representation, keyed by YouTube video ID (spec §17, §18).
//
// This is what makes the economics work. Extracting knowledge from an hour of
// transcript is the expensive step; generating an additional output from the
// cached representation is one cheap call. Two users analysing the same
// popular video should cost us one extraction, not two.
//
// Raw transcripts are deliberately NOT stored here — they are processing
// intermediates with a short TTL (spec §29). What we keep is the derived,
// compact representation.

import mongoose, { Schema, models, model } from "mongoose";
import type { ContentType, KnowledgeRepresentation, TranscriptQualityRating } from "@/lib/youtube-study/types";
import { KNOWLEDGE_TTL_DAYS } from "@/lib/youtube-study/config";

export interface YoutubeVideoKnowledgeDoc {
  videoId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
  /** Hash of the transcript this representation was derived from. If the
   *  captions change, the hash changes and we re-extract (spec §17). */
  transcriptHash: string;
  transcriptStatus: TranscriptQualityRating;
  transcriptChars: number;
  transcriptSource: string;
  contentType: ContentType;
  knowledge: KnowledgeRepresentation;
  /** Outputs already generated from this representation, cached by type so a
   *  repeat request costs nothing. */
  outputs: Array<{ outputType: string; content: string; targetModel?: string; generatedAt: Date }>;
  modelUsed: string;
  createdAt: Date;
  updatedAt: Date;
}

const YoutubeVideoKnowledgeSchema = new Schema<YoutubeVideoKnowledgeDoc>(
  {
    videoId: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: "" },
    channelTitle: { type: String, default: "" },
    durationSeconds: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: "" },
    transcriptHash: { type: String, required: true },
    transcriptStatus: { type: String, default: "GOOD" },
    transcriptChars: { type: Number, default: 0 },
    transcriptSource: { type: String, default: "auto" },
    contentType: { type: String, default: "OTHER" },
    // Stored as a loose subdocument: the representation's shape is owned by
    // lib/youtube-study/types.ts and validated on the way in by the
    // sanitisers in knowledge.ts, not by Mongoose.
    knowledge: { type: Schema.Types.Mixed, required: true },
    outputs: {
      type: [
        {
          _id: false,
          outputType: { type: String, required: true },
          content: { type: String, required: true },
          targetModel: { type: String },
          generatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    modelUsed: { type: String, default: "" },
  },
  { timestamps: true, collection: "youtube_video_knowledge" }
);

// Cached knowledge goes stale rather than wrong — captions get corrected and
// videos get re-uploaded — so entries expire and are re-derived on demand.
YoutubeVideoKnowledgeSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: KNOWLEDGE_TTL_DAYS * 24 * 60 * 60 }
);

export const YoutubeVideoKnowledge =
  (models.YoutubeVideoKnowledge as mongoose.Model<YoutubeVideoKnowledgeDoc>) ||
  model<YoutubeVideoKnowledgeDoc>("YoutubeVideoKnowledge", YoutubeVideoKnowledgeSchema);
