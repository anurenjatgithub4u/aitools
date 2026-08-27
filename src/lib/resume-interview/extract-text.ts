// Server-only resume text extraction. PDF/DOCX parsing libraries are
// Node-only, so this must run inside an API route, never imported by a
// client component.

import { PDFParse } from "pdf-parse"
import mammoth from "mammoth"

const MAX_CHARS = 20_000 // resumes are 1-3 pages; this is a generous ceiling

export async function extractResumeText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const name = file.name.toLowerCase()

  let text: string

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    try {
      const result = await parser.getText()
      text = result.text
    } finally {
      await parser.destroy()
    }
  } else if (name.endsWith(".docx") || file.type.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer })
    text = result.value
  } else if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc files aren't supported — please upload as .docx, .pdf, or .txt.")
  } else {
    // Treat anything else as plain text.
    text = buffer.toString("utf-8")
  }

  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  if (!cleaned || cleaned.length < 50) {
    throw new Error("Couldn't extract readable text from this file. Try a different format or a text-based (not scanned) PDF.")
  }

  return cleaned.slice(0, MAX_CHARS)
}
