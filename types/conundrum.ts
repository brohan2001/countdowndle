export type ConundrumPhase =
  | "idle" // no puzzle yet
  | "solving" // scrambled word shown, 30s countdown (ticks live in the UI)
  | "buzzed" // player has buzzed and now types the answer in a short window
  | "roundOver";

export const ROUND_DURATION_SECONDS = 30;
export const ANSWER_WINDOW_SECONDS = 10;
// TV rules: a flat 10 points, no time bonus.
export const CONUNDRUM_POINTS = 10;

export interface ConundrumPuzzle {
  scrambled: string;
  solution: string; // NOTE: currently sent to the client (inspectable via
  // devtools). Duels (M7) keep it server-side until reveal.
}

export interface ConundrumRoundResult {
  puzzle: ConundrumPuzzle;
  userGuess: string | null; // null if the player never buzzed
  isCorrect: boolean;
  timeTakenSeconds: number | null; // seconds into the round the buzz landed
  pointsAwarded: number;
}

export interface ConundrumGameState {
  phase: ConundrumPhase;
  puzzle: ConundrumPuzzle | null;
  // Seconds left on the round clock at the moment of the buzz. Captured once
  // from the UI timer; the reducer never sees ticks.
  buzzedAtSecondsRemaining: number | null;
  lastRoundResult: ConundrumRoundResult | null;
  totalScore: number;
  history: ConundrumRoundResult[];
}

export type ConundrumGameAction =
  | { type: "START_ROUND"; puzzle: ConundrumPuzzle }
  | { type: "BUZZ"; secondsRemaining: number }
  | { type: "SUBMIT_GUESS"; guess: string }
  | { type: "TIME_EXPIRED" }
  | { type: "RESET_ROUND" };
