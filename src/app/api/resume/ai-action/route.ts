import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { ResumeData, ResumeScore, JobMatchAnalysis } from "@/types/resume"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, text, targetRole, instruction, resume, jobDescription } = body

    const apiKey = process.env.GEMINI_API_KEY

    // Action 1: Granular text improvement
    if (action === "improveText") {
      if (!text) {
        return NextResponse.json({ error: "Text is required for improvement." }, { status: 400 })
      }

      if (apiKey && apiKey !== "mock_key") {
        try {
          const genAI = new GoogleGenerativeAI(apiKey)
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

          const prompt = `You are a professional resume editor. Rewrite the following text according to this instruction: "${instruction || "Make concise, impactful, and ATS-friendly"}".
Target Role: ${targetRole || "General Professional"}

Original Text:
"${text}"

Rules:
- Keep the length appropriate (do not exaggerate).
- Do NOT invent metrics or employers not present in original.
- Return ONLY the rewritten text without surrounding quotes or markdown formatting.`

          const response = await model.generateContent(prompt)
          const improved = response.response.text().trim()
          return NextResponse.json({ success: true, result: improved })
        } catch (e) {
          console.warn("AI improveText failed, falling back:", e)
        }
      }

      // Local fallback rewrite
      const fallbackResult = fallbackImproveText(text, instruction)
      return NextResponse.json({ success: true, result: fallbackResult })
    }

    // Action 2: Resume Score analysis
    if (action === "analyzeScore") {
      const resumeData: ResumeData = resume
      if (!resumeData) {
        return NextResponse.json({ error: "Resume data is required." }, { status: 400 })
      }

      const score = calculateResumeScore(resumeData)
      return NextResponse.json({ success: true, score })
    }

    // Action 3: Job Description Match Analysis
    if (action === "matchJobDescription") {
      const resumeData: ResumeData = resume
      if (!resumeData || !jobDescription) {
        return NextResponse.json({ error: "Resume and Job Description are required." }, { status: 400 })
      }

      const analysis = analyzeJobMatch(resumeData, jobDescription)
      return NextResponse.json({ success: true, analysis })
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 })
  } catch (err: any) {
    console.error("AI Action Error:", err)
    return NextResponse.json({ error: err.message || "AI action failed." }, { status: 500 })
  }
}

function fallbackImproveText(text: string, instruction?: string): string {
  const trimmed = text.trim()
  const inst = (instruction || "").toLowerCase()

  if (inst.includes("concise")) {
    return trimmed.replace(/\b(responsible for|in order to|worked on|helped with)\b/gi, "").trim()
  }
  if (inst.includes("professional") || inst.includes("impact") || inst.includes("verb")) {
    if (!/^[A-Z][a-z]+ed\b/.test(trimmed)) {
      return `Developed and optimized ${trimmed.charAt(0).toLowerCase() + trimmed.slice(1)}`
    }
  }
  if (inst.includes("grammar")) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1) + (trimmed.endsWith(".") ? "" : ".")
  }
  return `Enhanced: ${trimmed}`
}

function calculateResumeScore(resume: ResumeData): ResumeScore {
  let content = 70
  let relevance = 75
  let structure = 80
  let clarity = 75
  let formatting = 85
  const suggestions = []

  // Check contact info
  if (resume.basics.linkedin) content += 5
  else {
    suggestions.push({
      id: "sug_linkedin",
      category: "content" as const,
      title: "Add your LinkedIn URL",
      description: "Resumes with active LinkedIn profiles receive 40% higher recruiter response rates.",
      fixPrompt: "Add LinkedIn profile link to basic details",
    })
  }

  if (resume.basics.portfolio || resume.basics.github) content += 5

  // Check Summary
  if (resume.summary && resume.summary.length > 50) {
    content += 10
    clarity += 5
  } else {
    suggestions.push({
      id: "sug_summary",
      category: "clarity" as const,
      title: "Enhance Professional Summary",
      description: "Your summary is brief. Add 2-3 sentences highlighting your core competencies and target role.",
      fixPrompt: "Make professional summary more role-specific and impactful",
    })
  }

  // Check Experience bullets
  const totalBullets = resume.experience.reduce((acc, exp) => acc + exp.bullets.length, 0)
  if (totalBullets >= 4) {
    structure += 10
    relevance += 10
  } else {
    suggestions.push({
      id: "sug_bullets",
      category: "structure" as const,
      title: "Add Stronger Bullet Points",
      description: "Aim for 3-5 bullet points per work experience section highlighting key responsibilities.",
      fixPrompt: "Generate 2 additional action-oriented experience bullets",
    })
  }

  // Check Skills
  const totalSkills = resume.skills.reduce((acc, s) => acc + s.items.length, 0)
  if (totalSkills >= 6) {
    content += 10
  } else {
    suggestions.push({
      id: "sug_skills",
      category: "relevance" as const,
      title: "Expand Technical Skills Matrix",
      description: "List relevant tools, languages, and frameworks to improve ATS keyword indexing.",
      fixPrompt: "Suggest 4 relevant industry skills for my target role",
    })
  }

  // Cap at 98 max
  content = Math.min(content, 95)
  relevance = Math.min(relevance, 94)
  structure = Math.min(structure, 96)
  clarity = Math.min(clarity, 92)
  formatting = Math.min(formatting, 98)

  const total = Math.round((content + relevance + structure + clarity + formatting) / 5)

  return {
    total,
    breakdown: { content, relevance, structure, clarity, formatting },
    suggestions,
  }
}

function analyzeJobMatch(resume: ResumeData, jobDescription: string): JobMatchAnalysis {
  const jdLower = jobDescription.toLowerCase()
  const resumeSkills = resume.skills.flatMap((s) => s.items.map((i) => i.toLowerCase()))
  
  // Extract common tech words from JD
  const potentialKeywords = [
    "react", "typescript", "javascript", "kotlin", "android", "python", "node.js", "express",
    "firebase", "rest api", "graphql", "sql", "postgresql", "mongodb", "docker", "aws",
    "jetpack compose", "unit testing", "git", "ci/cd", "agile", "scrum", "figma", "tailwind"
  ]

  const presentInJd = potentialKeywords.filter((kw) => jdLower.includes(kw))
  const matchingSkills: string[] = []
  const missingKeywords: string[] = []

  presentInJd.forEach((kw) => {
    const isMatched = resumeSkills.some((s) => s.includes(kw)) || resume.summary.toLowerCase().includes(kw)
    if (isMatched) {
      matchingSkills.push(capitalizeWords(kw))
    } else {
      missingKeywords.push(capitalizeWords(kw))
    }
  })

  // Calculate score
  const totalRelevant = presentInJd.length || 1
  const matchPercent = Math.min(96, Math.max(45, Math.round((matchingSkills.length / totalRelevant) * 100)))

  return {
    matchScore: matchPercent,
    matchingSkills: matchingSkills.length ? matchingSkills : ["General Software Engineering"],
    missingKeywords: missingKeywords.length ? missingKeywords.slice(0, 5) : ["Unit Testing", "CI/CD"],
    recommendations: missingKeywords.length
      ? missingKeywords.slice(0, 3).map((kw) => `Consider highlighting experience with ${kw} in your skills or summary.`)
      : ["Your resume matches the core technical requirements of this job description!"],
  }
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}
