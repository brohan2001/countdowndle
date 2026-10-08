import { LargeCount, NumberTile } from "@/types/numbers";
import { Rng, randomInt, shuffle } from "../shared/random";

const LARGE_VALUES = [25, 50, 75, 100];

const SMALL_COUNTS: Record<number, number> = {
  1: 2,
  2: 2,
  3: 2,
  4: 2,
  5: 2,
  6: 2,
  7: 2,
  8: 2,
  9: 2,
  10: 2,
};

const NUMBERS_PER_ROUND = 6;

export function drawLargeNumbers(
  count: LargeCount,
  rng: Rng = Math.random,
): NumberTile[] {
  const largeNumbers = shuffle(LARGE_VALUES, rng).slice(0, count);
  return largeNumbers.map((largeNumber) => ({
    id: crypto.randomUUID(),
    value: largeNumber,
    isOriginal: true,
  }));
}

export function drawSmallNumber(
  pool: Record<number, number>,
  rng: Rng = Math.random,
): {
  tile: NumberTile;
  pool: Record<number, number>;
} {
  const smallNumbers = Object.keys(pool).map(Number);
  const random =
    rng() * Object.values(pool).reduce((sum, count) => sum + count, 0);
  let cumulative = 0;

  for (const smallNumber of smallNumbers) {
    cumulative += pool[smallNumber];

    if (random < cumulative) {
      const newPool = {
        ...pool,
        [smallNumber]: pool[smallNumber] - 1,
      };

      const tile: NumberTile = {
        id: crypto.randomUUID(),
        value: smallNumber,
        isOriginal: true,
      };

      return { tile: tile, pool: newPool };
    }
  }
  throw new Error("Failed to draw a number");
}

export function drawNumbers(
  largeCount: LargeCount,
  rng: Rng = Math.random,
): NumberTile[] {
  let pool = SMALL_COUNTS;
  const tiles = drawLargeNumbers(largeCount, rng);
  for (let i = 0; i < NUMBERS_PER_ROUND - largeCount; i++) {
    const { tile, pool: newPool } = drawSmallNumber(pool, rng);
    pool = newPool;
    tiles.push(tile);
  }
  return tiles;
}

export function pickTarget(rng: Rng = Math.random): number {
  return randomInt(100, 999, rng);
}
