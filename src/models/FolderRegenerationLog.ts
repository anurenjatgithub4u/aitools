import mongoose, { Schema, Document } from "mongoose";

// Tracks per-folder "Regenerate this" corrections (spec 3.4/4): a high
// regeneration rate on a folder/category signals the clarification questions
// for that category need tuning.
export interface IFolderRegenerationLog extends Document {
  userId: string;
  projectId: string;
  folderId: string;
  folderName: string;
  reason: string;
}

const FolderRegenerationLogSchema = new Schema<IFolderRegenerationLog>(
  {
    userId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    folderId: { type: String, required: true, index: true },
    folderName: { type: String, default: "" },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
);

export const FolderRegenerationLog =
  mongoose.models.FolderRegenerationLog ||
  mongoose.model<IFolderRegenerationLog>("FolderRegenerationLog", FolderRegenerationLogSchema);
