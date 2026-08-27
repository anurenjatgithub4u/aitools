import mongoose, { Schema, Document } from "mongoose";

export interface IFAQ {
  question: string;
  answer: string;
}

export interface ITool extends Document {
  id: string;
  name: string;
  description: string;
  website: string;
  logo: string;
  category: string;
  pricing: string;
  free_plan: boolean;
  api: boolean;
  mobile: boolean;
  opensource: boolean;
  rating: number;
  best_for: string;
  difficulty: string;
  pros: string[];
  cons: string[];
  tags: string[];
  features: string[];
  alternatives: string[];
  faq: IFAQ[];
  addedDate?: string;
  trendingScore?: number;
  reviewStatus?: "none" | "published" | "outdated";
  lastVerifiedAt?: Date;
  lastUpdatedType?: string;
  
  // New optional fields
  slug?: string;
  developer?: string;
  launchYear?: number | null;
  pricingModel?: string;
  startingPrice?: string;
  enterprise?: boolean;
  verified?: boolean;
  featured?: boolean;
  affiliateUrl?: string;
  useCases?: string[];
  
  // New classification fields
  toolType?: string;
  aiType?: string[];
  primaryCategory?: string;
  secondaryCategories?: string[];
  targetAudience?: string[];
  skillLevel?: string;
  deployment?: string[];
  platforms?: string[];
  capabilities?: string[];
  integrations?: string[];
  hosting?: string;
  searchKeywords?: string[];
  modelFamily?: string[];
  supports?: {
    api?: boolean;
    vision?: boolean;
    speech?: boolean;
    images?: boolean;
    embeddings?: boolean;
    fineTuning?: boolean;
  };
  deploymentOptions?: string[];
  license?: string;
  ecosystem?: string[];
  searchableAliases?: string[];
  classificationVersion?: number;
}

const FAQSchema = new Schema<IFAQ>({
  question: { type: String, required: true },
  answer: { type: String, required: true },
}, { _id: false });

const ToolSchema = new Schema<ITool>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  website: { type: String, required: true },
  logo: { type: String, required: true },
  category: { type: String, required: true },
  pricing: { type: String, required: true },
  free_plan: { type: Boolean, required: true },
  api: { type: Boolean, required: true },
  mobile: { type: Boolean, required: true },
  opensource: { type: Boolean, required: true },
  rating: { type: Number, required: true },
  best_for: { type: String, required: true },
  difficulty: { type: String, required: true },
  pros: { type: [String], default: [] },
  cons: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  features: { type: [String], default: [] },
  alternatives: { type: [String], default: [] },
  faq: { type: [FAQSchema], default: [] },
  addedDate: { type: String },
  trendingScore: { type: Number },
  reviewStatus: { type: String, enum: ["none", "published", "outdated"], default: "none" },
  lastVerifiedAt: { type: Date, default: Date.now },
  lastUpdatedType: { type: String, default: "initial" },

  // New optional fields
  slug: { 
    type: String, 
    unique: true, 
    index: true,
    sparse: true // Added sparse so existing docs without slug don't cause duplicate key errors
  },
  developer: { type: String, default: "" },
  launchYear: { type: Number, default: null },
  pricingModel: { type: String, default: "" },
  startingPrice: { type: String, default: "" },
  enterprise: { type: Boolean, default: false },
  verified: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  affiliateUrl: { type: String, default: "" },
  useCases: { type: [String], default: [] },

  // New classification fields
  toolType: { type: String },
  aiType: { type: [String], default: [] },
  primaryCategory: { type: String },
  secondaryCategories: { type: [String], default: [] },
  targetAudience: { type: [String], default: [] },
  skillLevel: { type: String },
  deployment: { type: [String], default: [] },
  platforms: { type: [String], default: [] },
  capabilities: { type: [String], default: [] },
  integrations: { type: [String], default: [] },
  hosting: { type: String },
  searchKeywords: { type: [String], default: [] },
  modelFamily: { type: [String], default: [] },
  supports: {
    api: { type: Boolean, default: false },
    vision: { type: Boolean, default: false },
    speech: { type: Boolean, default: false },
    images: { type: Boolean, default: false },
    embeddings: { type: Boolean, default: false },
    fineTuning: { type: Boolean, default: false }
  },
  deploymentOptions: { type: [String], default: [] },
  license: { type: String },
  ecosystem: { type: [String], default: [] },
  searchableAliases: { type: [String], default: [] },
  classificationVersion: { type: Number, default: 1 }
}, { timestamps: true });

export const Tool = mongoose.models.Tool || mongoose.model<ITool>("Tool", ToolSchema);
