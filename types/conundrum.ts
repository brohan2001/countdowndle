export type ConundrumPhase = 'idle' | 'solving' | 'roundOver';

export interface ConundrumPuzzle {
  scrambled: string;
  solution: string; // NOTE: Currently sent to client (inspectable via devtools).
                    // Phase 2: consider server-side validation to prevent spoilers.
}

export interface ConundrumRoundResult {
  puzzle: ConundrumPuzzle;
  userGuess: string | null;
  isCorrect: boolean;
  timeTakenSeconds: number | null;
}

// TODO: ConundrumGameState and ConundrumGameAction will be defined when we build Conundrum Game.