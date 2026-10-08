import { describe, it, expect } from "vitest";
import { analyzeBestWords } from "@/lib/letters/bestWords";
import { buildTrie } from "@/lib/letters/trie";
import { LetterTile } from "@/types/letters";

const board = (letters: string): LetterTile[] =>
  [...letters].map((letter, i) => ({ id: String(i), letter, type: "consonant" as const }));

const trie = buildTrie(["stale", "slate", "least", "tales", "tale", "seat", "eats", "stables", "cat"]);

describe("analyzeBestWords", () => {
  const b = board("STALEXYZQ");
  it("finds the longest words and ignores words below the minimum length", () => {
    const a = analyzeBestWords(trie, b, null);
    expect(a.bestLength).toBe(5);
    expect(a.longest).toEqual(["least", "slate", "stale", "tales"]);
    expect(a.top[0].length).toBe(5);
    expect(a.top).not.toContain("cat");
    expect(a.totalFound).toBe(7); // 4 five-letter + tale, seat, eats
  });
  it("reports whether the player matched the maximum", () => {
    expect(analyzeBestWords(trie, b, "slate").playerMatchedBest).toBe(true);
    expect(analyzeBestWords(trie, b, "SEAT").playerMatchedBest).toBe(false);
  });
  it("is null when nothing valid was submitted", () => {
    expect(analyzeBestWords(trie, b, null).playerMatchedBest).toBeNull();
    expect(analyzeBestWords(trie, b, "zzzzz").playerMatchedBest).toBeNull();
  });
  it("handles a board with no words", () => {
    const a = analyzeBestWords(trie, board("QQQQQQQQQ"), null);
    expect(a.bestLength).toBe(0);
    expect(a.longest).toEqual([]);
    expect(a.top).toEqual([]);
  });
  it("respects topN", () => {
    expect(analyzeBestWords(trie, b, null, 2).top).toHaveLength(2);
  });
});
