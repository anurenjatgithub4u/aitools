"use client"

import React from "react"
import { ResumeData, ResumeExperience, ResumeEducation, ResumeSkillCategory, ResumeProject } from "@/types/resume"
import { RESUME_TEMPLATES } from "@/lib/resume/templates"

interface TemplateRendererProps {
  data: ResumeData
  templateId?: string
  isEditable?: boolean
  onUpdateField?: (path: string, value: any) => void
}

export function TemplateRenderer({
  data,
  templateId = "ats-classic",
  isEditable = false,
  onUpdateField,
}: TemplateRendererProps) {
  const currentTemplate = RESUME_TEMPLATES.find((t) => t.id === templateId) || RESUME_TEMPLATES[0]
  const accentColor = data.settings?.accentColor || currentTemplate.accentColor || "#1e293b"
  const fontFamily = data.settings?.fontFamily || currentTemplate.fontFamily || "Inter, sans-serif"
  const fontSizePx = data.settings?.fontSizeNumeric ? `${data.settings.fontSizeNumeric}px` : "14px"
  
  const isItalic = data.settings?.isItalic
  const isUnderline = data.settings?.isUnderline
  const isStrikethrough = data.settings?.isStrikethrough
  const textTransform = data.settings?.textTransform || "none"
  const textAlign = data.settings?.textAlign || "left"
  const lineHeight = data.settings?.lineHeight === "tight" ? "1.35" : data.settings?.lineHeight === "relaxed" ? "1.8" : "1.55"
  const letterSpacing = data.settings?.letterSpacing === "tight" ? "-0.02em" : data.settings?.letterSpacing === "wide" ? "0.04em" : "0em"
  const textEffect = data.settings?.textEffect || "none"
  const fontWeight = data.settings?.fontWeight === "bold" ? 700 : data.settings?.fontWeight === "semibold" ? 600 : data.settings?.fontWeight === "medium" ? 500 : 400

  const fontStyle: React.CSSProperties = {
    fontFamily,
    fontSize: fontSizePx,
    textAlign: textAlign as any,
    lineHeight,
    letterSpacing,
    textTransform: textTransform as any,
    fontWeight,
    fontStyle: isItalic ? "italic" : "normal",
    textDecoration: [
      isUnderline ? "underline" : "",
      isStrikethrough ? "line-through" : ""
    ].filter(Boolean).join(" ") || "none",
  }

  const handleBlur = (path: string, e: React.FocusEvent<HTMLElement>) => {
    if (isEditable && onUpdateField) {
      onUpdateField(path, e.currentTarget.innerText)
    }
  }

  const EditableText = ({
    path,
    value,
    className = "",
    as: Tag = "span",
    placeholder = "Type here...",
  }: {
    path: string
    value: string
    className?: string
    as?: any
    placeholder?: string
  }) => {
    if (!isEditable) {
      return <Tag className={className}>{value || ""}</Tag>
    }

    return (
      <Tag
        contentEditable
        suppressContentEditableWarning
        onBlur={(e: React.FocusEvent<HTMLElement>) => handleBlur(path, e)}
        className={`${className} outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-0.5 transition-all`}
        data-placeholder={placeholder}
      >
        {value || ""}
      </Tag>
    )
  }

  // Helper renderers for sections
  const renderHeader = () => (
    <header className="mb-6 text-center border-b border-gray-200 pb-4">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900" style={{ color: accentColor }}>
        <EditableText path="basics.name" value={data.basics.name} placeholder="Your Name" />
      </h1>
      <p className="text-base font-medium text-gray-700 mt-1">
        <EditableText path="basics.title" value={data.basics.title} placeholder="Professional Title" />
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-600 mt-2">
        {data.basics.location && (
          <span>
            <EditableText path="basics.location" value={data.basics.location} />
          </span>
        )}
        {data.basics.email && (
          <>
            <span>•</span>
            <a href={`mailto:${data.basics.email}`} className="hover:underline">
              <EditableText path="basics.email" value={data.basics.email} />
            </a>
          </>
        )}
        {data.basics.phone && (
          <>
            <span>•</span>
            <span>
              <EditableText path="basics.phone" value={data.basics.phone} />
            </span>
          </>
        )}
        {data.basics.linkedin && (
          <>
            <span>•</span>
            <span className="text-indigo-600 font-medium">
              <EditableText path="basics.linkedin" value={data.basics.linkedin} />
            </span>
          </>
        )}
        {data.basics.portfolio && (
          <>
            <span>•</span>
            <span className="text-indigo-600 font-medium">
              <EditableText path="basics.portfolio" value={data.basics.portfolio} />
            </span>
          </>
        )}
        {data.basics.github && (
          <>
            <span>•</span>
            <span className="text-indigo-600 font-medium">
              <EditableText path="basics.github" value={data.basics.github} />
            </span>
          </>
        )}
      </div>
    </header>
  )

  const renderSummary = () => {
    if (!data.summary) return null
    return (
      <section className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-2" style={{ color: accentColor }}>
          Professional Summary
        </h2>
        <p className="text-sm text-gray-800 leading-relaxed">
          <EditableText path="summary" value={data.summary} />
        </p>
      </section>
    )
  }

  const renderExperience = () => {
    if (!data.experience?.length) return null
    return (
      <section className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3" style={{ color: accentColor }}>
          Work Experience
        </h2>
        <div className="space-y-4">
          {data.experience.map((exp, idx) => (
            <div key={exp.id || idx} className="space-y-1">
              <div className="flex justify-between items-baseline">
                <h3 className="text-sm font-bold text-gray-900">
                  <EditableText path={`experience.${idx}.position`} value={exp.position} />
                  {" "}
                  <span className="font-semibold text-gray-700">
                    @ <EditableText path={`experience.${idx}.company`} value={exp.company} />
                  </span>
                </h3>
                <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                  <EditableText path={`experience.${idx}.startDate`} value={exp.startDate} /> -{" "}
                  <EditableText path={`experience.${idx}.endDate`} value={exp.current ? "Present" : exp.endDate} />
                </span>
              </div>
              {exp.location && (
                <p className="text-xs text-gray-500 italic">
                  <EditableText path={`experience.${idx}.location`} value={exp.location} />
                </p>
              )}
              {exp.bullets?.length > 0 && (
                <ul className="list-disc list-inside text-xs text-gray-700 space-y-1 pl-1 mt-1">
                  {exp.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="leading-normal">
                      <EditableText path={`experience.${idx}.bullets.${bIdx}`} value={bullet} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    )
  }

  const renderEducation = () => {
    if (!data.education?.length) return null
    return (
      <section className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3" style={{ color: accentColor }}>
          Education
        </h2>
        <div className="space-y-3">
          {data.education.map((edu, idx) => (
            <div key={edu.id || idx}>
              <div className="flex justify-between items-baseline">
                <h3 className="text-sm font-bold text-gray-900">
                  <EditableText path={`education.${idx}.degree`} value={edu.degree} />
                  {edu.field ? ` in ${edu.field}` : ""}
                </h3>
                <span className="text-xs text-gray-500 font-mono">
                  <EditableText path={`education.${idx}.startDate`} value={edu.startDate} /> -{" "}
                  <EditableText path={`education.${idx}.endDate`} value={edu.endDate} />
                </span>
              </div>
              <p className="text-xs font-medium text-gray-700">
                <EditableText path={`education.${idx}.institution`} value={edu.institution} />
              </p>
              {edu.details && (
                <p className="text-xs text-gray-600 mt-0.5">
                  <EditableText path={`education.${idx}.details`} value={edu.details} />
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    )
  }

  const renderSkills = () => {
    if (!data.skills?.length) return null
    return (
      <section className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-2" style={{ color: accentColor }}>
          Skills & Technical Expertise
        </h2>
        <div className="space-y-2 text-xs">
          {data.skills.map((skillGroup, idx) => (
            <div key={skillGroup.id || idx} className="flex gap-2">
              <span className="font-bold text-gray-900 min-w-[130px]">
                <EditableText path={`skills.${idx}.category`} value={skillGroup.category} />:
              </span>
              <span className="text-gray-700 flex-1">
                {skillGroup.items.join(", ")}
              </span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  const renderProjects = () => {
    if (!data.projects?.length) return null
    return (
      <section className="mb-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-3" style={{ color: accentColor }}>
          Key Projects
        </h2>
        <div className="space-y-3">
          {data.projects.map((proj, idx) => (
            <div key={proj.id || idx}>
              <div className="flex justify-between items-baseline">
                <h3 className="text-sm font-bold text-gray-900">
                  <EditableText path={`projects.${idx}.name`} value={proj.name} />
                </h3>
                {proj.url && (
                  <span className="text-xs text-indigo-600 font-mono">
                    <EditableText path={`projects.${idx}.url`} value={proj.url} />
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-700 mt-0.5">
                <EditableText path={`projects.${idx}.description`} value={proj.description} />
              </p>
              {proj.technologies?.length > 0 && (
                <p className="text-xs text-gray-500 font-mono mt-1">
                  <span className="font-semibold text-gray-700">Tech: </span>
                  {proj.technologies.join(" • ")}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    )
  }

  const renderExtras = () => {
    const hasCerts = data.certifications?.length > 0
    const hasAchieve = data.achievements?.length > 0
    const hasLangs = data.languages?.length > 0

    if (!hasCerts && !hasAchieve && !hasLangs) return null

    return (
      <section className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-3">
        {hasCerts && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1" style={{ color: accentColor }}>
              Certifications
            </h3>
            <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
              {data.certifications.map((cert, i) => (
                <li key={i}>
                  <EditableText path={`certifications.${i}`} value={cert} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasAchieve && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-1" style={{ color: accentColor }}>
              Achievements & Awards
            </h3>
            <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
              {data.achievements.map((ach, i) => (
                <li key={i}>
                  <EditableText path={`achievements.${i}`} value={ach} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    )
  }

  return (
    <div
      id="resume-canvas-paper"
      className="w-full bg-white text-gray-900 shadow-2xl rounded-sm p-8 md:p-12 min-h-[1050px] transition-all"
      style={fontStyle}
    >
      {renderHeader()}
      {templateId === "graduate" ? (
        <>
          {renderEducation()}
          {renderSummary()}
          {renderProjects()}
          {renderExperience()}
          {renderSkills()}
        </>
      ) : (
        <>
          {renderSummary()}
          {renderExperience()}
          {renderEducation()}
          {renderSkills()}
          {renderProjects()}
        </>
      )}
      {renderExtras()}
    </div>
  )
}
