import { Hero } from "@/components/home/hero";
import { ProjectsView } from "@/components/projects/projects-view";
import { SiteHeader } from "@/components/site-header";
import { appsRepo } from "@/lib/db";
import { authEnabled } from "@/lib/firebase/config";
import { PLAN_LIMITS, projectsLeft } from "@/lib/plans";
import { getCurrentUser } from "@/lib/session";

// Per-user data on every request (and keeps `next build` from opening the database).
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const projects = user ? await appsRepo.listProjects(user.id) : [];
  const quota =
    user && authEnabled && user.plan === "free"
      ? { left: projectsLeft(user.plan, user.projectsCreated), total: PLAN_LIMITS.free.projects }
      : null;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <Hero signedIn={user !== null} hasProjects={projects.length > 0} />
        {user && <ProjectsView initialProjects={projects} quota={quota} />}
      </main>
    </>
  );
}
