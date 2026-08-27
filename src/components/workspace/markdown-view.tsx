"use client"

import { useMemo } from "react"
import { marked } from "marked"

export function MarkdownView({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => {
    if (!content) return ""
    return marked.parse(content, { async: false, gfm: true, breaks: true }) as string
  }, [content])

  if (!content) {
    return <p className="text-sm text-muted-foreground italic">Nothing here yet.</p>
  }

  return (
    <div
      className={
        "prose prose-sm dark:prose-invert max-w-none " +
        "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 " +
        "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 " +
        "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 " +
        "[&_p]:my-2 [&_p]:leading-relaxed " +
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 " +
        "[&_li]:my-0.5 " +
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-3 " +
        "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] " +
        "[&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
        "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-muted [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 " +
        "[&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-primary [&_a]:underline [&_hr]:my-4 [&_hr]:border-border " +
        "[&_input[type=checkbox]]:mr-2 " +
        (className || "")
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
