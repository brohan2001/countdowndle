/** A source of floats in [0, 1), like Math.random. Inject one to make draws seedable. */
export type Rng = () => number;

/**
 * mulberry32: a tiny, fast seeded PRNG. The same 32-bit seed always yields
 * the same sequence, which is what makes Daily puzzles reproducible.
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** cyrb53 string hash (53 bits), used to turn "2026-10-09:letters" into a seed. */
export function hashString(input: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Seeded Rng from a string key. */
export function rngFromString(key: string): Rng {
  return mulberry32(hashString(key) >>> 0);
}

/** Random integer in the inclusive range [min, max]. */
export function randomInt(min: number, max: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Fisher-Yates shuffle. Returns a new array; the input is not modified.
 */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
