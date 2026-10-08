"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OPERATOR_SYMBOLS, NumbersOperator } from "@/types/numbers";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useRoundActions } from "./useRoundActions";
import type { DuelView } from "@/lib/match/client/useDuelMatch";

interface Submission {
  player_id: string;
  payload: Record<string, unknown>;
  points: number;
}

export function DuelReveal({ view }: { view: DuelView }) {
  const { state, round, players, secrets, matchId, userId } = view;
  const { send, busy, error } = useRoundActions(matchId!);
  const supabase = useMemo(() => createClient(), []);
  const [subs, setSubs] = useState<Submission[]>([]);

  const roundId = round?.id;
  useEffect(() => {
    if (!roundId) return;
    let alive = true;
    supabase
      .from("round_submissions")
      .select("player_id, payload, points")
      .eq("round_id", roundId)
      .then(({ data }) => {
        if (alive) setSubs((data ?? []) as Submission[]);
      });
    return () => {
      alive = false;
    };
  }, [supabase, roundId]);

  if (!state || !round) return null;
  const outcome = state.history[state.history.length - 1];
  const secret = secrets[round.idx] ?? {};
  const isLast = state.roundIndex + 1 >= state.format.length;

  return (
    <Panel className="flex w-full max-w-md flex-col items-center gap-4">
      <h2 className="font-serif text-2xl font-semibold capitalize text-ink">{round.kind} — result</h2>

      <ul className="flex w-full flex-col gap-1">
        {players.map((p) => {
          const sub = subs.find((s) => s.player_id === p.id);
          const detail =
            round.kind === "letters"
              ? (sub?.payload.word as string) || "—"
              : round.kind === "numbers"
                ? sub?.payload.declared !== undefined
                  ? `declared ${sub.payload.declared as number}${sub.payload.proven ? "" : " (unproven)"}`
                  : "no declaration"
                : outcome?.points[p.id]
                  ? "solved it"
                  : "—";
          return (
            <li key={p.id} className="flex items-baseline justify-between gap-4">
              <span className="font-bold text-ink">{p.name}{p.id === userId ? " (you)" : ""}</span>
              <span className="font-serif text-lg uppercase text-ink-soft">{detail}</span>
              <span className="font-serif text-xl font-semibold text-forest">+{outcome?.points[p.id] ?? 0}</span>
            </li>
          );
        })}
      </ul>

      {round.kind === "conundrum" && typeof secret.solution === "string" && (
        <p className="font-serif text-3xl font-semibold tracking-wider text-ink uppercase">{secret.solution}</p>
      )}
      {round.kind === "letters" && Array.isArray(secret.top) && (
        <p className="text-center text-sm text-ink-soft">
          Best possible ({secret.bestLength as number} letters):{" "}
          <span className="font-serif text-base font-semibold uppercase text-ink">
            {(secret.longest as string[]).slice(0, 4).join(" · ")}
          </span>
        </p>
      )}
      {round.kind === "numbers" && Array.isArray(secret.steps) && (
        <div className="w-full border-t border-dashed border-tile-edge pt-3 text-center">
          <p className="text-sm font-bold text-ink">
            Target {round.publicData.target as number} — closest possible {secret.value as number}
          </p>
          <ol className="font-serif text-lg font-semibold text-ink">
            {(secret.steps as { a: number; op: NumbersOperator; b: number; result: number }[]).map((s, i) => (
              <li key={i}>{s.a} {OPERATOR_SYMBOLS[s.op]} {s.b} = {s.result}</li>
            ))}
          </ol>
        </div>
      )}

      <Button disabled={busy} onClick={() => void send("next")}>
        {isLast ? "See final result" : "Next round"}
      </Button>
      {error && <p role="alert" className="text-sm font-bold text-urgent">{error}</p>}
    </Panel>
  );
}
