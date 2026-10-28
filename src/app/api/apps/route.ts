import { appsRepo } from "@/lib/db";
import { parseBody, route } from "@/lib/http";
import { resolveApp } from "@/lib/resolve-app";
import { CreateProjectInput } from "@/lib/schemas/api";

export const runtime = "nodejs";

export const GET = route(async () => Response.json({ projects: await appsRepo.listProjects() }));

/** Creates a project from an app name or niche idea; an App Store link/id links "my app". */
export const POST = route(async (req: Request) => {
  const input = await parseBody(req, CreateProjectInput);
  const mine = input.appStore ? (await resolveApp(input.appStore, input.countries[0])).app : null;
  const project = await appsRepo.createProject({
    name: input.name,
    niche: input.niche,
    audience: input.audience,
    countries: input.countries,
    itunesId: mine?.trackId ?? null,
    icon: mine?.icon || null,
  });
  return Response.json({ project }, { status: 201 });
});
