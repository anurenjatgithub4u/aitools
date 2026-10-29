import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { HomeJsonLd } from "@/components/seo/json-ld";
import { SITE } from "@/lib/site";
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
        <Faq />
      </main>
      <SiteFooter />
      <HomeJsonLd />
    </>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground">
        <span>
          © {new Date().getFullYear()} {SITE.brand} · {SITE.name}: App Store keyword research and ASO
        </span>
        <span>Search data from Apple&apos;s public iTunes Search API. Volume is an estimate.</span>
      </div>
    </footer>
  );
}
