import { useReducer } from "react";
import {
  LettersGameState,
  LettersGameAction,
  MAX_BOARD_SIZE,
  ROUND_DURATION_SECONDS,
  LettersRoundResult,
  LetterTile,
} from "@/types/letters";
import {
  createInitialBag,
  drawLetter,
  pickRandomFillCounts,
} from "./lettersPool";
import { validateWord } from "./dictionary";
import { scoreWord } from "./scoring";
import { shuffle } from "../shared/random";

export function createInitialState(): LettersGameState {
  // TODO: build the very first state, phase 'idle', empty board,
  // fresh bag, totalScore 0, empty history
  return {
    phase: "idle",
    board: [],
    bag: createInitialBag(),
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

      const { tile: newTile, bag: updatedBag } = drawLetter(
        state.bag,
        action.letterType,
      );
      const updatedBoard = [...state.board, newTile];
      const newPhase =
        updatedBoard.length >= MAX_BOARD_SIZE ? "solving" : "selecting";

      return {
        ...state,
        bag: updatedBag,
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
    case "RESET_ROUND": // TODO
      return {
        ...createInitialState(),
        totalScore: state.totalScore,
        history: state.history,
      };
    case "TICK":
      return state; // intentionally a no-op, per the decision above

    case "RANDOM_FILL": {
      // TODO 1: guard — only legal during 'idle' or 'selecting' (mirror canPickLetter's
      // two phases; if board is already full/solving/roundOver, return state unchanged)
      // TODO 2: derive vowelsSoFar/consonantsSoFar from state.board (same pattern as
      // SELECT_LETTER), and remainingSlots = MAX_BOARD_SIZE - state.board.length
      // TODO 3: const { vowelsToAdd, consonantsToAdd } = pickRandomFillCounts(...)
      // TODO 4: draw that many letters — loop `vowelsToAdd` times calling drawLetter(bag, 'vowel'),
      // then `consonantsToAdd` times for 'consonant'. IMPORTANT: drawLetter returns a NEW bag
      // each call (same reference-vs-value lesson from your very first lettersPool.ts review) —
      // thread the returned bag into the next call, don't reuse the original `state.bag`
      // for every draw or you'll double-count remaining letters.
      // TODO 5: shuffle() the newly drawn tiles (lib/shared/random.ts — your own Fisher-Yates)
      // before appending, so the board doesn't visibly read as "all vowels then all consonants"
      // TODO 6: new board = [...state.board, ...shuffledNewTiles]; phase becomes 'solving'
      // (guaranteed, since remainingSlots always brings the board to exactly 9)

      if (!(state.phase === "idle" || state.phase === "selecting")) {
        return state;
      }
      let remainingBoard: LetterTile[] = [];
      let currentBag = state.bag;
      const vowelsSoFar = state.board.filter((t) => t.type === "vowel").length;
      const consonantsSoFar = state.board.filter(
        (t) => t.type === "consonant",
      ).length;
      const remainingSlots = MAX_BOARD_SIZE - state.board.length;
      const { vowelsToAdd, consonantsToAdd } = pickRandomFillCounts(
        vowelsSoFar,
        consonantsSoFar,
        remainingSlots,
      );

      for (let i = 0; i < vowelsToAdd; i++) {
        const { tile, bag } = drawLetter(currentBag, "vowel");
        remainingBoard.push(tile);
        currentBag = bag;
      }
      for (let j = 0; j < consonantsToAdd; j++) {
        const { tile, bag } = drawLetter(currentBag, "consonant");
        remainingBoard.push(tile);
        currentBag = bag;
      }

      remainingBoard = shuffle(remainingBoard);

      return {
        ...state,
        bag: currentBag,
        board: [...state.board, ...remainingBoard],
        phase: "solving",
      };
    }
    default:
      return state;
  }
}

export function useLettersGame() {
  return useReducer(lettersGameReducer, undefined, createInitialState);
}
