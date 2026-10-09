export type DailyGame = "letters" | "numbers" | "conundrum";
export type DailyScores = Partial<Record<DailyGame, number>>;

export const DAILY_MAX_POINTS: Record<DailyGame, number> = {
  letters: 18,
  numbers: 10,
  conundrum: 10,
};

export type ScoreBand = "none" | "low" | "mid" | "high" | "max";

export function scoreBand(game: DailyGame, points: number): ScoreBand {
  if (points <= 0) {
    return "none";
  }
  const max = DAILY_MAX_POINTS[game];
  const ratio = points / max;
  if (ratio >= 1) {
    return "max";
  }
  if (ratio >= 0.7) {
    return "high";
  }
  // Strictly above 0.4: exactly 4/10 on Numbers is "low", 5/10 is "mid".
  if (ratio > 0.4) {
    return "mid";
  }
  return "low";
}

export const BAND_EMOJI: Record<ScoreBand, string> = {
  none: "⬛",
  low: "🟥",
  mid: "🟨",
  high: "🟩",
  max: "🟦",
};

export const MISSING_EMOJI = "⬜";

export function formatShare(dateKey: string, scores: DailyScores): string {
  const games: DailyGame[] = ["letters", "numbers", "conundrum"];
  const emojis = games
    .map((game) => {
      const score = scores[game];
      if (score === undefined) {
        return MISSING_EMOJI;
      }
      return BAND_EMOJI[scoreBand(game, score)];
    })
    .join("");

  return `Daily Countdown ${dateKey}\n${emojis}`;
}
