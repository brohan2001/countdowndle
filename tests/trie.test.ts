import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildTrie, countLetters, getTrie, Trie } from "@/lib/letters/trie";
import { parseWordList } from "@/lib/letters/dictionary";

describe("Trie basics", () => {
  const trie = buildTrie(["car", "card", "care", "Cat"]);
  it("has() is exact, case-insensitive", () => {
    expect(trie.has("car")).toBe(true);
    expect(trie.has("CAT")).toBe(true);
    expect(trie.has("ca")).toBe(false);
    expect(trie.has("cards")).toBe(false);
    expect(trie.has("")).toBe(false);
  });
  it("hasPrefix() accepts prefixes and words, rejects dead ends", () => {
    expect(trie.hasPrefix("ca")).toBe(true);
    expect(trie.hasPrefix("card")).toBe(true);
    expect(trie.hasPrefix("cx")).toBe(false);
    expect(trie.hasPrefix("")).toBe(true);
  });
  it("counts distinct words and ignores duplicate inserts", () => {
    const t = new Trie();
    t.insert("a");
    t.insert("a");
    expect(t.size).toBe(1);
    expect(trie.size).toBe(4);
  });
});

describe("findWords", () => {
  const trie = buildTrie(["tea", "eat", "ate", "tee", "tate", "at", "a", "teat", "eta"]);
  it("finds exactly the buildable words, longest first", () => {
    const words = trie.findWords(countLetters("teat"));
    expect(words).toEqual(["tate", "teat", "ate", "eat", "eta", "tea", "at", "a"].sort((a, b) => b.length - a.length || a.localeCompare(b)));
  });
  it("respects letter multiplicity", () => {
    expect(trie.findWords(countLetters("tea"))).not.toContain("tee");
    expect(trie.findWords(countLetters("tee"))).toContain("tee");
    expect(trie.findWords(countLetters("tea"))).not.toContain("teat");
  });
  it("honours minLength", () => {
    expect(trie.findWords(countLetters("teat"), 4)).toEqual(["tate", "teat"]);
  });
  it("returns nothing for an empty rack and never mutates the counts", () => {
    expect(trie.findWords(new Map())).toEqual([]);
    const counts = countLetters("teat");
    const snapshot = new Map(counts);
    trie.findWords(counts);
    expect(counts).toEqual(snapshot);
  });
});

describe("with the real dictionary", () => {
  const dict = parseWordList(readFileSync("public/dictionary/words.txt", "utf8"));
  it("agrees with the Set and caches per dictionary", () => {
    const trie = getTrie(dict);
    expect(getTrie(dict)).toBe(trie);
    expect(trie.size).toBe(dict.size);
    for (const w of ["table", "countdown", "zzzz"]) expect(trie.has(w)).toBe(dict.has(w));
  });
  it("findWords matches a brute-force scan on a 9-letter rack", () => {
    const rack = "stalecorn";
    const counts = countLetters(rack);
    const brute = [...dict].filter((w) => {
      const c = countLetters(w);
      for (const [ch, n] of c) if (n > (counts.get(ch) ?? 0)) return false;
      return true;
    });
    const found = getTrie(dict).findWords(counts);
    expect([...found].sort()).toEqual([...brute].sort());
    expect(found.length).toBeGreaterThan(50);
  });
  it("is fast enough to run at round end", () => {
    const trie = getTrie(dict);
    const start = performance.now();
    trie.findWords(countLetters("stalecorn"));
    expect(performance.now() - start).toBeLessThan(100);
  });
});
