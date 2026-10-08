"use client";

import { useEffect } from "react";
import { useCountdown } from "@/lib/shared/useCountdown";
import { DialFace } from "@/components/ui/DialTimer";
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
    <DialFace
      seconds={secondsRemaining}
      urgent={secondsRemaining <= 2}
      label="next tap"
      size="sm"
    />
  );
}
