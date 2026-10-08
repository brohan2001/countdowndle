import { describe, it, expect } from "vitest";
import {
  computeStreaks,
  emptyHistory,
  isDayComplete,
  parseHistory,
  recordScore,
  DailyHistory,
} from "@/lib/daily/storage";

const full = { letters: 5, numbers: 7, conundrum: 10 };
const history = (...days: string[]): DailyHistory => ({
  version: 1,
  days: Object.fromEntries(days.map((d) => [d, full])),
});

describe("parseHistory", () => {
  it("returns empty for null, junk, wrong version, wrong shape", () => {
    for (const raw of [null, "", "not json", "[]", '{"version":2,"days":{}}', '{"version":1}', '{"version":1,"days":5}']) {
      expect(parseHistory(raw)).toEqual(emptyHistory());
    }
  });
  it("keeps valid days and drops invalid keys, games and values", () => {
    const raw = JSON.stringify({
      version: 1,
      days: {
        "2026-10-09": { letters: 5, numbers: "x", conundrum: -1, bogus: 3 },
        "not-a-date": { letters: 1 },
        "2026-02-30": { letters: 1 },
      },
    });
    expect(parseHistory(raw).days).toEqual({ "2026-10-09": { letters: 5 } });
  });
  it("round-trips", () => {
    const h = history("2026-10-08", "2026-10-09");
    expect(parseHistory(JSON.stringify(h))).toEqual(h);
  });
});

describe("recordScore", () => {
  it("adds without mutating and never overwrites a played game", () => {
    const h0 = emptyHistory();
    const h1 = recordScore(h0, "2026-10-09", "letters", 7);
    expect(h0.days).toEqual({});
    expect(h1.days["2026-10-09"]).toEqual({ letters: 7 });
    expect(recordScore(h1, "2026-10-09", "letters", 18)).toBe(h1);
    expect(recordScore(h1, "2026-10-09", "numbers", 0).days["2026-10-09"]).toEqual({ letters: 7, numbers: 0 });
  });
});

describe("isDayComplete", () => {
  it("needs all three games", () => {
    expect(isDayComplete(undefined)).toBe(false);
    expect(isDayComplete({ letters: 1, numbers: 1 })).toBe(false);
    expect(isDayComplete(full)).toBe(true);
    expect(isDayComplete({ letters: 0, numbers: 0, conundrum: 0 })).toBe(true); // 0 points still counts as played
  });
});

describe("computeStreaks", () => {
  it("is zero with no history", () => {
    expect(computeStreaks(emptyHistory(), "2026-10-09")).toEqual({ current: 0, best: 0 });
  });
  it("counts consecutive complete days ending today", () => {
    expect(computeStreaks(history("2026-10-07", "2026-10-08", "2026-10-09"), "2026-10-09")).toEqual({ current: 3, best: 3 });
  });
  it("an unfinished today does not break a streak ending yesterday", () => {
    const h = history("2026-10-07", "2026-10-08");
    h.days["2026-10-09"] = { letters: 4 };
    expect(computeStreaks(h, "2026-10-09")).toEqual({ current: 2, best: 2 });
  });
  it("a missed day breaks the current streak but best is kept", () => {
    const h = history("2026-10-01", "2026-10-02", "2026-10-03", "2026-10-08");
    expect(computeStreaks(h, "2026-10-09")).toEqual({ current: 1, best: 3 });
    expect(computeStreaks(h, "2026-10-12")).toEqual({ current: 0, best: 3 });
  });
  it("crosses month and year boundaries", () => {
    expect(computeStreaks(history("2025-12-31", "2026-01-01"), "2026-01-01")).toEqual({ current: 2, best: 2 });
  });
  it("is derived: same history gives the same answer", () => {
    const h = history("2026-10-08", "2026-10-09");
    expect(computeStreaks(h, "2026-10-09")).toEqual(computeStreaks(h, "2026-10-09"));
  });
});
