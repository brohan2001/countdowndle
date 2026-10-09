import type { NumbersGameState } from "@/types/numbers";

// How far a calculator proof has got, counted in filled slots: each confirmed
// step is worth 4 (operand, operator, operand, confirm) plus whatever is
// pending. Clicks that change nothing (Clear on an empty calculator, an
// operator with no first operand) leave it unchanged, and toggling, Undo and
// Clear lower it.
export function proofProgress(
  state: Pick<
    NumbersGameState,
    "steps" | "pendingOperand1" | "pendingOperator" | "pendingOperand2"
  >,
): number {
  return (
    state.steps.length * 4 +
    (state.pendingOperand1 ? 1 : 0) +
    (state.pendingOperator ? 1 : 0) +
    (state.pendingOperand2 ? 1 : 0)
  );
}

// The per-tap clock only resets when progress passes its previous best (the
// high-water mark). Going backwards and re-doing the same work never earns
// time back, so a player can't stall by toggling or undo/redo loops.
export function nextHighWater(highWater: number, progress: number): number {
  return progress > highWater ? progress : highWater;
}
