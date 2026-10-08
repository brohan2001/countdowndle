"use client";

import { useEffect, useState } from "react";

export interface ScoreDisplayProps {
  totalScore: number;
  lastRoundPoints: number | null; // null = no round completed yet (e.g. game just started)
  roundId: number;                 // increments every round; exists purely so the "+N" flash
                                    // can re-trigger even if lastRoundPoints repeats the same value
}

export function ScoreDisplay({ totalScore, lastRoundPoints, roundId }: ScoreDisplayProps) {

  // The "+N" flash is derived: visible until its own round's timeout marks
  // that roundId as dismissed.
  const [dismissedRound, setDismissedRound] = useState<number | null>(null);
  const showPoints = lastRoundPoints != null && dismissedRound !== roundId;

  useEffect(() => {
    if (lastRoundPoints == null) return;

    const timeout = setTimeout(() => {
      setDismissedRound(roundId);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [roundId, lastRoundPoints]);

  return (
    <div>
      {/* TODO: wire the above in */}
      <div>Score: {totalScore}</div>
      {showPoints && lastRoundPoints !==null && (<span key = {roundId}> + {lastRoundPoints} </span>)}
    </div>
  );
}