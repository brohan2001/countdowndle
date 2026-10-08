import React, { useEffect } from "react";
import { useCountdown } from "../../lib/shared/useCountdown"; // adjust import path as needed

export interface TimerProps {
  durationSeconds: number;
  isRunning: boolean;
  onExpire: () => void;
}

export function Timer({ durationSeconds, isRunning, onExpire }: TimerProps) {
  const { secondsRemaining, start, pause, reset } = useCountdown({
    durationSeconds,
    onExpire,
  });

  useEffect(() => {
    if (isRunning) {
    reset();
    start();
    } else {
      pause();
    }
  }, [isRunning, start, pause, reset]);

  const isUrgent = isRunning && secondsRemaining <= 5;

  return (
    <div>
      <span
        className={`font-mono text-4xl font-bold transition-colors duration-300 ${
          isUrgent ? "text-red-500" : "text-white"
        }`}
      >
        {secondsRemaining}
      </span>
    </div>
  );
}