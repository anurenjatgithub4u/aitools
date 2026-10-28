import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <SearchIcon className="size-4" />
          </span>
          Keyword Planner
        </Link>
        <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{children}</div>
        <ThemeToggle />
      </div>
    </header>
  );
}
