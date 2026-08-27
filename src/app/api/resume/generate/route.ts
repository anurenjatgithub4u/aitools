import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { ResumeData } from "@/types/resume"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      prompt,
      targetRole = "",
      experienceLevel = "",
      resumeType = "",
      jobDescription = "",
      referenceContext = "",
    } = body

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "A descriptive prompt is required." }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey && apiKey !== "mock_key") {
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

        const systemPrompt = `You are FindUrAI Resume Generator, an expert ATS-conscious resume architect.
Convert the user's description into a structured, highly professional resume JSON.

STRICT ACCURACY RULES:
1. NEVER invent employers, job titles, universities, degrees, metrics, dates, or certifications not explicitly provided or strongly implied by the user prompt.
2. If specific contact details (email, phone, linkedin) are not provided, use clean placeholders or leave blank.
3. Write concise, action-oriented bullet points using powerful action verbs.
4. Keep bullets ATS-friendly and professional.
5. Return ONLY a raw valid JSON object without markdown fences, complying exactly with this structure:

{
  "basics": {
    "name": "Full Name",
    "title": "Target Professional Title",
    "email": "email@example.com",
    "phone": "Phone Number",
    "location": "City, Country/State",
    "linkedin": "linkedin.com/in/username",
    "portfolio": "portfolio URL",
    "github": "github URL"
  },
  "summary": "2-3 sentence professional summary",
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "location": "Location",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or Present",
      "current": false,
      "bullets": ["Action verb + task + outcome bullet"]
    }
  ],
  "education": [
    {
      "institution": "University / Institution Name",
      "degree": "Degree Name",
      "field": "Field of Study",
      "startDate": "YYYY",
      "endDate": "YYYY",
      "details": "Honors or GPA if provided"
    }
  ],
  "skills": [
    {
      "category": "Skill Category",
      "items": ["Skill 1", "Skill 2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Short description",
      "technologies": ["Tech 1", "Tech 2"],
      "url": "Project URL"
    }
  ],
  "certifications": ["Certification name"],
  "achievements": ["Key achievement"],
  "languages": ["Languages spoken"]
}`

        const userContent = `User Prompt: ${prompt}
Target Role: ${targetRole}
Experience Level: ${experienceLevel}
Resume Type: ${resumeType}
${jobDescription ? `Job Description to Tailor to:\n${jobDescription}` : ""}
${referenceContext ? `Reference Profile Context:\n${referenceContext}` : ""}`

        const response = await model.generateContent([
          { text: systemPrompt },
          { text: userContent },
        ])

        const rawText = response.response.text().trim()
        const cleanedJsonText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim()
        
        const parsed = JSON.parse(cleanedJsonText)

        const resumeId = `resume_${Date.now()}`
        const fullResume: ResumeData = {
          id: resumeId,
          title: parsed.basics?.title ? `${parsed.basics.title} Resume` : `${targetRole || "My Professional"} Resume`,
          targetRole: targetRole || parsed.basics?.title || "Professional",
          experienceLevel,
          resumeType,
          sourcePrompt: prompt,
          jobDescription,
          referenceContext,
          basics: {
            name: parsed.basics?.name || "Your Name",
            title: parsed.basics?.title || targetRole || "Professional",
            email: parsed.basics?.email || "",
            phone: parsed.basics?.phone || "",
            location: parsed.basics?.location || "",
            linkedin: parsed.basics?.linkedin || "",
            portfolio: parsed.basics?.portfolio || "",
            github: parsed.basics?.github || "",
          },
          summary: parsed.summary || "",
          experience: Array.isArray(parsed.experience)
            ? parsed.experience.map((exp: any, idx: number) => ({
                id: `exp_${idx}_${Date.now()}`,
                company: exp.company || "Company Name",
                position: exp.position || "Position Title",
                location: exp.location || "",
                startDate: exp.startDate || "",
                endDate: exp.endDate || "Present",
                current: Boolean(exp.current),
                bullets: Array.isArray(exp.bullets) ? exp.bullets : [],
              }))
            : [],
          education: Array.isArray(parsed.education)
            ? parsed.education.map((edu: any, idx: number) => ({
                id: `edu_${idx}_${Date.now()}`,
                institution: edu.institution || "University Name",
                degree: edu.degree || "Degree",
                field: edu.field || "",
                startDate: edu.startDate || "",
                endDate: edu.endDate || "",
                details: edu.details || "",
              }))
            : [],
          skills: Array.isArray(parsed.skills)
            ? parsed.skills.map((s: any, idx: number) => ({
                id: `skill_${idx}_${Date.now()}`,
                category: typeof s === "string" ? "Core Skills" : s.category || "Technical Skills",
                items: Array.isArray(s.items) ? s.items : typeof s === "string" ? [s] : [],
              }))
            : [],
          projects: Array.isArray(parsed.projects)
            ? parsed.projects.map((p: any, idx: number) => ({
                id: `proj_${idx}_${Date.now()}`,
                name: p.name || "Project Name",
                description: p.description || "",
                technologies: Array.isArray(p.technologies) ? p.technologies : [],
                url: p.url || "",
              }))
            : [],
          certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
          achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
          languages: Array.isArray(parsed.languages) ? parsed.languages : ["English"],
          settings: {
            templateId: "ats-classic",
            fontFamily: "Inter, sans-serif",
            fontSize: "md",
            spacing: "normal",
            accentColor: "#1e293b",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        return NextResponse.json({ success: true, resume: fullResume })
      } catch (aiErr) {
        console.warn("AI generation failed or rate limited, fallback to structured generator:", aiErr)
      }
    }

    // Fallback generator if AI API call is unavailable or fails
    const fallbackResume = generateFallbackResume(prompt, targetRole, experienceLevel)
    return NextResponse.json({ success: true, resume: fallbackResume })
  } catch (err: any) {
    console.error("Resume Generation Route Error:", err)
    return NextResponse.json({ error: err.message || "Failed to generate resume" }, { status: 500 })
  }
}

function generateFallbackResume(prompt: string, targetRole: string, experienceLevel: string): ResumeData {
  const roleName = targetRole || extractRoleFromPrompt(prompt) || "Software Engineer"
  const resumeId = `resume_${Date.now()}`

  return {
    id: resumeId,
    title: `${roleName} Resume`,
    targetRole: roleName,
    experienceLevel,
    sourcePrompt: prompt,
    basics: {
      name: "Alex Taylor",
      title: roleName,
      email: "alex.taylor@example.com",
      phone: "+1 (555) 019-2834",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/alextaylor-pro",
      portfolio: "alextaylor.dev",
      github: "github.com/alextaylor",
    },
    summary: `Dedicated and goal-oriented ${roleName} with hands-on experience building reliable software solutions. Proven background in writing clean code, collaborating with cross-functional teams, and shipping quality product features.`,
    experience: [
      {
        id: `exp_1_${Date.now()}`,
        company: "Tech Development Corp",
        position: `${roleName}`,
        location: "San Francisco, CA",
        startDate: "2023-01",
        endDate: "Present",
        current: true,
        bullets: [
          `Developed and maintained production features based on prompt requirements: "${prompt.slice(0, 80)}..."`,
          "Collaborated with product designers and backend engineers to implement scalable features and improve application load times.",
          "Wrote automated unit tests and participated in active code reviews to maintain high code quality.",
        ],
      },
    ],
    education: [
      {
        id: `edu_1_${Date.now()}`,
        institution: "State University",
        degree: "Bachelor of Science",
        field: "Computer Science",
        startDate: "2019",
        endDate: "2023",
        details: "Focus on Software Engineering & Data Structures.",
      },
    ],
    skills: [
      {
        id: `skill_1_${Date.now()}`,
        category: "Technical Skills",
        items: ["JavaScript", "TypeScript", "React", "Node.js", "Git", "REST APIs"],
      },
    ],
    projects: [
      {
        id: `proj_1_${Date.now()}`,
        name: "Featured Application Project",
        description: `Full-stack implementation based on ${roleName} standards.`,
        technologies: ["React", "TypeScript", "REST API"],
        url: "github.com/alextaylor/featured-app",
      },
    ],
    certifications: ["Professional Software Developer Certificate"],
    achievements: ["Delivered 100% on-time feature milestones"],
    languages: ["English"],
    settings: {
      templateId: "ats-classic",
      fontFamily: "Inter, sans-serif",
      fontSize: "md",
      spacing: "normal",
      accentColor: "#1e293b",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function extractRoleFromPrompt(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (lower.includes("android")) return "Android Developer"
  if (lower.includes("frontend")) return "Frontend Developer"
  if (lower.includes("backend")) return "Backend Developer"
  if (lower.includes("full stack") || lower.includes("fullstack")) return "Full Stack Engineer"
  if (lower.includes("ai") || lower.includes("machine learning")) return "AI Engineer"
  if (lower.includes("data analyst") || lower.includes("data science")) return "Data Analyst"
  if (lower.includes("product manager")) return "Product Manager"
  return "Software Engineer"
}
