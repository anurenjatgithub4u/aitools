import { describe, expect, it } from "vitest";
import { charCount, cleanKeywordField } from "./keyword-field";

describe("cleanKeywordField", () => {
  it("joins terms with commas and no spaces, lowercased", () => {
    const r = cleanKeywordField("Habit Tracker,  daily   goals ,\nRoutine");
    expect(r.field).toBe("habit tracker,daily goals,routine");
    expect(r.length).toBe(r.field.length);
  });

  it("drops duplicates and terms already covered by the name or subtitle", () => {
    const r = cleanKeywordField("streak, habit, streak, daily planner", { name: "Habit Streak", subtitle: "Daily planner & goals" });
    expect(r.field).toBe("");
    expect(r.duplicates).toEqual(["streak"]);
    expect(r.inNameOrSubtitle).toEqual(["streak", "habit", "daily planner"]);
  });

  it('ignores punctuation in the name, like "Streak: Habit Tracker"', () => {
    expect(cleanKeywordField("streak,habit tracker,goals", { name: "Streak: Habit Tracker" }).field).toBe("goals");
  });

  it("keeps a phrase when only some of its words are in the name", () => {
    expect(cleanKeywordField("habit journal", { name: "Habit" }).field).toBe("habit journal");
  });

  it("reports words repeated across terms", () => {
    expect(cleanKeywordField("habit tracker,mood tracker,habit").repeatedWords).toEqual(["habit", "tracker"]);
  });

  it("splits into unique single words", () => {
    expect(cleanKeywordField("habit tracker,mood tracker", { singleWords: true }).field).toBe("habit,tracker,mood");
  });

  it("accepts Japanese and Arabic list separators and counts code points", () => {
    expect(cleanKeywordField("習慣、家計簿").field).toBe("習慣,家計簿");
    expect(charCount("習慣,家計簿")).toBe(6);
  });
});
