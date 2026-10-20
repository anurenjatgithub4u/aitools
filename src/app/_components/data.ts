export type Scene = { id: number; label: string; seconds: number; voice: string; visual: string };

export const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts"] as const;
export const TONES = ["Casual & honest", "Hype", "Educational", "Funny", "Luxury"] as const;
export const FORMATS = ["Testimonial", "Unboxing", "Problem → Solution", "Before / After", "Get ready with me"] as const;
export const LENGTHS = [15, 30, 45, 60] as const;

export const CREATORS = [
  { id: "maya", name: "Maya", vibe: "Skincare · 24", hue: 330 },
  { id: "dev", name: "Dev", vibe: "Tech · 28", hue: 220 },
  { id: "sofia", name: "Sofia", vibe: "Lifestyle · 31", hue: 28 },
  { id: "kai", name: "Kai", vibe: "Fitness · 26", hue: 150 },
  { id: "zara", name: "Zara", vibe: "Fashion · 22", hue: 280 },
  { id: "omar", name: "Omar", vibe: "Food · 35", hue: 50 },
];

const HOOKS = [
  "Stop scrolling if you struggle with {problem}.",
  "I didn't believe the hype until I tried {product}.",
  "3 reasons {product} is now on my daily list.",
  "POV: you finally fixed {problem} for good.",
];

export const LIBRARY = [
  { id: 1, title: "Glow serum · testimonial", platform: "TikTok", status: "Ready", views: "—", hue: 330 },
  { id: 2, title: "Standing desk · problem → solution", platform: "Instagram Reels", status: "Rendering", views: "—", hue: 220 },
  { id: 3, title: "Protein bar · unboxing", platform: "YouTube Shorts", status: "Published", views: "48.2k", hue: 150 },
  { id: 4, title: "Linen set · get ready with me", platform: "TikTok", status: "Published", views: "112k", hue: 28 },
  { id: 5, title: "Noise-cancel buds · hype", platform: "Instagram Reels", status: "Draft", views: "—", hue: 280 },
  { id: 6, title: "Cold brew · before / after", platform: "TikTok", status: "Ready", views: "—", hue: 50 },
];

export function buildScenes(product: string, problem: string, length: number, format: string): Scene[] {
  const p = product || "this product";
  const pr = problem || "this problem";
  const hook = HOOKS[format.length % HOOKS.length].replace("{product}", p).replace("{problem}", pr);
  const problemSec = Math.round(length * 0.2);
  const revealSec = Math.round(length * 0.25);
  const proofSec = Math.round(length * 0.3);
  const ctaSec = Math.max(3, length - 3 - problemSec - revealSec - proofSec);
  const beats: Omit<Scene, "id">[] = [
    { label: "Hook", seconds: 3, voice: hook, visual: "Creator to camera, close-up, handheld" },
    { label: "Problem", seconds: problemSec, voice: `I used to deal with ${pr} every single day and nothing worked.`, visual: "B-roll of the struggle, quick cuts" },
    { label: "Reveal", seconds: revealSec, voice: `Then a friend sent me ${p}, so I gave it a real try.`, visual: `${format} setup, product in hand` },
    { label: "Proof", seconds: proofSec, voice: "Within a week the difference was obvious. Here is what changed.", visual: "Demo shots with on-screen captions" },
    { label: "CTA", seconds: ctaSec, voice: "Link is in my bio. Use my code for a discount.", visual: "Product shot, end card with code" },
  ];
  return beats.map((b, i) => ({ id: i + 1, ...b }));
}

export const TEMPLATES = [
  { id: "t1", name: "Honest testimonial", desc: "A creator shares a genuine before/after story and ends with a soft CTA.", format: "Testimonial", tone: "Casual & honest", platform: "TikTok", length: 30, category: "Beauty", uses: "12.4k", hue: 330 },
  { id: "t2", name: "Unboxing reaction", desc: "First-look reaction with close-ups of packaging, texture and details.", format: "Unboxing", tone: "Hype", platform: "Instagram Reels", length: 30, category: "Gadgets", uses: "9.1k", hue: 220 },
  { id: "t3", name: "Problem → solution", desc: "Open on the pain point, reveal the product, prove it in 3 beats.", format: "Problem → Solution", tone: "Educational", platform: "TikTok", length: 45, category: "Home", uses: "15.8k", hue: 150 },
  { id: "t4", name: "Before / after glow-up", desc: "Split-screen transformation with a bold on-screen caption.", format: "Before / After", tone: "Hype", platform: "YouTube Shorts", length: 15, category: "Beauty", uses: "7.3k", hue: 28 },
  { id: "t5", name: "Get ready with me", desc: "Morning routine where the product slips in naturally.", format: "Get ready with me", tone: "Casual & honest", platform: "Instagram Reels", length: 60, category: "Fashion", uses: "5.6k", hue: 280 },
  { id: "t6", name: "Funny skit pitch", desc: "A 20-second comedic scenario that lands on the product as the punchline.", format: "Problem → Solution", tone: "Funny", platform: "TikTok", length: 30, category: "Lifestyle", uses: "6.9k", hue: 50 },
  { id: "t7", name: "Luxury close-up", desc: "Slow, cinematic product shots with a calm voiceover.", format: "Unboxing", tone: "Luxury", platform: "Instagram Reels", length: 15, category: "Fashion", uses: "3.2k", hue: 260 },
  { id: "t8", name: "3 reasons I switched", desc: "List-style video with numbered on-screen captions.", format: "Testimonial", tone: "Educational", platform: "YouTube Shorts", length: 45, category: "Gadgets", uses: "8.0k", hue: 190 },
];

export const PLANS = [
  { id: "starter", name: "Starter", monthly: 0, yearly: 0, blurb: "Try the engine with no card.", credits: "10 credits / month", cta: "Start free", featured: false,
    features: ["2 AI creators", "Script & scene generator", "720p exports", "Watermarked videos"] },
  { id: "creator", name: "Creator", monthly: 29, yearly: 23, blurb: "For solo marketers and small shops.", credits: "150 credits / month", cta: "Choose Creator", featured: true,
    features: ["All 40+ AI creators", "1080p, no watermark", "Auto captions & music", "All templates", "Direct publish to TikTok & Reels"] },
  { id: "agency", name: "Agency", monthly: 99, yearly: 79, blurb: "For teams shipping UGC at volume.", credits: "600 credits / month", cta: "Choose Agency", featured: false,
    features: ["Everything in Creator", "5 team seats", "Brand kits & custom creators", "Bulk generation (CSV)", "Priority rendering"] },
];

export const FAQS = [
  ["What is a credit?", "One credit is roughly 6 seconds of rendered video. A 30-second video costs 5 credits; scripts and previews are free."],
  ["Can I use the videos in paid ads?", "Yes. Creator and Agency plans include a commercial licence for organic posts and paid ads."],
  ["Are the AI creators real people?", "No. They are synthetic avatars, and you can label videos as AI-generated at publish time."],
  ["Can I cancel any time?", "Yes. Cancel from settings and keep access until the end of the billing period."],
];
