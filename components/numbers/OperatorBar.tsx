"use client";

import {
  NumbersOperator,
  OPERATOR_ORDER,
  OPERATOR_SYMBOLS,
} from "@/types/numbers";

export interface OperatorBarProps {
  pendingOperator: NumbersOperator | null;
  canConfirm: boolean;
  canUndo: boolean;
  disabled: boolean;
  onSelectOperator: (operator: NumbersOperator) => void;
  onConfirm: () => void;
  onUndo: () => void;
  onClear: () => void;
}

export function OperatorBar({
  pendingOperator,
  canConfirm,
  canUndo,
  disabled,
  onSelectOperator,
  onConfirm,
  onUndo,
  onClear,
}: OperatorBarProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {OPERATOR_ORDER.map((operator) => {
          const isSelected = operator === pendingOperator;
          return (
            <button
              key={operator}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onSelectOperator(operator)}
              className={[
                "flex h-11 w-11 items-center justify-center rounded-lg border text-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
              ].join(" ")}
            >
              {OPERATOR_SYMBOLS[operator]}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled || !canUndo}
          onClick={onUndo}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={disabled || !canConfirm}
          onClick={onConfirm}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
