import { zodTextFormat } from "openai/helpers/zod";
import { describe, expect, it } from "vitest";
import { localizeOutput } from "./localize";
import { safeJson } from "./structured";

describe("localizeOutput", () => {
  const schema = localizeOutput([4, 7]);

  it("accepts one item per requested id", () => {
    const body = { items: [{ id: 4, phrase: "gewohnheitstracker", note: null }, { id: 7, phrase: "lernplaner", note: "planner for studying" }] };
    expect(safeJson(JSON.stringify(body), schema).ok).toBe(true);
  });

  it("rejects missing, extra or unknown ids so the call is retried", () => {
    expect(safeJson(JSON.stringify({ items: [{ id: 4, phrase: "x", note: null }] }), schema).ok).toBe(false);
    expect(safeJson(JSON.stringify({ items: [{ id: 4, phrase: "x", note: null }, { id: 9, phrase: "y", note: null }] }), schema).ok).toBe(false);
  });

  it("rejects empty phrases", () => {
    expect(safeJson(JSON.stringify({ items: [{ id: 4, phrase: "", note: null }, { id: 7, phrase: "y", note: null }] }), schema).ok).toBe(false);
  });

  it("is a valid strict structured-output format", () => {
    expect(zodTextFormat(schema, "localized_keywords").strict).toBe(true);
  });
});
