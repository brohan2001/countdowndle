import { useReducer } from "react";
import {
  ConundrumGameAction,
  ConundrumGameState,
  ConundrumRoundResult,
  CONUNDRUM_POINTS,
  ROUND_DURATION_SECONDS,
} from "@/types/conundrum";

export function createInitialState(): ConundrumGameState {
  return {
    phase: "idle",
    puzzle: null,
    buzzedAtSecondsRemaining: null,
    lastRoundResult: null,
    totalScore: 0,
    history: [],
  };
}

function finishRound(
  state: ConundrumGameState,
  userGuess: string | null,
  isCorrect: boolean,
): ConundrumGameState {
  if (state.puzzle === null) return state;
  const result: ConundrumRoundResult = {
    puzzle: state.puzzle,
    userGuess,
    isCorrect,
    timeTakenSeconds:
      state.buzzedAtSecondsRemaining === null
        ? null
        : ROUND_DURATION_SECONDS - state.buzzedAtSecondsRemaining,
    pointsAwarded: isCorrect ? CONUNDRUM_POINTS : 0,
  };
  return {
    ...state,
    phase: "roundOver",
    lastRoundResult: result,
    totalScore: state.totalScore + result.pointsAwarded,
    history: [...state.history, result],
  };
}

export function conundrumGameReducer(
  state: ConundrumGameState,
  action: ConundrumGameAction,
): ConundrumGameState {
  switch (action.type) {
    case "START_ROUND": {
      if (state.phase !== "idle") return state;
      return { ...state, phase: "solving", puzzle: action.puzzle };
    }

    case "BUZZ": {
      if (state.phase !== "solving") return state;
      const clamped = Math.min(
        ROUND_DURATION_SECONDS,
        Math.max(0, Math.floor(action.secondsRemaining)),
      );
      return { ...state, phase: "buzzed", buzzedAtSecondsRemaining: clamped };
    }

    case "SUBMIT_GUESS": {
      // Solo rules: a wrong buzz scores 0 and ends the round.
      if (state.phase !== "buzzed" || state.puzzle === null) return state;
      const guess = action.guess.trim().toLowerCase();
      return finishRound(state, guess, guess === state.puzzle.solution);
    }

    case "TIME_EXPIRED": {
      // Round clock ran out unbuzzed -> no answer. Answer window ran out
      // after a buzz -> wrong (no guess entered).
      if (state.phase === "solving") return finishRound(state, null, false);
      if (state.phase === "buzzed") return finishRound(state, "", false);
      return state;
    }

    case "RESET_ROUND": {
      return {
        ...createInitialState(),
        totalScore: state.totalScore,
        history: state.history,
      };
    }

    default:
      return state;
  }
}

export function useConundrumGame() {
  return useReducer(conundrumGameReducer, undefined, createInitialState);
}
