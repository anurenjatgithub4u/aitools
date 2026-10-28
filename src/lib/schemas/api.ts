import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/countries";

// Request bodies for every route handler. Shared with the client so forms validate the same way.

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export const CountryCodeSchema = z.enum(COUNTRY_CODES);
export const Countries = z.array(CountryCodeSchema).min(1).max(COUNTRY_CODES.length);

export const CreateProjectInput = z.object({
  name: text(100),
  niche: optionalText(500),
  audience: optionalText(200),
  /** App Store link or numeric id of "my app". Optional: a project can be just a niche idea. */
  appStore: optionalText(300),
  countries: Countries.default(["US"]),
});
export type CreateProjectInput = z.input<typeof CreateProjectInput>;

export const UpdateProjectInput = z.object({
  countries: Countries.optional(),
  appStore: z.string().trim().max(300).nullable().optional(),
});

export const BrainstormInput = z.object({
  /** Existing project to add keywords to; when absent, a new project is created. */
  appId: z.number().int().positive().optional(),
  name: text(100),
  description: text(1000),
  audience: optionalText(200),
});
export type BrainstormInput = z.input<typeof BrainstormInput>;

const Ids = z.array(z.number().int().positive()).min(1).max(500);

export const LocalizeInput = z.object({
  appId: z.number().int().positive(),
  /** Defaults to every keyword in the project. */
  keywordIds: Ids.optional(),
  /** Defaults to the project's countries. */
  countries: Countries.optional(),
});
export type LocalizeInput = z.input<typeof LocalizeInput>;
