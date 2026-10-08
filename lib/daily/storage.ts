import { DailyGame, DailyScores } from "./share";
import { isValidDailyKey, previousDailyKey } from "./dates";

export const DAILY_STORAGE_KEY = "countdown:daily:v1";
export const DAILY_GAMES: DailyGame[] = ["letters", "numbers", "conundrum"];

// Day key -> points per game. A game is absent until it has been played that
// day. Streaks are NOT stored; they are derived from this record.
export interface DailyHistory {
  version: 1;
  days: Record<string, DailyScores>;
}

export function emptyHistory(): DailyHistory {
  return { version: 1, days: {} };
}

// Defensive: localStorage content is user-editable and may be from another
// version, so anything unexpected is dropped rather than trusted.
export function parseHistory(raw: string | null): DailyHistory {
  if (raw === null) return emptyHistory();
  try {
    const data: unknown = JSON.parse(raw);
    if (
      typeof data !== "object" ||
      data === null ||
      (data as { version?: unknown }).version !== 1
    ) {
      return emptyHistory();
    }
    const rawDays = (data as { days?: unknown }).days;
    if (typeof rawDays !== "object" || rawDays === null) return emptyHistory();

    const days: Record<string, DailyScores> = {};
    for (const [key, value] of Object.entries(rawDays)) {
      if (!isValidDailyKey(key) || typeof value !== "object" || value === null) {
        continue;
      }
      const scores: DailyScores = {};
      for (const game of DAILY_GAMES) {
        const points = (value as Record<string, unknown>)[game];
        if (typeof points === "number" && Number.isFinite(points) && points >= 0) {
          scores[game] = points;
        }
      }
      days[key] = scores;
    }
    return { version: 1, days };
  } catch {
    return emptyHistory();
  }
}

// One attempt per game per day: a recorded score is never overwritten.
export function recordScore(
  history: DailyHistory,
  dayKey: string,
  game: DailyGame,
  points: number,
): DailyHistory {
  const existing = history.days[dayKey] ?? {};
  if (existing[game] !== undefined) return history;
  return {
    ...history,
    days: { ...history.days, [dayKey]: { ...existing, [game]: points } },
  };
}

export function isDayComplete(scores: DailyScores | undefined): boolean {
  return !!scores && DAILY_GAMES.every((game) => scores[game] !== undefined);
}

export interface Streaks {
  current: number;
  best: number;
}

// A day counts toward a streak when all three games were played. The current
// streak ends at today if today is complete, otherwise at yesterday (today
// being unfinished does not break it yet).
export function computeStreaks(history: DailyHistory, todayKey: string): Streaks {
  const complete = new Set(
    Object.entries(history.days)
      .filter(([, scores]) => isDayComplete(scores))
      .map(([key]) => key),
  );

  let current = 0;
  let cursor = complete.has(todayKey) ? todayKey : previousDailyKey(todayKey);
  while (complete.has(cursor)) {
    current++;
    cursor = previousDailyKey(cursor);
  }

  // YYYY-MM-DD sorts chronologically, so one pass over the sorted keys finds
  // the longest run of consecutive days.
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of [...complete].sort()) {
    run = prev !== null && previousDailyKey(key) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }

  return { current, best: Math.max(best, current) };
}

// --- localStorage I/O: every access is guarded; the game works without it. ---

export function loadHistory(): DailyHistory {
  try {
    return parseHistory(window.localStorage.getItem(DAILY_STORAGE_KEY));
  } catch {
    return emptyHistory();
  }
}

export function saveHistory(history: DailyHistory): void {
  try {
    window.localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Private mode / blocked storage / quota: silently skip persistence.
  }
}
