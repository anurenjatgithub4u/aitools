import mongoose, { Schema, Document } from "mongoose";

// AI Workspace Generator taxonomy (see FindurAI_AI_Workspace_Generation_Engine spec):
// dashboard (always first, fixed) -> execution (goal-specific) -> ai (mandatory
// AI Workflows/Prompt Packs) -> knowledge (optional) -> personal (Notes/Favorites)
// -> archive (always last).
export const COLLECTION_KINDS = ["dashboard", "execution", "ai", "knowledge", "personal", "archive"] as const;
export type CollectionKind = (typeof COLLECTION_KINDS)[number];

export const FOLDER_RESOURCE_TYPES = ["note", "pdf", "url"] as const;
export type FolderResourceType = (typeof FOLDER_RESOURCE_TYPES)[number];

export interface IFolderResource {
  id: string;
  type: FolderResourceType;
  title: string;
  content?: string;
  url?: string;
  createdAt: string;
}

export interface IWorkspaceCollection extends Document {
  userId: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  favorite: boolean;
  // Folder fields (AI Workspace Generator): set when this collection acts as
  // a folder scoped to a single project rather than a global cross-project
  // collection. Optional and additive — existing collections are unaffected.
  projectId: string | null;
  kind: CollectionKind | null;
  order: number;
  // Unlimited folder nesting (v2): null = top-level under the project.
  parentId: string | null;
  // AI-first execution redesign: auto-generated folder guide (purpose, what
  // belongs here, workflow, completion criteria, tips) and the plan milestone
  // this folder belongs to, for Roadmap grouping. Optional/additive.
  readme: string;
  milestoneId: string | null;
  // Manual, user-curated notes/PDFs/links attached to this folder. Fully
  // manual — no auto-extraction, no completion tracking.
  resources: IFolderResource[];
}

const WorkspaceCollectionSchema = new Schema<IWorkspaceCollection>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    emoji: { type: String, default: "🗂️" },
    color: { type: String, default: "#6366f1" },
    favorite: { type: Boolean, default: false },
    projectId: { type: String, default: null, index: true },
    kind: { type: String, enum: COLLECTION_KINDS, default: null },
    order: { type: Number, default: 0 },
    parentId: { type: String, default: null, index: true },
    readme: { type: String, default: "" },
    milestoneId: { type: String, default: null },
    resources: {
      type: [
        {
          id: { type: String, required: true },
          type: { type: String, enum: FOLDER_RESOURCE_TYPES, required: true },
          title: { type: String, required: true },
          content: { type: String },
          url: { type: String },
          createdAt: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const WorkspaceCollection =
  mongoose.models.WorkspaceCollection ||
  mongoose.model<IWorkspaceCollection>("WorkspaceCollection", WorkspaceCollectionSchema);
