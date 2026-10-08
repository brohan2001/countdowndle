"use client";

import { useEffect } from "react";
import { useLettersGame } from "@/lib/letters/useLettersGame";
import { dailyLettersBoard } from "@/lib/daily/puzzles";
import { ROUND_DURATION_SECONDS } from "@/types/letters";
import { DialTimer } from "@/components/ui/DialTimer";
import { LettersBoard } from "@/components/letters/LettersBoard";
import { WordInput } from "@/components/letters/WordInput";
import { RoundResultPanel } from "@/components/letters/RoundResultPanel";
import { DailyStageProps } from "./types";

export function DailyLettersStage({
  dayKey,
  dictionary,
  onComplete,
  onContinue,
}: DailyStageProps) {
  const [state, dispatch] = useLettersGame();

  // LOAD_BOARD is only legal from 'idle', so a StrictMode double-run is harmless.
  useEffect(() => {
    dispatch({ type: "LOAD_BOARD", board: dailyLettersBoard(dayKey) });
  }, [dayKey, dispatch]);

  const result = state.lastRoundResult;
  useEffect(() => {
    if (result) onComplete(result.pointsAwarded);
  }, [result, onComplete]);

  const isSolving = state.phase === "solving";

  return (
    <div className="flex flex-col items-center gap-6">
      <DialTimer
        durationSeconds={ROUND_DURATION_SECONDS}
        isRunning={isSolving}
        onExpire={() => dispatch({ type: "TIME_EXPIRED" })}
      />
      <LettersBoard board={state.board} />
      <WordInput
        disabled={!isSolving}
        onSubmit={(word) => dispatch({ type: "SUBMIT_WORD", word, dictionary })}
      />
      <RoundResultPanel
        result={result}
        dictionary={dictionary}
        onNextRound={onContinue}
      />
    </div>
  );
}
