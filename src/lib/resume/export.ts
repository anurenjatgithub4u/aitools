import { ResumeData } from "@/types/resume"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx"

export interface ValidationIssue {
  type: "warning" | "error"
  field: string
  message: string
}

export function validateResumeForExport(data: ResumeData): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!data.basics.name || data.basics.name.toLowerCase().includes("your name")) {
    issues.push({ type: "error", field: "basics.name", message: "Candidate name is missing or contains default placeholder." })
  }
  if (!data.basics.email) {
    issues.push({ type: "error", field: "basics.email", message: "Email address is missing." })
  }
  if (!data.basics.phone) {
    issues.push({ type: "warning", field: "basics.phone", message: "Phone number is recommended for ATS contact parsing." })
  }
  if (!data.summary || data.summary.trim().length < 20) {
    issues.push({ type: "warning", field: "summary", message: "Professional summary is very brief or empty." })
  }
  if (!data.experience || data.experience.length === 0) {
    issues.push({ type: "warning", field: "experience", message: "No work experience entries added." })
  }
  if (!data.skills || data.skills.length === 0) {
    issues.push({ type: "warning", field: "skills", message: "No technical skills section found." })
  }

  return issues
}

export async function exportResumeToPDF(elementId = "resume-canvas-paper", fileName = "Resume.pdf"): Promise<boolean> {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error("Canvas element not found for PDF export")
    return false
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    })

    const imgData = canvas.toDataURL("image/jpeg", 0.98)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(fileName)
    return true
  } catch (err) {
    console.error("PDF Export error:", err)
    // Fallback to window.print()
    window.print()
    return true
  }
}

export async function exportResumeToDOCX(data: ResumeData, fileName = "Resume.docx"): Promise<boolean> {
  try {
    const docChildren: any[] = []

    // Header Name
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: data.basics.name || "Your Name",
            bold: true,
            size: 32, // 16pt
            font: "Arial",
          }),
        ],
      })
    )

    // Title
    if (data.basics.title) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: data.basics.title,
              size: 24, // 12pt
              color: "4B5563",
              font: "Arial",
            }),
          ],
        })
      )
    }

    // Contact bar
    const contactParts = [
      data.basics.location,
      data.basics.email,
      data.basics.phone,
      data.basics.linkedin,
      data.basics.portfolio,
    ].filter(Boolean)

    if (contactParts.length) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: contactParts.join("  |  "),
              size: 18,
              color: "6B7280",
              font: "Arial",
            }),
          ],
        })
      )
    }

    // Summary Section
    if (data.summary) {
      docChildren.push(createSectionHeading("PROFESSIONAL SUMMARY"))
      docChildren.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: data.summary, size: 20, font: "Arial" })],
        })
      )
    }

    // Experience Section
    if (data.experience?.length) {
      docChildren.push(createSectionHeading("WORK EXPERIENCE"))
      data.experience.forEach((exp) => {
        docChildren.push(
          new Paragraph({
            spacing: { before: 100 },
            children: [
              new TextRun({ text: exp.position, bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: ` — ${exp.company}`, bold: true, color: "374151", size: 22, font: "Arial" }),
              new TextRun({
                text: `\t${exp.startDate} - ${exp.current ? "Present" : exp.endDate}`,
                color: "6B7280",
                size: 18,
                font: "Arial",
              }),
            ],
          })
        )

        exp.bullets.forEach((bullet) => {
          docChildren.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [new TextRun({ text: bullet, size: 20, font: "Arial" })],
            })
          )
        })
      })
    }

    // Education Section
    if (data.education?.length) {
      docChildren.push(createSectionHeading("EDUCATION"))
      data.education.forEach((edu) => {
        docChildren.push(
          new Paragraph({
            spacing: { before: 100 },
            children: [
              new TextRun({ text: `${edu.degree} ${edu.field ? `in ${edu.field}` : ""}`, bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: ` — ${edu.institution}`, color: "374151", size: 20, font: "Arial" }),
              new TextRun({ text: `\t${edu.startDate} - ${edu.endDate}`, color: "6B7280", size: 18, font: "Arial" }),
            ],
          })
        )
      })
    }

    // Skills Section
    if (data.skills?.length) {
      docChildren.push(createSectionHeading("SKILLS & EXPERTISE"))
      data.skills.forEach((s) => {
        docChildren.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `${s.category}: `, bold: true, size: 20, font: "Arial" }),
              new TextRun({ text: s.items.join(", "), size: 20, font: "Arial" }),
            ],
          })
        )
      })
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    })

    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (err) {
    console.error("DOCX export error:", err)
    return false
  }
}

function createSectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    border: {
      bottom: { color: "9CA3AF", space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        color: "1F2937",
        font: "Arial",
      }),
    ],
  })
}
