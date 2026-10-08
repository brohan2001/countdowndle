"use client";

import { LetterBag, LetterType, LetterTile } from "@/types/letters";

export interface LetterSelectorProps {
  bag: LetterBag;
  disabled: boolean;
  board: LetterTile[];
  onSelect: (type: LetterType) => void;
  onRandomFill: () => void;
}

export function LetterSelector({
  bag,
  board,
  disabled,
  onSelect,
  onRandomFill,
}: LetterSelectorProps) {
  const vowelPool = bag["vowel"];
  const consonantPool = bag["consonant"];

  const vowels = Object.keys(vowelPool);
  const consonants = Object.keys(consonantPool);

  let vowelTotal = 0;
  let consonantTotal = 0;

  for (const vowel of vowels) {
    vowelTotal += vowelPool[vowel];
  }
  for (const consonant of consonants) {
    consonantTotal += consonantPool[consonant];
  }

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
