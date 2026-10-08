import { describe, it, expect } from "vitest";
import { lettersGameReducer, createInitialState } from "@/lib/letters/useLettersGame";
import { LettersGameState } from "@/types/letters";
import { mulberry32 } from "@/lib/shared/random";

const dict = new Set(["table"]);

function fill(state: LettersGameState, vowels: number, consonants: number) {
  let s = state;
  for (let i = 0; i < vowels; i++) s = lettersGameReducer(s, { type: "SELECT_LETTER", letterType: "vowel" });
  for (let i = 0; i < consonants; i++) s = lettersGameReducer(s, { type: "SELECT_LETTER", letterType: "consonant" });
  return s;
}

describe("letters reducer", () => {
  it("starts idle with an empty board", () => {
    const s = createInitialState();
    expect(s.phase).toBe("idle");
    expect(s.board).toHaveLength(0);
  });
  it("goes selecting → solving on the 9th letter", () => {
    const mid = fill(createInitialState(), 2, 3);
    expect(mid.phase).toBe("selecting");
    expect(mid.board).toHaveLength(5);
    const full = fill(mid, 2, 2);
    expect(full.phase).toBe("solving");
    expect(full.board).toHaveLength(9);
  });
  it("caps vowels at 5 and consonants at 6", () => {
    const s = fill(createInitialState(), 7, 0);
    expect(s.board).toHaveLength(5);
    const c = fill(createInitialState(), 0, 8);
    expect(c.board).toHaveLength(6);
  });
  it("ignores picks once full", () => {
    const full = fill(createInitialState(), 4, 5);
    expect(lettersGameReducer(full, { type: "SELECT_LETTER", letterType: "vowel" })).toBe(full);
  });
  it("draws from the top of the deck without mutating the previous state", () => {
    const s0 = createInitialState();
    const topVowel = s0.decks.vowel[0];
    const vowelCount = s0.decks.vowel.length;
    const s1 = lettersGameReducer(s0, { type: "SELECT_LETTER", letterType: "vowel" });
    expect(s1.board[0].letter).toBe(topVowel);
    expect(s0.decks.vowel).toHaveLength(vowelCount);
    expect(s1.decks.vowel).toHaveLength(vowelCount - 1);
    expect(s1.decks.vowel).toEqual(s0.decks.vowel.slice(1));
    expect(s1.decks.consonant).toBe(s0.decks.consonant);
  });
  it("is reproducible from a seeded rng", () => {
    const a = createInitialState(mulberry32(123));
    const b = createInitialState(mulberry32(123));
    expect(a.decks).toEqual(b.decks);
    expect(createInitialState(mulberry32(124)).decks).not.toEqual(a.decks);
  });
  it("decks hold the real tile-set frequencies", () => {
    const d = createInitialState().decks;
    expect(d.vowel).toHaveLength(67);
    expect(d.consonant).toHaveLength(74);
    expect(d.vowel.filter((l) => l === "E")).toHaveLength(21);
    expect(d.consonant.filter((l) => l === "Q")).toHaveLength(1);
  });
  it("a round can never draw a letter more often than the deck holds", () => {
    // Only one Q exists, so drawing every consonant never yields two.
    let s = createInitialState(mulberry32(5));
    for (let i = 0; i < 6; i++) s = lettersGameReducer(s, { type: "SELECT_LETTER", letterType: "consonant" });
    expect(s.board.filter((t) => t.letter === "Q").length).toBeLessThanOrEqual(1);
  });
  it("RANDOM_FILL draws from the decks and uses unique tile ids", () => {
    const s0 = createInitialState(mulberry32(8));
    const s = lettersGameReducer(s0, { type: "RANDOM_FILL", rng: mulberry32(8) });
    expect(new Set(s.board.map((t) => t.id)).size).toBe(9);
    expect(s.decks.vowel.length + s.decks.consonant.length).toBe(67 + 74 - 9);
    const drawn = s.board.map((t) => t.letter).sort();
    const expected = [
      ...s0.decks.vowel.slice(0, s.board.filter((t) => t.type === "vowel").length),
      ...s0.decks.consonant.slice(0, s.board.filter((t) => t.type === "consonant").length),
    ].sort();
    expect(drawn).toEqual(expected);
  });
  it("RANDOM_FILL always yields a legal 9-tile board", () => {
    for (let i = 0; i < 50; i++) {
      const s = lettersGameReducer(createInitialState(), { type: "RANDOM_FILL" });
      const v = s.board.filter((t) => t.type === "vowel").length;
      expect(s.board).toHaveLength(9);
      expect(s.phase).toBe("solving");
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
  it("SUBMIT_WORD scores a valid word and ends the round", () => {
    const solving: LettersGameState = {
      ...createInitialState(),
      phase: "solving",
      board: [..."TABLEXYZQ"].map((letter, i) => ({ id: String(i), letter, type: "consonant" as const })),
    };
    const done = lettersGameReducer(solving, { type: "SUBMIT_WORD", word: "table", dictionary: dict });
    expect(done.phase).toBe("roundOver");
    expect(done.totalScore).toBe(5);
    expect(done.history).toHaveLength(1);
  });
  it("SUBMIT_WORD is ignored outside solving", () => {
    const s = createInitialState();
    expect(lettersGameReducer(s, { type: "SUBMIT_WORD", word: "table", dictionary: dict })).toBe(s);
  });
  it("TIME_EXPIRED scores 0 and only applies while solving", () => {
    const idle = createInitialState();
    expect(lettersGameReducer(idle, { type: "TIME_EXPIRED" })).toBe(idle);
    const solving = fill(createInitialState(), 4, 5);
    const done = lettersGameReducer(solving, { type: "TIME_EXPIRED" });
    expect(done.phase).toBe("roundOver");
    expect(done.lastRoundResult?.pointsAwarded).toBe(0);
    expect(done.totalScore).toBe(0);
  });
  it("RESET_ROUND keeps score and history", () => {
    const solving = fill(createInitialState(), 4, 5);
    const over = lettersGameReducer(solving, { type: "TIME_EXPIRED" });
    const reset = lettersGameReducer(over, { type: "RESET_ROUND" });
    expect(reset.phase).toBe("idle");
    expect(reset.board).toHaveLength(0);
    expect(reset.history).toHaveLength(1);
    expect(reset.decks.vowel).toHaveLength(67); // fresh decks every round
  });
});
