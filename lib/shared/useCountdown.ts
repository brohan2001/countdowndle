import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCountdownOptions {
  durationSeconds: number;
  onExpire?: () => void;
}

export interface UseCountdownResult {
  secondsRemaining: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export function useCountdown(options: UseCountdownOptions): UseCountdownResult {
  const [secondsRemaining, setSecondsRemaining] = useState(
    options.durationSeconds,
  );
  const [started, setStarted] = useState(false);
  // Derived, not stored: running means started and not yet at zero.
  const isRunning = started && secondsRemaining > 0;

  // Latest onExpire without re-subscribing effects when the caller's
  // callback identity changes between renders.
  const onExpireRef = useRef(options.onExpire);
  const firedRef = useRef(false);
  useEffect(() => {
    onExpireRef.current = options.onExpire;
  });

  // 1. Pure interval: only decrements secondsRemaining without side effects
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isRunning]);

  // 2. Pure watcher: executes side effect exactly once when crossing to 0
  useEffect(() => {
    if (started && secondsRemaining === 0 && !firedRef.current) {
      firedRef.current = true;
      onExpireRef.current?.();
    }
  }, [started, secondsRemaining]);

  const start = useCallback(() => {
    setStarted(true);
  }, []);

  const pause = useCallback(() => {
    setStarted(false);
  }, []);

  const reset = useCallback(() => {
    firedRef.current = false;
    setStarted(false);
    setSecondsRemaining(options.durationSeconds);
  }, [options.durationSeconds]);

  return { secondsRemaining, isRunning, start, pause, reset };
}
