import { describe, it, expect } from "vitest";
import {
  scoreBand,
  formatShare,
  MISSING_EMOJI,
} from "@/lib/daily/share";

describe("scoreBand", () => {
  it("evaluates letters band boundaries correctly", () => {
    expect(scoreBand("letters", -5)).toBe("none");
    expect(scoreBand("letters", 0)).toBe("none");
    expect(scoreBand("letters", 12)).toBe("mid");
    expect(scoreBand("letters", 13)).toBe("high");
    expect(scoreBand("letters", 18)).toBe("max");
    expect(scoreBand("letters", 99)).toBe("max");
  });

  it("evaluates numbers band boundaries correctly", () => {
    expect(scoreBand("numbers", -1)).toBe("none");
    expect(scoreBand("numbers", 0)).toBe("none");
    expect(scoreBand("numbers", 4)).toBe("low");
    expect(scoreBand("numbers", 5)).toBe("mid");
    expect(scoreBand("numbers", 7)).toBe("high");
    expect(scoreBand("numbers", 10)).toBe("max");
    expect(scoreBand("numbers", 20)).toBe("max");
  });

  it("evaluates conundrum band boundaries correctly", () => {
    expect(scoreBand("conundrum", 0)).toBe("none");
    expect(scoreBand("conundrum", 10)).toBe("max");
  });
});

describe("formatShare", () => {
  it("formats full example correctly", () => {
    const result = formatShare("2026-10-09", {
      letters: 18,
      numbers: 7,
      conundrum: 0,
    });
    expect(result).toBe("Countdown Desk 2026-10-09\n🟦🟩⬛");
  });

  it("shows MISSING_EMOJI for partial scores", () => {
    const result = formatShare("2026-10-09", {
      letters: 18,
    });
    expect(result).toBe(`Countdown Desk 2026-10-09\n🟦${MISSING_EMOJI}${MISSING_EMOJI}`);
    expect(result).toBe("Countdown Desk 2026-10-09\n🟦⬜⬜");
  });

  it("shows all missing emoji when no games played", () => {
    const result = formatShare("2026-10-09", {});
    expect(result).toBe("Countdown Desk 2026-10-09\n⬜⬜⬜");
  });

  it("contains no digits other than the date", () => {
    const dateKey = "2026-10-09";
    const result = formatShare(dateKey, {
      letters: 18,
      numbers: 7,
      conundrum: 0,
    });
    const digitsOnly = result.replace(/\D/g, "");
    const dateDigitsOnly = dateKey.replace(/\D/g, "");
    expect(digitsOnly).toBe(dateDigitsOnly);
  });
});
