import "server-only";
import { appsRepo, usersRepo, type NewProject } from "@/lib/db";
import { authEnabled } from "@/lib/firebase/config";
import { HttpError } from "@/lib/http";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Project, User } from "@/types";

/**
 * Creates a project for `user`, using one slot of their plan's quota (2 on Free). Out of slots:
 * 402 upgrade_required, which the UI turns into an upgrade prompt. Local mode has no quota.
 */
export async function createProjectForUser(user: User, p: NewProject): Promise<Project> {
  if (!authEnabled) return appsRepo.createProject(user.id, p);
  const limit = PLAN_LIMITS[user.plan].projects;
  if (!(await usersRepo.takeProjectSlot(user.id, limit))) {
    throw new HttpError(402, "upgrade_required", `The ${PLAN_LIMITS[user.plan].label} plan includes ${limit} projects. Upgrade to Premium to create more.`);
  }
  try {
    return await appsRepo.createProject(user.id, p);
  } catch (e) {
    await usersRepo.returnProjectSlot(user.id);
    throw e;
  }
}
