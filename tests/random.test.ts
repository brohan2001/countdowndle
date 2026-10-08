import { describe, it, expect } from "vitest";
import { mulberry32, hashString, rngFromString, shuffle, randomInt } from "@/lib/shared/random";
import { drawNumbers, pickTarget } from "@/lib/numbers/numberPool";
import { createInitialBag, drawLetter, pickRandomFillCounts } from "@/lib/letters/lettersPool";

const take = (r: () => number, n: number) => Array.from({ length: n }, r);

describe("seeded rng", () => {
  it("is deterministic per seed and differs across seeds", () => {
    expect(take(mulberry32(42), 5)).toEqual(take(mulberry32(42), 5));
    expect(take(mulberry32(42), 5)).not.toEqual(take(mulberry32(43), 5));
  });
  it("yields floats in [0,1)", () => {
    for (const x of take(mulberry32(1), 1000)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it("hashString is stable and distinguishes inputs", () => {
    expect(hashString("2026-10-09:letters")).toBe(hashString("2026-10-09:letters"));
    expect(hashString("a")).not.toBe(hashString("b"));
    expect(take(rngFromString("k"), 3)).toEqual(take(rngFromString("k"), 3));
  });
  it("randomInt covers the inclusive range", () => {
    const seen = new Set(take(mulberry32(7), 500).map((x) => randomInt(1, 3, () => x)));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });
});

describe("shuffle", () => {
  it("does not mutate the input and preserves elements", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const out = shuffle(input, mulberry32(3));
    expect(input).toEqual(copy);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual(copy);
  });
  it("is reproducible with a seeded rng", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], mulberry32(9));
    const b = shuffle([1, 2, 3, 4, 5, 6], mulberry32(9));
    expect(a).toEqual(b);
  });
});

describe("seeded draws", () => {
  it("numbers: same seed → same values and target", () => {
    const v = (seed: number) => drawNumbers(2, mulberry32(seed)).map((t) => t.value);
    expect(v(5)).toEqual(v(5));
    expect(pickTarget(mulberry32(5))).toBe(pickTarget(mulberry32(5)));
    expect(v(5)).toHaveLength(6);
  });
  it("letters: same seed → same letters", () => {
    const letters = (seed: number) => {
      const r = mulberry32(seed);
      let bag = createInitialBag();
      const out: string[] = [];
      for (let i = 0; i < 5; i++) {
        const d = drawLetter(bag, "consonant", r);
        bag = d.bag;
        out.push(d.tile.letter);
      }
      return out;
    };
    expect(letters(11)).toEqual(letters(11));
    expect(pickRandomFillCounts(0, 0, 9, mulberry32(2))).toEqual(pickRandomFillCounts(0, 0, 9, mulberry32(2)));
  });
});
