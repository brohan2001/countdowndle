import { NumbersOperator } from "@/types/numbers";
import { applyOperator } from "./arithmetic";

export interface ProofStep {
  a: number;
  op: NumbersOperator;
  b: number;
}

const OPERATORS: readonly string[] = ["+", "-", "*", "/"];

// Server-side check of a declare-mode proof. The proof is a list of
// calculator steps over VALUES (not client tile ids): each step must combine
// two numbers currently in the pool, using the same legality rule as the
// calculator, and some step must produce the declared value. Mirrors the
// client reducer, so the server never trusts client-side claims.
export function validateProof(
  drawn: readonly number[],
  steps: readonly ProofStep[],
  declared: number,
): boolean {
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > drawn.length - 1) {
    return false;
  }
  const pool = [...drawn];
  let reached = false;

  for (const step of steps) {
    if (
      !step ||
      !Number.isInteger(step.a) ||
      !Number.isInteger(step.b) ||
      !OPERATORS.includes(step.op)
    ) {
      return false;
    }
    const ia = pool.indexOf(step.a);
    if (ia === -1) return false;
    pool.splice(ia, 1);
    const ib = pool.indexOf(step.b);
    if (ib === -1) return false;
    pool.splice(ib, 1);

    const result = applyOperator(step.a, step.op, step.b);
    if (result === null) return false;
    pool.push(result);
    if (result === declared) reached = true;
  }
  return reached;
}
