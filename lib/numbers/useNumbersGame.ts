import { useReducer } from "react";
import {
  NumbersGameState,
  NumbersGameAction,
  NumberTile,
  CalculatorStep,
  NumbersRoundResult,
  NumbersValidationResult,
} from "@/types/numbers";
import { evaluateAnswer, scoreResult } from "./scoring";
import { drawNumbers, pickTarget } from "./numberPool";
import { applyOperator } from "./arithmetic";
import { evaluateExpression } from "./expression";

export function createInitialState(): NumbersGameState {
  return {
    phase: "selecting",
    largeCount: null,
    inputMode: "calculator",
    playMode: "untimed",
    drawnNumbers: [],
    pool: [],
    steps: [],
    target: null,
    pendingOperand1: null,
    pendingOperator: null,
    pendingOperand2: null,
    freeTextExpression: "",
    declaredValue: null,
    result: null,
  };
}

// Long enough for any real Countdown expression; caps parser recursion
// depth well below the stack limit (Fix 2).
const MAX_FREE_TEXT_LENGTH = 100;

// The one shared rule for "can the player currently build a solution":
//   - untimed mode: only while phase === 'solving' (live entry, as before)
//   - declare mode: only while phase === 'proving' (no time pressure once
//     the number is declared — 'solving' in declare mode is JUST for typing
//     a declaration, not for working the tiles)
// Both the reducer's calculator/free-text guards and the page's disabled
// props read this one function, so they can't drift out of sync.
export function canWork(state: NumbersGameState): boolean {
  if (state.playMode === "declare") {
    return state.phase === "proving";
  }
  return state.phase === "solving";
}

function getCandidateValues(state: NumbersGameState): number[] {
  return [
    ...state.drawnNumbers.map((t) => t.value),
    ...state.steps.map((s) => s.resultTile.value),
  ];
}

function requireTarget(state: NumbersGameState): number {
  if (state.target === null) {
    throw new Error("Cannot build round result without an active target");
  }
  return state.target;
}
// Shared by LOCK_DECLARATION and TIME_EXPIRED-while-declaring: if nothing
// was ever declared, the round just ends (same as any empty submission).
// Otherwise the round moves into the untimed 'proving' phase.
function resolveDeclarationPhase(state: NumbersGameState): NumbersGameState {
  if (state.declaredValue === null) {
    return {
      ...state,
      phase: "roundOver",
      result: buildRoundResult(state),
    };
  }

  return {
    ...state,
    phase: "proving",
  };
}

function isDeclarationProven(state: NumbersGameState): boolean {
  const declaredValue = state.declaredValue;
  if (declaredValue === null) {
    return false;
  }

  if (state.inputMode === "calculator") {
    const candidates = getCandidateValues(state);
    return state.steps.length > 0 && candidates.includes(declaredValue);
  }

  const available = state.drawnNumbers.map((t) => t.value);
  const evaluation = evaluateExpression(state.freeTextExpression, available);
  return (
    evaluation.ok &&
    evaluation.usedOperator &&
    evaluation.value === state.declaredValue
  );
}

function buildCalculatorResult(state: NumbersGameState): NumbersRoundResult {
  const target = requireTarget(state);

  const emptyValidation: NumbersValidationResult = {
    status: "invalid-empty",
    achievedValue: null,
    difference: null,
  };

  if (state.steps.length === 0) {
    return {
      target: target,
      drawnNumbers: state.drawnNumbers,
      inputMode: "calculator",
      playMode: state.playMode,
      declaredValue: state.declaredValue,
      validation: emptyValidation,
      pointsAwarded: 0,
      solution: { mode: "calculator", steps: [] },
    };
  }

  const candidates = getCandidateValues(state);

  let bestValue = candidates[0];
  let minDiff = Math.abs(bestValue - target);

  for (const val of candidates) {
    const diff = Math.abs(val - target);
    if (diff < minDiff) {
      minDiff = diff;
      bestValue = val;
    }
  }

  const validation = evaluateAnswer(target, bestValue);
  const pointsAwarded = scoreResult(validation);

  return {
    target: target,
    drawnNumbers: state.drawnNumbers,
    inputMode: "calculator",
    playMode: state.playMode,
    declaredValue: state.declaredValue,
    validation,
    pointsAwarded,
    solution: { mode: "calculator", steps: state.steps },
  };
}

function buildFreeTextResult(state: NumbersGameState): NumbersRoundResult {
  const target = requireTarget(state);

  const expression = state.freeTextExpression.trim();
  const base = {
    target: target,
    drawnNumbers: state.drawnNumbers,
    inputMode: "freeText" as const,
    playMode: state.playMode,
    declaredValue: state.declaredValue,
    solution: {
      mode: "freeText" as const,
      expression: state.freeTextExpression,
    },
  };

  if (expression.length === 0) {
    return {
      ...base,
      validation: {
        status: "invalid-empty",
        achievedValue: null,
        difference: null,
      },
      pointsAwarded: 0,
    };
  }

  const available = state.drawnNumbers.map((t) => t.value);
  const evaluation = evaluateExpression(expression, available);

  if (!evaluation.ok) {
    return {
      ...base,
      validation: {
        status: evaluation.reason,
        achievedValue: null,
        difference: null,
      },
      pointsAwarded: 0,
    };
  }
  if (!evaluation.usedOperator) {
    return {
      ...base,
      validation: {
        status: "invalid-syntax",
        achievedValue: null,
        difference: null,
      },
      pointsAwarded: 0,
    };
  }

  const validation = evaluateAnswer(target, evaluation.value);
  const pointsAwarded = scoreResult(validation);

  return { ...base, validation, pointsAwarded };
}

function buildDeclareResult(state: NumbersGameState): NumbersRoundResult {
  const target = requireTarget(state);

  const base = {
    target: target,
    drawnNumbers: state.drawnNumbers,
    inputMode: state.inputMode,
    playMode: state.playMode,
    declaredValue: state.declaredValue,
    solution:
      state.inputMode === "calculator"
        ? { mode: "calculator" as const, steps: state.steps }
        : { mode: "freeText" as const, expression: state.freeTextExpression },
  };

  if (state.declaredValue === null) {
    return {
      ...base,
      validation: {
        status: "invalid-empty",
        achievedValue: null,
        difference: null,
      },
      pointsAwarded: 0,
    };
  }

  if (!isDeclarationProven(state)) {
    // Decision: show the declared number (not null) here, so the result
    // panel can say "you declared 518" even though the proof fell short.
    return {
      ...base,
      validation: {
        status: "invalid-unproven",
        achievedValue: state.declaredValue,
        difference: Math.abs(state.declaredValue - target),
      },
      pointsAwarded: 0,
    };
  }

  const validation = evaluateAnswer(target, state.declaredValue);
  const pointsAwarded = scoreResult(validation);

  return { ...base, validation, pointsAwarded };
}

function buildRoundResult(state: NumbersGameState): NumbersRoundResult {
  if (state.playMode === "declare") {
    return buildDeclareResult(state);
  }
  return state.inputMode === "calculator"
    ? buildCalculatorResult(state)
    : buildFreeTextResult(state);
}

export function numbersGameReducer(
  state: NumbersGameState,
  action: NumbersGameAction,
): NumbersGameState {
  switch (action.type) {
    case "SET_LARGE_COUNT": {
      if (state.phase !== "selecting") {
        return state;
      }
      return { ...state, largeCount: action.largeCount };
    }

    case "SET_INPUT_MODE": {
      // Stays locked once 'selecting' ends — including during 'proving' — to
      // keep this simple (a mid-proof mode switch would need to decide what
      // happens to in-progress calculator steps vs a typed expression).
      if (state.phase !== "selecting") {
        return state;
      }
      return { ...state, inputMode: action.mode };
    }

    case "SET_PLAY_MODE": {
      if (state.phase !== "selecting") {
        return state;
      }
      return { ...state, playMode: action.mode };
    }

    case "START_SOLVING": {
      if (state.phase === "selecting" && state.largeCount !== null) {
        const drawnNumbers = drawNumbers(state.largeCount);
        const target = pickTarget();

        return {
          ...state,
          phase: "solving",
          drawnNumbers: drawnNumbers,
          pool: [...drawnNumbers],
          target: target,
        };
      }
      return state;
    }

    case "SELECT_OPERAND": {
      if (!canWork(state) || state.inputMode !== "calculator") {
        return state;
      }

      const tile = state.pool.find((t) => t.id === action.tileId);
      if (!tile) {
        return state;
      }

      if (state.pendingOperand1?.id === tile.id) {
        return {
          ...state,
          pendingOperand1: null,
          pendingOperator: null,
          pendingOperand2: null,
        };
      }

      if (state.pendingOperator === null) {
        return { ...state, pendingOperand1: tile };
      }

      if (state.pendingOperand1 === null) {
        return state;
      }

      if (tile.id === state.pendingOperand1.id) {
        return state;
      }

      return { ...state, pendingOperand2: tile };
    }

    case "SELECT_OPERATOR": {
      if (!canWork(state) || state.inputMode !== "calculator") {
        return state;
      }
      if (state.pendingOperand1 !== null) {
        return { ...state, pendingOperator: action.operator };
      }
      return state;
    }

    case "CONFIRM_STEP": {
      const { pendingOperand1, pendingOperator, pendingOperand2 } = state;

      if (
        !canWork(state) ||
        state.inputMode !== "calculator" ||
        pendingOperand1 === null ||
        pendingOperator === null ||
        pendingOperand2 === null
      ) {
        return state;
      }

      const calculatedValue = applyOperator(
        pendingOperand1.value,
        pendingOperator,
        pendingOperand2.value,
      );

      if (calculatedValue === null) {
        return state;
      }

      const newTile: NumberTile = {
        id: crypto.randomUUID(),
        value: calculatedValue,
        isOriginal: false,
      };

      const calculatorStep: CalculatorStep = {
        id: crypto.randomUUID(),
        operand1: pendingOperand1,
        operator: pendingOperator,
        operand2: pendingOperand2,
        resultTile: newTile,
      };

      const newPool = state.pool.filter(
        (tile) =>
          tile.id !== pendingOperand1.id && tile.id !== pendingOperand2.id,
      );

      return {
        ...state,
        pool: [...newPool, newTile],
        steps: [...state.steps, calculatorStep],
        pendingOperand1: null,
        pendingOperator: null,
        pendingOperand2: null,
      };
    }

    case "UNDO_STEP": {
      if (
        !canWork(state) ||
        state.inputMode !== "calculator" ||
        state.steps.length === 0
      ) {
        return state;
      }

      const lastStep = state.steps[state.steps.length - 1];

      const poolWithoutResult = state.pool.filter(
        (tile) => tile.id !== lastStep.resultTile.id,
      );
      const newPool = [
        ...poolWithoutResult,
        lastStep.operand1,
        lastStep.operand2,
      ];

      return {
        ...state,
        pool: newPool,
        steps: state.steps.slice(0, -1),
        pendingOperand1: null,
        pendingOperator: null,
        pendingOperand2: null,
      };
    }

    case "CLEAR_CALCULATOR": {
      if (!canWork(state) || state.inputMode !== "calculator") {
        return state;
      }

      return {
        ...state,
        steps: [],
        pool: [...state.drawnNumbers],
        pendingOperand1: null,
        pendingOperator: null,
        pendingOperand2: null,
      };
    }

    // case "UPDATE_FREE_TEXT": {
    //   if (!canWork(state) || state.inputMode !== "freeText") {
    //     return state;
    //   }
    //   return { ...state, freeTextExpression: action.value };
    // }
    case "UPDATE_FREE_TEXT": {
      if (!canWork(state) || state.inputMode !== "freeText") {
        return state;
      }
      return {
        ...state,
        freeTextExpression: action.value.slice(0, MAX_FREE_TEXT_LENGTH),
      };
    }

    case "SET_DECLARED_VALUE": {
      if (state.phase !== "solving" || state.playMode !== "declare") {
        return state;
      }

      // The reducer is the last line of defence — don't trust the input box.
      // Reject anything that isn't a clean positive integer (NaN, 0,
      // negative, or a decimal like 2.5).
      if (
        action.value !== null &&
        (!Number.isInteger(action.value) || action.value <= 0)
      ) {
        return state;
      }

      return { ...state, declaredValue: action.value };
    }

    case "LOCK_DECLARATION": {
      if (state.phase !== "solving" || state.playMode !== "declare") {
        return state;
      }
      return resolveDeclarationPhase(state);
    }

    case "SUBMIT_ANSWER": {
      // Allowed for untimed 'solving' or declare-mode 'proving'. In declare
      // mode's 'solving' phase canWork is false, so SUBMIT_ANSWER is
      // ignored there — the player uses LOCK_DECLARATION instead.
      if (!canWork(state)) {
        return state;
      }
      return {
        ...state,
        phase: "roundOver",
        result: buildRoundResult(state),
      };
    }

    case "TIME_EXPIRED": {
      // Only meaningful for declare mode's countdown while still 'solving'.
      // Untimed mode has no countdown driving this action at all, and if
      // the phase has already moved on (declaration already locked, round
      // already over), this is a stale timer tick — ignore it either way.
      if (state.phase !== "solving" || state.playMode !== "declare") {
        return state;
      }
      return resolveDeclarationPhase(state);
    }

    case "RESET_ROUND": {
      const freshState = createInitialState();
      return {
        ...freshState,
        inputMode: state.inputMode,
        largeCount: state.largeCount,
        playMode: state.playMode,
      };
    }

    default:
      return state;
  }
}

export function useNumbersGame() {
  return useReducer(numbersGameReducer, undefined, createInitialState);
}
