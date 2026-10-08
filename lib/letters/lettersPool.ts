// lib/letters/letterPool.ts
import { LetterDecks, LetterType, LetterTile } from "@/types/letters";
import { Rng, randomInt, shuffle } from "../shared/random";

// TODO: source real vowel/consonant frequency counts and hardcode them here
const VOWEL_COUNTS: Record<string, number> = {
  A: 15,
  E: 21,
  I: 13,
  O: 13,
  U: 5,
};
const CONSONANT_COUNTS: Record<string, number> = {
  B: 2,
  C: 3,
  D: 6,
  F: 2,
  G: 3,
  H: 2,
  J: 1,
  K: 1,
  L: 5,
  M: 4,
  N: 8,
  P: 4,
  Q: 1,
  R: 9,
  S: 9,
  T: 9,
  V: 1,
  W: 1,
  X: 1,
  Y: 1,
  Z: 1,
};

function expand(counts: Record<string, number>): string[] {
  return Object.entries(counts).flatMap(([letter, n]) =>
    Array.from({ length: n }, () => letter),
  );
}

// A fresh round's decks: every letter repeated by its frequency, then
// Fisher-Yates shuffled. Drawing is just taking from the top, so the whole
// round's letters are fixed by the rng up front (seedable for Daily).
export function createDecks(rng: Rng = Math.random): LetterDecks {
  return {
    vowel: shuffle(expand(VOWEL_COUNTS), rng),
    consonant: shuffle(expand(CONSONANT_COUNTS), rng),
  };
}

// Takes the top letter of one deck. Returns null if that deck is empty.
// Never mutates `decks`.
export function drawFromDecks(
  decks: LetterDecks,
  type: LetterType,
  id: string,
): { tile: LetterTile; decks: LetterDecks } | null {
  const [letter, ...rest] = decks[type];
  if (letter === undefined) return null;
  return {
    tile: { id, letter, type },
    decks: { ...decks, [type]: rest },
  };
}

export function pickRandomFillCounts(
  vowelsSoFar: number,
  consonantsSoFar: number,
  remainingSlots: number,
  rng: Rng = Math.random,
): { vowelsToAdd: number; consonantsToAdd: number } {
  // TODO: compute lowerBound/upperBound as above, pick a random int in that
  // inclusive range for vowelsToAdd, derive consonantsToAdd as the remainder.
  // (Math.floor(Math.random() * (upperBound - lowerBound + 1)) + lowerBound
  // gives a random int in an inclusive range — same idea as drawLetter's own
  // random-picking logic.)
  const lowerBound = Math.max(0, 3 - vowelsSoFar);
  const upperBound = Math.min(remainingSlots, 5 - vowelsSoFar);
  const vowelsToAdd = randomInt(lowerBound, upperBound, rng);
  const consonantsToAdd = remainingSlots - vowelsToAdd;
  return { vowelsToAdd, consonantsToAdd };
}
