"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ToolCard } from "@/components/tool-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, SlidersHorizontal, Sparkles, Plus, Check, Loader2, Globe, Star, CheckCircle2, XCircle } from "lucide-react"
import { AITool } from "@/types"
import { UnifiedResults } from "@/components/workspace/unified-results"
import { notFound } from "next/navigation"
import { TOOL_DIRECTORY_ENABLED } from "@/lib/tools/config"

// Words that describe the search intent itself, not the domain. These are
// stripped before per-word matching so generic words don't pull in noise.
const META_WORDS = new Set([
  "best", "top", "good", "great", "find", "what", "which", "is", "are",
  "the", "a", "an", "for", "to", "i", "me", "my", "use", "using", "with",
  "tool", "tools", "ai", "artificial", "intelligence", "assistant",
  "platform", "software", "solution", "recommend", "recommendation",
  // generic action/filler words that match too many descriptions
  "app", "apps", "develop", "developing", "development", "build", "building",
  "create", "creating", "make", "making", "want", "need", "help", "helps",
  "looking", "get", "getting", "something", "anything", "can", "do", "does",
  "how", "of", "in", "on", "and", "or", "that", "this", "you", "your",
]);

// Maps query intent to the classification taxonomy (toolType / primaryCategory /
// useCases / capabilities) plus reinforcing keywords. Intent only *boosts* a
// tool that genuinely fits the taxonomy — it never blanket-passes a category.
type Intent = {
  patterns: string[];
  toolTypes?: string[];
  primaryCategories?: string[];
  useCases?: string[];
  capabilities?: string[];
  keywords?: string[];
};

const INTENT_MAP: Intent[] = [
  {
    patterns: ["mobile app", "build app", "app development", "app builder", "develop app", "develop an app", "build a web", "build website", "create website", "web development", "web app", "full stack", "fullstack", "front end", "frontend", "backend", "build software", "no code app"],
    toolTypes: ["AI Coding Assistant"],
    primaryCategories: ["Coding"],
    useCases: ["Coding Assistant"],
    capabilities: ["Code Generation"],
    keywords: ["app builder", "full stack", "website", "react", "nextjs", "no-code", "deploy", "mobile", "frontend", "backend", "flutter"],
  },
  {
    patterns: ["write code", "coding assistant", "code generation", "code completion", "programming", "autocomplete", "debug", "refactor", "pair programming", "copilot", "ide"],
    toolTypes: ["AI Coding Assistant"],
    primaryCategories: ["Coding"],
    useCases: ["Coding Assistant"],
    capabilities: ["Code Generation"],
    keywords: ["code", "programming", "developer", "ide", "autocomplete", "debug"],
  },
  {
    patterns: ["write", "writing", "blog", "content", "article", "copywriting", "essay", "paraphrase", "grammar", "rewrite", "copy"],
    primaryCategories: ["Marketing", "Productivity"],
    useCases: ["Content Generation"],
    keywords: ["writing", "content", "copy", "blog", "article", "grammar"],
  },
  {
    patterns: ["generate image", "create image", "image generation", "ai art", "illustration", "text to image", "logo", "photo edit", "upscale", "design image", "thumbnail"],
    toolTypes: ["Image Generator"],
    primaryCategories: ["Image Generation"],
    useCases: ["Image Creation"],
    capabilities: ["Image Generation"],
    keywords: ["image", "art", "photo", "illustration", "logo", "upscale"],
  },
  {
    patterns: ["video", "text to video", "create video", "animate", "animation", "video editing", "avatar video", "film", "clip"],
    toolTypes: ["Video Generator"],
    primaryCategories: ["Video Generation"],
    useCases: ["Video Editing"],
    capabilities: ["Video Generation"],
    keywords: ["video", "animation", "avatar", "film", "clip"],
  },
  {
    patterns: ["voice", "text to speech", "speech to text", "tts", "transcribe", "transcription", "narration", "dubbing", "voice clone", "music", "song", "audio", "podcast"],
    toolTypes: ["Speech Platform"],
    primaryCategories: ["Voice AI"],
    capabilities: ["Text-to-Speech", "Speech-to-Text"],
    keywords: ["voice", "speech", "tts", "audio", "transcription", "music"],
  },
  {
    patterns: ["chatbot", "chat bot", "conversational", "customer support", "customer service", "help desk", "support agent"],
    toolTypes: ["AI Application", "Agent Framework"],
    useCases: ["AI Chatbots", "Customer Support"],
    keywords: ["chatbot", "support", "customer", "conversation"],
  },
  {
    patterns: ["ai agent", "agents", "autonomous", "automate", "automation", "workflow", "orchestrate", "multi agent", "multi-agent"],
    toolTypes: ["Agent Framework", "Automation Platform"],
    primaryCategories: ["Automation"],
    useCases: ["AI Agents", "Automation"],
    capabilities: ["Function Calling"],
    keywords: ["agent", "automation", "workflow", "orchestration"],
  },
  {
    patterns: ["search engine", "ai search", "research", "answer engine", "literature", "papers", "academic", "scholar"],
    toolTypes: ["Search Engine"],
    primaryCategories: ["Research"],
    useCases: ["Research"],
    capabilities: ["Search"],
    keywords: ["search", "research", "papers", "academic", "answers"],
  },
  {
    patterns: ["rag", "vector database", "vector search", "embeddings", "knowledge base", "retrieval", "semantic search", "chat with documents", "chat with pdf"],
    toolTypes: ["Vector Database", "RAG Framework"],
    primaryCategories: ["Databases", "Developer Tools"],
    useCases: ["Knowledge Base", "Document Analysis"],
    capabilities: ["RAG", "Embeddings", "Search"],
    keywords: ["rag", "vector", "embeddings", "retrieval", "knowledge", "documents"],
  },
  {
    patterns: ["seo", "keyword research", "marketing", "ads", "advertising", "social media", "campaign"],
    primaryCategories: ["Marketing"],
    useCases: ["SEO", "Marketing"],
    keywords: ["seo", "marketing", "ads", "social", "campaign"],
  },
  {
    patterns: ["meeting notes", "notes", "summarize", "summarization", "transcribe meeting", "note taking", "presentation", "slides"],
    primaryCategories: ["Productivity"],
    useCases: ["Knowledge Base", "Document Analysis", "Content Generation"],
    keywords: ["notes", "meeting", "summary", "presentation", "productivity"],
  },
  {
    patterns: ["llm", "language model", "foundation model", "model api", "inference", "open source model", "run local", "run llm locally", "local llm"],
    toolTypes: ["Foundation Model", "Foundation Model API", "Inference Platform"],
    primaryCategories: ["Developer Tools"],
    keywords: ["llm", "model", "inference", "local"],
  },
  {
    patterns: ["data analysis", "analyze data", "spreadsheet", "sql", "csv", "charts", "data viz"],
    useCases: ["Document Analysis", "Automation"],
    keywords: ["data", "analysis", "spreadsheet", "sql", "csv"],
  },
  {
    // Study / homework / learning — a general assistant, search/research tool,
    // or dedicated education app are all valid answers here.
    patterns: ["homework", "assignment", "study", "studying", "exam", "revision", "learn", "learning", "education", "student", "students", "tutor", "tutoring", "quiz", "math problem", "solve math", "explain", "understand", "school", "college", "essay help", "study help"],
    toolTypes: ["AI Assistant", "Search Engine"],
    primaryCategories: ["Education", "Research", "Productivity"],
    useCases: ["Research", "Content Generation", "Knowledge Base"],
    keywords: ["homework", "study", "student", "education", "tutor", "learn", "exam", "essay", "explain", "answer", "math", "science"],
  },
  {
    // Broad "general assistant" questions — surface versatile chat assistants.
    patterns: ["answer questions", "general knowledge", "ask anything", "ask questions", "brainstorm", "everyday tasks", "general purpose", "explain concepts", "q and a"],
    toolTypes: ["AI Assistant"],
    primaryCategories: ["Productivity"],
    useCases: ["AI Chatbots", "Content Generation", "Research"],
    keywords: ["chat", "assistant", "answer", "brainstorm", "knowledge", "general"],
  },
];

function getIntent(query: string) {
  const q = query.toLowerCase();
  const toolTypes = new Set<string>();
  const primaryCategories = new Set<string>();
  const useCases = new Set<string>();
  const capabilities = new Set<string>();
  const keywords = new Set<string>();
  let matched = false;
  for (const intent of INTENT_MAP) {
    if (intent.patterns.some(p => q.includes(p))) {
      matched = true;
      intent.toolTypes?.forEach(v => toolTypes.add(v));
      intent.primaryCategories?.forEach(v => primaryCategories.add(v));
      intent.useCases?.forEach(v => useCases.add(v));
      intent.capabilities?.forEach(v => capabilities.add(v));
      intent.keywords?.forEach(v => keywords.add(v));
    }
  }
  return { matched, toolTypes, primaryCategories, useCases, capabilities, keywords };
}

// Normalize any string|string[] field to a single lowercased haystack.
function lc(v: unknown): string {
  if (Array.isArray(v)) return v.join(" ").toLowerCase();
  return typeof v === "string" ? v.toLowerCase() : "";
}
function lcArr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]).map(x => String(x).toLowerCase()) : [];
}

function matchToolsForQuery(activeQuery: string, allTools: AITool[]): AITool[] {
  if (!activeQuery) return allTools;
  const q = activeQuery.toLowerCase().trim();

  const intent = getIntent(q);

  // Meaningful domain words (generic/meta words removed)
  const meaningfulWords = q
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ""))
    .filter(w => w.length >= 3 && !META_WORDS.has(w));

  const isPhrase = q.split(/\s+/).length >= 2;

  const scored = allTools.map(tool => {
    let score = 0;

    const name = tool.name.toLowerCase();
    const aliases = lcArr(tool.searchableAliases);
    const tags = lcArr(tool.tags);
    const useCases = lcArr(tool.useCases);
    const capabilities = lcArr(tool.capabilities);
    const searchKw = lcArr(tool.searchKeywords);
    const toolType = lc(tool.toolType);
    const primaryCategory = lc(tool.primaryCategory);
    const bestFor = lc(tool.best_for);
    const description = lc(tool.description);
    const category = lc(tool.category);
    const secondary = lc(tool.secondaryCategories);
    const aiType = lc(tool.aiType);
    const targetAudience = lc(tool.targetAudience);

    // Big haystack for keyword presence checks.
    const haystack = [name, aliases.join(" "), tags.join(" "), toolType, primaryCategory, secondary, useCases.join(" "), capabilities.join(" "), searchKw.join(" "), bestFor, description, category, aiType, targetAudience].join(" ");

    // 1) Exact name / alias hit (someone searching a specific tool)
    if (name === q || aliases.includes(q)) score += 40;
    else if (name.includes(q)) score += 24;
    else if (aliases.some(a => a.includes(q))) score += 18;

    // 2) Full-phrase presence in strong fields
    if (isPhrase) {
      if (bestFor.includes(q)) score += 10;
      if (tags.some(t => t.includes(q))) score += 10;
      if (searchKw.some(k => k.includes(q))) score += 10;
      if (description.includes(q)) score += 6;
    }

    // 3) Intent boosts — only reward tools that fit the taxonomy.
    if (intent.matched) {
      if (intent.toolTypes.has(tool.toolType || "")) score += 14;
      if (intent.primaryCategories.has(tool.primaryCategory || "")) score += 7;
      let ucHits = 0;
      for (const uc of useCases) if ([...intent.useCases].some(x => x.toLowerCase() === uc)) ucHits++;
      score += Math.min(ucHits * 6, 12);
      let capHits = 0;
      for (const cap of capabilities) if ([...intent.capabilities].some(x => x.toLowerCase() === cap)) capHits++;
      score += Math.min(capHits * 4, 8);
      let kwHits = 0;
      for (const kw of intent.keywords) if (haystack.includes(kw)) kwHits++;
      score += Math.min(kwHits * 3, 15);
    }

    // 4) Per meaningful word, count once per field (field-weighted).
    for (const word of meaningfulWords) {
      if (name.includes(word)) score += 7;
      if (aliases.some(a => a.includes(word))) score += 6;
      if (tags.some(t => t.includes(word))) score += 5;
      if (searchKw.some(k => k.includes(word))) score += 5;
      if (toolType.includes(word)) score += 5;
      if (primaryCategory.includes(word)) score += 4;
      if (useCases.some(u => u.includes(word))) score += 4;
      if (capabilities.some(c => c.includes(word))) score += 3;
      if (bestFor.includes(word)) score += 4;
      if (targetAudience.includes(word)) score += 4;
      if (category.includes(word)) score += 3;
      if (secondary.includes(word)) score += 2;
      if (description.includes(word)) score += 2;
    }

    return { tool, score };
  });

  // Filter on RELEVANCE only first — popularity must never pull in an
  // off-topic tool or push out a relevant but lesser-known one.
  const relevant = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (relevant.length === 0) return [];

  // Dynamic threshold relative to the best match keeps only strong results,
  // so a broad category no longer drags in dozens of weak matches.
  const topScore = relevant[0].score;
  const cutoff = Math.max(8, topScore * 0.4);

  // Among the relevant matches, re-rank by a blend of relevance + quality
  // (rating + popularity) so the best-known, highest-rated tools surface first.
  const maxTrending = Math.max(1, ...allTools.map(t => t.trendingScore || 0));

  return relevant
    .filter(({ score }) => score >= cutoff)
    .map(({ tool, score }) => {
      const rating = tool.rating || 0;                 // 0–10
      const popularity = (tool.trendingScore || 0) / maxTrending; // 0–1
      // Bounded quality boost (~up to 18) nudges ordering among similarly
      // relevant tools without overriding a clearly stronger match.
      const quality = rating * 1.0 + popularity * 8;
      return { tool, score, final: score + quality };
    })
    .sort((a, b) =>
      b.final - a.final ||
      (b.tool.rating || 0) - (a.tool.rating || 0) ||
      (b.tool.trendingScore || 0) - (a.tool.trendingScore || 0)
    )
    .slice(0, 36)
    .map(({ tool }) => tool);
}

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""
  const initialCategory = searchParams.get("category") || ""
  const sortParam = searchParams.get("sort") || "" // "trending" | "recent" | "popular"

  const [query, setQuery] = useState(initialQuery)
  const [activeQuery, setActiveQuery] = useState(initialQuery)
  const [tools, setTools] = useState<AITool[]>([])
  const [loading, setLoading] = useState(true)
  
  // Semantic (hybrid AI) search results from /api/search. null = use keyword fallback.
  const [semanticResults, setSemanticResults] = useState<AITool[] | null>(null)
  const [semanticLoading, setSemanticLoading] = useState(false)

  // Layer 2 search states
  const [webSearching, setWebSearching] = useState(false)
  const [suggestedTool, setSuggestedTool] = useState<AITool | null>(null)
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  
  // Unified search: hide the tool grid when the user filters to a workspace-only type
  const [showTools, setShowTools] = useState(true)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory)
  const [freeOnly, setFreeOnly] = useState(false)
  const [hasApi, setHasApi] = useState(false)
  const [hasMobile, setHasMobile] = useState(false)
  const [isOpenSource, setIsOpenSource] = useState(false)

  const availableCategories = Array.from(new Set(tools.map(t => t.category))).filter(Boolean).sort()

  useEffect(() => {
    // Render instantly from the session cache, then refresh in the background.
    try {
      const cached = sessionStorage.getItem("tools-cache")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTools(parsed)
          setLoading(false)
        }
      }
    } catch { /* ignore corrupt cache */ }

    fetch("/api/tools")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTools(data)
          try { sessionStorage.setItem("tools-cache", JSON.stringify(data)) } catch { /* quota */ }
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch tools", err)
        setLoading(false)
      })
  }, [])

  // Hybrid AI search: semantic recall + Gemini rerank. Falls back to the
  // local keyword matcher when the API returns { fallback: true } or errors.
  useEffect(() => {
    if (!activeQuery) {
      setSemanticResults(null);
      setSemanticLoading(false);
      return;
    }
    let cancelled = false;
    setSemanticLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(activeQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data.results) && !data.fallback) {
          setSemanticResults(data.results as AITool[]);
        } else {
          setSemanticResults(null); // signal keyword fallback
        }
        setSemanticLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSemanticResults(null);
        setSemanticLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeQuery]);

  useEffect(() => {
    if (!activeQuery || loading || tools.length === 0) {
      setSuggestedTool(null);
      setWebSearching(false);
      return;
    }
    if (semanticLoading) return; // wait for the AI search to resolve first

    // Use AI results when available, otherwise the keyword matcher.
    const matched = semanticResults ?? matchToolsForQuery(activeQuery, tools);
    // If we have 3 or more tools from db we don't need to search from Tavily API
    const needsWebSearch = matched.length < 3;

    if (needsWebSearch) {
      setWebSearching(true)
      setSuggestedTool(null)
      setSubmissionStatus("idle")
      
      fetch(`/api/search/web?q=${encodeURIComponent(activeQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setSuggestedTool(data)
          }
          setWebSearching(false)
        })
        .catch((err) => {
          console.error("Web search failed", err)
          setWebSearching(false)
        })
    } else {
      setSuggestedTool(null)
      setWebSearching(false)
    }
  }, [activeQuery, tools, loading, semanticResults, semanticLoading])

  const handleSuggestSubmit = async () => {
    if (!suggestedTool) return
    setSubmissionStatus("submitting")
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...suggestedTool,
          searchQuery: activeQuery,
          source: "web_search_suggestion",
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSubmissionStatus("success")
      } else {
        setSubmissionStatus("error")
      }
    } catch (err) {
      console.error("Submission failed", err)
      setSubmissionStatus("error")
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveQuery(query)
  }

  // Basic intelligent matching simulation
  const getFilteredTools = () => {
    // Prefer AI/semantic results; fall back to the local keyword matcher.
    let filtered = activeQuery
      ? (semanticResults ?? matchToolsForQuery(activeQuery, tools))
      : sortParam === "trending"
        ? [...tools].sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
        : sortParam === "recent"
          ? [...tools].sort((a, b) => new Date(b.addedDate || "").getTime() - new Date(a.addedDate || "").getTime())
          : sortParam === "popular"
            ? [...tools].sort((a, b) => ((b.rating || 0) * 0.6 + ((b.trendingScore || 0) / 10) * 0.4) - ((a.rating || 0) * 0.6 + ((a.trendingScore || 0) / 10) * 0.4))
            : tools;

    if (categoryFilter) {
      filtered = filtered.filter(t => t.category === categoryFilter)
    }
    if (freeOnly) {
      filtered = filtered.filter(t => t.pricing === "Free" || t.free_plan)
    }
    if (hasApi) {
      filtered = filtered.filter(t => t.api)
    }
    if (hasMobile) {
      filtered = filtered.filter(t => t.mobile)
    }
    if (isOpenSource) {
      filtered = filtered.filter(t => t.opensource)
    }

    return filtered
  }

  const results = getFilteredTools()
  const isFallbackMatch = activeQuery && results.length > 0 && !results.some(t =>
    t.name.toLowerCase().includes(activeQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(activeQuery.toLowerCase()) ||
    t.tags.some(tag => activeQuery.toLowerCase().includes(tag.toLowerCase()))
  )

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24 bg-background border border-border/40 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 font-semibold mb-6 pb-4 border-b border-border/40">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Features</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox id="free" checked={freeOnly} onCheckedChange={(c) => setFreeOnly(!!c)} />
                  <label htmlFor="free" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Free / Free Tier
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="api" checked={hasApi} onCheckedChange={(c) => setHasApi(!!c)} />
                  <label htmlFor="api" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Has API
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="mobile" checked={hasMobile} onCheckedChange={(c) => setHasMobile(!!c)} />
                  <label htmlFor="mobile" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Mobile App
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="os" checked={isOpenSource} onCheckedChange={(c) => setIsOpenSource(!!c)} />
                  <label htmlFor="os" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Open Source
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Categories</h4>
                <ScrollArea className="h-[200px]">
                  <div className="flex flex-col gap-2">
                    {availableCategories.map(cat => (
                      <div key={cat} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`cat-${cat}`} 
                          checked={categoryFilter === cat} 
                          onCheckedChange={(c) => setCategoryFilter(c ? cat : "")} 
                        />
                        <label htmlFor={`cat-${cat}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {cat}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-6" 
              onClick={() => {
                setFreeOnly(false); setHasApi(false); setHasMobile(false); setIsOpenSource(false); setCategoryFilter("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSearch} className="relative flex items-center mb-8">
            <Search className="absolute left-4 w-5 h-5 text-muted-foreground" />
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for AI tools, categories, or tasks..."
              className="h-14 pl-12 pr-28 rounded-xl text-base sm:text-lg shadow-sm border-border/60 bg-background/50 backdrop-blur-sm"
            />
            <Button type="submit" className="absolute right-2 h-10 px-6 rounded-lg">
              Search
            </Button>
          </form>

          {activeQuery && (
            <UnifiedResults query={activeQuery} onToolsVisibility={setShowTools} />
          )}

          {loading || (activeQuery && semanticLoading && results.length === 0) ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="animate-pulse h-[320px] rounded-2xl bg-background/50 border border-border/20 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 bg-muted rounded-xl" />
                      <div className="space-y-2">
                        <div className="h-5 bg-muted rounded-sm w-32" />
                        <div className="h-4 bg-muted rounded-sm w-20" />
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-muted rounded-sm" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded-sm w-full" />
                    <div className="h-4 bg-muted rounded-sm w-5/6" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded-sm w-16" />
                    <div className="h-4 bg-muted rounded-sm w-48" />
                  </div>
                  <div className="flex gap-4">
                    <div className="h-10 bg-muted rounded-xl flex-1" />
                    <div className="h-10 bg-muted rounded-xl w-10" />
                  </div>
                </div>
              ))}
            </div>
          ) : showTools ? (
            <>
              {!activeQuery && sortParam && (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {sortParam === "trending" ? "Trending AI Tools" : sortParam === "recent" ? "Recently Added" : "Most Popular AI Tools"}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{results.length} tools</p>
                </div>
              )}
              {activeQuery && (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3 flex-wrap">
                    {results.length} results for "{activeQuery}"
                    {semanticLoading && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Refining with AI…
                      </span>
                    )}
                  </h2>
                  {isFallbackMatch && (
                    <p className="text-sm text-amber-500 mt-2 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                      We didn't find an exact match for your query, but here are some intelligent recommendations based on similar tasks and categories.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {results.map((tool, idx) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                  >
                    <ToolCard tool={tool} />
                  </motion.div>
                ))}
              </div>

              {/* Web-aware Layer 2 Search Loader */}
              {webSearching && (
                <div className="text-center py-16 bg-card border border-primary/20 rounded-2xl p-8 relative overflow-hidden shadow-lg shadow-primary/5 mt-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse" />
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin flex items-center justify-center mb-6">
                      <Globe className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary animate-bounce" />
                      Scanning Wider Web
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      We didn't find this tool in our local index of 200. Searching the web in real-time for the best matching AI tools...
                    </p>
                  </div>
                </div>
              )}

              {/* Web-aware Layer 2 Suggested Add Card */}
              {!webSearching && suggestedTool && (
                <div className="mt-8 mb-12">
                  <div className="relative group rounded-2xl border-2 border-primary/30 bg-card p-6 md:p-8 shadow-xl shadow-primary/5 hover:border-primary/50 transition-all duration-300">
                    {/* Glowing Accent */}
                    <div className="absolute -top-3 left-6 flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold tracking-wider uppercase shadow-md">
                      <Sparkles className="w-3.5 h-3.5" />
                      Suggested Web Match
                    </div>
                    
                    <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 pt-4">
                      {/* Left: Structured Tool Card Details matching directory styling */}
                      <div className="flex-1 space-y-5">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-4 items-center">
                            <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary font-bold text-xl shrink-0">
                              {suggestedTool.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
                                {suggestedTool.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">{suggestedTool.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-sm font-bold">
                            <Star className="w-4 h-4 fill-primary" />
                            {suggestedTool.rating || 4.2}
                          </div>
                        </div>

                        <div>
                          <a 
                            href={suggestedTool.website} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            <Globe className="w-4 h-4" />
                            {suggestedTool.website}
                          </a>
                        </div>
                        
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                          {suggestedTool.description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {suggestedTool.best_for && (
                            <div>
                              <span className="text-xs font-semibold uppercase text-muted-foreground">Best For</span>
                              <p className="text-sm text-foreground">{suggestedTool.best_for}</p>
                            </div>
                          )}
                          
                          <div className="flex items-end gap-2">
                            <Badge variant={suggestedTool.pricing === 'Free' ? 'default' : 'outline'}>{suggestedTool.pricing || 'Free Trial'}</Badge>
                            <Badge variant="secondary">{suggestedTool.difficulty || 'Beginner'}</Badge>
                          </div>
                        </div>

                        {/* Pros and Cons matching Directory List Card */}
                        {suggestedTool.pros && suggestedTool.pros.length > 0 && (
                          <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                            <div>
                              <span className="text-xs font-semibold uppercase text-green-500 mb-2 block">Pros</span>
                              <ul className="space-y-1 text-xs md:text-sm">
                                {suggestedTool.pros.slice(0, 2).map((pro, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                    <span className="line-clamp-1 text-muted-foreground">{pro}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="text-xs font-semibold uppercase text-red-500 mb-2 block">Cons</span>
                              <ul className="space-y-1 text-xs md:text-sm">
                                {suggestedTool.cons.slice(0, 2).map((con, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <span className="line-clamp-1 text-muted-foreground">{con}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          {suggestedTool.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="font-mono text-[10px] uppercase">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Right: CTA Box */}
                      <div className="w-full lg:w-72 bg-muted/40 border rounded-xl p-6 shrink-0 flex flex-col justify-between">
                        <div className="space-y-2.5 mb-6">
                          <h4 className="font-bold text-base">Add to FindUrAI Directory?</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            This tool isn't in our directory yet. Suggest this tool, and we will verify, index, and publish it automatically.
                          </p>
                        </div>
                        
                        {submissionStatus === "idle" && (
                          <Button 
                            onClick={handleSuggestSubmit}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all py-6 rounded-xl"
                          >
                            <Plus className="w-4 h-4" />
                            Want us to add it?
                          </Button>
                        )}

                        {submissionStatus === "submitting" && (
                          <Button disabled className="w-full flex items-center justify-center gap-2 py-6 rounded-xl">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </Button>
                        )}

                        {submissionStatus === "success" && (
                          <div className="w-full py-3.5 px-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 font-semibold text-center text-sm flex items-center justify-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                            <Check className="w-4 h-4 animate-bounce" />
                            Submission Received!
                          </div>
                        )}

                        {submissionStatus === "error" && (
                          <div className="space-y-2">
                            <div className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-semibold text-center text-sm">
                              Failed to submit.
                            </div>
                            <Button 
                              onClick={handleSuggestSubmit} 
                              size="sm" 
                              variant="outline" 
                              className="w-full text-xs py-5 rounded-xl"
                            >
                              Try Again
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {results.length === 0 && !webSearching && !suggestedTool && (
                <div className="text-center py-24 bg-muted/20 rounded-2xl border border-border/40">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No tools found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or clearing your filters.</p>
                  <Button 
                    variant="outline" 
                    className="mt-6"
                    onClick={() => {
                      setQuery("")
                      setActiveQuery("")
                      setFreeOnly(false); setHasApi(false); setHasMobile(false); setIsOpenSource(false); setCategoryFilter("");
                    }}
                  >
                    Clear all filters and search
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  if (!TOOL_DIRECTORY_ENABLED) notFound()

  return (
    <div className="min-h-screen bg-muted/10">
      <div className="bg-background border-b border-border/40 pt-10 pb-6 px-4">
        <div className="container max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">Discover Tools</h1>
          <p className="text-muted-foreground mt-2">Filter and search to find exactly what you need.</p>
        </div>
      </div>
      <Suspense fallback={<div className="p-8 text-center">Loading search results...</div>}>
        <SearchContent />
      </Suspense>
    </div>
  )
}
