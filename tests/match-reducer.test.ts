import { describe, it, expect } from "vitest";
import { createMatchState, matchReducer as reduce } from "@/lib/match/matchReducer";
import { MatchAction, MatchState } from "@/lib/match/types";

const run = (s: MatchState, ...actions: MatchAction[]) => actions.reduce(reduce, s);
const lobby = () => run(createMatchState(), { type: "JOIN", player: "A" }, { type: "JOIN", player: "B" });
const started = (target = 500) => run(lobby(), { type: "START", numbersTarget: target });

describe("lobby", () => {
  it("accepts two distinct players only, and START needs both", () => {
    const one = run(createMatchState(), { type: "JOIN", player: "A" });
    expect(reduce(one, { type: "START", numbersTarget: 500 })).toBe(one);
    expect(reduce(one, { type: "JOIN", player: "A" })).toBe(one);
    const two = run(one, { type: "JOIN", player: "B" });
    expect(reduce(two, { type: "JOIN", player: "C" })).toBe(two);
    expect(started().phase).toBe("playing");
  });
  it("actions are ignored before the match starts", () => {
    const l = lobby();
    expect(reduce(l, { type: "LETTERS_SUBMIT", player: "A", points: 5 })).toBe(l);
    expect(reduce(l, { type: "TIME_EXPIRED" })).toBe(l);
  });
});

describe("letters round", () => {
  it("picker is the first player; reveals when both submit; one submission each", () => {
    let s = started();
    expect(s.round).toMatchObject({ kind: "letters", picker: "A" });
    s = run(s, { type: "LETTERS_SUBMIT", player: "A", points: 6 });
    expect(s.phase).toBe("playing");
    expect(reduce(s, { type: "LETTERS_SUBMIT", player: "A", points: 99 })).toBe(s);
    s = run(s, { type: "LETTERS_SUBMIT", player: "B", points: 4 });
    expect(s.phase).toBe("reveal");
    expect(s.scores).toEqual({ A: 6, B: 4 });
    expect(s.history).toEqual([{ kind: "letters", points: { A: 6, B: 4 } }]);
  });
  it("TIME_EXPIRED reveals with missing players scoring 0; non-players ignored", () => {
    let s = started();
    expect(reduce(s, { type: "LETTERS_SUBMIT", player: "Z", points: 9 })).toBe(s);
    s = run(s, { type: "LETTERS_SUBMIT", player: "B", points: 3 }, { type: "TIME_EXPIRED" });
    expect(s.phase).toBe("reveal");
    expect(s.scores).toEqual({ A: 0, B: 3 });
  });
});

const toNumbers = (target = 500) =>
  run(started(target), { type: "TIME_EXPIRED" }, { type: "NEXT_ROUND", numbersTarget: target });

describe("numbers duel (declare/prove)", () => {
  it("declarations update while declaring; nobody declared -> reveal at 0", () => {
    let s = toNumbers();
    expect(s.round).toMatchObject({ kind: "numbers", stage: "declaring" });
    s = run(s, { type: "NUMBERS_DECLARE", player: "A", value: 450 }, { type: "NUMBERS_DECLARE", player: "A", value: 498 });
    expect((s.round as { declarations: Record<string, number> }).declarations.A).toBe(498);
    expect(reduce(s, { type: "NUMBERS_DECLARE", player: "A", value: 0 })).toBe(s);
    expect(reduce(s, { type: "NUMBERS_DECLARE", player: "A", value: 2.5 })).toBe(s);
    expect(run(toNumbers(), { type: "TIME_EXPIRED" }).phase).toBe("reveal");
  });
  it("closest declaration proves first; a successful proof scores and ends the round", () => {
    let s = run(toNumbers(), { type: "NUMBERS_DECLARE", player: "A", value: 490 }, { type: "NUMBERS_DECLARE", player: "B", value: 498 }, { type: "TIME_EXPIRED" });
    expect(s.round).toMatchObject({ stage: "proving", order: ["B", "A"], proofIndex: 0 });
    expect(reduce(s, { type: "NUMBERS_PROOF", player: "A", proven: true })).toBe(s); // not A's turn
    s = run(s, { type: "NUMBERS_PROOF", player: "B", proven: true });
    expect(s.phase).toBe("reveal");
    expect(s.scores).toEqual({ A: 0, B: 7 }); // 2 away -> 7 pts; A never proved
  });
  it("a failed proof passes the turn to the other player", () => {
    let s = run(toNumbers(), { type: "NUMBERS_DECLARE", player: "A", value: 490 }, { type: "NUMBERS_DECLARE", player: "B", value: 498 }, { type: "TIME_EXPIRED" });
    s = run(s, { type: "NUMBERS_PROOF", player: "B", proven: false });
    expect(s.phase).toBe("playing");
    s = run(s, { type: "NUMBERS_PROOF", player: "A", proven: true });
    expect(s.scores).toEqual({ A: 5, B: 0 }); // 10 away -> 5
  });
  it("a proven far-off declaration (0 pts) still ends proving", () => {
    let s = run(toNumbers(), { type: "NUMBERS_DECLARE", player: "A", value: 300 }, { type: "NUMBERS_DECLARE", player: "B", value: 100 }, { type: "TIME_EXPIRED" });
    s = run(s, { type: "NUMBERS_PROOF", player: "A", proven: true });
    expect(s.phase).toBe("reveal");
    expect(s.scores).toEqual({ A: 0, B: 0 });
  });
  it("players tied on distance both get to prove", () => {
    let s = run(toNumbers(), { type: "NUMBERS_DECLARE", player: "A", value: 497 }, { type: "NUMBERS_DECLARE", player: "B", value: 503 }, { type: "TIME_EXPIRED" });
    s = run(s, { type: "NUMBERS_PROOF", player: "A", proven: true });
    expect(s.phase).toBe("playing");
    s = run(s, { type: "NUMBERS_PROOF", player: "B", proven: true });
    expect(s.phase).toBe("reveal");
    expect(s.scores).toEqual({ A: 7, B: 7 });
  });
  it("proof timeout (TIME_EXPIRED while proving) fails the current prover", () => {
    let s = run(toNumbers(), { type: "NUMBERS_DECLARE", player: "A", value: 500 }, { type: "TIME_EXPIRED" });
    s = run(s, { type: "TIME_EXPIRED" });
    expect(s.phase).toBe("reveal");
    expect(s.scores).toEqual({ A: 0, B: 0 });
  });
  it("declarations are locked once proving starts", () => {
    const s = run(toNumbers(), { type: "NUMBERS_DECLARE", player: "A", value: 500 }, { type: "TIME_EXPIRED" });
    expect(reduce(s, { type: "NUMBERS_DECLARE", player: "A", value: 499 })).toBe(s);
  });
});

const toConundrum = () => {
  let s = started();
  s = run(s, { type: "TIME_EXPIRED" }, { type: "NEXT_ROUND", numbersTarget: 500 });
  s = run(s, { type: "TIME_EXPIRED" }, { type: "NEXT_ROUND", numbersTarget: 500 });
  return s;
};

describe("conundrum duel", () => {
  it("first buzz wins the floor; a late buzz is ignored", () => {
    const s = run(toConundrum(), { type: "CONUNDRUM_BUZZ", player: "B" });
    expect((s.round as { buzzedBy: string }).buzzedBy).toBe("B");
    expect(reduce(s, { type: "CONUNDRUM_BUZZ", player: "A" })).toBe(s);
    expect(reduce(s, { type: "CONUNDRUM_ANSWER", player: "A", correct: true })).toBe(s);
  });
  it("correct answer scores a flat 10 and reveals", () => {
    const s = run(toConundrum(), { type: "CONUNDRUM_BUZZ", player: "A" }, { type: "CONUNDRUM_ANSWER", player: "A", correct: true });
    expect(s.phase).toBe("reveal");
    expect(s.scores).toEqual({ A: 10, B: 0 });
  });
  it("wrong answer locks that player out; the opponent gets the rest of the time", () => {
    let s = run(toConundrum(), { type: "CONUNDRUM_BUZZ", player: "A" }, { type: "CONUNDRUM_ANSWER", player: "A", correct: false });
    expect(s.phase).toBe("playing");
    expect(reduce(s, { type: "CONUNDRUM_BUZZ", player: "A" })).toBe(s); // locked out
    s = run(s, { type: "CONUNDRUM_BUZZ", player: "B" }, { type: "CONUNDRUM_ANSWER", player: "B", correct: true });
    expect(s.scores).toEqual({ A: 0, B: 10 });
  });
  it("both wrong, or time out, reveals with no points", () => {
    const bothWrong = run(toConundrum(), { type: "CONUNDRUM_BUZZ", player: "A" }, { type: "CONUNDRUM_ANSWER", player: "A", correct: false }, { type: "CONUNDRUM_BUZZ", player: "B" }, { type: "CONUNDRUM_ANSWER", player: "B", correct: false });
    expect(bothWrong.phase).toBe("reveal");
    expect(bothWrong.scores).toEqual({ A: 0, B: 0 });
    expect(run(toConundrum(), { type: "TIME_EXPIRED" }).phase).toBe("reveal");
  });
});

describe("full match", () => {
  it("goes lobby -> 3 rounds -> final with the right winner", () => {
    let s = started();
    s = run(s, { type: "LETTERS_SUBMIT", player: "A", points: 7 }, { type: "LETTERS_SUBMIT", player: "B", points: 5 }, { type: "NEXT_ROUND", numbersTarget: 500 });
    s = run(s, { type: "NUMBERS_DECLARE", player: "B", value: 500 }, { type: "TIME_EXPIRED" }, { type: "NUMBERS_PROOF", player: "B", proven: true }, { type: "NEXT_ROUND", numbersTarget: 500 });
    s = run(s, { type: "CONUNDRUM_BUZZ", player: "A" }, { type: "CONUNDRUM_ANSWER", player: "A", correct: true }, { type: "NEXT_ROUND", numbersTarget: 0 });
    expect(s.phase).toBe("final");
    expect(s.scores).toEqual({ A: 17, B: 15 });
    expect(s.winner).toBe("A");
    expect(s.history.map((h) => h.kind)).toEqual(["letters", "numbers", "conundrum"]);
  });
  it("declares a draw on equal scores and ignores everything after final", () => {
    let s = started();
    s = run(s, { type: "TIME_EXPIRED" }, { type: "NEXT_ROUND", numbersTarget: 5 }, { type: "TIME_EXPIRED" }, { type: "NEXT_ROUND", numbersTarget: 5 }, { type: "TIME_EXPIRED" }, { type: "NEXT_ROUND", numbersTarget: 5 });
    expect(s.winner).toBe("draw");
    expect(reduce(s, { type: "TIME_EXPIRED" })).toBe(s);
    expect(reduce(s, { type: "NEXT_ROUND", numbersTarget: 5 })).toBe(s);
  });
  it("NEXT_ROUND is only legal from reveal", () => {
    const s = started();
    expect(reduce(s, { type: "NEXT_ROUND", numbersTarget: 500 })).toBe(s);
  });
  it("does not mutate previous states", () => {
    const s = started();
    const snapshot = JSON.stringify(s);
    run(s, { type: "LETTERS_SUBMIT", player: "A", points: 5 }, { type: "TIME_EXPIRED" });
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe("resign", () => {
  it("ends the match mid-round with the opponent winning, whatever the score", () => {
    let s = run(started(), { type: "LETTERS_SUBMIT", player: "A", points: 8 }, { type: "LETTERS_SUBMIT", player: "B", points: 0 });
    s = run(s, { type: "NEXT_ROUND", numbersTarget: 500 }, { type: "RESIGN", player: "B" });
    expect(s).toMatchObject({ phase: "final", round: null, winner: "A", resignedBy: "B" });
    expect(s.scores).toEqual({ A: 8, B: 0 });
    const leader = run(started(), { type: "LETTERS_SUBMIT", player: "A", points: 8 }, { type: "TIME_EXPIRED" }, { type: "RESIGN", player: "A" });
    expect(leader).toMatchObject({ phase: "final", winner: "B", resignedBy: "A" });
  });
  it("is ignored in the lobby, after the end, and from non-players", () => {
    const l = lobby();
    expect(reduce(l, { type: "RESIGN", player: "A" })).toBe(l);
    const s = started();
    expect(reduce(s, { type: "RESIGN", player: "Z" })).toBe(s);
    const over = run(s, { type: "RESIGN", player: "A" });
    expect(reduce(over, { type: "RESIGN", player: "B" })).toBe(over);
  });
});
