import mongoose, { Schema, Document } from "mongoose";

// A tool in the user's personal AI stack (see FEATURE_REDESIGN_2.0.md → My AI Stack)
export interface IWorkspaceStackTool extends Document {
  userId: string;
  name: string;
  emoji: string;
  color: string;
  usageCount: number;
}

const WorkspaceStackToolSchema = new Schema<IWorkspaceStackTool>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    emoji: { type: String, default: "🤖" },
    color: { type: String, default: "#8b5cf6" },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const WorkspaceStackTool =
  mongoose.models.WorkspaceStackTool ||
  mongoose.model<IWorkspaceStackTool>("WorkspaceStackTool", WorkspaceStackToolSchema);
