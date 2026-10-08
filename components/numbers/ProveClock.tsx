"use client";

import { useEffect } from "react";
import { useCountdown } from "@/lib/shared/useCountdown";
import { PROVE_TAP_SECONDS } from "@/types/numbers";

export interface ProveClockProps {
  onExpire: () => void;
}

// Per-tap proof clock. The parent remounts this (via a changing `key`) on
// every tile/operator tap, which gives an exact fresh PROVE_TAP_SECONDS.
// Ticks stay local here; the reducer only hears about the final timeout.
export function ProveClock({ onExpire }: ProveClockProps) {
  const { secondsRemaining, start } = useCountdown({
    durationSeconds: PROVE_TAP_SECONDS,
    onExpire,
  });

  useEffect(() => {
    start();
  }, [start]);

  return (
    <div className="flex flex-col items-center gap-1" aria-live="off">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Next tap within
      </span>
      <span
        className={`font-mono text-3xl font-bold ${
          secondsRemaining <= 2 ? "text-red-500" : "text-gray-900 dark:text-white"
        }`}
      >
        {secondsRemaining}
      </span>
    </div>
  );
}
