"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session; created in state so it survives re-renders but not page reloads.
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } }));
  // Windows has no flag emoji; load a flags-only font there (self-hosted, see public/fonts).
  useEffect(() => void polyfillCountryFlagEmojis("Twemoji Country Flags", "/fonts/TwemojiCountryFlags.woff2"), []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <Toaster richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
