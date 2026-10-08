"use client";

import { LetterTile, MAX_BOARD_SIZE } from "@/types/letters";

export interface LettersBoardProps {
  board: LetterTile[]; // 0 to MAX_BOARD_SIZE tiles, grows as letters are picked
}

export function LettersBoard({ board }: LettersBoardProps) {
  // TODO 1: Compute how many empty placeholder slots to render, so the total is
  // always MAX_BOARD_SIZE regardless of board.length.
  const emptyCount = Math.max(0, MAX_BOARD_SIZE - board.length);
  const emptySlots = Array.from({ length: emptyCount });

  return (
    <div className="flex">
      {
        /* TODO 2: Render one <Tile tile={...} /> per entry in `board`.
          Use tile.id as the key — NOT the array index. Why it matters here specifically:
          once you add Framer Motion reveal animations, React uses the key to decide
          whether an element is "the same one, just updated" or "a brand new one to
          mount." An index-based key would misattribute animations/state to the wrong
          tile if the array is ever sliced or reordered (it isn't today, but id-as-key
          is correct regardless and costs nothing). */
        board.map((tile) => (
          <Tile key={tile.id} tile={tile}></Tile>
        ))
      }

      {
        /* TODO 3: Render the empty placeholder slots after the filled ones —
          <Tile tile={null} /> for each. */
        emptySlots.map((_, index) => (
          <Tile key={`empty-${index}`} tile={null} />
        ))
      }
    </div>
  );
}

interface TileProps {
  tile: LetterTile | null; // null = empty, not-yet-drawn slot
}

function Tile({ tile }: TileProps) {
  // TODO 4: If `tile` is present, render its letter. Consider styling vowels vs.
  // consonants differently (tile.type) — a small at-a-glance aid for players scanning
  // the board.

  if (!tile) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-transparent text-gray-600" />
    );
  }
  // TODO 5: If `tile` is null, render an empty/dashed placeholder instead.
  //
  // No Framer Motion yet — get plain filled/empty rendering correct first, same
  // approach as Timer's color shift. Reveal animation comes after.
  const isVowel = tile.type === "vowel";

  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl font-black uppercase shadow-sm ${
        isVowel
          ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          : "border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
      }`}
    >
      {tile.letter}
    </div>
  );
}
