"use client";

import { NumberTile } from "@/types/numbers";

export interface TileRackProps {
  tiles: NumberTile[];
  pendingOperand1: NumberTile | null;
  pendingOperand2: NumberTile | null;
  disabled: boolean;
  onSelectTile: (tileId: string) => void;
}

export function TileRack({
  tiles,
  pendingOperand1,
  pendingOperand2,
  disabled,
  onSelectTile,
}: TileRackProps) {
  if (tiles.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No tiles yet — start the round to draw numbers.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {tiles.map((tile) => {
        const isSelected =
          tile.id === pendingOperand1?.id || tile.id === pendingOperand2?.id;

        return (
          <button
            key={tile.id}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onSelectTile(tile.id)}
            className={[
              "flex h-14 w-14 items-center justify-center rounded-lg border font-mono text-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "border-blue-600 bg-blue-600 text-white"
                : tile.isOriginal
                  ? "border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                  : "border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200",
            ].join(" ")}
          >
            {tile.value}
          </button>
        );
      })}
    </div>
  );
}
