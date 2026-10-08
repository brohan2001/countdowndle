"use client";

import { CalculatorStep, OPERATOR_SYMBOLS } from "@/types/numbers";

export interface StepHistoryProps {
  steps: CalculatorStep[];
}

export function StepHistory({ steps }: StepHistoryProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No steps yet — combine two tiles to get started.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-1 font-serif text-lg font-semibold text-ink">
      {steps.map((step) => (
        <li key={step.id}>
          {step.operand1.value} {OPERATOR_SYMBOLS[step.operator]}{" "}
          {step.operand2.value} = {step.resultTile.value}
        </li>
      ))}
    </ol>
  );
}
