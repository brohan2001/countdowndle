"use client";

import { useMemo } from "react";
import {
  NumbersRoundResult,
  NumbersValidationStatus,
  OPERATOR_SYMBOLS,
} from "@/types/numbers";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Panel } from "@/components/ui/Panel";
import { solveNumbers } from "@/lib/numbers/solver";
import { useResultSound } from "@/lib/shared/useResultSound";

export interface NumbersResultPanelProps {
  result: NumbersRoundResult | null;
  onNextRound: () => void;
}

const STATUS_MESSAGES: Record<NumbersValidationStatus, string> = {
  exact: "Exact!",
  "close-1-to-5": "Within 5!",
  "close-6-to-10": "Within 10",
  "valid-further-off": "Valid, but off target",
  "invalid-empty": "No answer submitted",
  "invalid-syntax": "Couldn't parse that expression",
  "invalid-fraction": "Division didn't land on a whole number",
  "invalid-negative": "Result went negative",
  "invalid-tile-reuse": "Used a number that wasn't available",
  "invalid-unproven": "Couldn't prove the declared number",
};

export function NumbersResultPanel({
  result,
  onNextRound,
}: NumbersResultPanelProps) {
  // Runs once per finished round (well under 50ms), never during play.
  const best = useMemo(
    () =>
      result ? solveNumbers(result.drawnNumbers, result.target) : null,
    [result],
  );

  useResultSound(result ? result.pointsAwarded > 0 : null);

  if (result === null) {
    return null;
  }

  const { target, validation, pointsAwarded, playMode, declaredValue } = result;
  const { status, achievedValue, difference } = validation;

  const stat = (label: string, value: string | number) => (
    <div>
      <dt className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
        {label}
      </dt>
      <dd className="font-serif text-2xl font-semibold text-ink">{value}</dd>
    </div>
  );

  return (
    <Panel className="flex w-full max-w-md flex-col items-center gap-4">
      <p
        className={`font-serif text-xl font-semibold ${
          pointsAwarded > 0 ? "text-forest" : "text-ink"
        }`}
      >
        {STATUS_MESSAGES[status]}
      </p>

      {playMode === "declare" && declaredValue !== null && (
        <p className="text-sm text-ink-soft">
          You declared {declaredValue}
          {status === "invalid-unproven" ? " — proof didn't reach it" : ""}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-center">
        {stat("Target", target)}
        {stat(
          playMode === "declare" ? "Declared" : "You reached",
          achievedValue === null ? "—" : achievedValue,
        )}
        {stat("Difference", difference === null ? "—" : difference)}
        {stat("Points", pointsAwarded)}
      </dl>

      {best && best.steps.length > 0 && (
        <div className="w-full border-t border-dashed border-tile-edge pt-4 text-center">
          <p className="text-sm font-bold text-ink">
            {best.difference === 0
              ? "Solvable exactly:"
              : `Closest possible: ${best.value} (off by ${best.difference})`}
          </p>
          <ol className="mt-1 font-serif text-lg font-semibold text-ink">
            {best.steps.map((step) => (
              <li key={step.id}>
                {step.operand1.value} {OPERATOR_SYMBOLS[step.operator]}{" "}
                {step.operand2.value} = {step.resultTile.value}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex gap-3">
        <ButtonLink href="/" variant="secondary">Home</ButtonLink>
        <Button onClick={onNextRound}>Next round</Button>
      </div>
    </Panel>
  );
}
