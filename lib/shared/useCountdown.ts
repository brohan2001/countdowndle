import { useCallback, useEffect, useState } from "react";

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
  const [isRunning, setIsRunning] = useState(false);

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
    if (isRunning && secondsRemaining === 0) {
      setIsRunning(false);
      options.onExpire?.();
    }
  }, [isRunning, secondsRemaining, options.onExpire]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setSecondsRemaining(options.durationSeconds);
  }, [options.durationSeconds]);

  return { secondsRemaining, isRunning, start, pause, reset };
}
