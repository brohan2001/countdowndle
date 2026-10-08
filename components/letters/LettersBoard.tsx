"use client";

import { LetterTile, MAX_BOARD_SIZE } from "@/types/letters";
import { Tile } from "@/components/ui/Tile";

export interface LettersBoardProps {
  board: LetterTile[]; // 0 to MAX_BOARD_SIZE tiles, grows as letters are picked
}

export function LettersBoard({ board }: LettersBoardProps) {
  const emptyCount = Math.max(0, MAX_BOARD_SIZE - board.length);

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {board.map((tile, index) => (
        <Tile key={tile.id} index={index}>
          {tile.letter}
        </Tile>
      ))}
      {Array.from({ length: emptyCount }, (_, i) => (
        <Tile key={`empty-${i}`} index={board.length + i} empty>
          ·
        </Tile>
      ))}
    </div>
  );
}
