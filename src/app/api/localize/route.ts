import type { CountryCode } from "@/lib/countries";
import { appsRepo, keywordsRepo } from "@/lib/db";
import { HttpError, parseBody, route } from "@/lib/http";
import { localizeKeywords } from "@/lib/openai/localize";
import { LocalizeInput } from "@/lib/schemas/api";
import { mapLimit } from "@/lib/async";

export const runtime = "nodejs";

// Keywords per model call; keeps prompts short and lets one bad batch retry cheaply.
const BATCH = 30;

/** Produces the local search phrase for each keyword × country and saves it, linked to the English keyword. */
export const POST = route(async (req: Request) => {
  const input = await parseBody(req, LocalizeInput);
  const project = await appsRepo.getProject(input.appId);
  if (!project) throw new HttpError(404, "not_found", "Project not found");

  const keywords = input.keywordIds
    ? await keywordsRepo.getKeywordsByIds(project.id, input.keywordIds)
    : await keywordsRepo.listKeywords(project.id);
  if (!keywords.length) throw new HttpError(400, "no_keywords", "Add or brainstorm keywords first");
  const countries: CountryCode[] = input.countries ?? project.countries;

  const jobs = countries.flatMap((country) =>
    chunk(keywords, BATCH).map((batch) => ({ country, batch: batch.map((k) => ({ id: k.id, term: k.term })) })),
  );
  const results = await mapLimit(jobs, 3, async ({ country, batch }) =>
    (await localizeKeywords(country, batch)).map((r) => ({ ...r, country })),
  );
  await keywordsRepo.upsertLocalized(results.flat());

  return Response.json({ localized: await keywordsRepo.listLocalized(project.id) });
});

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
