import { Hero } from "@/components/home/hero";
import { ProjectsView } from "@/components/projects/projects-view";
import { SiteHeader } from "@/components/site-header";
import { appsRepo } from "@/lib/db";

// Reads the local database on every request (and keeps `next build` from opening it).
export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await appsRepo.listProjects();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <Hero hasProjects={projects.length > 0} />
        <ProjectsView initialProjects={projects} />
      </main>
    </>
  );
}
