import { NumbersOperator, NumbersValidationStatus } from "@/types/numbers";
import { applyOperator } from "./arithmetic";

// Free-text answers: the player types something like "(100 + 4) * 5 - 25".
// This file turns that string into a value, or into the specific reason it's
// invalid — WITHOUT ever using eval() or new Function() on player input.
// Besides the security risk of running arbitrary code from a text box,
// eval() would also happily accept decimals, negative literals, and reusing
// the same number an unlimited number of times — none of which Countdown
// permits. A small hand-written parser lets us enforce every rule ourselves.
//
// Grammar (standard precedence, "expression" lowest, "factor" highest):
//   expression -> term (("+" | "-") term)*
//   term       -> factor (("*" | "/") factor)*
//   factor     -> NUMBER | "(" expression ")"
//
// Each binary step reuses applyOperator from arithmetic.ts — the same
// function the calculator uses — so a fraction or a negative/zero result is
// rejected identically in both input modes. We tell a negative result apart
// from a fraction purely by which operator (- or /) was the one that
// returned null.

export type ExpressionInvalidReason =
  | "invalid-syntax"
  | "invalid-fraction"
  | "invalid-negative"
  | "invalid-tile-reuse";

const OPERATOR_ALIASES: Record<string, string> = {
  "×": "*",
  x: "*",
  X: "*",
  "÷": "/",
  "−": "-", // U+2212 MINUS SIGN, distinct from the ASCII hyphen
};

function normalizeOperators(expression: string): string {
  return expression.replace(/[×xX÷−]/g, (char) => OPERATOR_ALIASES[char]);
}

export type ExpressionEvaluation =
  | { ok: true; value: number; usedOperator: boolean }
  | { ok: false; reason: ExpressionInvalidReason };

interface Token {
  kind: "number" | "operator" | "lparen" | "rparen";
  value: string;
}

function tokenize(expression: string): Token[] | null {
  const tokens: Token[] = [];
  // const s = expression.trim();
  const s = normalizeOperators(expression).trim();
  let i = 0;

  while (i < s.length) {
    const char = s[i];

    if (char === " " || char === "\t") {
      i++;
      continue;
    }

    if (char === "(") {
      tokens.push({ kind: "lparen", value: char });
      i++;
      continue;
    }

    if (char === ")") {
      tokens.push({ kind: "rparen", value: char });
      i++;
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ kind: "operator", value: char });
      i++;
      continue;
    }

    if (char >= "0" && char <= "9") {
      let numStr = "";
      while (i < s.length && s[i] >= "0" && s[i] <= "9") {
        numStr += s[i];
        i++;
      }
      tokens.push({ kind: "number", value: numStr });
      continue;
    }

    // Anything else — a letter, a decimal point, a stray symbol — is a
    // syntax error. No decimals and no negative literals are intentional:
    // Countdown doesn't allow either.
    return null;
  }

  return tokens;
}

// Recursive-descent parser: each method handles one level of the grammar
// above and calls the next level down for its operands.
class Parser {
  private position = 0;
  private usedNumbers: number[] = [];
  private operatorUsed = false;

  constructor(private tokens: Token[]) {}

  private peek(): Token | null {
    return this.tokens[this.position] ?? null;
  }

  private consume(): Token | null {
    const token = this.peek();
    this.position++;
    return token;
  }

  parseExpression(): number | ExpressionInvalidReason {
    const first = this.parseTerm();
    if (typeof first !== "number") return first;

    let value = first;

    while (
      this.peek()?.kind === "operator" &&
      (this.peek()!.value === "+" || this.peek()!.value === "-")
    ) {
      const operator = this.consume()!.value as NumbersOperator;
      this.operatorUsed = true;
      const rhs = this.parseTerm();
      if (typeof rhs !== "number") return rhs;

      const combined = applyOperator(value, operator, rhs);
      if (combined === null) {
        // return operator === "-" ? "invalid-negative" : "invalid-fraction";
        return "invalid-negative";
      }
      value = combined;
    }

    return value;
  }

  private parseTerm(): number | ExpressionInvalidReason {
    const first = this.parseFactor();
    if (typeof first !== "number") return first;

    let value = first;

    while (
      this.peek()?.kind === "operator" &&
      (this.peek()!.value === "*" || this.peek()!.value === "/")
    ) {
      const operator = this.consume()!.value as NumbersOperator;
      this.operatorUsed = true;
      const rhs = this.parseFactor();
      if (typeof rhs !== "number") return rhs;

      const combined = applyOperator(value, operator, rhs);
      if (combined === null) {
        // return operator === "-" ? "invalid-negative" : "invalid-fraction";
        return "invalid-fraction";
      }
      value = combined;
    }

    return value;
  }

  private parseFactor(): number | ExpressionInvalidReason {
    const token = this.peek();
    if (!token) {
      return "invalid-syntax";
    }

    if (token.kind === "lparen") {
      this.consume();
      const inner = this.parseExpression();
      if (typeof inner !== "number") return inner;

      const closing = this.consume();
      if (!closing || closing.kind !== "rparen") {
        return "invalid-syntax";
      }
      return inner;
    }

    if (token.kind === "number") {
      this.consume();
      const value = Number(token.value);
      this.usedNumbers.push(value);
      return value;
    }

    return "invalid-syntax";
  }

  getUsedNumbers(): number[] {
    return this.usedNumbers;
  }

  isAtEnd(): boolean {
    return this.position >= this.tokens.length;
  }

  hasUsedOperator(): boolean {
    return this.operatorUsed;
  }
}

// Checks that every number the player typed actually came from the drawn
// tiles, respecting multiplicities (two drawn 75s means "75" can appear
// twice, not more).
function usesOnlyAvailableNumbers(
  usedNumbers: number[],
  availableNumbers: number[],
): boolean {
  const remaining = [...availableNumbers];

  for (const used of usedNumbers) {
    const index = remaining.indexOf(used);
    if (index === -1) {
      return false;
    }
    remaining.splice(index, 1);
  }

  return true;
}

export function evaluateExpression(
  expression: string,
  availableNumbers: number[],
): ExpressionEvaluation {
  const tokens = tokenize(expression);
  if (tokens === null || tokens.length === 0) {
    return { ok: false, reason: "invalid-syntax" };
  }

  const parser = new Parser(tokens);
  const result = parser.parseExpression();

  if (typeof result !== "number") {
    return { ok: false, reason: result };
  }

  if (!parser.isAtEnd()) {
    // Leftover tokens after a complete expression, e.g. "5 5 +" or "5)".
    return { ok: false, reason: "invalid-syntax" };
  }

  if (!usesOnlyAvailableNumbers(parser.getUsedNumbers(), availableNumbers)) {
    return { ok: false, reason: "invalid-tile-reuse" };
  }

  return { ok: true, value: result, usedOperator: parser.hasUsedOperator() };
}
