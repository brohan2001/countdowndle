"use client";

import { useEffect } from "react";
import { useConundrumGame } from "@/lib/conundrum/useConundrumGame";
import { dailyConundrumPuzzle } from "@/lib/daily/puzzles";
import { ScrambleBoard } from "@/components/conundrum/ScrambleBoard";
import { BuzzPanel } from "@/components/conundrum/BuzzPanel";
import { AnswerPanel } from "@/components/conundrum/AnswerPanel";
import { ConundrumResultPanel } from "@/components/conundrum/ConundrumResultPanel";
import { DailyStageProps } from "./types";

export function DailyConundrumStage({
  dayKey,
  dictionary,
  solutions,
  onComplete,
  onContinue,
}: DailyStageProps) {
  const [state, dispatch] = useConundrumGame();

  useEffect(() => {
    dispatch({
      type: "START_ROUND",
      puzzle: dailyConundrumPuzzle(dayKey, solutions, dictionary),
    });
  }, [dayKey, solutions, dictionary, dispatch]);

  const result = state.lastRoundResult;
  useEffect(() => {
    if (result) onComplete(result.pointsAwarded);
  }, [result, onComplete]);

  return (
    <div className="flex flex-col items-center gap-6">
      {state.puzzle && <ScrambleBoard letters={state.puzzle.scrambled} />}

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

      <ConundrumResultPanel result={result} onNextRound={onContinue} />
    </div>
  );
}
