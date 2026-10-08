"use client";

import { NumbersRoundResult, NumbersValidationStatus } from "@/types/numbers";

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
  if (result === null) {
    return null;
  }

  const { target, validation, pointsAwarded, playMode, declaredValue } = result;
  const { status, achievedValue, difference } = validation;

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-lg font-bold text-gray-900 dark:text-white">
        {STATUS_MESSAGES[status]}
      </p>

      {playMode === "declare" && declaredValue !== null && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You declared {declaredValue}
          {status === "invalid-unproven" ? " — proof didn't reach it" : ""}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-center">
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Target
          </dt>
          <dd className="font-mono text-lg text-gray-900 dark:text-white">
            {target}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {playMode === "declare" ? "Declared" : "You reached"}
          </dt>
          <dd className="font-mono text-lg text-gray-900 dark:text-white">
            {achievedValue === null ? "—" : achievedValue}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Difference
          </dt>
          <dd className="font-mono text-lg text-gray-900 dark:text-white">
            {difference === null ? "—" : difference}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Points
          </dt>
          <dd className="font-mono text-lg text-gray-900 dark:text-white">
            {pointsAwarded}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onNextRound}
        className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white shadow transition hover:bg-blue-700"
      >
        Next round
      </button>
    </div>
  );
}
