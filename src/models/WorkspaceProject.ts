import mongoose, { Schema, Document } from "mongoose";

export interface IClarificationAnswer {
  question: string;
  answer: string;
}

export interface IMilestone {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface IExecutionPlan {
  goal: string;
  estimatedDuration: string;
  expectedOutcome: string;
  deliverables: string[];
  suggestedTimeline: string;
  milestones: IMilestone[];
  deadline: string | null;
}

export interface IWorkspaceProject extends Document {
  userId: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  favorite: boolean;
  // Generation v2 (see workspace-generation-v2-spec.md): stored per generation
  // event for analytics + context-aware regeneration. Optional/additive.
  intent: string | null;
  category: string | null;
  clarificationAnswers: IClarificationAnswer[];
  // AI-first execution redesign (workspace-execution-redesign-spec.md): the
  // approved plan the user reviewed before generation — drives the Roadmap
  // and Tracker. Optional/additive; null for projects created before this.
  plan: IExecutionPlan | null;
}

const ClarificationAnswerSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }
);

const MilestoneSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const ExecutionPlanSchema = new Schema(
  {
    goal: { type: String, default: "" },
    estimatedDuration: { type: String, default: "" },
    expectedOutcome: { type: String, default: "" },
    deliverables: { type: [String], default: [] },
    suggestedTimeline: { type: String, default: "" },
    milestones: { type: [MilestoneSchema], default: [] },
    deadline: { type: String, default: null },
  },
  { _id: false }
);

const WorkspaceProjectSchema = new Schema<IWorkspaceProject>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    emoji: { type: String, default: "📁" },
    color: { type: String, default: "#8b5cf6" },
    favorite: { type: Boolean, default: false },
    intent: { type: String, default: null },
    category: { type: String, default: null },
    clarificationAnswers: { type: [ClarificationAnswerSchema], default: [] },
    plan: { type: ExecutionPlanSchema, default: null },
  },
  { timestamps: true }
);

export const WorkspaceProject =
  mongoose.models.WorkspaceProject ||
  mongoose.model<IWorkspaceProject>("WorkspaceProject", WorkspaceProjectSchema);
