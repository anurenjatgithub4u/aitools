// Master switch for the Workspace — the Notion-style personal knowledge app
// (collections, graph view, projects, playbooks, workflows, insights, stack).
//
// Off by default. It was a second product bolted onto the site, reachable only
// from a single homepage button that no longer exists now that the homepage is
// the product leaderboard.
//
// Switching it off also closes a real hole: every /api/workspace/* handler
// takes `userId` straight from the query string or request body with no token
// verification, so anyone who guessed a uid could read or write another
// person's workspace. If this is ever re-enabled, those routes must be moved
// onto verifyFirebaseIdToken first — see src/lib/products/auth.ts for the
// pattern.
//
// Set NEXT_PUBLIC_WORKSPACE_ENABLED=true in .env.local to turn it back on.
export const WORKSPACE_ENABLED = process.env.NEXT_PUBLIC_WORKSPACE_ENABLED === "true";
