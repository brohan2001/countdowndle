"use client";

import { useEffect, useState } from "react";

export interface ScoreDisplayProps {
  totalScore: number;
  lastRoundPoints: number | null; // null = no round completed yet (e.g. game just started)
  roundId: number;                 // increments every round; exists purely so the "+N" flash
                                    // can re-trigger even if lastRoundPoints repeats the same value
}

export function ScoreDisplay({ totalScore, lastRoundPoints, roundId }: ScoreDisplayProps) {

  const [showPoints,setShowPoints] = useState(false);

  useEffect(() => {
    if (lastRoundPoints == null){
        setShowPoints(false);
        return;
    }
    setShowPoints(true);
    
    const timeout = setTimeout(() => {
        setShowPoints(false);
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