export interface TemplateDefinition {
  id: string
  name: string
  description: string
  category: string
  badge: string
  accentColor: string
  fontFamily: string
}

export const RESUME_TEMPLATES: TemplateDefinition[] = [
  {
    id: "ats-classic",
    name: "ATS Classic",
    description: "Ultra-clean single-column structure designed for maximum parsing compatibility across all major Applicant Tracking Systems.",
    category: "Standard",
    badge: "100% ATS Ready",
    accentColor: "#1e293b", // Slate
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "modern-pro",
    name: "Modern Professional",
    description: "Sleek modern layout with subtle horizontal rules, clear visual hierarchy, and polished typography for experienced candidates.",
    category: "Professional",
    badge: "Popular",
    accentColor: "#6366f1", // Indigo
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "minimal",
    name: "Minimalist Elegance",
    description: "Focuses on generous white space and clean typography. Perfect for design, product, and leadership roles.",
    category: "Design",
    badge: "Clean",
    accentColor: "#0f172a", // Dark Slate
    fontFamily: "Georgia, serif",
  },
  {
    id: "technical",
    name: "Technical Developer",
    description: "Optimized for software engineers and IT professionals with prominent technical skill matrices and repository links.",
    category: "Engineering",
    badge: "Tech Favorite",
    accentColor: "#0284c7", // Sky Blue
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  {
    id: "graduate",
    name: "Graduate & Entry",
    description: "Prioritizes education, academic projects, and core technical coursework for students, interns, and fresh graduates.",
    category: "Students",
    badge: "Fresher Friendly",
    accentColor: "#10b981", // Emerald
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "executive",
    name: "Executive Leader",
    description: "Refined styling emphasizing strategic impact summary, key leadership competencies, and key career achievements.",
    category: "Leadership",
    badge: "Executive",
    accentColor: "#8b5cf6", // Violet
    fontFamily: "Inter, sans-serif",
  },
]
