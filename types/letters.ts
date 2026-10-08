import type { Rng } from "@/lib/shared/random";

export type LetterType = "vowel" | "consonant";

export interface LetterTile {
  id: string; // unique per drawn instance (e.g., two E's have different IDs)
  letter: string; // single uppercase character A-Z
  type: LetterType;
}

export type LettersGamePhase =
  | "idle" // pre-game, nothing selected yet
  | "selecting" // player is calling vowel/consonant, board filling up (0-8 tiles)
  | "solving" // 9th tile revealed, 30s timer counting down
  | "roundOver"; // timer expired or word submitted, showing result

export const MAX_BOARD_SIZE = 9;
export const ROUND_DURATION_SECONDS = 30;
export const MIN_WORD_LENGTH = 4;

// Finite, pre-shuffled decks of letters (a weighted multiset, drawn from the
// top without replacement). Index 0 is the next letter to be drawn.
export interface LetterDecks {
  vowel: string[];
  consonant: string[];
}

export type WordValidationStatus =
  | "unchecked"
  | "valid"
  | "invalid-not-a-word"
  | "invalid-not-on-board"
  | "invalid-empty"
  | "invalid-too-short";

export interface WordValidationResult {
  status: WordValidationStatus;
  word: string;
}

export interface LettersRoundResult {
  board: LetterTile[];
  submittedWord: string | null;
  validation: WordValidationResult;
  pointsAwarded: number; // 0 if invalid, otherwise per scoring rules
}

export interface LettersGameState {
  phase: LettersGamePhase;
  board: LetterTile[];
  decks: LetterDecks;
  timeRemainingSeconds: number;
  currentInput: string;
  lastRoundResult: LettersRoundResult | null;
  totalScore: number;
  history: LettersRoundResult[];
}

export type LettersGameAction =
  | { type: "SELECT_LETTER"; letterType: LetterType }
  | { type: "TICK" }
  | { type: "UPDATE_INPUT"; value: string }
  | { type: "SUBMIT_WORD"; word: string; dictionary: Set<string> }
  | { type: "TIME_EXPIRED" }
  | { type: "LOAD_BOARD"; board: LetterTile[] } // preset 9-tile board (Daily)
  | { type: "RESET_ROUND"; rng?: Rng }
  | { type: "RANDOM_FILL"; rng?: Rng };
