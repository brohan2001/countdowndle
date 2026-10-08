"use client";

import { useEffect, useRef, useState } from "react";
import { DialFace, URGENT_SECONDS } from "@/components/ui/DialTimer";

export interface DeadlineDialProps {
  deadlineMs: number; // on the SERVER's clock
  clockOffset: number; // server - client, ms (see measureClockOffset)
  label?: string;
  onExpire: () => void;
}

// Counts down to a server-held deadline. Remaining time is derived from the
// clock each tick (not by decrementing), so a backgrounded tab or a slow
// timer can't drift. Ticks stay in this component; the match never sees them.
export function DeadlineDial({ deadlineMs, clockOffset, label, onExpire }: DeadlineDialProps) {
  const [seconds, setSeconds] = useState<number | null>(null);
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    firedRef.current = false;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - (Date.now() + clockOffset)) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current();
      }
    };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [deadlineMs, clockOffset]);

  return (
    <DialFace
      seconds={seconds ?? 0}
      urgent={seconds !== null && seconds <= URGENT_SECONDS}
      label={label}
    />
  );
}
