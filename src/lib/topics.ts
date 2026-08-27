import fs from 'fs';
import path from 'path';
import { getBlogPosts, type BlogPost } from '@/lib/blog';

// The Topic Hub layer (see DESIGN_KNOWLEDGE_HUB.md). Topics are static JSON in
// content/topics/*.json and are joined at build time with live blog frontmatter,
// so a hub always reflects the real articles that exist.

export interface RawPathItem {
  slug: string;
  level?: string;
  role?: string;
  planned?: boolean;
  title?: string;
}

export interface RawPathSection {
  section: string;
  summary?: string;
  items: RawPathItem[];
}

export interface RawTopic {
  slug: string;
  title: string;
  tagline: string;
  emoji: string;
  category: string;
  level: string;
  overview: string;
  startHere: string;
  learningPath: RawPathSection[];
  reference?: { label: string; items: RawPathItem[] };
  workflows?: TopicWorkflow[];
  promptPacks?: TopicPromptPack[];
  toolTags?: string[];
  toolIds?: string[];
  relatedTopics?: RelatedTopic[];
}

export interface TopicWorkflow {
  title: string;
  goal: string;
  steps: number;
  tools: string[];
  time: string;
  starterKitQuery?: string;
}

export interface TopicPromptPack {
  title: string;
  description: string;
  prompts: { title: string; text: string }[];
}

export interface RelatedTopic {
  slug: string;
  title: string;
  emoji: string;
  reason: string;
  planned?: boolean;
}

// A path item resolved against real blog data
export interface ResolvedPathItem {
  slug: string;
  title: string;
  description: string;
  readingTime: string;
  level: string;
  role?: string;
  planned: boolean;
  live: boolean;
  order: number; // 1-based position across the whole path (live + planned)
}

export interface ResolvedPathSection {
  section: string;
  summary?: string;
  items: ResolvedPathItem[];
}

export interface Topic extends Omit<RawTopic, 'learningPath' | 'reference'> {
  learningPath: ResolvedPathSection[];
  reference: ResolvedPathItem[];
  guideCount: number;
  workflowCount: number;
  promptPackCount: number;
  totalReadingMinutes: number;
  flatPath: ResolvedPathItem[]; // live items only, in order — for prev/next
}

const topicsDirectory = path.join(process.cwd(), 'content/topics');

function readingMinutes(readingTime: string): number {
  const m = readingTime.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function resolveItem(
  raw: RawPathItem,
  postBySlug: Map<string, BlogPost>,
  order: number
): ResolvedPathItem {
  const post = postBySlug.get(raw.slug);
  const live = !!post && !raw.planned;
  return {
    slug: raw.slug,
    title: post?.title || raw.title || raw.slug,
    description: post?.description || '',
    readingTime: post?.readingTime || '',
    level: raw.level || '',
    role: raw.role,
    planned: !live,
    live,
    order,
  };
}

export async function getTopic(slug: string): Promise<Topic | null> {
  const file = path.join(topicsDirectory, `${slug}.json`);
  if (!fs.existsSync(file)) return null;

  const raw: RawTopic = JSON.parse(fs.readFileSync(file, 'utf8'));
  const posts = await getBlogPosts();
  const postBySlug = new Map(posts.map((p) => [p.slug, p]));

  let order = 0;
  const learningPath: ResolvedPathSection[] = raw.learningPath.map((sec) => ({
    section: sec.section,
    summary: sec.summary,
    items: sec.items.map((it) => resolveItem(it, postBySlug, ++order)),
  }));

  const reference: ResolvedPathItem[] = (raw.reference?.items || []).map((it) =>
    resolveItem(it, postBySlug, 0)
  );

  const flatPath = learningPath.flatMap((s) => s.items).filter((i) => i.live);
  const guideCount = flatPath.length;
  const totalReadingMinutes = flatPath.reduce((sum, i) => sum + readingMinutes(i.readingTime), 0);

  return {
    ...raw,
    learningPath,
    reference,
    flatPath,
    guideCount,
    workflowCount: raw.workflows?.length || 0,
    promptPackCount: raw.promptPacks?.length || 0,
    totalReadingMinutes,
  };
}

export async function getAllTopicSlugs(): Promise<string[]> {
  if (!fs.existsSync(topicsDirectory)) return [];
  return fs
    .readdirSync(topicsDirectory)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

export async function getAllTopics(): Promise<Topic[]> {
  const slugs = await getAllTopicSlugs();
  const topics = await Promise.all(slugs.map((s) => getTopic(s)));
  return topics.filter((t): t is Topic => t !== null);
}

// Given an article slug, find which topic it belongs to and its neighbours in
// the learning path — powers the topic pill + prev/next on the article page.
export interface ArticleTopicContext {
  topicSlug: string;
  topicTitle: string;
  topicEmoji: string;
  lessonNumber: number;
  totalLessons: number;
  prev: ResolvedPathItem | null;
  next: ResolvedPathItem | null;
}

export async function getArticleTopicContext(
  articleSlug: string
): Promise<ArticleTopicContext | null> {
  const topics = await getAllTopics();
  for (const topic of topics) {
    const idx = topic.flatPath.findIndex((i) => i.slug === articleSlug);
    if (idx === -1) continue;
    return {
      topicSlug: topic.slug,
      topicTitle: topic.title,
      topicEmoji: topic.emoji,
      lessonNumber: idx + 1,
      totalLessons: topic.flatPath.length,
      prev: idx > 0 ? topic.flatPath[idx - 1] : null,
      next: idx < topic.flatPath.length - 1 ? topic.flatPath[idx + 1] : null,
    };
  }
  return null;
}
