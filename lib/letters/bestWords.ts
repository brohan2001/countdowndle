import { LetterTile, MIN_WORD_LENGTH } from "@/types/letters";
import { Trie, countLetters } from "./trie";

export interface BestWordsAnalysis {
  bestLength: number; // 0 if no valid word exists
  longest: string[]; // every word of bestLength, alphabetical
  top: string[]; // the longest `topN` words overall (longest first)
  totalFound: number;
  playerMatchedBest: boolean | null; // null if the player submitted nothing valid
}

export const DEFAULT_TOP_N = 8;

export function analyzeBestWords(
  trie: Trie,
  board: LetterTile[],
  submittedWord: string | null,
  topN = DEFAULT_TOP_N,
): BestWordsAnalysis {
  const found = trie.findWords(
    countLetters(board.map((tile) => tile.letter)),
    MIN_WORD_LENGTH,
  );
  const bestLength = found[0]?.length ?? 0;
  const longest = found.filter((w) => w.length === bestLength);

  const submitted = submittedWord?.trim().toLowerCase() ?? "";
  const playerHasValid = submitted !== "" && trie.has(submitted);

  return {
    bestLength,
    longest,
    top: found.slice(0, topN),
    totalFound: found.length,
    playerMatchedBest: playerHasValid ? submitted.length >= bestLength : null,
  };
}
