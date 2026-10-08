"use client";

import { useEffect } from "react";
import { useCountdown } from "@/lib/shared/useCountdown";
import { Button } from "@/components/ui/Button";
import { DialFace, URGENT_SECONDS } from "@/components/ui/DialTimer";
import { ROUND_DURATION_SECONDS } from "@/types/conundrum";

export interface BuzzPanelProps {
  onBuzz: (secondsRemaining: number) => void;
  onExpire: () => void;
}

// Owns the 30s round clock locally; the reducer only ever hears about the
// buzz (with the seconds left at that instant) or the final expiry.
export function BuzzPanel({ onBuzz, onExpire }: BuzzPanelProps) {
  const { secondsRemaining, start } = useCountdown({
    durationSeconds: ROUND_DURATION_SECONDS,
    onExpire,
  });

  useEffect(() => {
    start();
  }, [start]);

  return (
    <div className="flex flex-col items-center gap-4">
      <DialFace
        seconds={secondsRemaining}
        urgent={secondsRemaining <= URGENT_SECONDS}
      />
      <Button onClick={() => onBuzz(secondsRemaining)}>Buzz!</Button>
    </div>
  );
}
