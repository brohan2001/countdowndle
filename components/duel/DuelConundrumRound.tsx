"use client";

import { ScrambleBoard } from "@/components/conundrum/ScrambleBoard";
import { AnswerPanel } from "@/components/conundrum/AnswerPanel";
import { Button } from "@/components/ui/Button";
import { DeadlineDial } from "./DeadlineDial";
import { useRoundActions } from "./useRoundActions";
import type { DuelView } from "@/lib/match/client/useDuelMatch";

export function DuelConundrumRound({ view }: { view: DuelView }) {
  const { round, state, userId, matchId, clockOffset, players } = view;
  const { send, busy, error, advanceWhenDue } = useRoundActions(matchId!);
  if (!round || state?.round?.kind !== "conundrum" || userId === null) return null;

  const er = state.round;
  const iAmAnswering = er.buzzedBy === userId;
  const theyAreAnswering = er.buzzedBy !== null && !iAmAnswering;
  const lockedOut = er.lockedOut.includes(userId);
  const opponent = players.find((p) => p.id !== userId);

  return (
    <div className="flex flex-col items-center gap-6">
      <DeadlineDial deadlineMs={round.deadlineMs} clockOffset={clockOffset} onExpire={advanceWhenDue} />
      <ScrambleBoard letters={round.publicData.scrambled as string} />

      {iAmAnswering && (
        <AnswerPanel
          onSubmit={(guess) => void send("answer", { guess })}
          onExpire={() => void advanceWhenDue()}
        />
      )}
      {theyAreAnswering && (
        <p className="font-serif text-xl font-semibold text-ink">
          {opponent?.name ?? "Your opponent"} buzzed — they&apos;re answering…
        </p>
      )}
      {!iAmAnswering && !theyAreAnswering && !lockedOut && (
        <Button disabled={busy} onClick={() => void send("buzz")}>
          Buzz!
        </Button>
      )}
      {lockedOut && !iAmAnswering && (
        <p className="text-sm font-bold text-urgent">
          Wrong — you&apos;re locked out. Your opponent has the rest of the time.
        </p>
      )}
      {error && <p role="alert" className="text-sm font-bold text-urgent">{error}</p>}
    </div>
  );
}
