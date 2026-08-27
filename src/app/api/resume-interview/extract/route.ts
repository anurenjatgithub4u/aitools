import { NextRequest, NextResponse } from "next/server"
import { extractResumeText } from "@/lib/resume-interview/extract-text"

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8MB — resumes are small; this is generous

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File is too large. Please upload a resume under 8MB." }, { status: 400 })
    }

    const text = await extractResumeText(file)
    return NextResponse.json({ text })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Couldn't read this file."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
