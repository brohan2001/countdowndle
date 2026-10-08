import { CalculatorStep, NumberTile, NumbersOperator } from "@/types/numbers";
import { applyOperator } from "./arithmetic";

export interface NumbersSolution {
  value: number; // the closest reachable value to the target
  difference: number;
  steps: CalculatorStep[]; // empty only if no step is possible (fewer than 2 tiles)
}

// Exhaustive search over the drawn tiles. Every state is a multiset of tiles;
// a move picks an unordered pair and one operator, replaces the pair with the
// result, and recurses. Legality comes from applyOperator, the same rule the
// calculator and the free-text parser use, so the solver can never "find"
// something a player couldn't enter.
//
// Pruning:
//  - stop on an exact hit;
//  - + and × are commutative, so each unordered pair is tried once, with the
//    larger operand first (which - and / require anyway);
//  - × 1 and ÷ 1 never change a value, so they are skipped;
//  - states are memoized by their sorted values, since the same multiset
//    reached by a different path can reach exactly the same results.
const OPERATORS: NumbersOperator[] = ["+", "-", "*", "/"];

export function solveNumbers(
  drawn: NumberTile[],
  target: number,
): NumbersSolution {
  let best: NumbersSolution | null = null;
  const visited = new Set<string>();
  let nextId = 0;

  const consider = (value: number, steps: CalculatorStep[]) => {
    const difference = Math.abs(value - target);
    if (
      best === null ||
      difference < best.difference ||
      (difference === best.difference && steps.length < best.steps.length)
    ) {
      best = { value, difference, steps };
    }
  };

  const search = (pool: NumberTile[], steps: CalculatorStep[]): boolean => {
    const key = pool
      .map((t) => t.value)
      .sort((a, b) => a - b)
      .join(",");
    if (visited.has(key)) return false;
    visited.add(key);

    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const [big, small] =
          pool[i].value >= pool[j].value ? [pool[i], pool[j]] : [pool[j], pool[i]];

        for (const operator of OPERATORS) {
          if ((operator === "*" || operator === "/") && small.value === 1) {
            continue;
          }
          const value = applyOperator(big.value, operator, small.value);
          if (value === null) continue;

          const resultTile: NumberTile = {
            id: `solver-${nextId++}`,
            value,
            isOriginal: false,
          };
          const step: CalculatorStep = {
            id: `solver-step-${nextId++}`,
            operand1: big,
            operator,
            operand2: small,
            resultTile,
          };
          const nextSteps = [...steps, step];
          consider(value, nextSteps);
          if (value === target) return true;

          const nextPool = pool.filter((t) => t !== big && t !== small);
          nextPool.push(resultTile);
          if (nextPool.length > 1 && search(nextPool, nextSteps)) return true;
        }
      }
    }
    return false;
  };

  search(drawn, []);

  return (
    best ?? {
      value: drawn[0]?.value ?? 0,
      difference: Math.abs((drawn[0]?.value ?? 0) - target),
      steps: [],
    }
  );
}
