"use client";

import { useEffect, useState } from "react";
import { useCountdown } from "@/lib/shared/useCountdown";
import { DialFace } from "@/components/ui/DialTimer";
import { nextHighWater, proofProgress } from "@/lib/numbers/proveProgress";
import {
  NumbersGameState,
  PROVE_TAP_SECONDS,
  PROVE_TOTAL_SECONDS,
} from "@/types/numbers";

function Clock({
  seconds,
  label,
  onExpire,
}: {
  seconds: number;
  label: string;
  onExpire: () => void;
}) {
  const { secondsRemaining, start } = useCountdown({
    durationSeconds: seconds,
    onExpire,
  });

  useEffect(() => {
    start();
  }, [start]);

  return (
    <DialFace
      seconds={secondsRemaining}
      urgent={secondsRemaining <= 2}
      label={label}
      size="sm"
    />
  );
}

export interface ProveClocksProps {
  state: NumbersGameState;
  onExpire: () => void;
}

// The two proof clocks. Mount this only while proving: the total clock runs
// once for the whole proof, and the per-tap clock is remounted (via `key`)
// only when the proof reaches new ground — see lib/numbers/proveProgress.ts.
// Ticks stay local here; the reducer only hears about the final timeout.
export function ProveClocks({ state, onExpire }: ProveClocksProps) {
  const progress = proofProgress(state);
  // History-dependent, so it can't be derived from the current state alone.
  // Updated during render (React's "adjust state on prop change" pattern).
  const [highWater, setHighWater] = useState(progress);
  if (nextHighWater(highWater, progress) !== highWater) setHighWater(progress);

  return (
    <div className="flex items-end gap-4">
      <Clock key={highWater} seconds={PROVE_TAP_SECONDS} label="next tap" onExpire={onExpire} />
      <Clock seconds={PROVE_TOTAL_SECONDS} label="total" onExpire={onExpire} />
    </div>
  );
}
