"use client";

import { LetterDecks, LetterType, LetterTile } from "@/types/letters";
import { Button } from "@/components/ui/Button";

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
  const vowelSoFar = board.filter((t) => t.type === "vowel").length;
  const consonantSoFar = board.filter((t) => t.type === "consonant").length;
  const vowelDisabled =
    disabled || decks.vowel.length === 0 || vowelSoFar >= 5;
  const consonantDisabled =
    disabled || decks.consonant.length === 0 || consonantSoFar >= 6;

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Button
        variant="secondary"
        disabled={vowelDisabled}
        onClick={() => onSelect("vowel")}
      >
        Vowel
      </Button>
      <Button
        variant="secondary"
        disabled={consonantDisabled}
        onClick={() => onSelect("consonant")}
      >
        Consonant
      </Button>
      <Button disabled={disabled} onClick={onRandomFill}>
        Random
      </Button>
    </div>
  );
}
