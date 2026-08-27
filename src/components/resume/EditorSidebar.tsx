"use client"

import React, { useState } from "react"
import { ResumeData } from "@/types/resume"
import { RESUME_TEMPLATES } from "@/lib/resume/templates"
import {
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Award,
  Sparkles,
  LayoutTemplate,
  Type,
  Plus,
  Trash2,
  ChevronDown,
  Wand2,
} from "lucide-react"

interface EditorSidebarProps {
  data: ResumeData
  onChange: (updated: ResumeData) => void
  onApplyAiImprovement?: (fieldPath: string, instruction: string) => void
}

export function EditorSidebar({ data, onChange, onApplyAiImprovement }: EditorSidebarProps) {
  const [activeTab, setActiveTab] = useState<"content" | "ai" | "template">("content")
  const [openSection, setOpenSection] = useState<string>("personal")

  const updateBasics = (field: string, val: string) => {
    onChange({
      ...data,
      basics: { ...data.basics, [field]: val },
    })
  }

  const updateSummary = (val: string) => {
    onChange({ ...data, summary: val })
  }

  const handleTemplateChange = (templateId: string) => {
    const selected = RESUME_TEMPLATES.find((t) => t.id === templateId)
    onChange({
      ...data,
      settings: {
        ...data.settings,
        templateId,
        accentColor: selected?.accentColor || data.settings?.accentColor || "#1e293b",
        fontFamily: selected?.fontFamily || data.settings?.fontFamily || "Inter, sans-serif",
      },
    })
  }

  // Add Experience
  const addExperience = () => {
    const newExp = {
      id: `exp_${Date.now()}`,
      company: "New Company",
      position: "Position Title",
      location: "City, Country",
      startDate: "2023",
      endDate: "Present",
      current: true,
      bullets: ["Accomplished key task using action verb and measurable outcome."],
    }
    onChange({ ...data, experience: [...data.experience, newExp] })
  }

  const removeExperience = (idx: number) => {
    const updated = data.experience.filter((_, i) => i !== idx)
    onChange({ ...data, experience: updated })
  }

  const updateExperienceField = (idx: number, field: string, val: any) => {
    const updated = [...data.experience]
    updated[idx] = { ...updated[idx], [field]: val }
    onChange({ ...data, experience: updated })
  }

  const addExperienceBullet = (expIdx: number) => {
    const updated = [...data.experience]
    updated[expIdx].bullets.push("Developed and maintained feature module.")
    onChange({ ...data, experience: updated })
  }

  const updateExperienceBullet = (expIdx: number, bIdx: number, val: string) => {
    const updated = [...data.experience]
    updated[expIdx].bullets[bIdx] = val
    onChange({ ...data, experience: updated })
  }

  const removeExperienceBullet = (expIdx: number, bIdx: number) => {
    const updated = [...data.experience]
    updated[expIdx].bullets = updated[expIdx].bullets.filter((_, i) => i !== bIdx)
    onChange({ ...data, experience: updated })
  }

  // Skills
  const addSkillCategory = () => {
    const newSkill = {
      id: `skill_${Date.now()}`,
      category: "Tools & Frameworks",
      items: ["Skill 1", "Skill 2"],
    }
    onChange({ ...data, skills: [...data.skills, newSkill] })
  }

  const updateSkillCategory = (idx: number, category: string, itemsStr: string) => {
    const updated = [...data.skills]
    const items = itemsStr.split(",").map((s) => s.trim()).filter(Boolean)
    updated[idx] = { ...updated[idx], category, items }
    onChange({ ...data, skills: updated })
  }

  const removeSkillCategory = (idx: number) => {
    onChange({ ...data, skills: data.skills.filter((_, i) => i !== idx) })
  }

  return (
    <div className="w-full h-full flex flex-col bg-card border-r border-border/60 overflow-hidden select-none">
      {/* Top Tab Bar */}
      <div className="flex border-b border-border/60 bg-muted/40 p-1 gap-1">
        <button
          onClick={() => setActiveTab("content")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "content" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Content
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "ai" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          AI Tools
        </button>
        <button
          onClick={() => setActiveTab("template")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "template" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Template
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === "content" && (
          <div className="space-y-3">
            {/* Personal Information */}
            <div className="border border-border/60 rounded-xl overflow-hidden bg-background/50">
              <button
                onClick={() => setOpenSection(openSection === "personal" ? "" : "personal")}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  Personal Information
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSection === "personal" ? "rotate-180" : ""}`} />
              </button>

              {openSection === "personal" && (
                <div className="p-3 border-t border-border/60 space-y-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Full Name</label>
                    <input
                      type="text"
                      value={data.basics.name}
                      onChange={(e) => updateBasics("name", e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Job Title</label>
                    <input
                      type="text"
                      value={data.basics.title}
                      onChange={(e) => updateBasics("title", e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Email</label>
                      <input
                        type="email"
                        value={data.basics.email}
                        onChange={(e) => updateBasics("email", e.target.value)}
                        className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Phone</label>
                      <input
                        type="text"
                        value={data.basics.phone}
                        onChange={(e) => updateBasics("phone", e.target.value)}
                        className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Location</label>
                      <input
                        type="text"
                        value={data.basics.location}
                        onChange={(e) => updateBasics("location", e.target.value)}
                        className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">LinkedIn</label>
                      <input
                        type="text"
                        value={data.basics.linkedin}
                        onChange={(e) => updateBasics("linkedin", e.target.value)}
                        className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="border border-border/60 rounded-xl overflow-hidden bg-background/50">
              <button
                onClick={() => setOpenSection(openSection === "summary" ? "" : "summary")}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Professional Summary
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSection === "summary" ? "rotate-180" : ""}`} />
              </button>

              {openSection === "summary" && (
                <div className="p-3 border-t border-border/60 space-y-2">
                  <textarea
                    rows={4}
                    value={data.summary}
                    onChange={(e) => updateSummary(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                  {onApplyAiImprovement && (
                    <button
                      onClick={() => onApplyAiImprovement("summary", "Make concise, impactful, and ATS-friendly")}
                      className="flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                    >
                      <Wand2 className="w-3 h-3" />
                      Improve summary with AI
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Experience */}
            <div className="border border-border/60 rounded-xl overflow-hidden bg-background/50">
              <button
                onClick={() => setOpenSection(openSection === "experience" ? "" : "experience")}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-sky-400" />
                  Work Experience ({data.experience.length})
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSection === "experience" ? "rotate-180" : ""}`} />
              </button>

              {openSection === "experience" && (
                <div className="p-3 border-t border-border/60 space-y-4">
                  {data.experience.map((exp, idx) => (
                    <div key={exp.id || idx} className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-2 relative">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground text-[11px]">Position #{idx + 1}</span>
                        <button
                          onClick={() => removeExperience(idx)}
                          className="text-destructive hover:text-red-400 p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Position Title"
                          value={exp.position}
                          onChange={(e) => updateExperienceField(idx, "position", e.target.value)}
                          className="bg-background border border-input rounded px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Company Name"
                          value={exp.company}
                          onChange={(e) => updateExperienceField(idx, "company", e.target.value)}
                          className="bg-background border border-input rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Start Date (e.g. 2022-01)"
                          value={exp.startDate}
                          onChange={(e) => updateExperienceField(idx, "startDate", e.target.value)}
                          className="bg-background border border-input rounded px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="End Date or Present"
                          value={exp.endDate}
                          onChange={(e) => updateExperienceField(idx, "endDate", e.target.value)}
                          className="bg-background border border-input rounded px-2 py-1 text-xs"
                        />
                      </div>

                      {/* Bullets */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[10px] text-muted-foreground font-semibold uppercase">Bullet Points</label>
                        {exp.bullets.map((b, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={b}
                              onChange={(e) => updateExperienceBullet(idx, bIdx, e.target.value)}
                              className="flex-1 bg-background border border-input rounded px-2 py-1 text-xs"
                            />
                            <button
                              onClick={() => removeExperienceBullet(idx, bIdx)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addExperienceBullet(idx)}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-1"
                        >
                          <Plus className="w-3 h-3" /> Add Bullet
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addExperience}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border hover:border-primary text-xs font-semibold text-primary transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Work Experience
                  </button>
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="border border-border/60 rounded-xl overflow-hidden bg-background/50">
              <button
                onClick={() => setOpenSection(openSection === "skills" ? "" : "skills")}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  Skills ({data.skills.length})
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSection === "skills" ? "rotate-180" : ""}`} />
              </button>

              {openSection === "skills" && (
                <div className="p-3 border-t border-border/60 space-y-3">
                  {data.skills.map((s, idx) => (
                    <div key={s.id || idx} className="space-y-1.5 p-2 rounded border border-border/60 bg-muted/20">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={s.category}
                          onChange={(e) => updateSkillCategory(idx, e.target.value, s.items.join(", "))}
                          className="font-semibold text-xs bg-background border border-input rounded px-2 py-1 w-2/3"
                        />
                        <button onClick={() => removeSkillCategory(idx)} className="text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Comma separated skills (e.g. React, Kotlin, Git)"
                        value={s.items.join(", ")}
                        onChange={(e) => updateSkillCategory(idx, s.category, e.target.value)}
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
                      />
                    </div>
                  ))}
                  <button
                    onClick={addSkillCategory}
                    className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-border rounded text-primary text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Skill Group
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Tools Tab */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                <Sparkles className="w-4 h-4" />
                FindUrAI Writing Assistant
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Click any action below to automatically rewrite and enhance your current resume content:
              </p>
            </div>

            <div className="space-y-2">
              {[
                { label: "Make More Concise", prompt: "Make more concise and direct" },
                { label: "Make More Professional", prompt: "Make tone more professional and executive" },
                { label: "Add Stronger Action Verbs", prompt: "Incorporate powerful ATS action verbs" },
                { label: "Improve Impact", prompt: "Focus on results, outcomes, and business impact" },
                { label: "Fix Grammar & Punctuation", prompt: "Fix all grammar, spelling, and punctuation errors" },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onApplyAiImprovement && onApplyAiImprovement("summary", item.prompt)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background hover:bg-muted text-left text-xs font-medium text-foreground transition-colors cursor-pointer"
                >
                  <span>{item.label}</span>
                  <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Template Tab */}
        {activeTab === "template" && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Template</h3>
            <div className="space-y-3">
              {RESUME_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleTemplateChange(tmpl.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    data.settings?.templateId === tmpl.id
                      ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/40"
                      : "border-border/80 bg-background hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-foreground">{tmpl.name}</span>
                    <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
                      {tmpl.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{tmpl.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
