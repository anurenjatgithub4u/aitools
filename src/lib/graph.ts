import fs from 'fs';
import path from 'path';
import { getAllPacks, getPack, type PromptPack } from '@/lib/packs';

// Lightweight knowledge graph (UI & Knowledge Graph spec §4).
// Nodes: packs, techniques, tools, concepts. Edges are DERIVED at read time
// from pack tags (uses_technique, belongs_to_concept, requires_tool) plus the
// hand-curated related_pack + prerequisite_of lists in content/graph.json.
// Invisible infrastructure: it powers "Related" rails + technique pages —
// no graph visualization until the library is big enough to deserve one.

export interface TechniqueNode {
  slug: string;
  label: string;
  short: string;
  body: string;
  prerequisiteOf?: string[];
}

export interface ConceptNode {
  slug: string;
  label: string;
}

interface GraphFile {
  techniques: TechniqueNode[];
  concepts: ConceptNode[];
  relatedPacks: [string, string][];
}

function loadGraph(): GraphFile {
  const file = path.join(process.cwd(), 'content/graph.json');
  if (!fs.existsSync(file)) return { techniques: [], concepts: [], relatedPacks: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function getAllTechniques(): TechniqueNode[] {
  return loadGraph().techniques;
}

export function getTechnique(slug: string): TechniqueNode | null {
  return loadGraph().techniques.find((t) => t.slug === slug) || null;
}

export function getConcept(slug: string): ConceptNode | null {
  return loadGraph().concepts.find((c) => c.slug === slug) || null;
}

// Packs that use a technique (edge: pack --uses_technique--> technique)
export function getPacksUsingTechnique(techniqueSlug: string): PromptPack[] {
  return getAllPacks().filter((p) => p.techniques?.includes(techniqueSlug));
}

// The "Related" rail for a pack detail page: related packs (curated edges +
// same-concept siblings) and the techniques the pack teaches.
export interface PackRelated {
  packs: { slug: string; title: string; benefit?: string }[];
  techniques: TechniqueNode[];
}

export function getRelatedForPack(slug: string): PackRelated {
  const graph = loadGraph();
  const pack = getPack(slug);
  if (!pack) return { packs: [], techniques: [] };

  const relatedSlugs = new Set<string>();
  for (const [a, b] of graph.relatedPacks) {
    if (a === slug) relatedSlugs.add(b);
    if (b === slug) relatedSlugs.add(a);
  }
  // Same-concept siblings fill in if curation gave fewer than 3
  if (relatedSlugs.size < 3) {
    for (const p of getAllPacks()) {
      if (p.slug !== slug && p.concept === pack.concept) {
        relatedSlugs.add(p.slug);
      }
      if (relatedSlugs.size >= 3) break;
    }
  }

  const packs = [...relatedSlugs]
    .slice(0, 3)
    .map((s) => getPack(s))
    .filter((p): p is PromptPack => !!p)
    .map((p) => ({ slug: p.slug, title: p.title, benefit: p.benefit }));

  const techniques = (pack.techniques || [])
    .map((t: string) => graph.techniques.find((n) => n.slug === t))
    .filter((t: TechniqueNode | undefined): t is TechniqueNode => !!t)
    .slice(0, 3);

  return { packs, techniques };
}
