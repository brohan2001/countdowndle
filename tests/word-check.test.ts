import { describe, it, expect } from "vitest";
import { checkWord, getAnagramIndex } from "@/lib/letters/wordCheck";

const dict = new Set(["cat", "act", "tack", "stare", "tears", "rates", "aster", "countdown", "abandoned", "unabashedly"]);

describe("checkWord", () => {
  it("normalises case and whitespace and finds anagrams", () => {
    expect(checkWord(dict, "  STARE ")).toEqual({
      status: "checked",
      word: "stare",
      inList: true,
      playable: true,
      tooShort: false,
      tooLong: false,
      anagrams: ["aster", "rates", "tears"],
    });
  });
  it("flags lengths that can't score even when listed", () => {
    expect(checkWord(dict, "cat")).toMatchObject({ inList: true, playable: false, tooShort: true, anagrams: ["act"] });
    expect(checkWord(dict, "unabashedly")).toMatchObject({ inList: true, playable: false, tooLong: true });
  });
  it("reports unlisted words, empty input and non-letters", () => {
    expect(checkWord(dict, "tacks")).toMatchObject({ status: "checked", inList: false, playable: false });
    expect(checkWord(dict, "   ")).toEqual({ status: "empty" });
    expect(checkWord(dict, "can't")).toEqual({ status: "bad-characters", word: "can't" });
  });
  it("builds the anagram index once per dictionary", () => {
    expect(getAnagramIndex(dict)).toBe(getAnagramIndex(dict));
  });
});
