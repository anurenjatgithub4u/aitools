// Master switch for the full resume builder: /resume/create, /resume/editor,
// /resume-examples, and /templates.
//
// Off by default — this was an orphaned mini-product (no nav/footer link led
// to it) unrelated to the language-learning focus. The lightweight
// `/utilities/resume-interview` practice tool is separate and unaffected.
//
// Set NEXT_PUBLIC_RESUME_BUILDER_ENABLED=true in .env.local to bring it back.
export const RESUME_BUILDER_ENABLED = process.env.NEXT_PUBLIC_RESUME_BUILDER_ENABLED === "true";
