"use client";

import { LettersRoundResult, WordValidationStatus } from "@/types/letters";

export interface RoundResultPanelProps {
  result: LettersRoundResult | null; // null = round hasn't ended yet, render nothing
  onNextRound: () => void;
}

function getValidationMessage(status: WordValidationStatus): string {
  switch (status) {
    case "unchecked": {
      return "Not finished checking";
    }
    case "valid": {
      return "Valid word!";
    }
    case "invalid-not-a-word": {
      return "Not found in dictionary";
    }
    case "invalid-not-on-board": {
      return "Can't be formed from the board tiles";
    }
    case "invalid-empty": {
      return "No word submitted";
    }
    case "invalid-too-short": {
      return "Too short (minimum 4 letters)";
    }
  }
}

export function RoundResultPanel({
  result,
  onNextRound,
}: RoundResultPanelProps) {
  if (!result) return null;

  // TODO 1: Resolve status message without switch fall-through
  const message = getValidationMessage(result.validation.status);
  const isValid = result.validation.status === "valid";

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-800 dark:bg-gray-900">
      {/* TODO 2: display result.submittedWord, or a clean fallback if null */}
      <div className="text-center">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Submitted Word
        </span>
        <p className="font-mono text-3xl font-black uppercase tracking-wider text-gray-900 dark:text-white">
          {result.submittedWord ?? "—"}
        </p>
      </div>

      {/* TODO 3: display validation message with status-based styling */}
      <p
        className={`text-sm font-semibold ${
          isValid
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {message}
      </p>

      {/* TODO 4: display pointsAwarded ONLY when word is valid */}
      {isValid && (
        <div className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          +{result.pointsAwarded}{" "}
          {result.pointsAwarded === 1 ? "point" : "points"}
        </div>
      )}

      {/* TODO 5: next round trigger */}
      <button
        type="button"
        onClick={onNextRound}
        className="mt-2 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white shadow transition hover:bg-blue-700 active:scale-95"
      >
        Next Round
      </button>
    </div>
  );
}
