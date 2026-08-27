import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WorkspaceItem } from "@/models/WorkspaceItem";
import { generateMission, toSteps } from "@/lib/workspace-generation";

// Repairs an already-existing project: every non-stub file must be a
// mission (workspace-generation-spec.md), but projects generated before
// ensureItemMission() was added to the generation pipeline can still have
// gaps. Called from the Dashboard on load — cheap no-op once a project has
// no gaps left, since the DB query below returns nothing to do.

// Caps how many AI calls run at once — firing one per missing file
// unbounded risks provider rate limits on projects with many gaps, which
// would silently strand exactly the files this route exists to fix.
const CONCURRENCY = 4;
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    if (!userId || !projectId) {
      return NextResponse.json({ error: "userId and projectId are required" }, { status: 400 });
    }

    await connectDB();
    const missing = await WorkspaceItem.find({
      userId,
      projectId,
      generationState: "generated",
      $or: [{ "typeData.steps": { $exists: false } }, { "typeData.steps": { $size: 0 } }],
    }).lean();

    const results = await mapWithConcurrency(missing, CONCURRENCY, async (it: any) => {
      try {
        const mission = await generateMission(it.title, it.markdownContent || "");
        if (mission.tasks.length === 0) return false;
        const res = await WorkspaceItem.updateOne(
          {
            _id: it._id,
            userId,
            $or: [{ "typeData.steps": { $exists: false } }, { "typeData.steps": { $size: 0 } }],
          },
          {
            $set: {
              "typeData.goal": it.typeData?.goal || mission.goal,
              "typeData.estimatedTime": it.typeData?.estimatedTime || mission.estimatedTime,
              "typeData.difficulty": it.typeData?.difficulty || mission.difficulty,
              "typeData.steps": toSteps(mission.tasks),
            },
          }
        );
        return res.modifiedCount > 0;
      } catch {
        // best-effort per item — leave it for the next scan or the manual button
        return false;
      }
    });
    const updated = results.filter(Boolean).length;

    return NextResponse.json({ scanned: missing.length, updated });
  } catch (error: any) {
    console.error("Backfill missions error:", error);
    return NextResponse.json({ error: "Failed to backfill checklists" }, { status: 500 });
  }
}
