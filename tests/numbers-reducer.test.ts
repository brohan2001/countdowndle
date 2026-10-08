import { describe, it, expect } from "vitest";
import { numbersGameReducer, createInitialState, canWork } from "@/lib/numbers/useNumbersGame";
import { NumbersGameState, NumberTile } from "@/types/numbers";

const tile = (id: string, value: number): NumberTile => ({ id, value, isOriginal: true });
const tiles = [tile("a", 100), tile("b", 4), tile("c", 5), tile("d", 25), tile("e", 3), tile("f", 7)];

function started(overrides: Partial<NumbersGameState> = {}): NumbersGameState {
  return {
    ...createInitialState(),
    phase: "solving",
    largeCount: 2,
    drawnNumbers: tiles,
    pool: [...tiles],
    target: 520,
    ...overrides,
  };
}

function step(s: NumbersGameState, a: string, op: "+" | "-" | "*" | "/", b: string) {
  let r = numbersGameReducer(s, { type: "SELECT_OPERAND", tileId: a });
  r = numbersGameReducer(r, { type: "SELECT_OPERATOR", operator: op });
  r = numbersGameReducer(r, { type: "SELECT_OPERAND", tileId: b });
  return numbersGameReducer(r, { type: "CONFIRM_STEP" });
}

describe("numbers setup", () => {
  it("START_SOLVING draws 6 tiles and a target", () => {
    let s = numbersGameReducer(createInitialState(), { type: "START_SOLVING" });
    expect(s.phase).toBe("selecting"); // needs a large count first
    s = numbersGameReducer(s, { type: "SET_LARGE_COUNT", largeCount: 2 });
    s = numbersGameReducer(s, { type: "START_SOLVING" });
    expect(s.phase).toBe("solving");
    expect(s.drawnNumbers).toHaveLength(6);
    expect(s.drawnNumbers.filter((t) => t.value >= 25 && [25, 50, 75, 100].includes(t.value))).toHaveLength(2);
    expect(s.target).toBeGreaterThanOrEqual(100);
    expect(s.target).toBeLessThanOrEqual(999);
  });
  it("locks modes after selecting", () => {
    const s = started();
    expect(numbersGameReducer(s, { type: "SET_INPUT_MODE", mode: "freeText" })).toBe(s);
    expect(numbersGameReducer(s, { type: "SET_PLAY_MODE", mode: "declare" })).toBe(s);
  });
});

describe("calculator (untimed)", () => {
  it("builds a step, replacing operands with the result", () => {
    const s = step(started(), "a", "+", "b");
    expect(s.steps).toHaveLength(1);
    expect(s.pool).toHaveLength(5);
    expect(s.pool.some((t) => t.value === 104)).toBe(true);
    expect(s.pool.some((t) => t.id === "a" || t.id === "b")).toBe(false);
  });
  it("ignores illegal steps", () => {
    const s = step(started(), "e", "-", "c"); // 3 - 5
    expect(s.steps).toHaveLength(0);
    expect(s.pool).toHaveLength(6);
  });
  it("undo restores operands; clear restores everything", () => {
    const s1 = step(started(), "a", "+", "b");
    const undone = numbersGameReducer(s1, { type: "UNDO_STEP" });
    expect(undone.steps).toHaveLength(0);
    expect(undone.pool.map((t) => t.id).sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
    const s2 = step(s1, "c", "*", "d");
    const cleared = numbersGameReducer(s2, { type: "CLEAR_CALCULATOR" });
    expect(cleared.steps).toHaveLength(0);
    expect(cleared.pool).toHaveLength(6);
  });
  it("scores the closest candidate on submit", () => {
    const s = step(started(), "a", "+", "b"); // 104
    const done = numbersGameReducer(s, { type: "SUBMIT_ANSWER" });
    expect(done.phase).toBe("roundOver");
    expect(done.result?.validation.achievedValue).toBe(104);
    expect(done.result?.pointsAwarded).toBe(0);
  });
  it("zero steps is invalid-empty", () => {
    const done = numbersGameReducer(started(), { type: "SUBMIT_ANSWER" });
    expect(done.result?.validation.status).toBe("invalid-empty");
    expect(done.result?.pointsAwarded).toBe(0);
  });
  it("exact hit scores 10", () => {
    let s = step(started(), "a", "+", "b"); // 104
    const t = s.pool.find((x) => x.value === 104)!;
    s = step(s, t.id, "*", "c"); // 520
    const done = numbersGameReducer(s, { type: "SUBMIT_ANSWER" });
    expect(done.result?.validation.status).toBe("exact");
    expect(done.result?.pointsAwarded).toBe(10);
  });
});

describe("free text (untimed)", () => {
  it("truncates overlong input", () => {
    const s = numbersGameReducer(started({ inputMode: "freeText" }), { type: "UPDATE_FREE_TEXT", value: "1".repeat(500) });
    expect(s.freeTextExpression).toHaveLength(100);
  });
  it("scores a valid expression", () => {
    let s = numbersGameReducer(started({ inputMode: "freeText" }), { type: "UPDATE_FREE_TEXT", value: "(100 + 4) * 5" });
    s = numbersGameReducer(s, { type: "SUBMIT_ANSWER" });
    expect(s.result?.pointsAwarded).toBe(10);
  });
  it("rejects a bare number and tile reuse", () => {
    let s = numbersGameReducer(started({ inputMode: "freeText" }), { type: "UPDATE_FREE_TEXT", value: "100" });
    expect(numbersGameReducer(s, { type: "SUBMIT_ANSWER" }).result?.validation.status).toBe("invalid-syntax");
    s = numbersGameReducer(s, { type: "UPDATE_FREE_TEXT", value: "100 + 100" });
    expect(numbersGameReducer(s, { type: "SUBMIT_ANSWER" }).result?.validation.status).toBe("invalid-tile-reuse");
  });
});

describe("declare mode (current behaviour)", () => {
  const declare = (o: Partial<NumbersGameState> = {}) => started({ playMode: "declare", ...o });
  it("can't work tiles while declaring", () => {
    expect(canWork(declare())).toBe(false);
    expect(canWork(declare({ phase: "proving" }))).toBe(true);
  });
  it("validates declared values", () => {
    const s = declare();
    expect(numbersGameReducer(s, { type: "SET_DECLARED_VALUE", value: 2.5 })).toBe(s);
    expect(numbersGameReducer(s, { type: "SET_DECLARED_VALUE", value: 0 })).toBe(s);
    expect(numbersGameReducer(s, { type: "SET_DECLARED_VALUE", value: 520 }).declaredValue).toBe(520);
  });
  it("lock with no declaration ends the round at 0", () => {
    const done = numbersGameReducer(declare(), { type: "LOCK_DECLARATION" });
    expect(done.phase).toBe("roundOver");
    expect(done.result?.validation.status).toBe("invalid-empty");
  });
  it("lock with a declaration enters proving; proof scores", () => {
    let s = numbersGameReducer(declare({ declaredValue: 104 }), { type: "LOCK_DECLARATION" });
    expect(s.phase).toBe("proving");
    s = step(s, "a", "+", "b");
    s = numbersGameReducer(s, { type: "SUBMIT_ANSWER" });
    expect(s.result?.declaredValue).toBe(104);
    expect(s.result?.validation.status).toBe("valid-further-off");
  });
  it("unproven declaration scores 0 as invalid-unproven", () => {
    let s = numbersGameReducer(declare({ declaredValue: 520 }), { type: "LOCK_DECLARATION" });
    s = numbersGameReducer(s, { type: "SUBMIT_ANSWER" });
    expect(s.result?.validation.status).toBe("invalid-unproven");
    expect(s.result?.pointsAwarded).toBe(0);
  });
  it("TIME_EXPIRED is ignored in untimed mode and after solving", () => {
    const u = started();
    expect(numbersGameReducer(u, { type: "TIME_EXPIRED" })).toBe(u);
    const p = declare({ phase: "proving", declaredValue: 5 });
    expect(numbersGameReducer(p, { type: "TIME_EXPIRED" })).toBe(p);
  });
});

describe("declare mode: timed prove", () => {
  const declare = (o: Partial<NumbersGameState> = {}) => started({ playMode: "declare", ...o });

  it("declaration can be updated repeatedly while the clock runs (latest wins)", () => {
    let s = declare();
    s = numbersGameReducer(s, { type: "SET_DECLARED_VALUE", value: 300 });
    s = numbersGameReducer(s, { type: "SET_DECLARED_VALUE", value: 518 });
    expect(s.declaredValue).toBe(518);
    s = numbersGameReducer(s, { type: "SET_DECLARED_VALUE", value: null });
    expect(s.declaredValue).toBeNull();
  });

  it("expiry with a declaration enters proving, forcing calculator mode", () => {
    const s = numbersGameReducer(declare({ inputMode: "freeText", declaredValue: 104 }), { type: "TIME_EXPIRED" });
    expect(s.phase).toBe("proving");
    expect(s.inputMode).toBe("calculator");
    expect(canWork(s)).toBe(true);
  });

  it("expiry without a declaration ends the round as invalid-empty", () => {
    const s = numbersGameReducer(declare(), { type: "TIME_EXPIRED" });
    expect(s.phase).toBe("roundOver");
    expect(s.result?.validation.status).toBe("invalid-empty");
    expect(s.result?.pointsAwarded).toBe(0);
  });

  it("a proving step that reaches the declared value ends the round and scores", () => {
    let s = numbersGameReducer(declare({ declaredValue: 520 }), { type: "TIME_EXPIRED" });
    s = step(s, "a", "+", "b"); // 104, not yet
    expect(s.phase).toBe("proving");
    const t = s.pool.find((x) => x.value === 104)!;
    s = step(s, t.id, "*", "c"); // 520
    expect(s.phase).toBe("roundOver");
    expect(s.result?.validation.status).toBe("exact");
    expect(s.result?.pointsAwarded).toBe(10);
  });

  it("declaring a drawn tile's value is not proven by an unrelated step", () => {
    let s = numbersGameReducer(declare({ declaredValue: 100 }), { type: "TIME_EXPIRED" });
    s = step(s, "b", "+", "c"); // 9; the 100 tile is untouched
    expect(s.phase).toBe("proving");
    s = numbersGameReducer(s, { type: "PROVE_TIMEOUT" });
    expect(s.result?.validation.status).toBe("invalid-unproven");
  });

  it("PROVE_TIMEOUT while proving scores invalid-unproven / 0", () => {
    let s = numbersGameReducer(declare({ declaredValue: 520 }), { type: "TIME_EXPIRED" });
    s = numbersGameReducer(s, { type: "PROVE_TIMEOUT" });
    expect(s.phase).toBe("roundOver");
    expect(s.result?.validation.status).toBe("invalid-unproven");
    expect(s.result?.pointsAwarded).toBe(0);
  });

  it("PROVE_TIMEOUT is ignored outside proving", () => {
    const solving = declare({ declaredValue: 5 });
    expect(numbersGameReducer(solving, { type: "PROVE_TIMEOUT" })).toBe(solving);
    const over = numbersGameReducer(numbersGameReducer(declare({ declaredValue: 5 }), { type: "TIME_EXPIRED" }), { type: "PROVE_TIMEOUT" });
    expect(numbersGameReducer(over, { type: "PROVE_TIMEOUT" })).toBe(over);
  });
});
