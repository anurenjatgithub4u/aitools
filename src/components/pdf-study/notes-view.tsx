"use client"

import { downloadFileName, downloadText, notesToMarkdown, toPlainText } from "@/lib/pdf-study/export"
import type { NotesResult } from "@/lib/pdf-study/types"
import { CopyButton, DownloadButton, PrintButton, ResultActions, SourcePages } from "./result-actions"

export function NotesView({ notes, fileName }: { notes: NotesResult; fileName: string }) {
  const markdown = () => notesToMarkdown(notes)

  return (
    <div className="space-y-8">
      <ResultActions>
        <CopyButton getText={() => toPlainText(markdown())} />
        <DownloadButton
          label="Markdown"
          onDownload={() =>
            downloadText(markdown(), downloadFileName(fileName, "notes", "md"), "text/markdown")
          }
        />
        <DownloadButton
          label="Text"
          onDownload={() =>
            downloadText(
              toPlainText(markdown()),
              downloadFileName(fileName, "notes", "txt"),
              "text/plain"
            )
          }
        />
        <PrintButton />
      </ResultActions>

      <article className="space-y-8">
        <header>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">{notes.title}</h3>
          {notes.overview && (
            <p className="mt-3 text-muted-foreground leading-relaxed">{notes.overview}</p>
          )}
        </header>

        {notes.sections.map((section, index) => (
          <section key={`${section.title}-${index}`} className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/60 pb-2">
              <h4 className="text-lg font-bold tracking-tight">{section.title}</h4>
              <SourcePages pages={section.sourcePages} />
            </div>

            {section.summary && (
              <p className="text-muted-foreground leading-relaxed">{section.summary}</p>
            )}

            {section.keyPoints.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-foreground mb-2">Key points</h5>
                <ul className="space-y-2">
                  {section.keyPoints.map((point, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {section.definitions.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-foreground mb-2">Important terms</h5>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {section.definitions.map((def, i) => (
                    <div key={i} className="rounded-xl border border-border/60 bg-card/40 p-4">
                      <dt className="text-sm font-semibold text-foreground">{def.term}</dt>
                      <dd className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {def.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {section.formulas.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-foreground mb-2">Formulas</h5>
                <ul className="space-y-2">
                  {section.formulas.map((formula, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 font-mono text-sm overflow-x-auto"
                    >
                      {formula}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {section.examples.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-foreground mb-2">Examples</h5>
                <ul className="space-y-2">
                  {section.examples.map((example, i) => (
                    <li
                      key={i}
                      className="rounded-xl border-l-2 border-primary/40 bg-primary/5 px-4 py-3 text-sm leading-relaxed"
                    >
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}

        {notes.keyTakeaways.length > 0 && (
          <section className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
            <h4 className="text-lg font-bold tracking-tight mb-3">Key takeaways</h4>
            <ol className="space-y-2.5">
              {notes.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
    </div>
  )
}
