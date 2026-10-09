"use client";

import { useMemo } from "react";
import {
  LettersRoundResult,
  MIN_WORD_LENGTH,
  WordValidationStatus,
} from "@/types/letters";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Panel } from "@/components/ui/Panel";
import { getTrie } from "@/lib/letters/trie";
import { analyzeBestWords } from "@/lib/letters/bestWords";
import { useResultSound } from "@/lib/shared/useResultSound";

export interface RoundResultPanelProps {
  result: LettersRoundResult | null; // null = round hasn't ended yet, render nothing
  dictionary: Set<string> | null; // for the best-word analysis; null while loading
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
  dictionary,
  onNextRound,
}: RoundResultPanelProps) {
  // The trie is built lazily (first call only), and the search only runs once
  // a round has actually ended — never during play.
  const analysis = useMemo(
    () =>
      result && dictionary
        ? analyzeBestWords(
            getTrie(dictionary),
            result.board,
            result.submittedWord,
          )
        : null,
    [result, dictionary],
  );

  useResultSound(result ? result.validation.status === "valid" : null);

  if (!result) return null;

  const message = getValidationMessage(result.validation.status);
  const isValid = result.validation.status === "valid";

  return (
    <Panel className="flex w-full max-w-md flex-col items-center gap-4">
      <div className="text-center">
        <span className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
          Submitted word
        </span>
        <p className="font-serif text-3xl font-semibold tracking-wider text-ink uppercase">
          {result.submittedWord ?? "—"}
        </p>
      </div>

      <p
        className={`text-sm font-bold ${isValid ? "text-forest" : "text-urgent"}`}
      >
        {message}
      </p>

      {isValid && (
        <div className="rounded-desk border border-brass bg-dial px-4 py-1 text-sm font-bold text-accent">
          +{result.pointsAwarded}{" "}
          {result.pointsAwarded === 1 ? "point" : "points"}
        </div>
      )}

      {analysis && (
        <div className="w-full border-t border-dashed border-tile-edge pt-4 text-center">
          {analysis.bestLength === 0 ? (
            <p className="text-sm text-ink-soft">
              No valid word of {MIN_WORD_LENGTH}+ letters on this board.
            </p>
          ) : (
            <>
              <p className="text-sm font-bold text-ink">
                {analysis.playerMatchedBest === true
                  ? "You found a best-length word!"
                  : `Best possible: ${analysis.bestLength} letters`}
              </p>
              <p className="mt-1 font-serif text-lg font-semibold tracking-wider text-ink uppercase">
                {analysis.longest.slice(0, 5).join(" · ")}
                {analysis.longest.length > 5 &&
                  ` +${analysis.longest.length - 5}`}
              </p>
              {analysis.top.length > analysis.longest.length && (
                <p className="mt-2 text-xs tracking-wide text-ink-soft uppercase">
                  Also: {analysis.top.slice(analysis.longest.length).join(", ")}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <ButtonLink href="/" variant="secondary">Home</ButtonLink>
        <Button onClick={onNextRound}>Next round</Button>
      </div>
    </Panel>
  );
}
