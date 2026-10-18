// The AI tools you can visit on AI Tools Avenue. Walk up to a booth, press E (or tap Drive) and the tool opens.
export interface AiTool { id: string; name: string; url: string; blurb: string; color: number }

export const AI_TOOLS: AiTool[] = [
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', blurb: 'Chat, write, code', color: 0x10a37f },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai', blurb: 'Thoughtful AI assistant', color: 0xd97757 },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', blurb: "Google's AI assistant", color: 0x4285f4 },
  { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', blurb: 'Answers with sources', color: 0x20808d },
  { id: 'copilot', name: 'Copilot', url: 'https://copilot.microsoft.com', blurb: "Microsoft's AI companion", color: 0x2b7cd3 },
  { id: 'grok', name: 'Grok', url: 'https://grok.com', blurb: "xAI's chatbot", color: 0x222222 },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com', blurb: 'Open reasoning models', color: 0x4d6bfe },
  { id: 'midjourney', name: 'Midjourney', url: 'https://www.midjourney.com', blurb: 'AI image art', color: 0x7a5cf0 },
  { id: 'canva', name: 'Canva', url: 'https://www.canva.com', blurb: 'Design with Magic Studio', color: 0x00c4cc },
  { id: 'runway', name: 'Runway', url: 'https://runwayml.com', blurb: 'AI video generation', color: 0xe8453c },
  { id: 'suno', name: 'Suno', url: 'https://suno.com', blurb: 'Make songs from text', color: 0xf2a33a },
  { id: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io', blurb: 'Realistic AI voices', color: 0x3a3a4a },
  { id: 'notebooklm', name: 'NotebookLM', url: 'https://notebooklm.google.com', blurb: 'Study with your sources', color: 0xf2c31b },
  { id: 'notion', name: 'Notion AI', url: 'https://www.notion.com/product/ai', blurb: 'Notes, docs and AI', color: 0x2f2f2f },
  { id: 'cursor', name: 'Cursor', url: 'https://cursor.com', blurb: 'AI code editor', color: 0x4a4a5a },
  { id: 'github-copilot', name: 'GitHub Copilot', url: 'https://github.com/features/copilot', blurb: 'AI pair programmer', color: 0x6e40c9 },
  { id: 'huggingface', name: 'Hugging Face', url: 'https://huggingface.co', blurb: 'Models, datasets, demos', color: 0xffb000 },
  { id: 'meta-ai', name: 'Meta AI', url: 'https://www.meta.ai', blurb: "Meta's AI assistant", color: 0x0a7cff },
];
