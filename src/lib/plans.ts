import type { Plan } from "@/types";

/**
 * What each plan allows. A "free attempt" is one project (brainstorm, localize and checks inside
 * it). `projects` counts projects ever created, so deleting one doesn't give a free slot back.
 */
export const PLAN_LIMITS: Record<Plan, { projects: number; label: string }> = {
  free: { projects: 2, label: "Free" },
  premium: { projects: Number.POSITIVE_INFINITY, label: "Premium" },
};

export function projectsLeft(plan: Plan, projectsCreated: number): number {
  return Math.max(0, PLAN_LIMITS[plan].projects - projectsCreated);
}

export const canCreateProject = (plan: Plan, projectsCreated: number) => projectsLeft(plan, projectsCreated) > 0;
