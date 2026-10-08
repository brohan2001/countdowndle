import { describe, it, expect } from "vitest";
import { dailyRng } from "@/lib/daily/seed";
import { dailyConundrumPuzzle, dailyLettersBoard, dailyNumbersPuzzle } from "@/lib/daily/puzzles";
import { lettersGameReducer, createInitialState as lettersInit } from "@/lib/letters/useLettersGame";
import { numbersGameReducer, createInitialState as numbersInit } from "@/lib/numbers/useNumbersGame";

describe("daily determinism", () => {
  it("same day -> same puzzles; different day -> different", () => {
    expect(dailyLettersBoard("2026-10-09")).toEqual(dailyLettersBoard("2026-10-09"));
    expect(dailyNumbersPuzzle("2026-10-09")).toEqual(dailyNumbersPuzzle("2026-10-09"));
    expect(dailyLettersBoard("2026-10-09")).not.toEqual(dailyLettersBoard("2026-10-10"));
    expect(dailyNumbersPuzzle("2026-10-09")).not.toEqual(dailyNumbersPuzzle("2026-10-10"));
  });
  it("each game has its own stream", () => {
    expect(dailyRng("2026-10-09", "letters")()).not.toBe(dailyRng("2026-10-09", "numbers")());
  });
  it("letters board is a legal 9-tile board for many days", () => {
    for (let d = 1; d <= 28; d++) {
      const board = dailyLettersBoard(`2026-02-${String(d).padStart(2, "0")}`);
      const vowels = board.filter((t) => t.type === "vowel").length;
      expect(board).toHaveLength(9);
      expect(vowels).toBeGreaterThanOrEqual(3);
      expect(vowels).toBeLessThanOrEqual(5);
      expect(new Set(board.map((t) => t.id)).size).toBe(9);
    }
  });
  it("numbers puzzle has 6 tiles, correct large count, target 100-999", () => {
    for (let d = 1; d <= 28; d++) {
      const p = dailyNumbersPuzzle(`2026-02-${String(d).padStart(2, "0")}`);
      expect(p.drawnNumbers).toHaveLength(6);
      expect(p.drawnNumbers.filter((t) => [25, 50, 75, 100].includes(t.value))).toHaveLength(p.largeCount);
      expect(p.target).toBeGreaterThanOrEqual(100);
      expect(p.target).toBeLessThanOrEqual(999);
    }
  });
  it("conundrum puzzle is deterministic and a true anagram", () => {
    const sols = ["abductors", "kidnapped", "stalemate", "countdown"];
    const dict = new Set(sols);
    const a = dailyConundrumPuzzle("2026-10-09", sols, dict);
    expect(a).toEqual(dailyConundrumPuzzle("2026-10-09", sols, dict));
    expect([...a.scrambled].sort().join("")).toBe([...a.solution].sort().join(""));
    expect(a.scrambled).not.toBe(a.solution);
  });
});

describe("preset-loading actions", () => {
  it("LOAD_BOARD starts a letters round on the preset board (idle only)", () => {
    const board = dailyLettersBoard("2026-10-09");
    const s = lettersGameReducer(lettersInit(), { type: "LOAD_BOARD", board });
    expect(s.phase).toBe("solving");
    expect(s.board).toEqual(board);
    expect(lettersGameReducer(s, { type: "LOAD_BOARD", board })).toBe(s);
    const idle = lettersInit();
    expect(lettersGameReducer(idle, { type: "LOAD_BOARD", board: board.slice(0, 5) })).toBe(idle);
  });
  it("LOAD_PUZZLE starts a numbers round with the preset (selecting only)", () => {
    const p = dailyNumbersPuzzle("2026-10-09");
    const s = numbersGameReducer(numbersInit(), { type: "LOAD_PUZZLE", ...p });
    expect(s.phase).toBe("solving");
    expect(s.target).toBe(p.target);
    expect(s.pool).toEqual(p.drawnNumbers);
    expect(numbersGameReducer(s, { type: "LOAD_PUZZLE", ...p })).toBe(s);
  });
});
