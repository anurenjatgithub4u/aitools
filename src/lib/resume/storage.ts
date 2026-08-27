import { ResumeData } from "@/types/resume"

const STORAGE_KEY = "findurai_resumes"

export function getSavedResumes(): ResumeData[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error("Failed to parse saved resumes", e)
    return []
  }
}

export function getResumeById(id: string): ResumeData | null {
  const resumes = getSavedResumes()
  return resumes.find((r) => r.id === id) || null
}

export function saveResume(resume: ResumeData): ResumeData {
  if (typeof window === "undefined") return resume
  try {
    const resumes = getSavedResumes()
    const index = resumes.findIndex((r) => r.id === resume.id)
    const updated = {
      ...resume,
      updatedAt: new Date().toISOString(),
    }

    if (index >= 0) {
      resumes[index] = updated
    } else {
      resumes.unshift(updated)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes))
    return updated
  } catch (e) {
    console.error("Failed to save resume", e)
    return resume
  }
}

export function deleteResume(id: string): void {
  if (typeof window === "undefined") return
  try {
    const resumes = getSavedResumes()
    const filtered = resumes.filter((r) => r.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (e) {
    console.error("Failed to delete resume", e)
  }
}

export function duplicateResume(id: string): ResumeData | null {
  const original = getResumeById(id)
  if (!original) return null

  const newId = `resume_${Date.now()}`
  const copy: ResumeData = {
    ...JSON.parse(JSON.stringify(original)),
    id: newId,
    title: `${original.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  saveResume(copy)
  return copy
}
