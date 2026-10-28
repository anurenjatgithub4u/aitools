import { describe, expect, it } from "vitest";
import { parseAppStoreId, rankOf, toApps } from "./parse";

describe("parseAppStoreId", () => {
  it.each([
    ["https://apps.apple.com/us/app/duolingo-language-lessons/id570060128", 570060128],
    ["https://apps.apple.com/gb/app/notion/id1232780281?platform=iphone", 1232780281],
    ["apps.apple.com/app/id284882215", 284882215],
    ["https://itunes.apple.com/us/app/id389801252?mt=8", 389801252],
    ["https://apps.apple.com/de/app/x/id1234567890/", 1234567890],
    ["570060128", 570060128],
    ["id570060128", 570060128],
    ["  570060128  ", 570060128],
  ])("%s → %d", (input, id) => expect(parseAppStoreId(input)).toBe(id));

  it.each(["", "duolingo", "https://example.com/app/id570060128", "https://apps.apple.com/us/app/duolingo", "12", "not a url at all"])(
    "rejects %j",
    (input) => expect(parseAppStoreId(input)).toBeNull(),
  );
});

describe("toApps", () => {
  it("maps software results and drops malformed rows", () => {
    expect(
      toApps([
        { trackId: 1, trackName: "A", artworkUrl100: "a.png", userRatingCount: 50, averageUserRating: 4.5, extra: true },
        { wrapperType: "artist", artistName: "x" },
        { trackId: 2, trackName: "B" },
      ]),
    ).toEqual([
      { trackId: 1, name: "A", icon: "a.png", ratingCount: 50, rating: 4.5 },
      { trackId: 2, name: "B", icon: "", ratingCount: 0, rating: 0 },
    ]);
  });
});

describe("rankOf", () => {
  it("is 1-based, null when absent or no id", () => {
    expect(rankOf([5, 6, 7], 7)).toBe(3);
    expect(rankOf([5, 6, 7], 8)).toBeNull();
    expect(rankOf([5, 6, 7], null)).toBeNull();
  });
});
