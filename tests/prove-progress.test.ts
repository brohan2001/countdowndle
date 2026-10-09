import { describe, it, expect } from "vitest";
import { numbersGameReducer, createInitialState } from "@/lib/numbers/useNumbersGame";
import { nextHighWater, proofProgress } from "@/lib/numbers/proveProgress";
import { NumbersGameState, NumberTile, NumbersGameAction } from "@/types/numbers";

const tile = (id: string, value: number): NumberTile => ({ id, value, isOriginal: true });
const tiles = [tile("a", 100), tile("b", 4), tile("c", 5), tile("d", 25), tile("e", 3), tile("f", 7)];

function proving(): NumbersGameState {
  return {
    ...createInitialState(),
    phase: "proving",
    playMode: "declare",
    largeCount: 2,
    drawnNumbers: tiles,
    pool: [...tiles],
    target: 520,
    declaredValue: 520,
  };
}

// Replays actions, returning how many times the per-tap clock would reset.
function resets(actions: NumbersGameAction[]) {
  let s = proving();
  let high = proofProgress(s);
  let count = 0;
  for (const a of actions) {
    s = numbersGameReducer(s, a);
    const next = nextHighWater(high, proofProgress(s));
    if (next !== high) count++;
    high = next;
  }
  return { count, state: s };
}

const sel = (tileId: string): NumbersGameAction => ({ type: "SELECT_OPERAND", tileId });

describe("proof progress high-water mark", () => {
  it("each new slot of a step resets the clock", () => {
    const { count, state } = resets([
      sel("a"),
      { type: "SELECT_OPERATOR", operator: "+" },
      sel("b"),
      { type: "CONFIRM_STEP" },
    ]);
    expect(state.steps).toHaveLength(1);
    expect(count).toBe(4);
  });

  it("toggling a tile on and off only earns time once", () => {
    const { count } = resets([sel("a"), sel("a"), sel("a"), sel("a"), sel("a")]);
    expect(count).toBe(1);
  });

  it("Clear spam and no-op operator clicks earn nothing", () => {
    const { count } = resets([
      { type: "CLEAR_CALCULATOR" },
      { type: "CLEAR_CALCULATOR" },
      { type: "SELECT_OPERATOR", operator: "+" }, // no first operand yet
      { type: "CLEAR_CALCULATOR" },
    ]);
    expect(count).toBe(0);
  });

  it("undo then redo of the same step earns nothing", () => {
    const step: NumbersGameAction[] = [
      sel("a"),
      { type: "SELECT_OPERATOR", operator: "+" },
      sel("b"),
      { type: "CONFIRM_STEP" },
    ];
    const { count } = resets([...step, { type: "UNDO_STEP" }, ...step, { type: "UNDO_STEP" }, ...step]);
    expect(count).toBe(4);
  });
});
