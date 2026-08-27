import fs from 'fs';
import path from 'path';
import type { PromptPack } from '@/lib/packs-shared';

export * from '@/lib/packs-shared';

// Server-side loaders for official Prompt Packs (content/packs/*.json).
// See the Product Pivot Spec: packs are the primary, publicly-browsable content type.

const packsDirectory = path.join(process.cwd(), 'content/packs');

export function getAllPacks(): PromptPack[] {
  if (!fs.existsSync(packsDirectory)) return [];
  return fs
    .readdirSync(packsDirectory)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(packsDirectory, f), 'utf8')) as PromptPack)
    .filter((p) => p.isPublic)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getPack(slug: string): PromptPack | null {
  // Guard against path traversal — slugs are simple kebab-case ids
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const file = path.join(packsDirectory, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as PromptPack;
}

export function getAllPackSlugs(): string[] {
  return getAllPacks().map((p) => p.slug);
}
