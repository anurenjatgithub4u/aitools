import "server-only";
import { buildBoardRows } from "@/lib/board";
import { appsRepo, competitorsRepo, keywordsRepo, rankChecksRepo } from "@/lib/db";
import type { Board } from "@/types";

export async function loadBoard(appId: number): Promise<Board | null> {
  const project = await appsRepo.getProject(appId);
  if (!project) return null;
  const [keywords, localized, checks, competitors] = await Promise.all([
    keywordsRepo.listKeywords(appId),
    keywordsRepo.listLocalized(appId),
    rankChecksRepo.latestRankChecks(appId),
    competitorsRepo.listCompetitors(appId),
  ]);
  return { project, competitors, rows: buildBoardRows(project, keywords, localized, checks, competitors) };
}
