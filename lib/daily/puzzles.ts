import { LetterTile, MAX_BOARD_SIZE } from "@/types/letters";
import { LargeCount, NumberTile } from "@/types/numbers";
import { ConundrumPuzzle } from "@/types/conundrum";
import { createDecks, drawFromDecks, pickRandomFillCounts } from "../letters/lettersPool";
import { drawNumbers, pickTarget } from "../numbers/numberPool";
import { makePuzzle, pickSolution } from "../conundrum/puzzle";
import { randomInt, shuffle } from "../shared/random";
import { DailyGameId, dailyRng } from "./seed";

export function dailyLettersBoard(dayKey: string): LetterTile[] {
  const rng = dailyRng(dayKey, "letters");
  let decks = createDecks(rng);
  const { vowelsToAdd, consonantsToAdd } = pickRandomFillCounts(0, 0, MAX_BOARD_SIZE, rng);

  const tiles: LetterTile[] = [];
  const plan = [
    ["vowel", vowelsToAdd],
    ["consonant", consonantsToAdd],
  ] as const;
  for (const [type, count] of plan) {
    for (let i = 0; i < count; i++) {
      const drawn = drawFromDecks(decks, type, `tile-${tiles.length}`);
      if (drawn === null) throw new Error("Deck exhausted");
      tiles.push(drawn.tile);
      decks = drawn.decks;
    }
  }
  return shuffle(tiles, rng).map((tile, index) => ({ ...tile, id: `tile-${index}` }));
}

export interface DailyNumbersPuzzle {
  largeCount: LargeCount;
  drawnNumbers: NumberTile[];
  target: number;
}

export function dailyNumbersPuzzle(dayKey: string): DailyNumbersPuzzle {
  const rng = dailyRng(dayKey, "numbers");
  const largeCount = randomInt(0, 4, rng) as LargeCount;
  const drawnNumbers = drawNumbers(largeCount, rng).map((tile, index) => ({
    ...tile,
    id: `daily-${index}`, // stable ids so the same day always yields equal state
  }));
  return { largeCount, drawnNumbers, target: pickTarget(rng) };
}

export function dailyConundrumPuzzle(
  dayKey: string,
  solutions: readonly string[],
  dictionary: ReadonlySet<string>,
): ConundrumPuzzle {
  const rng = dailyRng(dayKey, "conundrum");
  return makePuzzle(pickSolution(solutions, rng), dictionary, rng);
}

export type { DailyGameId };
