"use client";

import { LetterDecks, LetterType, LetterTile } from "@/types/letters";

export interface LetterSelectorProps {
  decks: LetterDecks;
  disabled: boolean;
  board: LetterTile[];
  onSelect: (type: LetterType) => void;
  onRandomFill: () => void;
}

export function LetterSelector({
  decks,
  board,
  disabled,
  onSelect,
  onRandomFill,
}: LetterSelectorProps) {
  const vowelTotal = decks.vowel.length;
  const consonantTotal = decks.consonant.length;

  const vowelSoFar = board.filter((t) => t.type === "vowel").length;
  const consonantSoFar = board.filter((t) => t.type === "consonant").length;
  const vowelDisabled = disabled || vowelTotal === 0 || vowelSoFar >= 5;
  const consonantDisabled =
    disabled || consonantTotal === 0 || consonantSoFar >= 6;

  return (
    <div className="flex gap-4">
      <button
        type="button"
        disabled={vowelDisabled}
        onClick={() => onSelect("vowel")}
        className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white shadow transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Vowel {/*({vowelTotal})*/}
      </button>

      <button
        type="button"
        disabled={consonantDisabled}
        onClick={() => onSelect("consonant")}
        className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white shadow transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Consonant {/*({consonantTotal})*/}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onRandomFill()}
        className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white shadow transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Random
      </button>
    </div>
  );
}
