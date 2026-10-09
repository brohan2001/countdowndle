"use client";

import { ConundrumRoundResult } from "@/types/conundrum";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Panel } from "@/components/ui/Panel";
import { useResultSound } from "@/lib/shared/useResultSound";

export interface ConundrumResultPanelProps {
  result: ConundrumRoundResult | null;
  onNextRound: () => void;
}

export function ConundrumResultPanel({
  result,
  onNextRound,
}: ConundrumResultPanelProps) {
  useResultSound(result ? result.isCorrect : null);

  if (!result) return null;

  const message = result.isCorrect
    ? "Got it!"
    : result.userGuess === null
      ? "Time's up — no buzz"
      : "Not quite";

  return (
    <Panel className="flex w-full max-w-md flex-col items-center gap-4">
      <p
        className={`font-serif text-xl font-semibold ${
          result.isCorrect ? "text-forest" : "text-urgent"
        }`}
      >
        {message}
      </p>
      <div className="text-center">
        <span className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
          The answer
        </span>
        <p className="font-serif text-3xl font-semibold tracking-wider text-ink uppercase">
          {result.puzzle.solution}
        </p>
      </div>
      {result.userGuess && !result.isCorrect && (
        <p className="text-sm text-ink-soft">You said: {result.userGuess}</p>
      )}
      {result.isCorrect && result.timeTakenSeconds !== null && (
        <p className="text-sm text-ink-soft">
          Solved with {result.timeTakenSeconds}s on the clock — +
          {result.pointsAwarded} points
        </p>
      )}
      <div className="flex gap-3">
        <ButtonLink href="/" variant="secondary">Home</ButtonLink>
        <Button onClick={onNextRound}>Next round</Button>
      </div>
    </Panel>
  );
}
