import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  isInflection,
  letterSignature,
  scrambleWord,
  selectConundrumWords,
} from "@/lib/conundrum/generator";
import { parseWordList } from "@/lib/letters/dictionary";
import { mulberry32, shuffle } from "@/lib/shared/random";

describe("selectConundrumWords", () => {
  it("keeps only unique-anagram 9-letter words", () => {
    // 'stalenoxy'-style fake groups: two words share a signature -> both dropped
    const dict = new Set(["abcdefghi", "ihgfedcba", "qwertyuio", "short", "abcdefghij"]);
    expect(selectConundrumWords(dict)).toEqual(["qwertyuio"]);
  });
  it("drops inflections whose base word is in the dictionary", () => {
    const dict = new Set(["wanderers", "wanderer", "abductors", "stripping", "strip", "computing", "compute", "kidnapped"]);
    const out = selectConundrumWords(dict);
    expect(out).not.toContain("wanderers"); // plural of wanderer
    expect(out).not.toContain("stripping"); // strip + ing
    expect(out).not.toContain("computing"); // compute -> comput + ing
    expect(out).toContain("abductors"); // abductor not in dict
    expect(out).toContain("kidnapped"); // kidnap not in dict
  });
  it("detects -ed with doubled consonant and -ies", () => {
    expect(isInflection("stopped", new Set(["stop"]))).toBe(true);
    expect(isInflection("cities", new Set(["city"]))).toBe(true);
    expect(isInflection("baked", new Set(["bake"]))).toBe(true);
  });
});

describe("scrambleWord", () => {
  const dict = new Set(["listen", "silent"]);
  it("never returns the solution or a dictionary word, and keeps the letters", () => {
    for (let seed = 1; seed < 40; seed++) {
      const rng = mulberry32(seed);
      const s = scrambleWord("listen", dict, (l) => shuffle(l, rng));
      expect(s).not.toBe("listen");
      expect(dict.has(s)).toBe(false);
      expect(letterSignature(s)).toBe(letterSignature("listen"));
    }
  });
  it("falls back deterministically when every shuffle is rejected", () => {
    expect(scrambleWord("abcdefghi", new Set(), (l) => l)).toBe("bcdefghia");
  });
});

describe("generated conundrums.json", () => {
  const solutions: string[] = JSON.parse(readFileSync("public/dictionary/conundrums.json", "utf8"));
  const dict = parseWordList(readFileSync("public/dictionary/words.txt", "utf8"));
  it("is non-trivial, 9 letters, in the dictionary, unique signatures", () => {
    expect(solutions.length).toBeGreaterThan(1000);
    expect(solutions.every((w) => w.length === 9 && dict.has(w))).toBe(true);
    expect(new Set(solutions.map(letterSignature)).size).toBe(solutions.length);
  });
  it("matches what the generator produces now (regenerate if the wordlist changes)", () => {
    expect(solutions).toEqual(selectConundrumWords(dict));
  });
});
