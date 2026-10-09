"use client";

import { useEffect, useState } from "react";
import { useConundrumGame } from "@/lib/conundrum/useConundrumGame";
import { loadDictionary } from "@/lib/letters/dictionary";
import { makePuzzle, pickSolution } from "@/lib/conundrum/puzzle";
import { ScoreDisplay } from "@/components/ui/ScoreDisplay";
import { Button } from "@/components/ui/Button";
import { ScrambleBoard } from "@/components/conundrum/ScrambleBoard";
import { BuzzPanel } from "@/components/conundrum/BuzzPanel";
import { AnswerPanel } from "@/components/conundrum/AnswerPanel";
import { ConundrumResultPanel } from "@/components/conundrum/ConundrumResultPanel";
import { useLeaveGuard } from "@/lib/shared/leaveGuard";

interface Assets {
  dictionary: Set<string>;
  solutions: string[];
}

async function loadAssets(): Promise<Assets> {
  const [dictionary, response] = await Promise.all([
    loadDictionary(),
    fetch("/dictionary/conundrums.json"),
  ]);
  if (!response.ok) {
    throw new Error(`Failed to load conundrums: ${response.statusText}`);
  }
  return { dictionary, solutions: (await response.json()) as string[] };
}

export default function ConundrumPage() {
  const [state, dispatch] = useConundrumGame();
  useLeaveGuard(state.phase === "solving" || state.phase === "buzzed", "Quit this round? It won’t be scored.");
  const [assets, setAssets] = useState<Assets | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadAssets()
      .then((a) => mounted && setAssets(a))
      .catch((e: unknown) => {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load puzzles");
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const startRound = () => {
    if (!assets) return;
    const solution = pickSolution(assets.solutions);
    dispatch({
      type: "START_ROUND",
      puzzle: makePuzzle(solution, assets.dictionary),
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-ink">Conundrum</h1>

      {error && (
        <div className="w-full rounded-desk border border-urgent bg-paper p-3 text-center text-sm font-bold text-urgent">
          {error}
        </div>
      )}

      <ScoreDisplay
        totalScore={state.totalScore}
        lastRoundPoints={state.lastRoundResult?.pointsAwarded ?? null}
        roundId={state.history.length}
      />

      {state.puzzle && <ScrambleBoard letters={state.puzzle.scrambled} />}

      {state.phase === "idle" && (
        <Button disabled={assets === null} onClick={startRound}>
          {assets === null ? "Loading…" : "Start round"}
        </Button>
      )}

      {state.phase === "solving" && (
        <BuzzPanel
          onBuzz={(secondsRemaining) =>
            dispatch({ type: "BUZZ", secondsRemaining })
          }
          onExpire={() => dispatch({ type: "TIME_EXPIRED" })}
        />
      )}

      {state.phase === "buzzed" && (
        <AnswerPanel
          onSubmit={(guess) => dispatch({ type: "SUBMIT_GUESS", guess })}
          onExpire={() => dispatch({ type: "TIME_EXPIRED" })}
        />
      )}

      <ConundrumResultPanel
        result={state.lastRoundResult}
        onNextRound={() => dispatch({ type: "RESET_ROUND" })}
      />
    </main>
  );
}
