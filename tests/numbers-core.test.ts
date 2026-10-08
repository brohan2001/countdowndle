import { describe, it, expect } from "vitest";
import { applyOperator } from "@/lib/numbers/arithmetic";
import { evaluateExpression } from "@/lib/numbers/expression";
import { evaluateAnswer, scoreResult } from "@/lib/numbers/scoring";

describe("applyOperator", () => {
  it("adds and multiplies", () => {
    expect(applyOperator(3, "+", 4)).toBe(7);
    expect(applyOperator(3, "*", 4)).toBe(12);
  });
  it("rejects zero or negative subtraction", () => {
    expect(applyOperator(5, "-", 3)).toBe(2);
    expect(applyOperator(3, "-", 5)).toBeNull();
    expect(applyOperator(5, "-", 5)).toBeNull();
  });
  it("requires exact division", () => {
    expect(applyOperator(10, "/", 5)).toBe(2);
    expect(applyOperator(10, "/", 3)).toBeNull();
    expect(applyOperator(10, "/", 0)).toBeNull();
  });
});

describe("evaluateExpression", () => {
  const tiles = [100, 4, 5, 25, 3, 7];
  it("respects precedence and parentheses", () => {
    expect(evaluateExpression("100 + 4 * 5", tiles)).toEqual({ ok: true, value: 120, usedOperator: true });
    expect(evaluateExpression("(100 + 4) * 5", tiles)).toEqual({ ok: true, value: 520, usedOperator: true });
  });
  it("accepts pretty operator symbols", () => {
    const r = evaluateExpression("100 − 4 × 5", tiles);
    expect(r).toMatchObject({ ok: true, value: 80 });
  });
  it("flags a bare number as no operator used", () => {
    expect(evaluateExpression("100", tiles)).toEqual({ ok: true, value: 100, usedOperator: false });
  });
  it("reports syntax errors", () => {
    for (const bad of ["", "5 5 +", "(5", "5)", "2.5 + 1", "abc"]) {
      expect(evaluateExpression(bad, tiles)).toEqual({ ok: false, reason: "invalid-syntax" });
    }
  });
  it("reports fractions and negatives", () => {
    expect(evaluateExpression("7 / 5", tiles)).toEqual({ ok: false, reason: "invalid-fraction" });
    expect(evaluateExpression("3 - 5", tiles)).toEqual({ ok: false, reason: "invalid-negative" });
  });
  it("enforces tile multiplicity", () => {
    expect(evaluateExpression("4 + 4", tiles)).toEqual({ ok: false, reason: "invalid-tile-reuse" });
    expect(evaluateExpression("4 + 4", [4, 4])).toMatchObject({ ok: true, value: 8 });
    expect(evaluateExpression("9 + 1", tiles)).toEqual({ ok: false, reason: "invalid-tile-reuse" });
  });
});

describe("numbers scoring", () => {
  it("bands by distance", () => {
    expect(evaluateAnswer(500, 500).status).toBe("exact");
    expect(evaluateAnswer(500, 495).status).toBe("close-1-to-5");
    expect(evaluateAnswer(500, 506).status).toBe("close-6-to-10");
    expect(evaluateAnswer(500, 511).status).toBe("valid-further-off");
  });
  it("awards 10/7/5/0", () => {
    expect(scoreResult(evaluateAnswer(500, 500))).toBe(10);
    expect(scoreResult(evaluateAnswer(500, 503))).toBe(7);
    expect(scoreResult(evaluateAnswer(500, 508))).toBe(5);
    expect(scoreResult(evaluateAnswer(500, 600))).toBe(0);
    expect(scoreResult({ status: "invalid-empty", achievedValue: null, difference: null })).toBe(0);
  });
});
