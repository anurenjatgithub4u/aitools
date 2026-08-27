// Character-level rendering of the target text (spec §4/§5). Every character
// is its own span so correctness can be tracked and styled individually —
// a single typo never turns the whole paragraph red.

interface TypingTextDisplayProps {
  text: string
  typed: string
}

export function TypingTextDisplay({ text, typed }: TypingTextDisplayProps) {
  const chars = text.split("")

  return (
    <div
      className="font-mono text-lg sm:text-xl leading-relaxed tracking-wide whitespace-pre-wrap break-words select-none"
      aria-hidden="true"
    >
      {chars.map((char, i) => {
        if (i < typed.length) {
          const correct = typed[i] === char
          return (
            <span
              key={i}
              className={
                correct
                  ? "text-foreground"
                  : "text-destructive bg-destructive/10 underline decoration-wavy decoration-destructive/70 underline-offset-4 rounded-[2px]"
              }
            >
              {char}
            </span>
          )
        }
        if (i === typed.length) {
          return (
            <span key={i} className="text-foreground bg-primary/15 border-b-2 border-primary rounded-[2px]">
              {char}
            </span>
          )
        }
        return (
          <span key={i} className="text-muted-foreground/45">
            {char}
          </span>
        )
      })}
    </div>
  )
}
