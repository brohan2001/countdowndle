import { Rng, rngFromString } from "../shared/random";

export type DailyGameId = "letters" | "numbers" | "conundrum";

// Each game gets its own stream from the same day key, so adding or
// changing one game's draws never shifts another game's puzzle.
export function dailyRng(dayKey: string, gameId: DailyGameId): Rng {
  return rngFromString(`countdown:${dayKey}:${gameId}`);
}
