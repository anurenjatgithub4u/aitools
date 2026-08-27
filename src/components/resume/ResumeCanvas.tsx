"use client"

import React, { useState } from "react"
import { ResumeData } from "@/types/resume"
import { TemplateRenderer } from "./TemplateRenderer"
import { exportResumeToPDF, exportResumeToDOCX, validateResumeForExport } from "@/lib/resume/export"
import {
  Download,
  FileDown,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Pencil,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  SlidersHorizontal,
  ChevronDown,
  Paintbrush,
  Maximize2,
  Type,
  Layers,
} from "lucide-react"

interface ResumeCanvasProps {
  data: ResumeData
  saveStatus: "saved" | "saving" | "idle"
  onUpdate: (updated: ResumeData) => void
  onDuplicate: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

const PRESET_FONTS = [
  { label: "Inter (ATS Standard)", value: "Inter, sans-serif" },
  { label: "Proxima Nova / Sans", value: "'Proxima Nova', sans-serif" },
  { label: "Roboto Modern", value: "'Roboto', sans-serif" },
  { label: "Outfit Modern", value: "'Outfit', sans-serif" },
  { label: "Georgia Classic", value: "Georgia, serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Merriweather Serif", value: "'Merriweather', serif" },
  { label: "Fira Code Mono", value: "'Fira Code', monospace" },
]

const COLOR_SWATCHES = [
  { name: "Dark Slate", hex: "#0f172a" },
  { name: "Slate Classic", hex: "#1e293b" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Sky Blue", hex: "#0284c7" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Rose Pink", hex: "#f43f5e" },
  { name: "Amber", hex: "#f59e0b" },
]

export function ResumeCanvas({
  data,
  saveStatus,
  onUpdate,
  onDuplicate,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: ResumeCanvasProps) {
  const [zoom, setZoom] = useState(100)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)
  const [validationIssues, setValidationIssues] = useState<any[]>([])
  const [showValidation, setShowValidation] = useState(false)

  // Active Tool Popover States
  const [activePopover, setActivePopover] = useState<"color" | "spacing" | "effects" | "font" | "align" | null>(null)

  // Current Settings
  const settings = data.settings || {
    templateId: "ats-classic",
    fontFamily: "Inter, sans-serif",
    fontSize: "md",
    fontSizeNumeric: 14,
    accentColor: "#1e293b",
    spacing: "normal",
  }

  const currentFontSize = settings.fontSizeNumeric || 14
  const currentColor = settings.accentColor || "#1e293b"

  const updateSetting = (key: string, value: any) => {
    onUpdate({
      ...data,
      settings: {
        ...settings,
        [key]: value,
      },
    })
  }

  const handleUpdateField = (path: string, value: any) => {
    const copy = JSON.parse(JSON.stringify(data))
    const parts = path.split(".")
    let current = copy

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (current[part] === undefined) return
      current = current[part]
    }

    const last = parts[parts.length - 1]
    current[last] = value
    onUpdate(copy)
  }

  const handlePdfExport = async () => {
    const issues = validateResumeForExport(data)
    setValidationIssues(issues)
    if (issues.some((i) => i.type === "error")) {
      setShowValidation(true)
      return
    }

    setExportingPdf(true)
    await exportResumeToPDF("resume-canvas-paper", `${data.title.replace(/\s+/g, "_")}.pdf`)
    setExportingPdf(false)
  }

  const handleDocxExport = async () => {
    setExportingDocx(true)
    await exportResumeToDOCX(data, `${data.title.replace(/\s+/g, "_")}.docx`)
    setExportingDocx(false)
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-neutral-950 overflow-hidden select-none">
      {/* 1. TOP DOCUMENT HEADER (Canva Navbar Style) */}
      <div className="h-12 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur px-4 flex items-center justify-between text-white shrink-0 z-30">
        {/* Left: Mode Badge & Undo / Redo */}
        <div className="flex items-center gap-2">
          {/* Editing Mode Dropdown Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold">
            <Pencil className="w-3 h-3 text-indigo-400" />
            <span>Editing</span>
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
          </div>

          <div className="h-4 w-px bg-neutral-800 my-auto mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canUndo ? "hover:bg-neutral-800 text-neutral-200" : "text-neutral-600 cursor-not-allowed"
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              canRedo ? "hover:bg-neutral-800 text-neutral-200" : "text-neutral-600 cursor-not-allowed"
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-800 my-auto mx-1 hidden sm:block" />

          {/* Document Title & Save Status */}
          <div className="hidden sm:flex items-center gap-2">
            <input
              type="text"
              value={data.title}
              onChange={(e) => onUpdate({ ...data, title: e.target.value })}
              className="bg-transparent font-medium text-xs text-neutral-100 hover:bg-neutral-900 focus:bg-neutral-900 border border-transparent focus:border-neutral-700 rounded px-2 py-1 outline-none transition-all max-w-[200px]"
            />
            <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
              {saveStatus === "saving" ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Saving...
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Center: Page Indicator Banner */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900/80 px-3 py-1 rounded-full border border-neutral-800 font-mono">
          <span>Page 1</span>
          <span>•</span>
          <span className="text-neutral-200">{data.basics.name || "Untitled Resume"}</span>
        </div>

        {/* Right Actions: Zoom & Export */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs text-neutral-300">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-1 hover:bg-neutral-800 rounded cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-mono text-[11px]">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              className="p-1 hover:bg-neutral-800 rounded cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Duplicate Button */}
          <button
            onClick={onDuplicate}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 transition-colors cursor-pointer"
            title="Duplicate Resume"
          >
            <Copy className="w-3 h-3" />
            <span>Duplicate</span>
          </button>

          {/* Export DOCX */}
          <button
            onClick={handleDocxExport}
            disabled={exportingDocx}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 transition-colors cursor-pointer"
          >
            <FileDown className="w-3 h-3 text-blue-400" />
            <span>{exportingDocx ? "DOCX..." : "DOCX"}</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={handlePdfExport}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-xs font-semibold text-white shadow-md shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>{exportingPdf ? "Exporting..." : "Export PDF"}</span>
          </button>
        </div>
      </div>

      {/* 2. CANVA-STYLE SECONDARY EDITING TOOLBAR (Formatting Controls) */}
      <div className="h-11 border-b border-neutral-800 bg-neutral-900 px-3 flex items-center gap-1.5 text-white shrink-0 z-20 overflow-x-auto scrollbar-none">
        {/* Font Family Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setActivePopover(activePopover === "font" ? null : "font")}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700/80 rounded-lg text-xs text-neutral-200 font-medium border border-neutral-700/80 min-w-[130px] justify-between cursor-pointer"
          >
            <span className="truncate" style={{ fontFamily: settings.fontFamily }}>
              {PRESET_FONTS.find((f) => f.value === settings.fontFamily)?.label.split(" ")[0] || "Font"}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          </button>

          {activePopover === "font" && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
              <div className="text-[10px] uppercase font-bold text-neutral-400 px-2 py-1">Typography Fonts</div>
              {PRESET_FONTS.map((font) => (
                <button
                  key={font.value}
                  onClick={() => {
                    updateSetting("fontFamily", font.value)
                    setActivePopover(null)
                  }}
                  style={{ fontFamily: font.value }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    settings.fontFamily === font.value ? "bg-indigo-500/20 text-indigo-300 font-bold" : "hover:bg-neutral-800 text-neutral-200"
                  }`}
                >
                  <span>{font.label}</span>
                  {settings.fontFamily === font.value && <Check className="w-3 h-3 text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-neutral-800 shrink-0 my-auto" />

        {/* Font Size Stepper (- 14pt +) */}
        <div className="flex items-center bg-neutral-800 rounded-lg border border-neutral-700/80 p-0.5 shrink-0">
          <button
            onClick={() => updateSetting("fontSizeNumeric", Math.max(10, currentFontSize - 1))}
            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-700 rounded text-neutral-300 text-sm font-bold cursor-pointer"
            title="Decrease Font Size"
          >
            -
          </button>
          <span className="w-8 text-center text-xs font-mono text-neutral-200 font-semibold">{currentFontSize}</span>
          <button
            onClick={() => updateSetting("fontSizeNumeric", Math.min(24, currentFontSize + 1))}
            className="w-6 h-6 flex items-center justify-center hover:bg-neutral-700 rounded text-neutral-300 text-sm font-bold cursor-pointer"
            title="Increase Font Size"
          >
            +
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-800 shrink-0 my-auto" />

        {/* Color Picker Control (A with active color bar) */}
        <div className="relative">
          <button
            onClick={() => setActivePopover(activePopover === "color" ? null : "color")}
            className="flex flex-col items-center justify-center p-1.5 hover:bg-neutral-800 rounded-lg border border-transparent hover:border-neutral-700 transition-colors cursor-pointer shrink-0"
            title="Text & Accent Color"
          >
            <span className="text-xs font-bold leading-none">A</span>
            <span className="w-4 h-1 rounded-full mt-0.5" style={{ backgroundColor: currentColor }} />
          </button>

          {activePopover === "color" && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-3 z-50 space-y-3">
              <div className="text-[10px] uppercase font-bold text-neutral-400">Accent & Heading Palette</div>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    onClick={() => {
                      updateSetting("accentColor", swatch.hex)
                      setActivePopover(null)
                    }}
                    className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: swatch.hex }}
                    title={swatch.name}
                  >
                    {currentColor === swatch.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-neutral-800 flex items-center gap-2">
                <span className="text-[10px] text-neutral-400">Custom:</span>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => updateSetting("accentColor", e.target.value)}
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono text-neutral-300">{currentColor}</span>
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-neutral-800 shrink-0 my-auto" />

        {/* Text Style Formatting Buttons (B, I, U, S) */}
        <div className="flex items-center gap-0.5 bg-neutral-800/60 p-0.5 rounded-lg border border-neutral-700/60 shrink-0">
          <button
            onClick={() => updateSetting("fontWeight", settings.fontWeight === "bold" ? "normal" : "bold")}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              settings.fontWeight === "bold" ? "bg-indigo-500 text-white font-bold" : "text-neutral-300 hover:bg-neutral-700"
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => updateSetting("isItalic", !settings.isItalic)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              settings.isItalic ? "bg-indigo-500 text-white" : "text-neutral-300 hover:bg-neutral-700"
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => updateSetting("isUnderline", !settings.isUnderline)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              settings.isUnderline ? "bg-indigo-500 text-white" : "text-neutral-300 hover:bg-neutral-700"
            }`}
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => updateSetting("isStrikethrough", !settings.isStrikethrough)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              settings.isStrikethrough ? "bg-indigo-500 text-white" : "text-neutral-300 hover:bg-neutral-700"
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Case Transform (aA) */}
        <button
          onClick={() =>
            updateSetting("textTransform", settings.textTransform === "uppercase" ? "none" : "uppercase")
          }
          className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
            settings.textTransform === "uppercase"
              ? "bg-indigo-500 text-white border-indigo-400"
              : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700"
          }`}
          title="Toggle Uppercase"
        >
          aA
        </button>

        <div className="h-4 w-px bg-neutral-800 shrink-0 my-auto" />

        {/* Alignment Control Dropdown */}
        <div className="relative">
          <button
            onClick={() => setActivePopover(activePopover === "align" ? null : "align")}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300 border border-neutral-700 flex items-center gap-1 cursor-pointer shrink-0"
            title="Text Alignment"
          >
            {settings.textAlign === "center" ? (
              <AlignCenter className="w-3.5 h-3.5" />
            ) : settings.textAlign === "right" ? (
              <AlignRight className="w-3.5 h-3.5" />
            ) : settings.textAlign === "justify" ? (
              <AlignJustify className="w-3.5 h-3.5" />
            ) : (
              <AlignLeft className="w-3.5 h-3.5" />
            )}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {activePopover === "align" && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-1 z-50 flex flex-col gap-1">
              <button
                onClick={() => {
                  updateSetting("textAlign", "left")
                  setActivePopover(null)
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <AlignLeft className="w-3.5 h-3.5" /> Left
              </button>
              <button
                onClick={() => {
                  updateSetting("textAlign", "center")
                  setActivePopover(null)
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <AlignCenter className="w-3.5 h-3.5" /> Center
              </button>
              <button
                onClick={() => {
                  updateSetting("textAlign", "right")
                  setActivePopover(null)
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <AlignRight className="w-3.5 h-3.5" /> Right
              </button>
              <button
                onClick={() => {
                  updateSetting("textAlign", "justify")
                  setActivePopover(null)
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 rounded-lg cursor-pointer"
              >
                <AlignJustify className="w-3.5 h-3.5" /> Justify
              </button>
            </div>
          )}
        </div>

        {/* Spacing Popover (Line Height & Section Padding) */}
        <div className="relative">
          <button
            onClick={() => setActivePopover(activePopover === "spacing" ? null : "spacing")}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300 border border-neutral-700 flex items-center gap-1 cursor-pointer shrink-0"
            title="Line & Section Spacing"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {activePopover === "spacing" && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-3 z-50 space-y-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Line Spacing</div>
                <div className="grid grid-cols-3 gap-1 bg-neutral-800 p-1 rounded-lg">
                  {["tight", "normal", "relaxed"].map((lh) => (
                    <button
                      key={lh}
                      onClick={() => updateSetting("lineHeight", lh)}
                      className={`px-2 py-1 text-xs capitalize rounded font-medium ${
                        (settings.lineHeight || "normal") === lh ? "bg-indigo-500 text-white" : "text-neutral-300"
                      }`}
                    >
                      {lh}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Section Density</div>
                <div className="grid grid-cols-3 gap-1 bg-neutral-800 p-1 rounded-lg">
                  {["compact", "normal", "spacious"].map((sp) => (
                    <button
                      key={sp}
                      onClick={() => updateSetting("spacing", sp)}
                      className={`px-2 py-1 text-xs capitalize rounded font-medium ${
                        settings.spacing === sp ? "bg-indigo-500 text-white" : "text-neutral-300"
                      }`}
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-neutral-800 shrink-0 my-auto" />

        {/* Text Effects Popover */}
        <div className="relative">
          <button
            onClick={() => setActivePopover(activePopover === "effects" ? null : "effects")}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs text-neutral-200 font-medium border border-neutral-700 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Effects</span>
          </button>

          {activePopover === "effects" && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-2 z-50 space-y-1">
              <div className="text-[10px] uppercase font-bold text-neutral-400 px-2 py-1">Heading Style Effects</div>
              {[
                { label: "Standard Clean", value: "none" },
                { label: "Subtle Shadow", value: "shadow" },
                { label: "Modern Outline", value: "outline" },
                { label: "Soft Card Tint", value: "subtle" },
              ].map((fx) => (
                <button
                  key={fx.value}
                  onClick={() => {
                    updateSetting("textEffect", fx.value)
                    setActivePopover(null)
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between cursor-pointer ${
                    (settings.textEffect || "none") === fx.value
                      ? "bg-purple-500/20 text-purple-300 font-semibold"
                      : "hover:bg-neutral-800 text-neutral-200"
                  }`}
                >
                  <span>{fx.label}</span>
                  {(settings.textEffect || "none") === fx.value && <Check className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Format Painter / Reset Style */}
        <button
          onClick={() => {
            updateSetting("fontFamily", "Inter, sans-serif")
            updateSetting("fontSizeNumeric", 14)
            updateSetting("fontWeight", "normal")
            updateSetting("isItalic", false)
            updateSetting("isUnderline", false)
            updateSetting("isStrikethrough", false)
            updateSetting("textTransform", "none")
            updateSetting("textAlign", "left")
          }}
          className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300 border border-neutral-700 cursor-pointer shrink-0 ml-auto"
          title="Reset Formatting to Default"
        >
          <Paintbrush className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      </div>

      {/* Validation Issue Modal */}
      {showValidation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold">Pre-Export Check</h3>
            </div>
            <p className="text-xs text-neutral-300">Please review the following items before exporting your resume:</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {validationIssues.map((issue, idx) => (
                <div key={idx} className="p-2 rounded bg-neutral-800 text-xs text-neutral-200 flex items-start gap-2">
                  <span className={issue.type === "error" ? "text-red-400 font-bold" : "text-amber-400"}>•</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowValidation(false)}
                className="px-4 py-2 rounded-lg border border-neutral-700 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Close & Edit
              </button>
              <button
                onClick={() => {
                  setShowValidation(false)
                  exportResumeToPDF("resume-canvas-paper", `${data.title.replace(/\s+/g, "_")}.pdf`)
                }}
                className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-white hover:bg-primary/90"
              >
                Export Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Paper Viewport */}
      <div className="flex-1 overflow-auto p-6 md:p-12 flex justify-center items-start bg-neutral-950">
        <div
          className="transition-transform duration-200 origin-top max-w-4xl w-full"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          <TemplateRenderer
            data={data}
            templateId={settings.templateId || "ats-classic"}
            isEditable={true}
            onUpdateField={handleUpdateField}
          />
        </div>
      </div>
    </div>
  )
}
