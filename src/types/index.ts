import type { CountryCode } from "@/lib/countries";

export type KeywordKind = "short" | "long";
export type Verdict = "Target" | "Push" | "Maybe" | "Swap" | "Dead";

/** One app from an iTunes search result, trimmed to what the board shows and scoring needs. */
export type TopApp = {
  trackId: number;
  name: string;
  icon: string;
  ratingCount: number;
  rating: number;
};

export type Project = {
  id: number;
  name: string;
  niche: string | null;
  audience: string | null;
  /** Numeric App Store id of "my app"; null for niche-only projects. */
  itunesId: number | null;
  icon: string | null;
  countries: CountryCode[];
  /** Epoch ms (a number so server-rendered props and API JSON have the same shape). */
  createdAt: number;
};

export type Competitor = { id: number; appId: number; itunesId: number; name: string; icon: string | null };

export type Keyword = { id: number; appId: number; term: string; kind: KeywordKind; createdAt: Date };

export type LocalizedKeyword = { id: number; keywordId: number; country: CountryCode; phrase: string; note: string | null };

export type RankCheck = {
  id: number;
  keywordId: number;
  country: CountryCode;
  /** The phrase actually searched (localized phrase, or the English term). */
  term: string;
  checkedAt: Date;
  /** Track ids in result order, up to 200. Ranks for my app and competitors are derived from this. */
  resultIds: number[];
  /** Top 10 apps; the board shows 5, difficulty uses 10. */
  top: TopApp[];
};

/** A rank of null means "not in the top 200" (shown as "200+"). */
export type Rank = number | null;

export type CheckTaskResult = {
  keywordId: number;
  country: CountryCode;
  term: string;
  /** My app's rank; null = 200+ (or no app id on the project). */
  rank: Rank;
  top5: TopApp[];
  checkedAt: number;
};

/** One row of the board: a keyword in one country, with its latest check and scores. */
export type BoardRow = {
  keywordId: number;
  keyword: string;
  kind: KeywordKind;
  country: CountryCode;
  /** The localized phrase searched in this country; null when not localized yet. */
  phrase: string | null;
  /** Null until the first check. */
  checkedAt: number | null;
  rank: Rank;
  /** Competitor id → rank (null = 200+). Empty until checked. */
  competitorRanks: Record<number, Rank>;
  volume: number | null;
  difficulty: number | null;
  verdict: Verdict | null;
  verdictWhy: string | null;
  top5: TopApp[];
};

export type Board = { project: Project; competitors: Competitor[]; rows: BoardRow[] };

/** Progress of a background rank-check job, as polled by the UI. */
export type CheckJob = {
  id: string;
  appId: number;
  status: "running" | "done" | "error";
  total: number;
  done: number;
  failed: number;
  current: { keywordId: number; keyword: string; country: CountryCode } | null;
  /** "keywordId:country" of every task not finished yet (including the current one). */
  pending: string[];
  /** Set while backing off, e.g. { until, reason: "rate limited" } → "rate limited, retrying in Ns". */
  waiting: { until: number; reason: string } | null;
  results: CheckTaskResult[];
  errors: { keywordId: number; country: CountryCode; message: string }[];
  startedAt: number;
  finishedAt: number | null;
};
