"use client";

import { LargeCount, NumbersInputMode, NumbersPlayMode } from "@/types/numbers";

const LARGE_COUNT_OPTIONS: LargeCount[] = [0, 1, 2, 3, 4];

export interface LargeCountSelectorProps {
  selectedLargeCount: LargeCount | null;
  inputMode: NumbersInputMode;
  playMode: NumbersPlayMode;
  disabled: boolean;
  onSelectLargeCount: (count: LargeCount) => void;
  onSelectInputMode: (mode: NumbersInputMode) => void;
  onSelectPlayMode: (mode: NumbersPlayMode) => void;
  onStart: () => void;
}

const baseButton =
  "rounded-lg border px-4 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const inactiveButton =
  "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700";
const activeButton = "border-blue-600 bg-blue-600 text-white";

function toggleClass(isSelected: boolean) {
  return `${baseButton} ${isSelected ? activeButton : inactiveButton}`;
}

export function LargeCountSelector({
  selectedLargeCount,
  inputMode,
  playMode,
  disabled,
  onSelectLargeCount,
  onSelectInputMode,
  onSelectPlayMode,
  onStart,
}: LargeCountSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Large numbers
        </span>
        <div className="flex gap-2">
          {LARGE_COUNT_OPTIONS.map((option) => {
            const isSelected = option === selectedLargeCount;
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => onSelectLargeCount(option)}
                className={toggleClass(isSelected)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Input mode
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={inputMode === "calculator"}
            onClick={() => onSelectInputMode("calculator")}
            className={toggleClass(inputMode === "calculator")}
          >
            Calculator
          </button>
          {/* Free text is now a real, selectable mode — the hard-coded
              `disabled` from before is gone; it obeys the same `disabled`
              prop as every other button here. */}
          <button
            type="button"
            disabled={disabled}
            aria-pressed={inputMode === "freeText"}
            onClick={() => onSelectInputMode("freeText")}
            className={toggleClass(inputMode === "freeText")}
          >
            Free text
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Play mode
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={playMode === "untimed"}
            onClick={() => onSelectPlayMode("untimed")}
            className={toggleClass(playMode === "untimed")}
          >
            Untimed
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={playMode === "declare"}
            onClick={() => onSelectPlayMode("declare")}
            className={toggleClass(playMode === "declare")}
          >
            Declare
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled || selectedLargeCount === null}
        onClick={onStart}
        className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Start
      </button>
    </div>
  );
}
