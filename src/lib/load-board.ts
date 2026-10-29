import "server-only";
import { buildBoardRows } from "@/lib/board";
import { appsRepo, competitorsRepo, keywordsRepo, rankChecksRepo } from "@/lib/db";
import type { Board } from "@/types";

/** The board for one of the owner's projects; null when it doesn't exist or isn't theirs. */
export async function loadBoard(appId: number, ownerId: string): Promise<Board | null> {
  const project = await appsRepo.getProject(appId, ownerId);
  if (!project) return null;
  const [keywords, localized, checks, competitors] = await Promise.all([
    keywordsRepo.listKeywords(appId),
    keywordsRepo.listLocalized(appId),
    rankChecksRepo.latestRankChecks(appId),
    competitorsRepo.listCompetitors(appId),
  ]);
  return { project, competitors, rows: buildBoardRows(project, keywords, localized, checks, competitors) };
}
