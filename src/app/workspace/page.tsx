"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, Copy, Check, Zap, LayoutTemplate, GitBranch, FileText, Pencil, Sparkles } from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { PACK_ROLES } from "@/lib/packs-shared"
import { HeroSeeTheDifference } from "@/components/hero-see-the-difference"

// ─── Role-specific starter content ──────────────────────────────────────────

interface StarterContent {
  prompt: {
    title: string
    text: string
    packSlug: string
  }
  workflow: {
    title: string
    steps: string[]
    packSlug: string
  }
  promptChain: {
    title: string
    chain: { label: string; preview: string }[]
    packSlug: string
  }
  template: {
    title: string
    body: string
  }
}

const ROLE_CONTENT: Record<string, StarterContent> = {
  developer: {
    prompt: {
      title: "Debug this error",
      text: "You are a senior [LANGUAGE] engineer. I'm hitting this error:\n\n[PASTE ERROR + STACK TRACE]\n\nExplain: (1) what this error means, (2) the 3 most likely causes ranked by probability, (3) what evidence in the stack trace points to each. Do not suggest fixes yet.",
      packSlug: "chatgpt-prompts-for-debugging",
    },
    workflow: {
      title: "Code Review Workflow",
      steps: ["Explain what this code does", "Identify bugs or edge cases", "Suggest refactors", "Write tests"],
      packSlug: "claude-prompts-for-code-review",
    },
    promptChain: {
      title: "Feature → Ship chain",
      chain: [
        { label: "Design", preview: "Write a technical spec for this feature…" },
        { label: "Build", preview: "Implement the spec with these constraints…" },
        { label: "Test", preview: "Write unit tests for the implementation…" },
        { label: "Document", preview: "Write clear docs for this API…" },
      ],
      packSlug: "claude-prompts-for-documentation",
    },
    template: {
      title: "Bug Report Template",
      body: `## Bug Report

**Environment:** [OS / Browser / Version]
**Severity:** Critical / High / Medium / Low

### What happened
[Describe the unexpected behavior]

### Steps to reproduce
1. 
2. 
3. 

### Expected behavior
[What should have happened]

### Error / Stack trace
\`\`\`
[Paste here]
\`\`\`

### Notes
[Anything else relevant]`,
    },
  },

  writer: {
    prompt: {
      title: "Write a compelling intro",
      text: "You are a senior editor at a top-tier publication. Write 3 different opening paragraphs for an article about [TOPIC]. Each under 80 words and using a different hook:\n- Hook A: a counterintuitive statistic\n- Hook B: a specific scene or anecdote\n- Hook C: a direct challenge to a belief the reader holds\nDo NOT start with 'In today's…'",
      packSlug: "chatgpt-prompts-for-freelance-writers",
    },
    workflow: {
      title: "Article Writing Workflow",
      steps: ["Decode the brief", "Generate outline", "Draft sections", "Self-edit for tightness", "Write headline set"],
      packSlug: "chatgpt-prompts-for-freelance-writers",
    },
    promptChain: {
      title: "Blog → Distribution chain",
      chain: [
        { label: "Write", preview: "Write the core blog post on [TOPIC]…" },
        { label: "Repurpose", preview: "Turn this into a LinkedIn article…" },
        { label: "Thread", preview: "Create a Twitter thread from this…" },
        { label: "Email", preview: "Write a newsletter edition from this…" },
      ],
      packSlug: "claude-prompts-for-content-repurposing",
    },
    template: {
      title: "Article Brief Template",
      body: `## Article Brief

**Headline (working):** 
**Target keyword:** 
**Word count:** 
**Publication / audience:** 

### Goal
[What should the reader know / feel / do after reading?]

### Angle
[What makes this piece different from existing coverage?]

### Key points to cover
1. 
2. 
3. 

### Sources to reference
- 

### Deadline
`,
    },
  },

  marketer: {
    prompt: {
      title: "Campaign positioning prompt",
      text: "I'm planning a campaign for: [PRODUCT/SERVICE]. Target audience: [DESCRIBE]. Help me find the single most important thing my audience needs to believe to take action — not a feature, a belief. Then tell me what they currently believe that's in the way, and what proof point would shift it.",
      packSlug: "claude-prompts-for-marketing-copy",
    },
    workflow: {
      title: "Campaign Launch Workflow",
      steps: ["Develop positioning", "Write ad variants", "Build email sequence", "Create landing page", "Post-campaign analysis"],
      packSlug: "claude-prompts-for-marketing-copy",
    },
    promptChain: {
      title: "Idea → Content chain",
      chain: [
        { label: "Angle", preview: "Generate 20 content angles for [TOPIC]…" },
        { label: "LinkedIn", preview: "Write a LinkedIn post from this angle…" },
        { label: "Email", preview: "Turn this into a newsletter edition…" },
        { label: "Thread", preview: "Write a Twitter thread from this…" },
      ],
      packSlug: "chatgpt-prompts-for-social-media",
    },
    template: {
      title: "Campaign Brief Template",
      body: `## Campaign Brief

**Product / Service:** 
**Campaign goal:** Awareness / Lead Gen / Conversion / Retention
**Target audience:** 
**Timeline:** 

### Core message (one sentence)

### Supporting messages
1. 
2. 
3. 

### Channels
- [ ] Google Ads
- [ ] Meta
- [ ] LinkedIn
- [ ] Email
- [ ] Social

### Success metrics
- Primary KPI: 
- Secondary KPI: 

### Budget
`,
    },
  },

  student: {
    prompt: {
      title: "Understand a new concept",
      text: "I need to understand [CONCEPT] for my [SUBJECT]. My level: [BEGINNER / SOME BACKGROUND].\n\nExplain this in three layers:\n1. ELI15 — simplest possible version\n2. Student-level — with correct terminology\n3. The nuance most students miss\n\nAfter each layer, give one concrete real-world example. Then ask me 3 questions to check if I actually understood it.",
      packSlug: "chatgpt-prompts-for-students",
    },
    workflow: {
      title: "Essay Writing Workflow",
      steps: ["Develop thesis", "Build argument structure", "Draft body paragraphs", "Write intro & conclusion", "Edit for logic & clarity"],
      packSlug: "claude-prompts-for-essay-writing",
    },
    promptChain: {
      title: "Study → Exam chain",
      chain: [
        { label: "Learn", preview: "Explain [TOPIC] in three layers…" },
        { label: "Notes", preview: "Process my raw lecture notes on [TOPIC]…" },
        { label: "Practice", preview: "Generate 12 practice questions at increasing difficulty…" },
        { label: "Review", preview: "What are the 10 most likely exam questions on [TOPIC]?…" },
      ],
      packSlug: "chatgpt-prompts-for-exam-prep",
    },
    template: {
      title: "Essay Plan Template",
      body: `## Essay Plan

**Title / Question:** 
**Course:** 
**Word count:** 
**Due date:** 

### Thesis (arguable claim)

### Argument map
1. Point 1: 
   - Evidence: 
   - Analysis: 
2. Point 2: 
   - Evidence: 
   - Analysis: 
3. Point 3: 
   - Evidence: 
   - Analysis: 

### Counterargument + rebuttal

### Sources
- 

### Outline word counts
- Intro: 
- Body: 
- Conclusion: 
`,
    },
  },

  founder: {
    prompt: {
      title: "Sharpen your positioning",
      text: "My startup: [DESCRIBE IN 2 SENTENCES]. Target customer: [DESCRIBE]. Their current solution: [HOW THEY SOLVE THIS TODAY].\n\nHelp me find my positioning:\n1. What is the single job my customer is hiring my product to do?\n2. What do they currently believe about this problem that I need to change?\n3. Write 3 one-sentence positioning statements — each taking a different angle.\n4. Which one is most defensible in 12 months and why?",
      packSlug: "chatgpt-prompts-for-social-media",
    },
    workflow: {
      title: "GTM Launch Workflow",
      steps: ["Define ICP and positioning", "Write landing page copy", "Build email sequence", "Create social content", "Analyze and iterate"],
      packSlug: "claude-prompts-for-marketing-copy",
    },
    promptChain: {
      title: "Idea → Validation chain",
      chain: [
        { label: "Problem", preview: "Help me articulate the problem I'm solving clearly…" },
        { label: "Solution", preview: "Write a one-paragraph product description…" },
        { label: "Copy", preview: "Write landing page copy for this product…" },
        { label: "Outreach", preview: "Write a cold outreach message to potential customers…" },
      ],
      packSlug: "claude-prompts-for-marketing-copy",
    },
    template: {
      title: "Weekly Founder Review",
      body: `## Weekly Founder Review — Week of [DATE]

### Top 3 wins this week
1. 
2. 
3. 

### Top 3 blockers
1. 
2. 
3. 

### Key metrics
- MRR / ARR: 
- Users / Customers: 
- Churn: 
- Pipeline: 

### What I learned about the customer this week

### Next week's #1 priority

### Decisions made
- 

### Decisions deferred
- 
`,
    },
  },
}

const DEFAULT_ROLE = "developer"

const PICKER_KEY = "findurai:home-role"

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkspaceHomePage() {
  const { user } = useAuth()
  const [role, setRole] = useState(DEFAULT_ROLE)

  // Persist role selection
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PICKER_KEY)
      if (saved && ROLE_CONTENT[saved]) setRole(saved)
    } catch { /* ignore */ }
  }, [])

  const saveRole = (r: string) => {
    setRole(r)
    try { localStorage.setItem(PICKER_KEY, r) } catch { /* ignore */ }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <span className="text-5xl">📦</span>
        <h1 className="text-2xl font-bold">Prompt Packs — Ready to Run</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Browse ready-made prompt sequences — copy any prompt in one click and open the right AI tool instantly. Sign in to save and remix packs.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/packs">
            <Button className="gap-2 rounded-full px-6">
              <BookOpen className="h-4 w-4" /> Browse Prompt Packs
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="rounded-full px-6">Sign in</Button>
          </Link>
        </div>
      </div>
    )
  }

  const firstName = user.displayName?.split(" ")[0] || "there"
  const content = ROLE_CONTENT[role] ?? ROLE_CONTENT[DEFAULT_ROLE]

  return (
    <div className="flex flex-col gap-8">
      {/* Header + role picker */}
      <div>
        <h1 className="text-xl font-bold">Hi, {firstName} 👋</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pick your role — see why a real workspace beats a single prompt, then grab your starter kit.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PACK_ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => saveRole(r.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                role === r.id
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* See The Difference — one reply vs. a real nested workspace (driven by role picker) */}
      <div>
        <h2 className="mb-1 font-display text-lg font-semibold">A reply vs. a real workspace.</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Same AI model. This is what FindurAI actually builds for your role, instead of one throwaway answer.
        </p>
        <HeroSeeTheDifference roleId={role} />
      </div>
    </div>
  )
}
