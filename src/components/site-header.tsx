import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { authEnabled } from "@/lib/firebase/config";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader({ children }: { children?: React.ReactNode }) {
  const user = authEnabled ? await getCurrentUser() : null;
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <SearchIcon className="size-4" />
          </span>
          <span className="hidden sm:inline">Keyword Planner</span>
        </Link>
        <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{children}</div>
        <ThemeToggle />
        {authEnabled &&
          (user ? (
            <UserMenu user={user} />
          ) : (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login?mode=signup">Get started</Link>
              </Button>
            </div>
          ))}
      </div>
    </header>
  );
}
