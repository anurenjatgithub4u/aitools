import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Tool } from "@/models/Tool";
import { callAI, hasAIProviderKey } from "@/lib/ai";

// AI Starter Kit: for a goal like "Create YouTube Shorts", Gemini assembles a
// complete solution — playbook, workflow steps, prompts, tools, resources —
// and we match recommended tools against the real directory (Unified Search vision).

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const goal = typeof body.q === "string" ? body.q.trim().slice(0, 300) : "";
    if (!goal) {
      return NextResponse.json({ error: "A goal is required" }, { status: 400 });
    }
    if (!hasAIProviderKey()) {
      return NextResponse.json(
        { error: "AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to enable Starter Kits." },
        { status: 503 }
      );
    }

    const prompt = `You are an AI workflow expert. A user wants to accomplish this goal: "${goal}".
Assemble a complete AI Starter Kit. Return a JSON object exactly matching this schema:
{
  "title": "Starter Kit title (e.g. 'YouTube Shorts Starter Kit')",
  "description": "One sentence on what this kit accomplishes",
  "steps": ["Step 1 ...", "Step 2 ...", "Step 3 ...", "Step 4 ...", "Step 5 ..."],
  "prompts": [
    { "title": "Prompt name", "promptText": "The full reusable prompt with {{variables}}" },
    { "title": "Second prompt name", "promptText": "..." }
  ],
  "tools": ["ChatGPT", "CapCut"],
  "resources": [
    { "title": "Resource name", "url": "https://..." }
  ],
  "tags": ["tag1", "tag2", "tag3"]
}
Rules: 4-6 concrete steps, 2-3 genuinely useful prompts, 3-5 real well-known AI tools, 1-3 real documentation/tutorial resources with real URLs.`;

    let text: string;
    try {
      text = await callAI(prompt);
    } catch (e: any) {
      return NextResponse.json({ error: `AI request failed: ${e.message}` }, { status: 502 });
    }
    const kit = JSON.parse(text);

    // Match recommended tool names against the real directory for live links
    const names: string[] = Array.isArray(kit.tools) ? kit.tools.slice(0, 8) : [];
    let matchedTools: { id: string; name: string; category: string; inDirectory: boolean }[] = [];
    try {
      await connectDB();
      const found: any[] = await Tool.find({
        name: { $in: names.map((n) => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")) },
      })
        .select("id name category")
        .lean();
      const foundByName = new Map(found.map((t) => [t.name.toLowerCase(), t]));
      matchedTools = names.map((n) => {
        const hit = foundByName.get(n.toLowerCase());
        return hit
          ? { id: hit.id, name: hit.name, category: hit.category, inDirectory: true }
          : { id: "", name: n, category: "", inDirectory: false };
      });
    } catch {
      matchedTools = names.map((n) => ({ id: "", name: n, category: "", inDirectory: false }));
    }

    return NextResponse.json({
      kit: {
        title: typeof kit.title === "string" ? kit.title : `${goal} Starter Kit`,
        description: typeof kit.description === "string" ? kit.description : "",
        steps: Array.isArray(kit.steps) ? kit.steps.slice(0, 8) : [],
        prompts: Array.isArray(kit.prompts)
          ? kit.prompts
              .filter((p: any) => p?.title && p?.promptText)
              .slice(0, 4)
          : [],
        tools: matchedTools,
        resources: Array.isArray(kit.resources)
          ? kit.resources.filter((r: any) => r?.title && r?.url).slice(0, 4)
          : [],
        tags: Array.isArray(kit.tags) ? kit.tags.slice(0, 6) : [],
      },
    });
  } catch (error: any) {
    console.error("Starter kit error:", error);
    return NextResponse.json({ error: "Failed to build the Starter Kit" }, { status: 500 });
  }
}
