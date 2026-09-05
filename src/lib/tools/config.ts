// Master switch for the AI tool directory: /tool/[id], /category/[slug],
// /compare, /submit-tool, and the /search browse UI.
//
// Off by default — findurai is focused on language learning now. The
// directory's templated review pages were getting a 0.1% CTR and an average
// Search position of ~55 in Search Console, and were dragging down how
// Google treats the rest of the domain.
//
// Set NEXT_PUBLIC_TOOL_DIRECTORY_ENABLED=true in .env.local to bring it back
// — one variable controls the sitemap entries, robots metadata, and every
// page above.
export const TOOL_DIRECTORY_ENABLED = process.env.NEXT_PUBLIC_TOOL_DIRECTORY_ENABLED === "true";
