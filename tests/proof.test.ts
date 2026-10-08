import { describe, it, expect } from "vitest";
import { validateProof } from "@/lib/numbers/proof";
import { cryptoRng } from "@/lib/shared/random";

const drawn = [100, 4, 5, 25, 3, 7];

describe("validateProof", () => {
  it("accepts a legal chain that reaches the declared value", () => {
    expect(validateProof(drawn, [{ a: 100, op: "+", b: 4 }, { a: 104, op: "*", b: 5 }], 520)).toBe(true);
  });
  it("accepts reaching the value at an intermediate step", () => {
    expect(validateProof(drawn, [{ a: 100, op: "+", b: 4 }, { a: 104, op: "*", b: 5 }], 104)).toBe(true);
  });
  it("rejects when the declared value is never produced", () => {
    expect(validateProof(drawn, [{ a: 100, op: "+", b: 4 }], 520)).toBe(false);
  });
  it("a drawn tile equal to the declaration is not a proof", () => {
    expect(validateProof(drawn, [{ a: 4, op: "+", b: 5 }], 100)).toBe(false);
  });
  it("rejects numbers not in the pool, and reuse beyond multiplicity", () => {
    expect(validateProof(drawn, [{ a: 9, op: "+", b: 1 }], 10)).toBe(false);
    expect(validateProof(drawn, [{ a: 4, op: "+", b: 4 }], 8)).toBe(false);
    expect(validateProof([4, 4, 1], [{ a: 4, op: "+", b: 4 }], 8)).toBe(true);
  });
  it("rejects a consumed operand being reused", () => {
    expect(validateProof(drawn, [{ a: 100, op: "+", b: 4 }, { a: 100, op: "+", b: 5 }], 105)).toBe(false);
  });
  it("rejects illegal arithmetic (negative, fraction, zero divisor)", () => {
    expect(validateProof(drawn, [{ a: 3, op: "-", b: 5 }], 2)).toBe(false);
    expect(validateProof(drawn, [{ a: 7, op: "/", b: 5 }], 1)).toBe(false);
  });
  it("rejects malformed input", () => {
    expect(validateProof(drawn, [], 5)).toBe(false);
    expect(validateProof(drawn, [{ a: 1.5, op: "+", b: 2 }] as never, 3)).toBe(false);
    expect(validateProof(drawn, [{ a: 4, op: "^", b: 2 }] as never, 16)).toBe(false);
    expect(validateProof(drawn, null as never, 5)).toBe(false);
    expect(validateProof([1, 2], [{ a: 1, op: "+", b: 1 }, { a: 2, op: "+", b: 2 }], 4)).toBe(false); // too many steps
  });
});

describe("cryptoRng", () => {
  it("yields floats in [0,1) that vary", () => {
    const r = cryptoRng();
    const xs = Array.from({ length: 200 }, r);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(new Set(xs).size).toBeGreaterThan(150);
  });
});
