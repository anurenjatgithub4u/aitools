// Expert Blueprint Library (Phase 1). A blueprint is an internal reasoning
// aid fed to the AI before it generates a workspace — it teaches HOW an
// expert sequences execution (abstract stage roles, file roles, checklist
// philosophy), never WHAT content to generate. Blueprints are never shown to
// users and never injected verbatim into generated output — every stage/file
// role must be renamed into goal-specific language by the model at
// generation time. See src/lib/workspace-blueprints/*.json for the actual
// data and BLUEPRINT.md-equivalent reasoning baked into each field.

export interface BlueprintMetadata {
  blueprintId: string;
  name: string;
  version: string;
  internal: boolean;
  notShownToUser: boolean;
  purpose: string;
  /** Existing classify-route categories (src/app/api/workspace/classify/route.ts) this blueprint applies to. */
  appliesToCategory: string[];
  /** Illustrative only — never used as a literal string-match table. The blueprint itself is domain-agnostic. */
  exampleDomains: string[];
  domainMatchingNote: string;
}

export interface BlueprintStageRole {
  stageId: string;
  order: number;
  stageRole: string;
  purpose: string;
  whyThisStageExists: string;
  whatShouldHappen: string;
  prerequisites: string;
  whatComesNext: string;
  canBeSkipped: boolean;
  skipCondition: string;
  isMandatory: boolean;
  mandatoryReason: string;
  folderGenerationGuidelines: string;
  fileGenerationGuidelines: string;
  checklistGenerationPhilosophy: string;
  emphasizedVerbs: string[];
}

export interface BlueprintStageRules {
  totalStages: number;
  orderIsFixed: boolean;
  orderEnforcement: string;
  stageToFolderMapping: string;
  compressionRule: string;
  expansionRule: string;
  renamingRule: string;
  skipRule: string;
}

export interface BlueprintFolderGenerationRules {
  namingPhilosophy: string;
  badFolderNameExamples: string[];
  noDuplicateFolders: string;
  noInventedContent: string;
  orderMustMatchStageOrder: string;
  folderCountTarget: string;
  oneStageOneReasonPerFolder: string;
}

export interface BlueprintFileGenerationRules {
  fileRoles: string[];
  fileRoleDefinitions: Record<string, string>;
  maxFilesPerFolder: number;
  roleSelectionRule: string;
  namingRule: string;
  namingExamples: { role: string; domainExample: string; renamedTo: string }[];
  noDuplicateRolesUnlessJustified: string;
}

export interface BlueprintChecklistGenerationRules {
  philosophy: string;
  rules: string[];
  approvedActionVerbs: string[];
  prohibitedPatterns: string[];
  notice: string;
}

export interface BlueprintValidationRules {
  structuralChecks: string[];
  contentChecks: string[];
  enforcement: string;
}

export interface BlueprintGenerationConstraints {
  maxFileRolesPerFolder: number;
  stageCount: number;
  blueprintIsReasoningAidOnly: string;
  tokenEfficiencyRule: string;
  customizationRequirement: string;
}

export interface ExpertBlueprint {
  metadata: BlueprintMetadata;
  stageRoles: BlueprintStageRole[];
  stageRules: BlueprintStageRules;
  folderGenerationRules: BlueprintFolderGenerationRules;
  fileGenerationRules: BlueprintFileGenerationRules;
  checklistGenerationRules: BlueprintChecklistGenerationRules;
  validationRules: BlueprintValidationRules;
  generationConstraints: BlueprintGenerationConstraints;
}
