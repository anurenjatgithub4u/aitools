// Shared types for the FindurAI Workspace feature (see FEATURE_WORKSPACE.md)

export type WorkspaceItemType =
  | "playbook"
  | "knowledge"
  | "workflow"
  | "prompt"
  | "decision"
  | "code"
  | "reference"
  | "research"
  | "template"
  | "idea"
  | "bookmark"
  | "guide"
  | "checklist"
  | "quiz"
  | "ai_conversation"
  | "roadmap";

export type RelationType =
  | "related_to"
  | "uses"
  | "created_from"
  | "depends_on"
  | "inspired_by"
  | "generated_by";

export interface WorkspaceRelation {
  itemId: string;
  relation: RelationType;
}

// See FindurAI_Workflow_UX_Redesign.md — steps can branch (decision/loop/parallel)
// while staying a flat array: `branch` attaches a step to the nearest preceding
// decision/loop/parallel step, so old plain step data keeps working unchanged.
export type WorkflowStepKind =
  | "step"
  | "decision"
  | "loop"
  | "parallel"
  | "ai_call"
  | "human_action"
  | "output";

export type WorkflowBranch = "yes" | "no" | "loop" | "parallel";

export interface WorkflowStep {
  id: string;
  text: string;
  done: boolean;
  indent: number;
  kind?: WorkflowStepKind;
  instruction?: string;
  tool?: string;
  model?: string;
  expectedOutput?: string;
  condition?: string;
  branch?: WorkflowBranch;
  // Workflow Redesign spec: shown in the run view's step detail panel.
  purpose?: string;
  estimatedTime?: string;
  // AI Task Evaluation spec: a task only becomes `done` after the user
  // explains their work and AI reviews it — explanation/evaluation persist
  // so reopening a task shows the last review instead of re-prompting.
  explanation?: string;
  evaluation?: TaskEvaluation;
}

export interface TaskEvaluation {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  canComplete: boolean;
}

// Type-specific fields stored alongside the shared item fields
export interface WorkspaceItemTypeData {
  // knowledge
  summary?: string;
  aiModel?: string;
  // prompt
  purpose?: string;
  promptText?: string;
  variables?: string[];
  expectedOutput?: string;
  exampleInput?: string;
  exampleOutput?: string;
  notes?: string;
  // workflow
  goal?: string;
  difficulty?: string;
  estimatedTime?: string;
  repeat?: string;
  aiModels?: string[];
  toolsUsed?: string[];
  steps?: WorkflowStep[];
  expectedResult?: string;
  // code
  language?: string;
  // reference / bookmark
  url?: string;
  // playbook
  problem?: string;
  finalResult?: string;
  lessonsLearned?: string;
  solved?: boolean;
  // remixed prompt pack (Product Pivot Spec)
  sourcePackSlug?: string;
  packSteps?: unknown[];
}

export interface StackToolDto {
  _id: string;
  userId: string;
  name: string;
  emoji: string;
  color: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInsights {
  counts: {
    playbooks: number;
    prompts: number;
    workflows: number;
    memory: number;
    projects: number;
    resources: number;
    total: number;
  };
  hoursSaved: number;
  weeklyCreated: number;
  weeklyUpdated: number;
  weeklySolved: number;
  solvedProblems: { id: string; title: string; emoji: string; updatedAt: string }[];
  topTags: { tag: string; count: number }[];
  graphSize: number;
}

export interface WorkspaceItemDto {
  _id: string;
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
  generationState?: "stub" | "generated";
  completionStatus?: "not_started" | "in_progress" | "completed";
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClarificationAnswer {
  question: string;
  answer: string;
}

// Preview-confirm flow (workspace-preview-confirm-spec.md), extended by the
// AI-first execution redesign (workspace-execution-redesign-spec.md) to carry
// a full execution plan alongside the folder-tree preview.
export interface PreviewFolderNode {
  title: string;
  icon: string;
  purpose: string;
  milestone?: string;
  exampleFiles: string[];
  folders: PreviewFolderNode[];
}

export interface PlanMilestone {
  title: string;
  description: string;
}

export interface ExecutionPlanDraft {
  goal: string;
  estimatedDuration: string;
  expectedOutcome: string;
  deliverables: string[];
  suggestedTimeline: string;
  milestones: PlanMilestone[];
  deadline?: string | null;
}

export interface PreviewStructure {
  workspaceName: string;
  icon: string;
  description: string;
  primaryIntent: string;
  secondaryIntent: string;
  plan: ExecutionPlanDraft;
  executionFolders: PreviewFolderNode[];
  knowledgeFolders: PreviewFolderNode[];
  scopeNote?: string | null;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface ExecutionPlan {
  goal: string;
  estimatedDuration: string;
  expectedOutcome: string;
  deliverables: string[];
  suggestedTimeline: string;
  milestones: Milestone[];
  deadline: string | null;
}

export interface WorkspaceProjectDto {
  _id: string;
  userId: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  favorite: boolean;
  intent?: string | null;
  category?: string | null;
  clarificationAnswers?: ClarificationAnswer[];
  plan?: ExecutionPlan | null;
  createdAt: string;
  updatedAt: string;
}

export type CollectionKind = "dashboard" | "execution" | "ai" | "knowledge" | "personal" | "archive";

// Manual, user-curated reference material attached to a folder — separate
// from generated items. No auto-extraction or completion tracking; users
// add/remove these by hand.
export type FolderResourceType = "note" | "pdf" | "url";

export interface FolderResource {
  id: string;
  type: FolderResourceType;
  title: string;
  content?: string; // note body, or an optional description for pdf/url
  url?: string; // link target for pdf/url
  createdAt: string;
}

export interface WorkspaceCollectionDto {
  _id: string;
  userId: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  favorite: boolean;
  projectId: string | null;
  kind: CollectionKind | null;
  order: number;
  parentId: string | null;
  readme?: string;
  milestoneId?: string | null;
  resources?: FolderResource[];
  createdAt: string;
  updatedAt: string;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: "project" | WorkspaceItemType;
  emoji: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: RelationType | "belongs_to";
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
