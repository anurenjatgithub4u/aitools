// Client-safe Prompt Pack types + helpers (no fs). Server loaders live in lib/packs.ts.

export interface PackStep {
  stepNumber: number;
  tool: string; // "chatgpt" | "claude" | "gemini"
  title: string;
  promptText: string;
  whyThisTool: string;
  outputExpected: string;
}

export interface PackFaq {
  q: string;
  a: string;
}

export interface PromptPack {
  id: string;
  slug: string;
  title: string;
  description: string;
  benefit?: string; // outcome-first one-liner shown on cards (spec §0.5.2)
  roleTags: string[];
  toolTags: string[];
  techniques?: string[]; // graph edges: uses_technique
  concept?: string; // graph edge: belongs_to_concept
  isPublic: boolean;
  createdBy: 'official';
  lastVerifiedModel: string;
  lastVerifiedDate: string;
  steps: PackStep[];
  faq: PackFaq[];
}

export interface PackSummary {
  slug: string;
  title: string;
  description: string;
  benefit?: string;
  roleTags: string[];
  toolTags: string[];
  stepCount: number;
  lastVerifiedModel: string;
  lastVerifiedDate: string;
}

export const PACK_TOOLS: Record<
  string,
  { label: string; emoji: string; url: string; prefill: boolean }
> = {
  chatgpt: { label: 'ChatGPT', emoji: '🟢', url: 'https://chatgpt.com/', prefill: true },
  claude: { label: 'Claude', emoji: '🟠', url: 'https://claude.ai/new', prefill: true },
  gemini: { label: 'Gemini', emoji: '🔷', url: 'https://gemini.google.com/app', prefill: false },
};

// Deep link that opens the tool, prefilled where supported. The prompt is
// ALWAYS copied to clipboard first — prefill is a bonus, not the mechanism.
export function toolDeepLink(tool: string, promptText: string): string {
  const meta = PACK_TOOLS[tool] || PACK_TOOLS.chatgpt;
  if (meta.prefill && promptText.length < 1800) {
    const sep = meta.url.includes('?') ? '&' : '?';
    return `${meta.url}${sep}q=${encodeURIComponent(promptText)}`;
  }
  return meta.url;
}

export const PACK_ROLES = [
  { id: 'developer', label: 'Developer', emoji: '💻' },
  { id: 'writer', label: 'Writer', emoji: '✍️' },
  { id: 'marketer', label: 'Marketer', emoji: '📣' },
  { id: 'student', label: 'Student', emoji: '🎓' },
  { id: 'founder', label: 'Founder', emoji: '🚀' },
];

// Role metadata for SEO page titles and descriptions
export const PACK_ROLE_META: Record<string, { title: string; description: string }> = {
  developer: {
    title: 'Best ChatGPT & Claude Prompts for Developers (2026)',
    description:
      'Ready-to-run ChatGPT and Claude prompt packs for developers — debugging, code review, API design, SQL, unit testing and more. Copy, run, and remix into your own workflows.',
  },
  writer: {
    title: 'Best ChatGPT & Claude Prompts for Writers (2026)',
    description:
      'Copy-paste prompt packs for freelance writers, bloggers, and content creators — covering blog writing, copywriting, email newsletters, and content repurposing with ChatGPT, Claude, and Gemini.',
  },
  marketer: {
    title: 'Best ChatGPT & Claude Prompts for Marketers (2026)',
    description:
      'Ready-to-run prompt packs for marketers — social media content, ad copy, email campaigns, and landing pages. Multi-step sequences for ChatGPT and Claude you can run in one click.',
  },
  student: {
    title: 'Best ChatGPT & Claude Prompts for Students (2026)',
    description:
      'AI prompt packs for students — essay writing, exam prep, note-taking, research papers, and study plans. Use ChatGPT and Claude as a study partner, not a shortcut.',
  },
  founder: {
    title: 'Best ChatGPT & Claude Prompts for Founders (2026)',
    description:
      'Ready-to-run AI prompt packs for founders and solopreneurs — marketing copy, social content, and campaign strategy built for small teams.',
  },
};

// Turn a pack into markdown for the forked WorkspaceItem — renders in the
// existing item editor with prompts as copyable code blocks.
export function packToMarkdown(pack: PromptPack): string {
  const lines: string[] = [
    `> Remixed from [${pack.title}](/packs/${pack.slug}) · verified against ${pack.lastVerifiedModel} on ${pack.lastVerifiedDate}`,
    '',
  ];
  for (const step of pack.steps) {
    const tool = PACK_TOOLS[step.tool]?.label || step.tool;
    lines.push(`## Step ${step.stepNumber}: ${step.title} (${tool})`);
    lines.push('');
    lines.push('```');
    lines.push(step.promptText);
    lines.push('```');
    lines.push('');
    lines.push(`**Why ${tool}:** ${step.whyThisTool}`);
    lines.push('');
    lines.push(`**Good output looks like:** ${step.outputExpected}`);
    lines.push('');
  }
  return lines.join('\n');
}
