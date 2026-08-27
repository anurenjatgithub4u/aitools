import mongoose, { Schema, Document } from "mongoose";

export interface ISubmission extends Document {
  name: string;
  description: string;
  website: string;
  logo?: string;
  category: string;
  pricing?: string;
  free_plan?: boolean;
  api?: boolean;
  mobile?: boolean;
  opensource?: boolean;
  rating?: number;
  best_for?: string;
  difficulty?: string;
  tags?: string[];
  features?: string[];
  pros?: string[];
  cons?: string[];
  submitterName?: string;
  submitterEmail?: string;
  searchQuery?: string;
  source: "manual_form" | "web_search_suggestion";
  status: "pending" | "approved" | "rejected";
  reviewNotes?: string;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    website: { type: String, required: true, trim: true },
    logo: { type: String, default: "" },
    category: { type: String, required: true, trim: true },
    pricing: { type: String, default: "Free Trial" },
    free_plan: { type: Boolean, default: false },
    api: { type: Boolean, default: false },
    mobile: { type: Boolean, default: false },
    opensource: { type: Boolean, default: false },
    rating: { type: Number, default: 4.0 },
    best_for: { type: String, default: "" },
    difficulty: { type: String, default: "Beginner" },
    tags: { type: [String], default: [] },
    features: { type: [String], default: [] },
    pros: { type: [String], default: [] },
    cons: { type: [String], default: [] },
    submitterName: { type: String, default: "" },
    submitterEmail: { type: String, default: "" },
    searchQuery: { type: String, default: "" },
    source: {
      type: String,
      enum: ["manual_form", "web_search_suggestion"],
      default: "manual_form",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Submission =
  mongoose.models.Submission ||
  mongoose.model<ISubmission>("Submission", SubmissionSchema);
