import { describe, it, expect } from "vitest";
import { conundrumGameReducer as reduce, createInitialState } from "@/lib/conundrum/useConundrumGame";
import { makePuzzle, pickSolution } from "@/lib/conundrum/puzzle";
import { mulberry32 } from "@/lib/shared/random";
import { ConundrumGameState } from "@/types/conundrum";

const puzzle = { scrambled: "nealtbsru", solution: "ratbleuns" };
const solving = (): ConundrumGameState => reduce(createInitialState(), { type: "START_ROUND", puzzle });

describe("conundrum reducer", () => {
  it("START_ROUND only works from idle", () => {
    const s = solving();
    expect(s.phase).toBe("solving");
    expect(reduce(s, { type: "START_ROUND", puzzle })).toBe(s);
  });
  it("BUZZ captures remaining time once, clamped, and only while solving", () => {
    const b = reduce(solving(), { type: "BUZZ", secondsRemaining: 17.9 });
    expect(b.phase).toBe("buzzed");
    expect(b.buzzedAtSecondsRemaining).toBe(17);
    expect(reduce(b, { type: "BUZZ", secondsRemaining: 3 })).toBe(b);
    expect(reduce(solving(), { type: "BUZZ", secondsRemaining: 99 }).buzzedAtSecondsRemaining).toBe(30);
    const idle = createInitialState();
    expect(reduce(idle, { type: "BUZZ", secondsRemaining: 5 })).toBe(idle);
  });
  it("correct answer scores a flat 10 regardless of time left", () => {
    for (const left of [29, 1]) {
      const b = reduce(solving(), { type: "BUZZ", secondsRemaining: left });
      const done = reduce(b, { type: "SUBMIT_GUESS", guess: "  RatbleUns " });
      expect(done.phase).toBe("roundOver");
      expect(done.lastRoundResult?.isCorrect).toBe(true);
      expect(done.lastRoundResult?.pointsAwarded).toBe(10);
      expect(done.lastRoundResult?.timeTakenSeconds).toBe(30 - left);
      expect(done.totalScore).toBe(10);
    }
  });
  it("wrong answer scores 0 and ends the round", () => {
    const b = reduce(solving(), { type: "BUZZ", secondsRemaining: 10 });
    const done = reduce(b, { type: "SUBMIT_GUESS", guess: "nope" });
    expect(done.phase).toBe("roundOver");
    expect(done.lastRoundResult?.isCorrect).toBe(false);
    expect(done.totalScore).toBe(0);
  });
  it("SUBMIT_GUESS is ignored unless buzzed", () => {
    const s = solving();
    expect(reduce(s, { type: "SUBMIT_GUESS", guess: "ratbleuns" })).toBe(s);
  });
  it("TIME_EXPIRED unbuzzed -> no answer; during answer window -> wrong; otherwise ignored", () => {
    const a = reduce(solving(), { type: "TIME_EXPIRED" });
    expect(a.lastRoundResult).toMatchObject({ userGuess: null, isCorrect: false, timeTakenSeconds: null });
    const b = reduce(reduce(solving(), { type: "BUZZ", secondsRemaining: 12 }), { type: "TIME_EXPIRED" });
    expect(b.lastRoundResult?.isCorrect).toBe(false);
    expect(reduce(a, { type: "TIME_EXPIRED" })).toBe(a);
    const idle = createInitialState();
    expect(reduce(idle, { type: "TIME_EXPIRED" })).toBe(idle);
  });
  it("RESET_ROUND keeps score and history", () => {
    const done = reduce(reduce(solving(), { type: "BUZZ", secondsRemaining: 5 }), { type: "SUBMIT_GUESS", guess: "ratbleuns" });
    const r = reduce(done, { type: "RESET_ROUND" });
    expect(r.phase).toBe("idle");
    expect(r.puzzle).toBeNull();
    expect(r.totalScore).toBe(10);
    expect(r.history).toHaveLength(1);
  });
});

describe("puzzle helpers", () => {
  it("are seed-reproducible and never leak the solution as the scramble", () => {
    const sols = ["abductors", "kidnapped", "stalemate"];
    const dict = new Set(sols);
    const a = makePuzzle(pickSolution(sols, mulberry32(4)), dict, mulberry32(9));
    const b = makePuzzle(pickSolution(sols, mulberry32(4)), dict, mulberry32(9));
    expect(a).toEqual(b);
    expect(a.scrambled).not.toBe(a.solution);
    expect([...a.scrambled].sort().join("")).toBe([...a.solution].sort().join(""));
  });
  it("pickSolution rejects an empty list", () => {
    expect(() => pickSolution([])).toThrow();
  });
});
