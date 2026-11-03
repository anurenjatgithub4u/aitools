"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { charCount, cleanKeywordField, LIMITS } from "@/lib/tools/keyword-field";
import { cn } from "@/lib/utils";

function Counter({ value, limit }: { value: number; limit: number }) {
  return (
    <span className={cn("text-xs tabular-nums", value > limit ? "font-medium text-destructive" : "text-muted-foreground")}>
      {value}/{limit}
    </span>
  );
}

function Field({ label, value, limit, children }: { label: string; value: string; limit: number; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <Counter value={charCount(value)} limit={limit} />
      </div>
      {children(id)}
    </div>
  );
}

export function KeywordFieldTool() {
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [raw, setRaw] = useState("");
  const [singleWords, setSingleWords] = useState(false);
  const [copied, setCopied] = useState(false);
  const result = useMemo(() => cleanKeywordField(raw, { name, subtitle, singleWords }), [raw, name, subtitle, singleWords]);
  const over = result.length - LIMITS.keywords;

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.field);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: the text is selectable in the box
    }
  }

  return (
    <div className="grid gap-6 rounded-2xl border bg-card p-4 sm:p-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Field label="App name" value={name} limit={LIMITS.name}>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Streaks: Habit Tracker" />}
        </Field>
        <Field label="Subtitle" value={subtitle} limit={LIMITS.subtitle}>
          {(id) => <Input id={id} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Build daily routines" />}
        </Field>
        <Field label="Your keywords (commas or one per line)" value={raw} limit={LIMITS.keywords}>
          {(id) => (
            <textarea
              id={id}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={6}
              placeholder="habit tracker, daily goals, routine, streak, habit, mood tracker"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />
          )}
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={singleWords} onChange={(e) => setSingleWords(e.target.checked)} className="size-4 accent-primary" />
          Split phrases into single words (fits the most keywords)
        </label>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Cleaned keyword field</span>
            <Counter value={result.length} limit={LIMITS.keywords} />
          </div>
          <output className="block min-h-24 rounded-lg border bg-background p-3 font-mono text-sm break-all">
            {result.field || <span className="text-muted-foreground">Your cleaned keywords appear here.</span>}
          </output>
          <div className="flex items-center justify-between gap-2">
            <p className={cn("text-sm", over > 0 ? "text-destructive" : "text-muted-foreground")}>
              {over > 0 ? `${over} characters over. Drop your weakest keywords.` : `${-over} characters left`}
            </p>
            <Button size="sm" variant="outline" onClick={copy} disabled={!result.field}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-muted-foreground">
          {result.duplicates.length > 0 && <li>Removed duplicates: {result.duplicates.join(", ")}</li>}
          {result.inNameOrSubtitle.length > 0 && <li>Removed, already in your name or subtitle: {result.inNameOrSubtitle.join(", ")}</li>}
          {!singleWords && result.repeatedWords.length > 0 && (
            <li>
              Words used more than once: {result.repeatedWords.join(", ")}. Apple combines words across your keywords, so listing each word once
              usually frees up space. Tick &quot;Split phrases into single words&quot; to do that.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
