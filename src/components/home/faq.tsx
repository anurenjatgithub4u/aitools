import { FAQ } from "@/lib/site";

/** Plain, crawlable answers to what people search before trying an ASO tool. */
export function Faq() {
  return (
    <section aria-labelledby="faq" className="mx-auto max-w-3xl">
      <h2 id="faq" className="text-2xl font-semibold tracking-tight">
        Questions
      </h2>
      <div className="mt-4 divide-y rounded-2xl border bg-card">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              <h3>{q}</h3>
              <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
