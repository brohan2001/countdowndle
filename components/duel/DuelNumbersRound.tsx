"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canWork, useNumbersGame } from "@/lib/numbers/useNumbersGame";
import { NumberTile } from "@/types/numbers";
import { Button } from "@/components/ui/Button";
import { TileRack } from "@/components/numbers/TileRack";
import { OperatorBar } from "@/components/numbers/OperatorBar";
import { StepHistory } from "@/components/numbers/StepHistory";
import { ProveClocks } from "@/components/numbers/ProveClock";
import { Tile } from "@/components/ui/Tile";
import { DeadlineDial } from "./DeadlineDial";
import { useRoundActions } from "./useRoundActions";
import type { DuelView } from "@/lib/match/client/useDuelMatch";

export function DuelNumbersRound({ view }: { view: DuelView }) {
  const { round, state, userId, matchId, clockOffset, players } = view;
  const { send, busy, error, advanceWhenDue } = useRoundActions(matchId!);
  const [draft, setDraft] = useState("");
  if (!round || state?.round?.kind !== "numbers" || userId === null) return null;

  const numbers = round.publicData.numbers as number[];
  const target = round.publicData.target as number;
  const er = state.round;
  const prover = er.stage === "proving" ? er.order[er.proofIndex] : null;
  const proverName = players.find((p) => p.id === prover)?.name ?? "Your opponent";

  return (
    <div className="flex flex-col items-center gap-6">
      <DeadlineDial
        key={`${round.id}-${er.stage}-${er.proofIndex}`}
        deadlineMs={round.deadlineMs}
        clockOffset={clockOffset}
        onExpire={advanceWhenDue}
        label={er.stage === "proving" ? "to prove" : "seconds"}
      />

      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-bold tracking-[0.14em] text-accent uppercase">Target</span>
        <div className="font-serif text-6xl font-bold tracking-widest text-ink">{target}</div>
      </div>

      {er.stage === "declaring" && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            {numbers.map((n, i) => (
              <Tile key={i} index={i}>{n}</Tile>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const value = Number(draft);
              if (Number.isInteger(value) && value > 0) void send("declare", { value });
            }}
          >
            <input
              type="number"
              min={1}
              step={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Your number"
              aria-label="Declared number"
              className="w-36 rounded-desk border-[1.5px] border-tile-edge bg-paper px-3 py-2 font-serif text-xl font-semibold text-ink focus:border-brass focus:outline-none"
            />
            <Button type="submit" disabled={busy || draft === ""}>Declare</Button>
          </form>
          <p className="text-sm text-ink-soft">
            Declare the closest number you can make. You can update it until the clock runs out; you&apos;ll prove it next.
          </p>
        </>
      )}

      {er.stage === "proving" && prover === userId && (
        <ProvePanel
          key={`${round.id}-${er.proofIndex}`}
          numbers={numbers}
          target={target}
          declared={er.declarations[userId]}
          onFinish={(steps) => void send("prove", { steps })}
        />
      )}
      {er.stage === "proving" && prover !== userId && (
        <p className="font-serif text-xl font-semibold text-ink">{proverName} is proving their number…</p>
      )}

      {error && <p role="alert" className="text-sm font-bold text-urgent">{error}</p>}
    </div>
  );
}

function ProvePanel({
  numbers,
  target,
  declared,
  onFinish,
}: {
  numbers: number[];
  target: number;
  declared: number;
  onFinish: (steps: { a: number; op: string; b: number }[]) => void;
}) {
  const [local, dispatch] = useNumbersGame();
  const sentRef = useRef(false);

  const tiles = useMemo<NumberTile[]>(
    () => numbers.map((value, i) => ({ id: `n-${i}`, value, isOriginal: true })),
    [numbers],
  );

  // Put the local calculator straight into declare-mode proving. Each action
  // is only legal from one phase, so a StrictMode re-run is harmless.
  useEffect(() => {
    dispatch({ type: "SET_PLAY_MODE", mode: "declare" });
    dispatch({ type: "LOAD_PUZZLE", largeCount: 0, drawnNumbers: tiles, target });
    dispatch({ type: "SET_DECLARED_VALUE", value: declared });
    dispatch({ type: "LOCK_DECLARATION" });
  }, [dispatch, tiles, target, declared]);

  // Local proof ended (proved it, timed out between taps, or gave up): send
  // the steps once. The server re-validates everything.
  const result = local.result;
  useEffect(() => {
    if (result && !sentRef.current) {
      sentRef.current = true;
      onFinish(
        local.steps.map((s) => ({ a: s.operand1.value, op: s.operator, b: s.operand2.value })),
      );
    }
  }, [result, local.steps, onFinish]);

  const proving = local.phase === "proving";
  const isWorking = canWork(local);
  const canConfirm =
    isWorking && local.pendingOperand1 !== null && local.pendingOperand2 !== null && local.pendingOperator !== null;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-serif text-xl font-semibold text-ink">Prove {declared}</p>
      {proving && <ProveClocks state={local} onExpire={() => dispatch({ type: "PROVE_TIMEOUT" })} />}
      <TileRack
        tiles={local.pool}
        pendingOperand1={local.pendingOperand1}
        pendingOperand2={local.pendingOperand2}
        disabled={!isWorking}
        onSelectTile={(tileId) => dispatch({ type: "SELECT_OPERAND", tileId })}
      />
      <OperatorBar
        pendingOperator={local.pendingOperator}
        canConfirm={canConfirm}
        canUndo={local.steps.length > 0}
        disabled={!isWorking}
        onSelectOperator={(operator) => dispatch({ type: "SELECT_OPERATOR", operator })}
        onConfirm={() => dispatch({ type: "CONFIRM_STEP" })}
        onUndo={() => dispatch({ type: "UNDO_STEP" })}
        onClear={() => dispatch({ type: "CLEAR_CALCULATOR" })}
      />
      <StepHistory steps={local.steps} />
      <Button variant="secondary" disabled={!isWorking} onClick={() => dispatch({ type: "SUBMIT_ANSWER" })}>
        Give up
      </Button>
    </div>
  );
}
