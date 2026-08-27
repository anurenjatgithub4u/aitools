import type { Category, Difficulty, ReadingPassage } from "./types"

// One bundled passage per category, each with real comprehension questions —
// see FEATURE spec §16/§18: reading speed is only measured alongside
// comprehension, never from "click Done" alone. No AI-generated content in
// the free tier; this library is static and reviewable.
export const READING_PASSAGES: ReadingPassage[] = [
  {
    id: "read-general-habit-of-walking",
    title: "The Habit of Walking",
    difficulty: "beginner",
    category: "general",
    text: `Walking is one of the simplest habits a person can build, yet it is often overlooked because it seems too ordinary to matter. Unlike many forms of exercise, walking requires no special equipment, no membership, and very little planning. A person can start by walking for just ten minutes a day and gradually increase that time as it becomes part of their routine.

Beyond its physical benefits, walking has a noticeable effect on mood and mental clarity. Many people report that a short walk helps them think more clearly, especially when they feel stuck on a problem. This is partly because walking removes the pressure of sitting still and staring at a task, allowing the mind to wander productively.

Walking outdoors adds another layer of benefit. Exposure to natural light and fresh air has been linked to better sleep and reduced stress. Even a walk around a city block, surrounded by buildings rather than trees, still offers a break from screens and indoor lighting.

The habit works best when it is consistent rather than occasional. A short daily walk, taken at roughly the same time each day, tends to stick far longer than an ambitious plan that quickly becomes difficult to maintain.`,
    questions: [
      { id: "q1", question: "According to the passage, what is one advantage of walking compared to many other forms of exercise?", options: ["It burns more calories", "It requires no special equipment or membership", "It must be done outdoors", "It requires a coach"], correctIndex: 1 },
      { id: "q2", question: "The passage suggests walking can help mental clarity because it:", options: ["Forces the mind to focus harder", "Removes the pressure of sitting still and lets the mind wander", "Increases heart rate significantly", "Requires intense concentration"], correctIndex: 1 },
      { id: "q3", question: "Why might even a walk around a city block still be beneficial, per the passage?", options: ["It burns more calories than a park walk", "It offers a break from screens and indoor lighting", "It is faster than walking in nature", "It requires no time commitment"], correctIndex: 1 },
      { id: "q4", question: "According to the passage, what makes a walking habit more likely to last?", options: ["Walking very long distances", "Walking only on weekends", "Consistency, taken at roughly the same time each day", "Walking with a group only"], correctIndex: 2 },
    ],
  },
  {
    id: "read-technology-technical-debt",
    title: "Understanding Technical Debt",
    difficulty: "intermediate",
    category: "technology",
    text: `In software development, the term "technical debt" describes the cost of choosing a quick, convenient solution now instead of a better approach that would take longer to implement. Like financial debt, it is not inherently bad. Teams often take on technical debt deliberately, for example to ship a feature before a deadline, with the intention of revisiting the code later.

The danger arises when that debt is never repaid. Over time, unaddressed shortcuts accumulate, making the codebase harder to understand, test, and extend. What began as a reasonable trade-off can quietly turn into a significant drag on a team's ability to move quickly, because every new feature has to work around the accumulated mess.

Experienced engineering teams treat technical debt as something to track and manage rather than avoid entirely. They keep a visible list of known shortcuts, periodically schedule time to address the most costly ones, and weigh new debt against its expected payoff. This turns an invisible, growing liability into a conscious decision.

The teams that struggle most are usually not the ones that take on debt, but the ones that lose track of it. Without visibility, technical debt tends to expand quietly until a project's velocity slows dramatically, often catching leadership by surprise months or years later.`,
    questions: [
      { id: "q1", question: "According to the passage, what does \"technical debt\" describe?", options: ["A financial loan taken by a software company", "The cost of choosing a quick solution now over a better one later", "A bug that crashes the application", "A type of programming language"], correctIndex: 1 },
      { id: "q2", question: "According to the passage, is technical debt inherently bad?", options: ["Yes, it should always be avoided", "No, teams often take it on deliberately for good reasons", "Only in mobile apps", "Only when caused by junior developers"], correctIndex: 1 },
      { id: "q3", question: "What happens when technical debt is never addressed, per the passage?", options: ["The codebase becomes easier to test", "It has no long-term effect", "It accumulates and makes the codebase harder to understand and extend", "It automatically resolves itself"], correctIndex: 2 },
      { id: "q4", question: "What distinguishes struggling teams from experienced teams, according to the passage?", options: ["Struggling teams take on more debt overall", "Experienced teams never take on any debt", "Struggling teams tend to lose track of their debt, while experienced teams manage it", "Experienced teams use different programming languages"], correctIndex: 2 },
    ],
  },
  {
    id: "read-business-retention",
    title: "Why Retention Often Matters More Than Acquisition",
    difficulty: "intermediate",
    category: "business",
    text: `Many young companies focus heavily on acquiring new customers, treating each new signup as a clear sign of progress. While acquisition is important, it can create a misleading picture of health if a business is losing existing customers just as quickly as it gains new ones.

Retention, the ability to keep customers using a product over time, is often a better long-term indicator of whether a business actually solves a meaningful problem. A company that struggles to retain customers is usually signaling a deeper issue: the product may not deliver enough ongoing value to justify continued use, regardless of how effective its marketing is at bringing people in the door.

Acquisition costs also tend to rise as a company grows, since the easiest, cheapest customers are typically acquired first. This makes retention increasingly valuable over time, because keeping an existing customer is almost always cheaper than acquiring a new one to replace them.

For this reason, experienced operators often look at retention metrics before celebrating growth in new signups. Steady, healthy retention suggests that growth is compounding rather than merely replacing customers who quietly leave.`,
    questions: [
      { id: "q1", question: "According to the passage, what can acquiring many new customers hide?", options: ["That the company has too many employees", "That the business is losing existing customers at a similar rate", "That the product is too expensive", "That marketing is ineffective"], correctIndex: 1 },
      { id: "q2", question: "Per the passage, what does poor retention usually signal?", options: ["The marketing team needs more budget", "The product may not deliver enough ongoing value", "The company is growing too fast", "The company should lower its prices"], correctIndex: 1 },
      { id: "q3", question: "According to the passage, why does retention become more valuable as a company grows?", options: ["Acquisition costs tend to rise, making it cheaper to keep existing customers", "New customers become easier to find", "Retention data becomes less accurate over time", "Growth always slows down eventually"], correctIndex: 0 },
      { id: "q4", question: "What do experienced operators check before celebrating new signup growth, per the passage?", options: ["The size of the marketing team", "Retention metrics", "The number of competitors", "The company's stock price"], correctIndex: 1 },
    ],
  },
  {
    id: "read-education-spaced-practice",
    title: "Why Spreading Out Study Time Works Better",
    difficulty: "beginner",
    category: "education",
    text: `Many students try to learn a large amount of material in one long session, often the night before a test. This method, sometimes called cramming, can feel productive because it involves hours of focused effort. However, research on memory suggests that this approach is often less effective than spreading the same amount of study time across several days.

When study sessions are spaced out, the brain is forced to recall information after it has started to fade slightly. This act of retrieving a memory, rather than simply rereading it, tends to strengthen that memory more than repeated exposure alone. Each time information is successfully recalled, it becomes a little easier to remember in the future.

Spacing also helps reveal which topics still need more attention. A student who studies the same material every day for a week will quickly notice which concepts keep slipping away, allowing them to focus extra time where it is actually needed rather than reviewing everything equally.`,
    questions: [
      { id: "q1", question: "What is the studying method described as cramming, according to the passage?", options: ["Studying a small amount every day", "Learning a large amount of material in one long session, often the night before a test", "Studying only with a group", "Skipping study sessions entirely"], correctIndex: 1 },
      { id: "q2", question: "According to the passage, why does spacing out study sessions help memory?", options: ["It gives students more free time", "It forces the brain to recall fading information, which strengthens memory", "It requires less total study time", "It avoids the need for testing"], correctIndex: 1 },
      { id: "q3", question: "What does successfully recalling information do, according to the passage?", options: ["It makes the information harder to remember later", "It has no effect on memory", "It makes that information a little easier to remember in the future", "It replaces the need for further study"], correctIndex: 2 },
      { id: "q4", question: "How does spacing help a student identify what to study, per the passage?", options: ["It reveals which concepts keep slipping away so they can get extra attention", "It removes the need to study certain topics", "It guarantees a perfect test score", "It shortens the material automatically"], correctIndex: 0 },
    ],
  },
  {
    id: "read-science-replication-crisis",
    title: "The Replication Problem in Scientific Research",
    difficulty: "advanced",
    category: "science",
    text: `Over the past two decades, researchers across several fields have raised concerns about a phenomenon now commonly called the replication crisis. When independent teams attempt to repeat published experiments using the original methods, a surprising number of results fail to hold up, even when the original studies passed peer review and were published in respected journals.

Several factors contribute to this problem. Small sample sizes can produce results that appear statistically significant purely by chance. Researchers, often under pressure to publish novel findings, may unconsciously favor analyses that produce interesting results over those that do not, a practice sometimes called p-hacking. Journals themselves have historically been more willing to publish surprising positive findings than studies that report no effect, creating an incentive structure that rewards novelty over reliability.

The consequences extend beyond academic embarrassment. Fields such as psychology and medicine rely on a foundation of trustworthy findings to guide real-world decisions, from clinical treatments to public policy. When foundational studies cannot be replicated, the practical guidance built on top of them becomes unreliable as well.

In response, many journals now require researchers to pre-register their hypotheses and methods before collecting data, reducing the temptation to adjust analyses after seeing the results. Large-scale replication projects have also become more common, offering a clearer picture of which findings genuinely hold up under repeated scrutiny.`,
    questions: [
      { id: "q1", question: "What is the \"replication crisis\" described in the passage?", options: ["A shortage of scientists willing to conduct experiments", "The finding that a surprising number of published results fail to hold up when independently repeated", "A crisis of funding for scientific research", "A disagreement over which journals are most respected"], correctIndex: 1 },
      { id: "q2", question: "According to the passage, what is \"p-hacking\"?", options: ["A method for increasing sample size", "Favoring analyses that produce interesting results over those that do not", "A technique for replicating studies exactly", "A type of peer review process"], correctIndex: 1 },
      { id: "q3", question: "Per the passage, what incentive have journals historically created?", options: ["A preference for studies with no effect", "A preference for surprising positive findings over reliable null results", "A requirement for pre-registration", "A ban on replication studies"], correctIndex: 1 },
      { id: "q4", question: "What change have many journals introduced in response to the replication crisis?", options: ["Requiring researchers to pre-register hypotheses and methods before collecting data", "Refusing to publish any new research", "Removing peer review entirely", "Publishing only studies with large sample sizes"], correctIndex: 0 },
    ],
  },
  {
    id: "read-productivity-context-switching",
    title: "The Hidden Cost of Context Switching",
    difficulty: "intermediate",
    category: "productivity",
    text: `Many professionals believe that handling several tasks at once is a sign of efficiency, but research on attention suggests the opposite is often true. Every time a person shifts from one task to another, whether it is moving from writing a report to answering a message, the brain needs time to fully disengage from the first task and re-engage with the second.

This transition period, often called a switching cost, is easy to underestimate because it usually lasts only a few seconds or minutes. However, when it happens dozens of times throughout a workday, those small costs accumulate into a significant loss of total focused time. Some studies suggest that frequent interruptions can reduce the amount of deep, productive work a person accomplishes by a substantial margin.

The problem is made worse by the fact that returning to a complex task after an interruption often requires reconstructing a mental model of where one left off, which takes noticeably longer than simply resuming a familiar routine task. This is one reason why professionals who protect longer, uninterrupted blocks of time often report getting more meaningful work done than those who respond to messages throughout the day.`,
    questions: [
      { id: "q1", question: "What does the passage suggest about handling several tasks at once?", options: ["It is always more efficient than single-tasking", "Research suggests it often has hidden costs rather than being purely efficient", "It has no effect on focus", "It only affects certain professions"], correctIndex: 1 },
      { id: "q2", question: "What is a \"switching cost,\" as described in the passage?", options: ["The financial cost of buying new tools", "The time the brain needs to disengage from one task and re-engage with another", "The cost of hiring a new employee", "A term for taking too many breaks"], correctIndex: 1 },
      { id: "q3", question: "Why are switching costs easy to underestimate, according to the passage?", options: ["They are usually only a few seconds or minutes long individually", "They only happen once a day", "They are always obvious to the person experiencing them", "They do not actually exist"], correctIndex: 0 },
      { id: "q4", question: "According to the passage, why does resuming a complex task after an interruption take longer?", options: ["It requires reconstructing a mental model of where one left off", "It requires new software", "It is always assigned to someone else", "It requires a formal meeting"], correctIndex: 0 },
    ],
  },
  {
    id: "read-career-signaling",
    title: "What Résumés Actually Signal to Employers",
    difficulty: "advanced",
    category: "career",
    text: `Hiring decisions are often described as an assessment of a candidate's skills, but in practice, much of the process functions as a system of signaling under uncertainty. Employers cannot directly observe how well a candidate will perform in a role before hiring them, so they rely on proxies, credentials, past job titles, references, that are believed to correlate with future performance, even when that correlation is imperfect.

This explains why certain signals, such as having worked at a well-known company, can carry outsized weight even when the actual work performed there was narrow or unremarkable. The signal itself, rather than the specific skills gained, is what employers are often responding to, because it is easier to verify than genuine competence.

This dynamic creates a challenge for capable candidates who lack conventional signals, such as a degree from a prestigious institution or a recognizable employer on their résumé. Their actual ability may be equal to or greater than more conventionally credentialed candidates, yet they must find alternative ways to demonstrate competence, through portfolios, direct referrals, or demonstrated work, since traditional signals are unavailable to them.

Understanding hiring as a signaling process, rather than a purely meritocratic evaluation, helps explain both its persistent inefficiencies and the strategies that unconventional candidates use to succeed despite them.`,
    questions: [
      { id: "q1", question: "According to the passage, why do employers rely on proxies like credentials and job titles?", options: ["They are legally required to", "They cannot directly observe future performance, so proxies serve as signals believed to correlate with it", "Proxies are always more accurate than skills tests", "Job titles guarantee performance"], correctIndex: 1 },
      { id: "q2", question: "Why can working at a well-known company carry outsized weight, according to the passage?", options: ["It is always the best predictor of skill", "The signal is easier to verify than genuine competence, even if the actual work was narrow", "It guarantees a higher salary", "It replaces the need for interviews"], correctIndex: 1 },
      { id: "q3", question: "What challenge does the passage describe for candidates lacking conventional signals?", options: ["They must find alternative ways to demonstrate competence, since traditional signals are unavailable to them", "They are legally barred from applying to certain jobs", "They must always accept lower pay", "They cannot be hired under any circumstances"], correctIndex: 0 },
      { id: "q4", question: "What does understanding hiring as a \"signaling process\" help explain, per the passage?", options: ["Why interviews are always fair", "Both hiring's persistent inefficiencies and the strategies unconventional candidates use to succeed", "Why résumés are no longer used", "Why all employers use the same hiring criteria"], correctIndex: 1 },
    ],
  },
]

// Same graceful-fallback strategy as the typing library: exact match first,
// then same difficulty, then anything — the tool should never come up empty.
export function candidateReadingPassages(difficulty: Difficulty, category: Category): ReadingPassage[] {
  const exact = READING_PASSAGES.filter((p) => p.difficulty === difficulty && p.category === category)
  if (exact.length > 0) return exact
  const sameCategory = READING_PASSAGES.filter((p) => p.category === category)
  if (sameCategory.length > 0) return sameCategory
  const sameDifficulty = READING_PASSAGES.filter((p) => p.difficulty === difficulty)
  if (sameDifficulty.length > 0) return sameDifficulty
  return READING_PASSAGES
}

export function pickReadingPassage(difficulty: Difficulty, category: Category, excludeId?: string): ReadingPassage {
  const candidates = candidateReadingPassages(difficulty, category)
  const pool = candidates.length > 1 ? candidates.filter((p) => p.id !== excludeId) : candidates
  return pool[Math.floor(Math.random() * pool.length)]
}

export function readingWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
