import { describe, it, expect } from "vitest";
import {
  toDailyKey,
  isValidDailyKey,
  previousDailyKey,
  daysBetween,
} from "@/lib/daily/dates";

describe("toDailyKey", () => {
  it("formats local date to YYYY-MM-DD", () => {
    expect(toDailyKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("isValidDailyKey", () => {
  it("validates correct date keys", () => {
    expect(isValidDailyKey("2026-01-05")).toBe(true);
    expect(isValidDailyKey("2028-02-29")).toBe(true);
    expect(isValidDailyKey("2026-02-28")).toBe(true);
  });

  it("rejects invalid keys", () => {
    expect(isValidDailyKey("2026-02-30")).toBe(false);
    expect(isValidDailyKey("2026-1-5")).toBe(false);
    expect(isValidDailyKey("")).toBe(false);
    expect(isValidDailyKey("abcd-ef-gh")).toBe(false);
    expect(isValidDailyKey("2026-02-29")).toBe(false);
  });
});

describe("previousDailyKey", () => {
  it("handles month boundary", () => {
    expect(previousDailyKey("2026-03-01")).toBe("2026-02-28");
  });

  it("handles leap day", () => {
    expect(previousDailyKey("2028-03-01")).toBe("2028-02-29");
  });

  it("handles year boundary", () => {
    expect(previousDailyKey("2026-01-01")).toBe("2025-12-31");
  });

  it("throws for invalid keys", () => {
    expect(() => previousDailyKey("2026-02-30")).toThrowError();
    expect(() => previousDailyKey("2026-1-5")).toThrowError();
    expect(() => previousDailyKey("")).toThrowError();
    expect(() => previousDailyKey("abcd-ef-gh")).toThrowError();
  });
});

describe("daysBetween", () => {
  it("computes days across a US DST change", () => {
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });

  it("returns negative for reversed order", () => {
    expect(daysBetween("2026-03-09", "2026-03-07")).toBe(-2);
  });

  it("returns 0 for the same date", () => {
    expect(daysBetween("2026-03-07", "2026-03-07")).toBe(0);
  });

  it("throws for invalid keys", () => {
    expect(() => daysBetween("invalid", "2026-03-07")).toThrowError();
    expect(() => daysBetween("2026-03-07", "invalid")).toThrowError();
  });
});
