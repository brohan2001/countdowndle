"use client";

import { NumberTile } from "@/types/numbers";
import { Tile } from "@/components/ui/Tile";

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
      <p className="text-sm text-ink-soft">
        No tiles yet — start the round to draw numbers.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {tiles.map((tile, index) => {
        const isSelected =
          tile.id === pendingOperand1?.id || tile.id === pendingOperand2?.id;
        return (
          <Tile
            key={tile.id}
            index={index}
            selected={isSelected}
            disabled={disabled}
            onClick={() => onSelectTile(tile.id)}
            className={tile.isOriginal ? "" : "bg-dial"}
          >
            {tile.value}
          </Tile>
        );
      })}
    </div>
  );
}
