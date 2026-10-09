// Transport-agnostic duel engine. The server (M7) feeds validated events in;
// clients render the resulting state. Nothing here knows about the network,
// timers or the database. Per-second ticks never enter this reducer, and the
// server owns deadlines and sends TIME_EXPIRED / PROOF events.

export type PlayerId = string;

export type RoundKind = "letters" | "numbers" | "conundrum";

// "Quick" format from the plan: one round of each. "Full show" is later.
export const QUICK_FORMAT: RoundKind[] = ["letters", "numbers", "conundrum"];

export type MatchPhase = "lobby" | "playing" | "reveal" | "final";

export type LettersRound = {
  kind: "letters";
  picker: PlayerId; // alternates between rounds
  points: Record<PlayerId, number>; // submitted, validated points (absent = nothing)
};

export type NumbersRound = {
  kind: "numbers";
  target: number;
  stage: "declaring" | "proving";
  declarations: Record<PlayerId, number>; // latest declaration wins
  // Proving order: closest declaration first. Players tied on distance are
  // both asked to prove (tieGroup), others follow in order.
  order: PlayerId[];
  proofIndex: number;
  points: Record<PlayerId, number>;
};

export type ConundrumRound = {
  kind: "conundrum";
  buzzedBy: PlayerId | null; // currently answering
  lockedOut: PlayerId[]; // got it wrong
  winner: PlayerId | null;
  points: Record<PlayerId, number>;
};

export type RoundState = LettersRound | NumbersRound | ConundrumRound;

export interface RoundOutcome {
  kind: RoundKind;
  points: Record<PlayerId, number>;
}

export interface MatchState {
  phase: MatchPhase;
  players: PlayerId[]; // exactly 2 once started
  format: RoundKind[];
  roundIndex: number;
  round: RoundState | null; // current round while playing or in reveal
  scores: Record<PlayerId, number>;
  history: RoundOutcome[];
  winner: PlayerId | "draw" | null; // set at 'final'
  resignedBy?: PlayerId; // set when the match ended by resignation
}

export type MatchAction =
  | { type: "JOIN"; player: PlayerId }
  | { type: "START"; numbersTarget: number }
  | { type: "NEXT_ROUND"; numbersTarget: number }
  | { type: "LETTERS_SUBMIT"; player: PlayerId; points: number }
  | { type: "NUMBERS_DECLARE"; player: PlayerId; value: number }
  // Result of the proof attempt by the player currently up. `points` is not
  // trusted from the client: the engine scores the declared value itself.
  | { type: "NUMBERS_PROOF"; player: PlayerId; proven: boolean }
  | { type: "CONUNDRUM_BUZZ"; player: PlayerId }
  | { type: "CONUNDRUM_ANSWER"; player: PlayerId; correct: boolean }
  | { type: "TIME_EXPIRED" }
  // Concede: the opponent wins whatever the score. Only once the match has
  // started and before it is over.
  | { type: "RESIGN"; player: PlayerId };
