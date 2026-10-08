import { useReducer } from "react";
import {
  LettersGameState,
  LettersGameAction,
  MAX_BOARD_SIZE,
  ROUND_DURATION_SECONDS,
  LettersRoundResult,
  LetterTile,
  LetterType,
} from "@/types/letters";
import {
  createDecks,
  drawFromDecks,
  pickRandomFillCounts,
} from "./lettersPool";
import { validateWord } from "./dictionary";
import { scoreWord } from "./scoring";
import { Rng, shuffle } from "../shared/random";

export function createInitialState(rng: Rng = Math.random): LettersGameState {
  return {
    phase: "idle",
    board: [],
    decks: createDecks(rng),
    timeRemainingSeconds: ROUND_DURATION_SECONDS,
    currentInput: "",
    lastRoundResult: null,
    totalScore: 0,
    history: [],
  };
}

export function lettersGameReducer(
  state: LettersGameState,
  action: LettersGameAction,
): LettersGameState {
  switch (action.type) {
    case "SELECT_LETTER": {
      // TODO
      if (state.board.length >= MAX_BOARD_SIZE) {
        return state;
      }

      const vowelsSoFar = state.board.filter((t) => t.type === "vowel").length;
      const consonantsSoFar = state.board.filter(
        (t) => t.type === "consonant",
      ).length;

      if (action.letterType === "vowel" && vowelsSoFar >= 5) {
        return state;
      }
      if (action.letterType === "consonant" && consonantsSoFar >= 6) {
        return state;
      }

      const drawn = drawFromDecks(
        state.decks,
        action.letterType,
        `tile-${state.board.length}`,
      );
      if (drawn === null) {
        return state;
      }
      const { tile: newTile, decks: updatedDecks } = drawn;
      const updatedBoard = [...state.board, newTile];
      const newPhase =
        updatedBoard.length >= MAX_BOARD_SIZE ? "solving" : "selecting";

      return {
        ...state,
        decks: updatedDecks,
        board: updatedBoard,
        phase: newPhase,
      };
    }
    case "UPDATE_INPUT": {
      // TODO
      return state;
    }
    case "SUBMIT_WORD": {
      // TODO:
      // - guard: if state.phase !== 'solving', return state unchanged
      // - call validateWord(action.word, state.board, action.dictionary)
      // - if validation.status === 'valid', score it with scoreWord(...); otherwise 0 points
      // - build a LettersRoundResult from board/word/validation/points
      // - return new state: phase 'roundOver', set lastRoundResult, add points to totalScore,
      //   append the round result to history
      if (state.phase !== "solving") {
        return state;
      }
      const { status, word } = validateWord(
        action.word,
        state.board,
        action.dictionary,
      );
      const score = status === "valid" ? scoreWord(word) : 0;
      const roundResult: LettersRoundResult = {
        board: state.board,
        submittedWord: word,
        validation: { status, word },
        pointsAwarded: score,
      };
      return {
        ...state,
        phase: "roundOver",
        lastRoundResult: roundResult,
        totalScore: state.totalScore + score,
        history: [...state.history, roundResult],
      };
    }
    case "TIME_EXPIRED": {
      // TODO:
      // - guard: if state.phase !== 'solving', return state unchanged
      // - build a LettersRoundResult: submittedWord null, validation status 'invalid-empty'
      //   (or however you want to represent "nothing submitted"), pointsAwarded 0
      // - return new state: phase 'roundOver', set lastRoundResult, append to history
      //   (totalScore unchanged, since 0 points)
      if (state.phase !== "solving") {
        return state;
      }
      //   const { status, word } = validateWord(
      //     action.word,
      //     state.board,
      //     action.dictionary,
      //   );
      //   const score = status === "valid" ? scoreWord(word) : 0;
      const roundResult: LettersRoundResult = {
        board: state.board,
        submittedWord: null,
        validation: { status: "invalid-empty", word: "" },
        pointsAwarded: 0,
      };
      return {
        ...state,
        phase: "roundOver",
        lastRoundResult: roundResult,
        history: [...state.history, roundResult],
      };
    }
    case "RESET_ROUND":
      return {
        ...createInitialState(action.rng),
        totalScore: state.totalScore,
        history: state.history,
      };
    case "TICK":
      return state; // intentionally a no-op, per the decision above

    case "RANDOM_FILL": {
      if (!(state.phase === "idle" || state.phase === "selecting")) {
        return state;
      }
      const vowelsSoFar = state.board.filter((t) => t.type === "vowel").length;
      const consonantsSoFar = state.board.filter(
        (t) => t.type === "consonant",
      ).length;
      const remainingSlots = MAX_BOARD_SIZE - state.board.length;
      const { vowelsToAdd, consonantsToAdd } = pickRandomFillCounts(
        vowelsSoFar,
        consonantsSoFar,
        remainingSlots,
        action.rng,
      );

      // Draw from the top of each deck, threading the shrinking decks through.
      let decks = state.decks;
      const drawnTiles: LetterTile[] = [];
      const plan: Array<[LetterType, number]> = [
        ["vowel", vowelsToAdd],
        ["consonant", consonantsToAdd],
      ];
      for (const [type, count] of plan) {
        for (let i = 0; i < count; i++) {
          const drawn = drawFromDecks(
            decks,
            type,
            `tile-${state.board.length + drawnTiles.length}`,
          );
          if (drawn === null) return state;
          drawnTiles.push(drawn.tile);
          decks = drawn.decks;
        }
      }

      // Shuffle so the board doesn't read as "all vowels then consonants".
      // Ids stay with their tile, so order on the board is what changes.
      return {
        ...state,
        decks,
        board: [...state.board, ...shuffle(drawnTiles, action.rng)],
        phase: "solving",
      };
    }
    default:
      return state;
  }
}

export function useLettersGame(rng?: Rng) {
  return useReducer(lettersGameReducer, rng, createInitialState);
}
