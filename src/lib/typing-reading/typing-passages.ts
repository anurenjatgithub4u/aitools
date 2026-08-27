import type { Category, Difficulty, TypingPassage } from "./types"

// A bundled, deterministic passage library — no AI generation in the free
// tier (see FEATURE spec §14/§28). One passage per (category, difficulty)
// pair keeps the set reviewable; buildTypingText() below joins several of
// them together for longer tests instead of needing hundreds of entries.
export const TYPING_PASSAGES: TypingPassage[] = [
  // General
  { id: "gen-beg", difficulty: "beginner", category: "general", text: "The sun was warm and the sky was clear. Birds sang in the trees near the park. A gentle breeze moved through the open field. It was a good day to go for a walk." },
  { id: "gen-int", difficulty: "intermediate", category: "general", text: "Every morning, the small town came alive with the sound of footsteps, conversations, and the distant hum of traffic. People moved through their routines with quiet purpose, each one carrying a slightly different version of the same ordinary day." },
  { id: "gen-adv", difficulty: "advanced", category: "general", text: "Amid the quiet churn of daily life, most people rarely pause to consider how many small, unremarkable decisions accumulate into the shape of a life; yet it is precisely these choices, repeated and refined, that define us over time." },

  // Technology
  { id: "tech-beg", difficulty: "beginner", category: "technology", text: "Computers help us do many things every day. We use them to write, learn, and talk to friends. A good computer should be fast and easy to use. Many people carry a small computer in their pocket." },
  { id: "tech-int", difficulty: "intermediate", category: "technology", text: "Software developers spend much of their time reading code rather than writing it, which is why clear naming and simple structure often matter more than clever tricks. Code that is easy to understand is usually easier to fix and improve." },
  { id: "tech-adv", difficulty: "advanced", category: "technology", text: "Modern distributed systems must tolerate partial failure by design: network partitions, delayed messages, and inconsistent state are ordinary operating conditions, which is why engineers increasingly favor idempotent operations, explicit retries, and observability over the illusion of a perfectly reliable network." },

  // Business
  { id: "biz-beg", difficulty: "beginner", category: "business", text: "A good business starts with a clear plan. It must solve a real problem for real people. Owners need to watch their costs and listen to customers. Small steps, taken often, can lead to big results." },
  { id: "biz-int", difficulty: "intermediate", category: "business", text: "Building a sustainable business usually takes longer than founders expect, because early growth often comes from work that does not scale: personal outreach, manual fixes, and constant adjustments based on direct customer feedback." },
  { id: "biz-adv", difficulty: "advanced", category: "business", text: "Profitability, in the long run, depends less on a single breakthrough product and more on the durability of a company's unit economics: acquisition cost, retention, and margin must align well enough that growth strengthens the business rather than amplifying its inefficiencies." },

  // Education
  { id: "edu-beg", difficulty: "beginner", category: "education", text: "Learning new things takes time and practice. It is okay to make mistakes along the way. Good students ask questions when they do not understand. Reading a little every day can help you learn a lot." },
  { id: "edu-int", difficulty: "intermediate", category: "education", text: "Effective studying is less about the number of hours spent and more about how actively a student engages with the material, through practice questions and short summaries, rather than a single long night of passive rereading." },
  { id: "edu-adv", difficulty: "advanced", category: "education", text: "Contemporary research on learning consistently favors retrieval practice and interleaving over massed repetition, suggesting that the discomfort of recalling information from memory, rather than merely recognizing it on a page, is precisely what strengthens long-term retention." },

  // Science
  { id: "sci-beg", difficulty: "beginner", category: "science", text: "Water covers most of the Earth's surface. Plants use sunlight to make their own food. Every living thing needs energy to grow and move. Scientists study the world by asking questions and testing ideas." },
  { id: "sci-int", difficulty: "intermediate", category: "science", text: "A scientific theory is not a guess; it is an explanation supported by repeated observation and experimentation that has withstood serious attempts to disprove it. Even well-established theories remain open to revision if new evidence contradicts them." },
  { id: "sci-adv", difficulty: "advanced", category: "science", text: "Peer review, for all its acknowledged flaws, slow turnaround, inconsistent rigor, occasional bias, remains one of the few mechanisms by which the scientific community filters speculative claims from findings robust enough to withstand independent scrutiny and replication." },

  // Productivity
  { id: "prod-beg", difficulty: "beginner", category: "productivity", text: "Making a short list can help you get things done. Try to finish one task before starting another. Short breaks can help you stay fresh and focused. Small habits, done daily, add up over time." },
  { id: "prod-int", difficulty: "intermediate", category: "productivity", text: "Most productivity systems fail not because they are poorly designed but because they demand more daily maintenance than the average person is willing to sustain. The habits that stick tend to be the simplest ones, repeated consistently." },
  { id: "prod-adv", difficulty: "advanced", category: "productivity", text: "Deep, uninterrupted focus has become an increasingly scarce resource in professional environments saturated with notifications and meetings competing for attention; protecting blocks of uninterrupted time is therefore less a matter of willpower than of structural, calendar-level defense." },

  // Career
  { id: "car-beg", difficulty: "beginner", category: "career", text: "Finding the right job can take time and effort. It helps to know what skills you already have. Talking to people in a field can teach you a lot. Every new role is a chance to keep learning." },
  { id: "car-int", difficulty: "intermediate", category: "career", text: "Career growth rarely follows a straight line; most professionals move sideways, take pay cuts for better opportunities, or spend years in roles that later prove essential in ways that were not obvious at the time." },
  { id: "car-adv", difficulty: "advanced", category: "career", text: "Negotiating compensation effectively requires more than confidence: it demands a clear-eyed understanding of one's market value, the specific priorities of the hiring organization, and the discipline to separate emotional attachment to an offer from an objective assessment." },
]

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Filters with graceful fallback: exact (difficulty + category) match first,
// then same difficulty across categories, then anything — the pool is
// deliberately small, so the tool should never come up empty.
function candidatePassages(difficulty: Difficulty, category: Category): TypingPassage[] {
  const exact = TYPING_PASSAGES.filter((p) => p.difficulty === difficulty && p.category === category)
  if (exact.length > 0) return exact
  const sameDifficulty = TYPING_PASSAGES.filter((p) => p.difficulty === difficulty)
  if (sameDifficulty.length > 0) return sameDifficulty
  return TYPING_PASSAGES
}

// Joins shuffled, non-repeating passages until the target word count is
// reached (looping back through the pool if necessary for long/timed tests).
export function buildTypingText(difficulty: Difficulty, category: Category, targetWords: number): string {
  const pool = shuffle(candidatePassages(difficulty, category))
  const parts: string[] = []
  let words = 0
  let i = 0
  while (words < targetWords) {
    const passage = pool[i % pool.length]
    parts.push(passage.text)
    words += wordCount(passage.text)
    i++
    if (i > 200) break // safety valve, should never trigger
  }
  return parts.join(" ")
}

// Appends one more random passage — used to extend a timed test's text on
// the fly if a fast typist reaches the end of the pre-built string.
export function extendTypingText(existingText: string, difficulty: Difficulty, category: Category): string {
  const pool = candidatePassages(difficulty, category)
  const next = pool[Math.floor(Math.random() * pool.length)]
  return `${existingText} ${next.text}`
}
