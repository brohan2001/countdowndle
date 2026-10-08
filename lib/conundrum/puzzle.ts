import { ConundrumPuzzle } from "@/types/conundrum";
import { Rng, randomInt, shuffle } from "../shared/random";
import { scrambleWord } from "./generator";

export function pickSolution(solutions: readonly string[], rng: Rng = Math.random): string {
  if (solutions.length === 0) throw new Error("No conundrum solutions available");
  return solutions[randomInt(0, solutions.length - 1, rng)];
}

export function makePuzzle(
  solution: string,
  dictionary: ReadonlySet<string>,
  rng: Rng = Math.random,
): ConundrumPuzzle {
  return {
    solution,
    scrambled: scrambleWord(solution, dictionary, (letters) => shuffle(letters, rng)),
  };
}
