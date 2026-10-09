"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { loadDictionary } from "@/lib/letters/dictionary";
import { toDailyKey } from "@/lib/daily/dates";
import {
  DAILY_GAMES,
  computeStreaks,
  forfeitRemaining,
  recordScore,
} from "@/lib/daily/storage";
import {
  getRawSnapshot,
  getServerRawSnapshot,
  historyFromRaw,
  subscribe,
  updateHistory,
} from "@/lib/daily/historyStore";
import { DailyGame as GameId } from "@/lib/daily/share";
import { DailyLettersStage } from "./DailyLettersStage";
import { DailyNumbersStage } from "./DailyNumbersStage";
import { DailyConundrumStage } from "./DailyConundrumStage";
import { DailySummary } from "./DailySummary";
import { Button } from "@/components/ui/Button";
import { useLeaveGuard } from "@/lib/shared/leaveGuard";

const TITLES: Record<GameId, string> = {
  letters: "Letters",
  numbers: "Numbers",
  conundrum: "Conundrum",
};

interface Assets {
  dictionary: Set<string>;
  solutions: string[];
}

async function loadAssets(): Promise<Assets> {
  const [dictionary, response] = await Promise.all([
    loadDictionary(),
    fetch("/dictionary/conundrums.json"),
  ]);
  if (!response.ok) throw new Error(`Failed to load conundrums: ${response.statusText}`);
  return { dictionary, solutions: (await response.json()) as string[] };
}

// Rendered only after mount (see DailyPage), so reading the local date and
// localStorage here can't cause a hydration mismatch.
export function DailyGame() {
  const dayKey = useMemo(() => toDailyKey(new Date()), []);
  const raw = useSyncExternalStore(subscribe, getRawSnapshot, getServerRawSnapshot);
  const history = useMemo(() => historyFromRaw(raw), [raw]);
  const scores = history.days[dayKey] ?? {};

  // Start at the first game not yet played today; Continue advances.
  const firstUnplayed = DAILY_GAMES.findIndex((g) => scores[g] === undefined);
  const [stageIndex, setStageIndex] = useState(
    firstUnplayed === -1 ? DAILY_GAMES.length : firstUnplayed,
  );

  const [assets, setAssets] = useState<Assets | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    loadAssets()
      .then((a) => mounted && setAssets(a))
      .catch((e: unknown) => {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load puzzles");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const game = DAILY_GAMES[stageIndex] as GameId | undefined;
  const onComplete = useCallback(
    (points: number) => {
      if (game) updateHistory((h) => recordScore(h, dayKey, game, points));
    },
    [dayKey, game],
  );
  const onContinue = useCallback(() => setStageIndex((i) => i + 1), []);
  useLeaveGuard(game !== undefined, "Leave the Daily Countdown? This game won’t be saved.");
  const [confirmingGiveUp, setConfirmingGiveUp] = useState(false);
  const giveUp = () => {
    updateHistory((h) => forfeitRemaining(h, dayKey));
    setStageIndex(DAILY_GAMES.length);
  };

  if (error) {
    return <p className="text-center font-bold text-urgent">{error}</p>;
  }
  if (!assets) {
    return <p className="text-center text-ink-soft">Setting up today&apos;s puzzles…</p>;
  }

  if (!game) {
    return (
      <DailySummary
        dayKey={dayKey}
        scores={scores}
        streaks={computeStreaks(history, dayKey)}
      />
    );
  }

  const props = {
    dayKey,
    dictionary: assets.dictionary,
    solutions: assets.solutions,
    onComplete,
    onContinue,
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
        {stageIndex + 1} of {DAILY_GAMES.length} · {TITLES[game]}
      </p>
      {/* key remounts the stage's own reducer for each game */}
      {game === "letters" && <DailyLettersStage key={game} {...props} />}
      {game === "numbers" && <DailyNumbersStage key={game} {...props} />}
      {game === "conundrum" && <DailyConundrumStage key={game} {...props} />}
      {confirmingGiveUp ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm font-bold text-ink">
            Give up? The rest of today scores 0.
          </span>
          <Button variant="danger" onClick={giveUp}>Give up</Button>
          <Button variant="secondary" onClick={() => setConfirmingGiveUp(false)}>
            Keep playing
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingGiveUp(true)}
          className="text-sm font-bold text-ink-soft underline hover:text-urgent"
        >
          Give up today
        </button>
      )}
    </div>
  );
}
