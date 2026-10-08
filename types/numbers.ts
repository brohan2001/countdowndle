export type NumbersGamePhase =
  | "selecting" // choosing large number count (0-4), input mode, and play mode
  | "solving" // tiles/target ready; declare mode counts down 30s to a declaration,
  //           untimed mode has no countdown and works like live entry
  | "proving" // declare mode only: time is up, player shows the working in the
  //           calculator, each tap within PROVE_TAP_SECONDS of the last
  | "roundOver"; // timer expired (untimed) or declaration/solution resolved

export type NumbersInputMode = "calculator" | "freeText";

// Deliberately a separate axis from NumbersInputMode: input mode is HOW you
// build an answer (tile calculator vs typed expression), play mode is
// WHEN/how the round is timed and scored (live entry vs declare-then-prove).
// Either input mode works with either play mode, so they're independent
// rather than folded into one combined enum.
export type NumbersPlayMode = "declare" | "untimed";

export type LargeCount = 0 | 1 | 2 | 3 | 4;

export type NumbersOperator = "+" | "-" | "*" | "/";

export const OPERATOR_ORDER: NumbersOperator[] = ["+", "-", "*", "/"];

export const OPERATOR_SYMBOLS: Record<NumbersOperator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

export interface NumberTile {
  id: string; // unique UUID per instance (e.g., crypto.randomUUID())
  value: number; // positive integer
  isOriginal: boolean; // true for initial drawn tiles, false for intermediate results
}

export interface CalculatorStep {
  id: string;
  operand1: NumberTile;
  operator: NumbersOperator;
  operand2: NumberTile;
  resultTile: NumberTile; // Exact tile instance added to pool for subsequent operations
}

export type NumbersValidationStatus =
  | "exact" // target matched exactly (10 pts)
  | "close-1-to-5" // within 1-5 off target (7 pts)
  | "close-6-to-10" // within 6-10 off target (5 pts)
  | "valid-further-off" // valid math/tiles, but difference > 10 (0 pts)
  | "invalid-empty" // nothing submitted / timed out / nothing declared
  | "invalid-syntax" // free-text parse or operator order error
  | "invalid-fraction" // non-integer division step
  | "invalid-negative" // negative or zero intermediate/final result
  | "invalid-tile-reuse" // used a number not available in the pool / drawn set
  | "invalid-unproven"; // declare mode: the proof did not reach the declared value

export interface NumbersValidationResult {
  status: NumbersValidationStatus;
  achievedValue: number | null;
  difference: number | null;
}

export const ROUND_DURATION_SECONDS = 30;

// Declare mode proof: every tile/operator tap must land within this many
// seconds of the previous one (each tap resets it). There is no total cap.
export const PROVE_TAP_SECONDS = 5;

export interface NumbersRoundResult {
  drawnNumbers: NumberTile[];
  target: number;
  inputMode: NumbersInputMode;
  playMode: NumbersPlayMode;
  declaredValue: number | null; // null in untimed mode, or if nothing was ever declared
  solution:
    | { mode: "calculator"; steps: CalculatorStep[] }
    | { mode: "freeText"; expression: string };
  validation: NumbersValidationResult;
  pointsAwarded: number;
}

export interface NumbersGameState {
  phase: NumbersGamePhase;
  largeCount: LargeCount | null;
  inputMode: NumbersInputMode; // defaults to 'calculator', switchable in 'selecting', frozen after
  playMode: NumbersPlayMode; // defaults to 'untimed', switchable only in 'selecting'
  drawnNumbers: NumberTile[]; // the 6 drawn numbers
  target: number | null; // randomly chosen 100–999

  // Calculator interaction state
  pool: NumberTile[]; // available tiles; shrinks/grows as steps are built/undone
  steps: CalculatorStep[]; // confirmed arithmetic steps
  pendingOperand1: NumberTile | null;
  pendingOperator: NumbersOperator | null;
  pendingOperand2: NumberTile | null;

  // Free-text interaction state
  freeTextExpression: string;

  // Declare-mode interaction state
  declaredValue: number | null; // the number the player claims they can reach

  result: NumbersRoundResult | null;
}

export type NumbersGameAction =
  | { type: "SET_LARGE_COUNT"; largeCount: LargeCount }
  | { type: "SET_INPUT_MODE"; mode: NumbersInputMode }
  | { type: "SET_PLAY_MODE"; mode: NumbersPlayMode }
  | { type: "START_SOLVING" }
  | { type: "SELECT_OPERAND"; tileId: string }
  | { type: "SELECT_OPERATOR"; operator: NumbersOperator }
  | { type: "CONFIRM_STEP" }
  | { type: "UNDO_STEP" }
  | { type: "CLEAR_CALCULATOR" }
  | { type: "UPDATE_FREE_TEXT"; value: string }
  | { type: "SET_DECLARED_VALUE"; value: number | null }
  | { type: "LOCK_DECLARATION" }
  | { type: "SUBMIT_ANSWER" }
  | { type: "TIME_EXPIRED" }
  | { type: "PROVE_TIMEOUT" }
  | { type: "RESET_ROUND" };
