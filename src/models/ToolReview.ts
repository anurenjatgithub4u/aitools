import mongoose, { Schema, Document } from "mongoose";

export interface IFAQReview {
  question: string;
  answer: string;
}

export interface IToolReview extends Document {
  toolId: string;
  slug: string;
  title: string;
  shortDescription: string;
  overview: string;
  keyFeatures: string;
  useCases: string;
  pricingDetails: string;
  prosAnalysis: string;
  consAnalysis: string;
  alternatives: string;
  verdict: string;
  faq: IFAQReview[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  published: boolean;
}

const FAQReviewSchema = new Schema<IFAQReview>({
  question: { type: String, required: true },
  answer: { type: String, required: true },
}, { _id: false });

const ToolReviewSchema = new Schema<IToolReview>({
  toolId: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  shortDescription: { type: String, required: true },
  overview: { type: String, required: true },
  keyFeatures: { type: String, required: true },
  useCases: { type: String, required: true },
  pricingDetails: { type: String, required: true },
  prosAnalysis: { type: String, required: true },
  consAnalysis: { type: String, required: true },
  alternatives: { type: String, required: true },
  verdict: { type: String, required: true },
  faq: { type: [FAQReviewSchema], default: [] },
  seoTitle: { type: String, required: true },
  seoDescription: { type: String, required: true },
  seoKeywords: { type: [String], default: [] },
  published: { type: Boolean, default: false },
}, { timestamps: true });

export const ToolReview = mongoose.models.ToolReview || mongoose.model<IToolReview>("ToolReview", ToolReviewSchema);
