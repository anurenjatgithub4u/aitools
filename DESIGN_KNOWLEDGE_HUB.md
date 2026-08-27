# FindUrAI Knowledge Hub — Information Architecture Redesign

Version: 1.0 · Status: Design (approved spec pending) · Companion to: FEATURE_REDESIGN_2.0.md

---

# The Core Insight

The topical SEO strategy and the learning-platform experience are **the same structure rendered differently**.

A topic cluster (pillar + supporting articles + internal links) is already a curriculum:
the pillar is the overview, the cluster articles are lessons, the linking rules are prerequisites.
Google sees a cluster. Humans should see a course.

So this redesign adds **no new content system**. It adds one new entity — the **Topic** — that
sits on top of existing articles, workflows, prompts and tools, and three new page types that
render it. Articles keep their URLs. SEO loses nothing. Humans gain a map.

> SEO is for Google. Navigation is for humans. Same data, two renderings.

---

# 1. Information Hierarchy

```
Knowledge Home (/learn)
└── Category            e.g. AI Engineering          (~6–10 total, fixed set)
    └── Topic           e.g. AI Agents               (10–30 per category)
        ├── Overview                                  (orientation, who it's for)
        ├── Learning Path                             (ordered guides = the spine)
        ├── Guides                                    (all articles, grouped, dense list)
        ├── Workflows                                 (reusable, save-to-workspace)
        ├── Prompt Packs                              (prompt bundles, save-to-workspace)
        ├── Playbooks                                 (worked solutions)
        ├── Tool Collection                           (directory tools for this topic)
        └── Related Topics                            (lateral navigation)
            └── Guide / Article (/blog/[slug])        (unchanged URLs — the leaves)
```

**Why this hierarchy:**
- Every level has a bounded cardinality, so no page ever lists more than ~30 siblings.
  1000+ guides ÷ hundreds of topics ≈ 5–40 guides per topic — human-scannable forever.
- The Topic is the unit of *intent* ("I want to understand AI Agents"), so it's the unit of
  navigation. Categories are too broad to learn; articles are too narrow to browse.
- Resources of different kinds (guide, workflow, prompt pack, tool) attach to the same Topic —
  this is what makes FindUrAI an OS rather than a blog: **learn it, then do it, then reuse it,
  on one page.**

---

# 2. Content Model (data, not UI)

## Topic definition — one JSON file per topic

`content/topics/ai-agents.json`

```json
{
  "slug": "ai-agents",
  "title": "AI Agents",
  "tagline": "From 'what is an agent?' to shipping one in production.",
  "emoji": "🤖",
  "category": "ai-engineering",
  "level": "Beginner → Advanced",
  "overview": "2–3 paragraphs of orientation markdown...",
  "learningPath": [
    { "section": "Foundations", "items": [
      { "slug": "what-is-an-ai-agent-beginner-guide", "level": "Beginner", "role": "start-here" },
      { "slug": "ai-agent-vs-chatbot", "level": "Beginner" },
      { "slug": "ai-agent-vs-ai-assistant", "level": "Beginner" }
    ]},
    { "section": "Core Components", "items": [
      { "slug": "ai-agent-architecture", "level": "Intermediate" },
      { "slug": "ai-agent-memory-explained", "level": "Intermediate" },
      { "slug": "ai-agent-planning-explained", "level": "Intermediate" },
      { "slug": "tool-calling-in-ai-agents", "level": "Intermediate", "planned": true }
    ]},
    { "section": "Scaling Up", "items": [
      { "slug": "single-agent-vs-multi-agent-systems", "level": "Advanced" },
      { "slug": "ai-agent-vs-rag", "level": "Intermediate", "planned": true }
    ]},
    { "section": "Building", "items": [
      { "slug": "best-ai-agent-frameworks-2026", "level": "Intermediate" },
      { "slug": "how-to-build-your-first-ai-agent", "level": "Intermediate", "planned": true }
    ]},
    { "section": "Production", "items": [
      { "slug": "ai-agent-security-best-practices", "level": "Advanced", "planned": true },
      { "slug": "real-world-ai-agent-examples", "level": "Beginner", "planned": true }
    ]}
  ],
  "extraGuides": [
    { "group": "Reference", "slugs": ["ai-agent-glossary", "ai-agent-cheat-sheet-2026", "ai-agent-interview-questions"] }
  ],
  "workflows": [
    { "title": "Build & ship a support agent", "goal": "Customer support agent", "source": "starter-kit" }
  ],
  "promptPacks": [
    { "title": "Agent Design Prompts", "description": "10 prompts for specs, evals and debugging",
      "prompts": [{ "title": "...", "text": "..." }] }
  ],
  "toolTags": ["AI Agents", "Developer Tools"],
  "toolIds": ["langgraph", "crewai", "n8n-ai"],
  "relatedTopics": ["rag", "mcp", "prompt-engineering"]
}
```

## Article frontmatter — two optional fields, fully backwards compatible

```yaml
topic: "ai-agents"      # attaches the article to a hub
level: "Intermediate"   # shown as a chip in lists
```

**Why data-first:** adding topic #200 is a JSON file, not a page build. The registry is
diffable, reviewable, and — later — generatable from the workspace itself. `"planned": true`
items render greyed-out in the path ("Coming soon"), which turns the content roadmap into
visible product surface and sets reader expectations honestly.

---

# 3. URL Structure (Deliverable 10)

| URL | Page | Notes |
|---|---|---|
| `/learn` | Knowledge Home | new browsing entry point |
| `/learn/ai-engineering` | Category page | topics, not articles |
| `/topics/ai-agents` | Topic Hub | the new head-term SEO landing page |
| `/blog/what-is-an-ai-agent-beginner-guide` | Article | **unchanged — zero migration** |
| `/blog` | All-articles index | kept for completists + SEO; demoted in nav |

**Why:**
- **Articles never move.** All existing rankings, backlinks and internal links stay intact.
  The redesign is purely additive — the safest possible SEO posture.
- `/topics/[slug]` is flat, not nested under category, because topics may belong to more than
  one category later (MCP is AI Engineering *and* Tooling); a flat canonical URL avoids
  duplicate-content ambiguity. Category context comes from breadcrumbs, not the path.
- `/learn` namespace avoids colliding with the existing `/category/[slug]` routes, which
  belong to the tool directory.
- Topic hubs give you pages that can rank for **head terms** ("AI agents") that individual
  long-tail articles never win — the missing SEO layer above the cluster.

Structured data: `BreadcrumbList` on every level; `ItemList` + `LearningResource` schema on
hubs; articles keep existing article schema and gain `isPartOf` → topic hub.

---

# 4. Page Designs + UX Reasoning (Deliverables 1–8, 12)

## 4.1 Knowledge Home — `/learn` (Deliverable 1)

```
┌────────────────────────────────────────────────┐
│  What do you want to learn today?   [search]   │   ← same question as product, one voice
│                                                │
│  ▸ START HERE  ────────────────────────────    │
│  [🤖 AI Agents] [🧠 RAG] [🔌 MCP] [✍️ Prompting] │   ← 4 featured topic cards, editorial pick
│                                                │
│  AI ENGINEERING                     view all → │
│  [topic card] [topic card] [topic card]        │   ← topics only. never articles.
│                                                │
│  PRODUCTIVITY                       view all → │
│  [topic card] [topic card] [topic card]        │
│                                                │
│  Recently updated guides            (small, dense list — the only article-level element)
└────────────────────────────────────────────────┘
```

**Reasoning:** the current blog index asks readers to choose between 30 near-identical cards —
choice paralysis with no signal of where to start. The home should ask one question ("what do
you want to learn?") and answer with **topics** — a vocabulary humans actually think in. The
single dense "recently updated" list serves returning readers without re-flattening the
hierarchy. Scales to hundreds of topics because categories cap what's shown and search handles
the tail.

## 4.2 Category Page — `/learn/ai-engineering` (Deliverable 2)

```
Learn › AI Engineering
─────────────────────────
The systems behind modern AI products.
12 topics · 87 guides · 34 workflows

SUGGESTED ORDER                                  ← roadmap.sh-style, but honest
①  Foundations        [LLMs] [Prompt Engineering]
②  Retrieval & Memory [RAG] [Vector Databases]
③  Agents & Tools     [AI Agents] [MCP]
④  Production         [AI Security] [Evals]

ALL TOPICS (A–Z)                                 ← compact grid for direct seekers
[topic card]  [topic card]  [topic card] ...
```

Topic card contents: emoji · title · tagline · `9 guides · 3 workflows` · level range ·
progress bar (if any guides completed).

**Reasoning:** two audiences hit a category page — *learners* who want sequence (served by the
suggested order) and *hunters* who know their target (served by the A–Z grid). Both get their
path in one screen. Counting resources on the card ("9 guides") signals depth honestly, which
identical hero images never did. The suggested order is numbered but not gated: adults skip
freely; the numbers are advice, not locks.

## 4.3 Topic Hub — `/topics/ai-agents` (Deliverable 3) — THE core page

```
Learn › AI Engineering › AI Agents
──────────────────────────────────────────────
🤖 AI Agents
From "what is an agent?" to shipping one in production.
10 guides · 3 workflows · 2 prompt packs · Beginner → Advanced

[▶ Start Learning]   [+ Save topic to Workspace]     ← the two intents, and only these two

OVERVIEW (2–3 short paragraphs: what, why now, who this is for)

LEARNING PATH                        ▓▓▓░░░░░ 3/12   ← the spine (see 4.4)
GUIDES                                               ← everything, grouped (see 4.5)
WORKFLOWS                                            ← do it (see 4.6)
PROMPT PACKS                                         ← reuse it (see 4.7)
TOOLS FOR THIS TOPIC                                 ← directory bridge
RELATED TOPICS                                       ← lateral moves (see 4.8)
```

Sticky in-page section nav on desktop (Overview · Path · Guides · Workflows · Prompts · Tools)
— the Stripe-docs pattern, because this page is intentionally long.

**Reasoning:** the hub answers the three questions in the order people ask them —
*what is this?* (overview), *how do I learn it?* (path), *how do I use it?* (workflows,
prompts, tools). Exactly one primary CTA ("Start Learning") because a first-time visitor
should never have to decide among nine sections; everyone else scrolls or uses the section
nav. "Save topic to Workspace" is the product bridge: the hub's workflows and prompt packs
land in the user's FindUrAI workspace — content becomes the OS's on-ramp.

## 4.4 Learning Path Layout (Deliverable 4)

On the hub — a sectioned vertical stepper:

```
FOUNDATIONS
  ✓ 1. What is an AI Agent?             Beginner · 11 min      ← done-state
  ● 2. AI Agent vs Chatbot              Beginner · 11 min      ← current (Resume points here)
  ○ 3. AI Agent vs AI Assistant         Beginner · 10 min
CORE COMPONENTS
  ○ 4. How AI Agents Work               Intermediate · 12 min
  ○ 5. Memory  ○ 6. Planning  ○ 7. Tool Calling (coming soon)  ← greyed, honest roadmap
...
```

On each article page (when the article belongs to a path):
- **Left rail (desktop)**: the path with the current item highlighted — the Apple-docs sidebar.
- **Footer nav**: `← Previous: Architecture   |   Next: Planning →` — the only element a
  reader needs to keep momentum.
- **Topic pill above the title**: `🤖 AI Agents · Lesson 5 of 12` linking back to the hub.

Progress: stored in `localStorage` for anonymous readers (zero-friction), synced to the
workspace account when signed in (the "your progress everywhere" hook that gives casual
readers a reason to create an account).

**Reasoning:** the article page is where readers actually are — if progression only exists on
the hub, nobody follows it. Prev/next + rail turns every article into a lesson **without
changing its URL or content**, so the SEO artifact and the lesson are literally the same
document. Checkmarks are motivating but never gating: any item is clickable in any order.

## 4.5 Guides Section (Deliverable 5)

Dense, grouped **list rows** — explicitly not card grids:

```
GUIDES
Comparisons
  · AI Agent vs Chatbot — capability: the loop and tools        Beginner · 11 min
  · AI Agent vs AI Assistant — control: who holds the wheel     Beginner · 10 min
Core Components
  · Architecture / Memory / Planning ...
Reference
  · Glossary · Cheat Sheet · Interview Questions
```

**Reasoning:** this is the direct fix for "many similar articles with similar hero images."
Hero-image cards spend ~80% of their pixels on the least differentiating element (the image)
and force 2–3 columns × huge rows. A title + one-line-differentiator row is scannable at 10×
the density — Apple and Stripe list hundreds of docs this way. Images still live on the
articles themselves and in social shares, where they earn their keep. Grouping carries the
information the grid destroyed: *why these articles differ*.

## 4.6 Workflow Section (Deliverable 6)

Cards (workflows are few and action-shaped, so cards are right here):
title · goal · steps count · tools used · time · **[Save to Workspace]**.
Sources: curated workflow definitions in the topic JSON, plus "Generate a starter kit for
this topic" (the existing `/api/workspace/starter-kit`), plus — later — community playbooks.

**Reasoning:** guides teach; workflows *do*. Keeping them adjacent on the hub is the OS thesis
on one screen. One-click save into the user's workspace closes the loop the 2.0 redesign
promised: Discover → Save → Reuse. This section is also the natural home for future paid or
community content, without any IA change.

## 4.7 Prompt Pack Section (Deliverable 7)

Pack card: title · description · `10 prompts` · preview of 2 · **[Save all to Prompt Library]**
(individual prompts expandable/copyable inline for anonymous users).

**Reasoning:** prompts are the highest-frequency reusable asset and the cheapest workspace
on-ramp — saving a pack costs one click and immediately makes the workspace worth returning
to. Inline copy keeps anonymous users served (SEO goodwill); save-all rewards signing in.
At 10,000+ prompt packs scale, packs stay discoverable because they attach to topics —
nobody ever browses a global list.

## 4.8 Related Topics (Deliverable 8)

Chip row at hub bottom + "Continue your journey" block after finishing a path:
`RAG →` `MCP →` `Prompt Engineering →` — each chip: emoji, title, 4-word reason
("agents that remember" for RAG).

**Reasoning:** lateral navigation is how a knowledge base becomes a web instead of silos, and
it's the human twin of the SEO cluster-to-cluster links. The 4-word reason matters: naked
topic names force the user to guess relevance; the reason makes the edge meaningful — same
principle as the typed relationships in the workspace graph.

---

# 5. Navigation Structure (Deliverable 9)

**Header:** `Explore Tools · Compare · Learn ▾ · Workspace · Blog→(inside Learn)`
- "Learn" replaces "Blog" as the primary content entry. Dropdown: 4 categories + 4 featured
  topics + "All guides" (the old /blog index, kept one click away).

**Breadcrumbs:** on every learn/topic/article page: `Learn › AI Engineering › AI Agents ›
Memory Explained` — each segment clickable. This is the single highest-value orientation
element and also feeds `BreadcrumbList` schema.

**Article page changes (additive only):** topic pill above title · path rail (desktop) ·
prev/next footer · "Related resources" box (path-aware: same-topic items first) replacing
the generic recent-posts block.

**Footer:** topics sitemap grouped by category (SEO crawl paths + long-tail navigation).

**Reasoning:** navigation should always answer three questions: *where am I* (breadcrumb +
topic pill), *what's next* (prev/next), *what else is here* (hub link + related). Every
addition is one of those answers; anything that isn't, stays out.

---

# 6. React Component Hierarchy (Deliverable 11)

```
src/lib/topics.ts               # loadTopics(), getTopic(slug), resolvePath(topic) → joins
                                # topic JSON with blog frontmatter (title/readingTime/level)
content/topics/*.json           # one file per topic (registry)

app/learn/page.tsx                      <KnowledgeHome>
app/learn/[category]/page.tsx           <CategoryPage>
app/topics/[slug]/page.tsx              <TopicHub>          # SSG via generateStaticParams

components/learn/
  TopicCard              # emoji, tagline, counts, level range, progress bar
  CategorySection        # label + TopicCard row (home)
  SuggestedOrder         # numbered topic groups (category page)
  TopicHeader            # breadcrumb, meta, StartLearning + SaveTopic CTAs
  TopicSectionNav        # sticky in-page nav (desktop)
  LearningPath           # sections → PathItem (✓/●/○, level chip, time, planned state)
  GuideList / GuideRow   # dense grouped rows
  WorkflowCard           # + SaveToWorkspace (reuses workspace quick-create API)
  PromptPackCard         # expandable prompts, copy, save-all
  TopicTools             # ToolCard reuse, filtered by toolTags/toolIds
  RelatedTopicChips
  ProgressProvider       # context: localStorage + workspace sync; used by hub & articles

components/blog/ (additive to existing article template)
  TopicPill              # "🤖 AI Agents · Lesson 5 of 12"
  PathRail               # desktop sidebar (renders LearningPath, compact variant)
  PathFooterNav          # prev / next
```

Everything reuses existing primitives (Badge, Button, Card, ToolCard, workspaceApi).
No new backend needed for phase 1 — topics are static JSON, progress is client-side,
save-to-workspace uses the existing `/api/workspace/*` routes.

---

# 7. Scalability Check (the stress test)

| Scale claim | How the IA absorbs it |
|---|---|
| 1000+ guides | ÷ topics → 5–40 per hub, grouped lists; hub never paginates |
| Hundreds of topics | ÷ categories (6–10) → 10–30 topic cards per category; search for the tail |
| 5000+ workflows | attached to topics; hubs show curated 3–6 + "view all" filtered view |
| 10000+ prompt packs | same attachment rule; packs are topic-scoped, never globally listed |
| Thousands of tools | already solved by the directory; hubs surface only tagged subsets |

The invariant that makes it work: **no page ever renders an unbounded list.** Every level
shows a bounded, curated set plus a search/filter escape hatch.

---

# 8. Rollout Plan

1. **Phase 1 — AI Agents hub (1 topic, proves the model):** topics registry + `/topics/ai-agents`
   + article prev/next + topic pill. Ships against the 7 live cluster articles today;
   planned articles appear greyed in the path.
2. **Phase 2 — Learn layer:** `/learn`, category pages, header nav swap, breadcrumbs, footer sitemap.
3. **Phase 3 — Workspace bridge:** save-topic, save-workflow, save-prompt-pack, progress sync.
4. **Phase 4 — Scale:** topic JSON for every existing category's content; retire hero-image
   grids from all listing surfaces; add hub schema markup.

Each phase is independently shippable and purely additive to what exists.
