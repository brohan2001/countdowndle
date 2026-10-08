import { describe, it, expect } from "vitest";
import { scoreWord } from "@/lib/letters/scoring";
import { validateWord, canBuildFromBoard, parseWordList } from "@/lib/letters/dictionary";
import { LetterTile } from "@/types/letters";

const board = (letters: string): LetterTile[] =>
  [...letters].map((letter, i) => ({ id: String(i), letter, type: "consonant" as const }));

const dict = parseWordList("table\nbleat\nabet\nstable\r\n\n");

describe("scoreWord", () => {
  it("scores length, doubling for a 9-letter word", () => {
    expect(scoreWord("table")).toBe(5);
    expect(scoreWord("abcdefghi")).toBe(18);
  });
});

describe("parseWordList", () => {
  it("trims, drops blanks, handles CRLF", () => {
    expect(dict.size).toBe(4);
    expect(dict.has("stable")).toBe(true);
  });
});

describe("canBuildFromBoard", () => {
  it("respects letter multiplicity and case", () => {
    expect(canBuildFromBoard("table", board("TABLEXYZQ"))).toBe(true);
    expect(canBuildFromBoard("TABLE", board("tablexyzq"))).toBe(true);
    expect(canBuildFromBoard("tabbed", board("TABLEXYZQ"))).toBe(false);
    expect(canBuildFromBoard("ttable", board("TABLEXYZQ"))).toBe(false);
  });
});

describe("validateWord", () => {
  const b = board("STABLEXYZ");
  it("runs checks in order", () => {
    expect(validateWord("  ", b, dict).status).toBe("invalid-empty");
    expect(validateWord("sty", b, dict).status).toBe("invalid-too-short");
    expect(validateWord("quiet", b, dict).status).toBe("invalid-not-on-board");
    expect(validateWord("tabsl", b, dict).status).toBe("invalid-not-a-word");
    expect(validateWord("Table", b, dict).status).toBe("valid");
  });
});
