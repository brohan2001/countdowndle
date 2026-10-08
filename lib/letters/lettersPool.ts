// lib/letters/letterPool.ts
import { LetterBag, LetterType, LetterTile } from "@/types/letters";
import { Rng, randomInt } from "../shared/random";

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

export function createInitialBag(): LetterBag {
  // TODO: return a fresh LetterBag from the constants above
  return { vowel: { ...VOWEL_COUNTS }, consonant: { ...CONSONANT_COUNTS } };
}

export function drawLetter(
  bag: LetterBag,
  type: LetterType,
  rng: Rng = Math.random,
): { tile: LetterTile; bag: LetterBag } {
  // TODO: weighted-random pick from bag[type], decrement that letter's count,
  // return a new tile + a new (not mutated) LetterBag
  const pool = bag[type];

  const letters = Object.keys(pool);

  let total = 0;

  for (const letter of letters) {
    total += pool[letter];
  }

  if (total == 0) {
    throw new Error(`No ${type} letters left in the bag`);
  }

  const random = rng() * total;

  let cumulative = 0;

  for (const letter of letters) {
    cumulative += pool[letter];

    if (random < cumulative) {
      const newPool = {
        ...pool,
        [letter]: pool[letter] - 1,
      };

      const newBag: LetterBag = {
        ...bag,
        [type]: newPool,
      };

      const tile: LetterTile = {
        id: crypto.randomUUID(),
        letter: letter,
        type: type,
      };

      return {
        tile: tile,
        bag: newBag,
      };
    }
  }
  throw new Error("Failed to draw a letter");
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
