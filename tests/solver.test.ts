import { describe, it, expect } from "vitest";
import { solveNumbers } from "@/lib/numbers/solver";
import { applyOperator } from "@/lib/numbers/arithmetic";
import { drawNumbers, pickTarget } from "@/lib/numbers/numberPool";
import { mulberry32 } from "@/lib/shared/random";
import { NumberTile, CalculatorStep } from "@/types/numbers";

const tiles = (...v: number[]): NumberTile[] => v.map((value, i) => ({ id: `t${i}`, value, isOriginal: true }));

// Replays a solution the way a player could: each operand must exist in the
// pool, each step must be legal, and the result must be the claimed value.
function replay(drawn: NumberTile[], steps: CalculatorStep[]): number | null {
  let pool = [...drawn];
  let last: number | null = null;
  for (const s of steps) {
    if (!pool.includes(s.operand1) || !pool.includes(s.operand2)) throw new Error("operand not in pool");
    const v = applyOperator(s.operand1.value, s.operator, s.operand2.value);
    if (v === null || v !== s.resultTile.value) throw new Error("illegal step");
    pool = [...pool.filter((t) => t !== s.operand1 && t !== s.operand2), s.resultTile];
    last = v;
  }
  return last;
}

describe("solveNumbers", () => {
  it("finds an exact solution and the steps replay legally", () => {
    const drawn = tiles(100, 4, 5, 25, 3, 7);
    const sol = solveNumbers(drawn, 520);
    expect(sol.difference).toBe(0);
    expect(sol.value).toBe(520);
    expect(replay(drawn, sol.steps)).toBe(520);
  });
  it("prefers fewer steps for a trivial exact target", () => {
    const sol = solveNumbers(tiles(100, 4, 5, 25, 3, 7), 104);
    expect(sol.steps).toHaveLength(1);
  });
  it("returns the closest reachable value when exact is impossible", () => {
    const drawn = tiles(1, 1);
    const sol = solveNumbers(drawn, 5); // only 2 is reachable (1+1); 1-1 and 1/1, 1*1 are illegal/skipped
    expect(sol.value).toBe(2);
    expect(sol.difference).toBe(3);
  });
  it("never returns an illegal solution across many seeded rounds", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = mulberry32(seed);
      const drawn = drawNumbers((seed % 5) as 0 | 1 | 2 | 3 | 4, rng);
      const target = pickTarget(rng);
      const sol = solveNumbers(drawn, target);
      expect(replay(drawn, sol.steps)).toBe(sol.value);
      expect(sol.difference).toBe(Math.abs(sol.value - target));
    }
  });
  it("runs well under the 50ms budget on a typical hard round", () => {
    const drawn = tiles(75, 50, 2, 3, 8, 7);
    const start = performance.now();
    solveNumbers(drawn, 812);
    const ms = performance.now() - start;
    expect(ms).toBeLessThan(50);
  });
  it("stays inside the 50ms worst-case budget on six distinct tiles", () => {
    const start = performance.now();
    solveNumbers(tiles(25, 50, 75, 100, 3, 6), 952);
    solveNumbers(tiles(2, 3, 7, 8, 9, 10), 999);
    expect(performance.now() - start).toBeLessThan(200);
  });
});
