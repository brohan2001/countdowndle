"use client";

import { LetterTile } from "@/types/letters";
import { LettersBoard } from "@/components/letters/LettersBoard";
import { WordInput } from "@/components/letters/WordInput";
import { DeadlineDial } from "./DeadlineDial";
import { useRoundActions } from "./useRoundActions";
import type { DuelView } from "@/lib/match/client/useDuelMatch";

export function DuelLettersRound({ view }: { view: DuelView }) {
  const { round, state, userId, matchId, clockOffset } = view;
  const { send, error, advanceWhenDue } = useRoundActions(matchId!);
  if (!round || state?.round?.kind !== "letters") return null;

  const board = round.publicData.board as LetterTile[];
  const iSubmitted = userId !== null && state.round.points[userId] !== undefined;

  return (
    <div className="flex flex-col items-center gap-6">
      <DeadlineDial deadlineMs={round.deadlineMs} clockOffset={clockOffset} onExpire={advanceWhenDue} />
      <LettersBoard board={board} />
      <WordInput disabled={iSubmitted} onSubmit={(word) => void send("letters", { word })} />
      {iSubmitted && <p className="text-sm text-ink-soft">Word locked in — waiting for your opponent…</p>}
      {error && <p role="alert" className="text-sm font-bold text-urgent">{error}</p>}
    </div>
  );
}
