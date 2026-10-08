import { NumbersOperator } from "@/types/numbers";

export function applyOperator(
  a: number,
  op: NumbersOperator,
  b: number,
): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "*":
      return a * b;
    case "-":
      return a - b <= 0 ? null : a - b;
    case "/":
      return b !== 0 && a % b === 0 ? a / b : null;
  }
}
