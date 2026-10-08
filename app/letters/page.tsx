"use client";

import { useEffect, useState } from "react";
import { useLettersGame } from "@/lib/letters/useLettersGame";
import { loadDictionary } from "@/lib/letters/dictionary";
import { ROUND_DURATION_SECONDS } from "@/types/letters";
import { Timer } from "@/components/ui/Timer";
import { ScoreDisplay } from "@/components/ui/ScoreDisplay";
import { LettersBoard } from "@/components/letters/LettersBoard";
import { LetterSelector } from "@/components/letters/LetterSelector";
import { WordInput } from "@/components/letters/WordInput";
import { RoundResultPanel } from "@/components/letters/RoundResultPanel";

export default function LettersPage() {
  const [state, dispatch] = useLettersGame();

  // TODO 1: Load and hold the dictionary Set once on mount.
  // Tracks loading & error states to keep the submit button cleanly guarded.
  const [dictionary, setDictionary] = useState<Set<string> | null>(null);
  const [dictionaryError, setDictionaryError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadDictionary()
      .then((dict) => {
        if (isMounted) setDictionary(dict);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setDictionaryError(
            err instanceof Error ? err.message : "Failed to load dictionary",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // TODO 2: Derive child boolean flags from state.phase
  const isSolving = state.phase === "solving";

  // Players can draw tiles in both 'idle' (1st pick) and 'selecting' (picks 2 through 9)
  const canPickLetter = state.phase === "idle" || state.phase === "selecting";

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 p-8">
      {dictionaryError && (
        <div className="w-full rounded-lg bg-red-100 p-3 text-center text-sm font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
          {dictionaryError}
        </div>
      )}

      {/* Score header */}
      <ScoreDisplay
        totalScore={state.totalScore}
        lastRoundPoints={state.lastRoundResult?.pointsAwarded ?? null}
        roundId={state.history.length}
      />

      {/* 30s Countdown timer */}
      <Timer
        durationSeconds={ROUND_DURATION_SECONDS}
        isRunning={isSolving}
        onExpire={() => dispatch({ type: "TIME_EXPIRED" })}
      />

      {/* 9-slot letter board */}
      <LettersBoard board={state.board} />

      {/* Vowel / Consonant selectors */}
      <LetterSelector
        bag={state.bag}
        board={state.board}
        disabled={!canPickLetter}
        onSelect={(letterType) =>
          dispatch({ type: "SELECT_LETTER", letterType })
        }
        onRandomFill={() => dispatch({ type: "RANDOM_FILL" })}
      />

      {/* Player input field: locked if not solving OR if dictionary is not yet ready */}
      <WordInput
        disabled={!isSolving || dictionary === null}
        onSubmit={(word) => {
          if (!dictionary) return;
          dispatch({ type: "SUBMIT_WORD", word, dictionary });
        }}
      />

      {/* Results overlay / modal panel: state.lastRoundResult is null except during roundOver */}
      <RoundResultPanel
        result={state.lastRoundResult}
        onNextRound={() => dispatch({ type: "RESET_ROUND" })}
      />
    </main>
  );
}
