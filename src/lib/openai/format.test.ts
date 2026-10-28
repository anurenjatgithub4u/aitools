import { zodTextFormat } from "openai/helpers/zod";
import { describe, expect, it } from "vitest";
import { BrainstormOutput } from "./brainstorm";

describe("structured output formats", () => {
  it("converts to a strict JSON schema OpenAI accepts", () => {
    const f = zodTextFormat(BrainstormOutput, "keywords");
    expect(f.strict).toBe(true);
    expect(JSON.stringify(f.schema)).toContain('"additionalProperties":false');
  });
});
