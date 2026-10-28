import "server-only";
import type { CountryCode } from "@/lib/countries";
import { HttpError } from "@/lib/http";
import { findAppsByName, ItunesError, lookupApp } from "@/lib/itunes/client";
import { parseAppStoreId } from "@/lib/itunes/parse";
import type { TopApp } from "@/types";

/**
 * Turns user input into an App Store app: an App Store link or numeric id is looked up directly;
 * anything else is searched by name and the closest name match wins. `alternatives` lets the UI
 * offer "not this one?" choices.
 */
export async function resolveApp(query: string, country: CountryCode): Promise<{ app: TopApp; alternatives: TopApp[] }> {
  try {
    const id = parseAppStoreId(query);
    if (id) {
      // apps can be missing from one storefront, so fall back to the US store
      const app = (await lookupApp(id, country)) ?? (country !== "US" ? await lookupApp(id, "US") : null);
      if (!app) throw new HttpError(404, "app_not_found", `No App Store app with id ${id}`);
      return { app, alternatives: [] };
    }
    const found = await findAppsByName(query, country);
    if (!found.length) throw new HttpError(404, "app_not_found", `No app found for "${query}"`);
    const q = query.trim().toLowerCase();
    const best = found.find((a) => a.name.toLowerCase() === q) ?? found.find((a) => a.name.toLowerCase().startsWith(q)) ?? found[0];
    return { app: best, alternatives: found.filter((a) => a.trackId !== best.trackId).slice(0, 4) };
  } catch (e) {
    if (e instanceof ItunesError) throw new HttpError(502, "itunes_error", e.message);
    throw e;
  }
}
