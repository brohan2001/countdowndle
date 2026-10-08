"use client";

import { useEffect, useState } from "react";
import { useCountdown } from "@/lib/shared/useCountdown";
import { Button } from "@/components/ui/Button";
import { DialFace, URGENT_SECONDS } from "@/components/ui/DialTimer";
import { ANSWER_WINDOW_SECONDS } from "@/types/conundrum";

export interface AnswerPanelProps {
  onSubmit: (guess: string) => void;
  onExpire: () => void;
}

export function AnswerPanel({ onSubmit, onExpire }: AnswerPanelProps) {
  const [value, setValue] = useState("");
  const { secondsRemaining, start } = useCountdown({
    durationSeconds: ANSWER_WINDOW_SECONDS,
    onExpire,
  });

  useEffect(() => {
    start();
  }, [start]);

  return (
    <form
      className="flex flex-col items-center gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value);
      }}
    >
      <DialFace
        seconds={secondsRemaining}
        urgent={secondsRemaining <= URGENT_SECONDS}
        label="to answer"
      />
      <div className="flex gap-2">
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Your answer"
          autoComplete="off"
          spellCheck={false}
          maxLength={9}
          className="w-56 rounded-desk border-[1.5px] border-tile-edge bg-paper px-4 py-2 font-serif text-xl font-semibold tracking-wider text-ink uppercase focus:border-brass focus:outline-none"
        />
        <Button type="submit" disabled={value.trim().length === 0}>
          Answer
        </Button>
      </div>
    </form>
  );
}
