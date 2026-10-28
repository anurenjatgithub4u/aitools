import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Verdict } from "@/types";

const STYLES: Record<Verdict, string> = {
  Target: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Push: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  Maybe: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Swap: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  Dead: "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
};

export const VERDICTS = Object.keys(STYLES) as Verdict[];

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Badge className={cn("border-transparent", STYLES[verdict])}>{verdict}</Badge>;
}
