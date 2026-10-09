"use client";

import { useEffect } from "react";
import { useCountdown } from "@/lib/shared/useCountdown";
import { playSound } from "@/lib/shared/sound";

export const URGENT_SECONDS = 5;

export interface DialFaceProps {
  seconds: number;
  urgent?: boolean;
  label?: string;
  size?: "md" | "sm";
}

// Presentational brass-rimmed dial. Owns no timing.
export function DialFace({
  seconds,
  urgent = false,
  label = "seconds",
  size = "md",
}: DialFaceProps) {
  useEffect(() => {
    if (urgent && seconds > 0) playSound("tick");
  }, [urgent, seconds]);
  const dims =
    size === "md" ? "h-[92px] w-[92px]" : "h-[64px] w-[64px]";
  const numeral = size === "md" ? "text-4xl" : "text-2xl";
  return (
    <div
      role="timer"
      aria-label={`${seconds} ${label}`}
      className={`flex ${dims} flex-col items-center justify-center rounded-full border-[5px] bg-dial transition-colors duration-300 ${
        urgent ? "border-urgent" : "border-brass"
      }`}
      style={{ boxShadow: "0 4px 10px rgba(74,52,40,.18), inset 0 0 0 2px #efe6d3" }}
    >
      <span
        className={`font-serif ${numeral} leading-none font-bold transition-colors duration-300 ${
          urgent ? "text-urgent" : "text-ink"
        }`}
      >
        {seconds}
      </span>
      <span className="mt-0.5 text-[9px] tracking-[0.14em] text-accent uppercase">
        {label}
      </span>
    </div>
  );
}

export interface DialTimerProps {
  durationSeconds: number;
  isRunning: boolean;
  onExpire: () => void;
}

// Drop-in replacement for the old Timer: restarts whenever isRunning turns on.
export function DialTimer({
  durationSeconds,
  isRunning,
  onExpire,
}: DialTimerProps) {
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

  return (
    <DialFace
      seconds={secondsRemaining}
      urgent={isRunning && secondsRemaining <= URGENT_SECONDS}
    />
  );
}
