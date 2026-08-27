import mongoose, { Schema, Document } from "mongoose";
import type {
  WorkspaceItemType,
  WorkspaceRelation,
  WorkspaceItemTypeData,
} from "@/types/workspace";

export const WORKSPACE_ITEM_TYPES: WorkspaceItemType[] = [
  "playbook",
  "knowledge",
  "workflow",
  "prompt",
  "decision",
  "code",
  "reference",
  "research",
  "template",
  "idea",
  "bookmark",
  "guide",
  "checklist",
  "quiz",
  "ai_conversation",
  "roadmap",
];

export const RELATION_TYPES = [
  "related_to",
  "uses",
  "created_from",
  "depends_on",
  "inspired_by",
  "generated_by",
] as const;

export const GENERATION_STATES = ["stub", "generated"] as const;
export type GenerationState = (typeof GENERATION_STATES)[number];

// Execution status (workspace-execution-redesign-spec.md 4) — separate from
// generationState: this tracks the user's progress on a file, not whether AI
// has written its content yet.
export const COMPLETION_STATUSES = ["not_started", "in_progress", "completed"] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export interface IWorkspaceItem extends Document {
  userId: string;
  title: string;
  description: string;
  emoji: string;
  type: WorkspaceItemType;
  projectId: string | null;
  collectionIds: string[];
  tags: string[];
  markdownContent: string;
  favorite: boolean;
  archived: boolean;
  relatedItems: WorkspaceRelation[];
  typeData: WorkspaceItemTypeData;
  // Preview-confirm capped generation (workspace-preview-confirm-spec.md 5/7):
  // "stub" items have only title+description, filled in on demand via
  // /api/workspace/generate-item. Defaults to "generated" for backward compat.
  generationState: GenerationState;
  completionStatus: CompletionStatus;
  completedAt: Date | null;
}

const RelationSchema = new Schema(
  {
    itemId: { type: String, required: true },
    relation: { type: String, enum: RELATION_TYPES, default: "related_to" },
  },
  { _id: false }
);

const WorkspaceItemSchema = new Schema<IWorkspaceItem>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    emoji: { type: String, default: "📄" },
    type: {
      type: String,
      enum: WORKSPACE_ITEM_TYPES,
      required: true,
      index: true,
    },
    projectId: { type: String, default: null, index: true },
    collectionIds: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    markdownContent: { type: String, default: "" },
    favorite: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    relatedItems: { type: [RelationSchema], default: [] },
    typeData: { type: Schema.Types.Mixed, default: {} },
    generationState: { type: String, enum: GENERATION_STATES, default: "generated" },
    completionStatus: { type: String, enum: COMPLETION_STATUSES, default: "not_started" },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false }
);

WorkspaceItemSchema.index({ userId: 1, type: 1, archived: 1 });
WorkspaceItemSchema.index({ userId: 1, updatedAt: -1 });

export const WorkspaceItem =
  mongoose.models.WorkspaceItem ||
  mongoose.model<IWorkspaceItem>("WorkspaceItem", WorkspaceItemSchema);
