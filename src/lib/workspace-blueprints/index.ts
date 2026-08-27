import type { ExpertBlueprint } from "@/types/blueprint";
import softwareEngineeringLearning from "./software-engineering-learning.json";
import startupProductDevelopment from "./startup-product-development.json";

// Expert Blueprint Library (Phase 2 — wired into generation). A blueprint is
// an internal reasoning aid fed to the AI before it designs a workspace: it
// teaches HOW an expert sequences execution (abstract stage/file roles,
// checklist philosophy), never WHAT content to generate — every stage/file
// role name must be renamed into goal-specific language before it reaches
// the user. Never shown to users, never injected verbatim into saved content.
//
// Selection is purely additive: a category with no matching blueprint falls
// back to the existing hardcoded workflow guidance already in
// preview/route.ts and generate/route.ts, so this can never regress coverage
// for a category we haven't written a blueprint for yet.

export const BLUEPRINTS: ExpertBlueprint[] = [
  softwareEngineeringLearning as ExpertBlueprint,
  startupProductDevelopment as ExpertBlueprint,
];

export function selectBlueprint(category: string | null | undefined): ExpertBlueprint | null {
  if (!category) return null;
  return BLUEPRINTS.find((b) => b.metadata.appliesToCategory.includes(category)) || null;
}

// Renders the stage-role sequence as folder/structure-design guidance —
// substituted for the hardcoded "Learning: Roadmap -> ..." style list when a
// blueprint matches the detected category.
export function formatBlueprintForStructurePrompt(blueprint: ExpertBlueprint): string {
  const lines = blueprint.stageRoles.map((s) => {
    const status = s.isMandatory ? "mandatory" : `optional — ${s.skipCondition}`;
    return `${s.order}. ${s.stageRole} (${status}): ${s.purpose} ${s.folderGenerationGuidelines}`;
  });
  return `Use this ${blueprint.stageRoles.length}-stage expert execution framework for "${blueprint.metadata.name}" goals as your reasoning structure (internal only — these stage names must NEVER appear literally as folder or milestone names; always rewrite each stage into language specific to this goal's real subject matter):
${lines.join("\n")}
${blueprint.stageRules.orderEnforcement} ${blueprint.stageRules.renamingRule} ${blueprint.stageRules.skipRule}`;
}

// Renders file-role + checklist-philosophy guidance for the content
// generation prompts (both the confirmed-structure content pass and the
// direct structure+content pass).
export function formatBlueprintForContentPrompt(blueprint: ExpertBlueprint): string {
  const roles = blueprint.fileGenerationRules.fileRoles
    .map((r) => `- ${r}: ${blueprint.fileGenerationRules.fileRoleDefinitions[r] || ""}`)
    .join("\n");
  const checklistRules = blueprint.checklistGenerationRules.rules.map((r) => `- ${r}`).join("\n");
  return `FILE ROLES for this framework (internal only — rename per goal, never use these role names literally as file titles; use only the roles that fit each folder, not all ${blueprint.fileGenerationRules.fileRoles.length} every time):
${roles}
${blueprint.fileGenerationRules.namingRule}

CHECKLIST PHILOSOPHY: ${blueprint.checklistGenerationRules.philosophy}
${checklistRules}
Favor these action verbs: ${blueprint.checklistGenerationRules.approvedActionVerbs.join(", ")}. Avoid patterns like: ${blueprint.checklistGenerationRules.prohibitedPatterns.join(", ")}.`;
}
