"use client";

import { useEffect, useMemo, useState } from "react";
import { animate, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { DuelView } from "@/lib/match/client/useDuelMatch";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Panel } from "@/components/ui/Panel";
import { playSound } from "@/lib/shared/sound";

interface FinalSubmission {
  player_id: string;
  payload: Record<string, unknown>;
  rounds: { idx: number };
}

function CountUp({ to }: { to: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [to]);
  return <>{value}</>;
}

function detailFor(kind: string, payload: Record<string, unknown> | undefined, points: number): string {
  if (kind === "letters") return ((payload?.word as string) || "—").toUpperCase();
  if (kind === "numbers") {
    if (payload?.declared === undefined) return "—";
    return `${payload.declared as number}${payload.proven ? " ✓" : points > 0 ? "" : " ✗"}`;
  }
  return points > 0 ? "solved" : "—";
}

export function DuelFinal({ view }: { view: DuelView }) {
  const state = view.state!;
  const { players, userId, matchId } = view;
  const supabase = useMemo(() => createClient(), []);
  const [subs, setSubs] = useState<FinalSubmission[]>([]);
  const [copied, setCopied] = useState(false);

  // Every round is revealed by now, so RLS lets both players read all of it.
  useEffect(() => {
    if (!matchId) return;
    let alive = true;
    supabase
      .from("round_submissions")
      .select("player_id, payload, rounds!inner(idx, match_id)")
      .eq("rounds.match_id", matchId)
      .then(({ data }) => {
        if (alive) setSubs((data ?? []) as unknown as FinalSubmission[]);
      });
    return () => {
      alive = false;
    };
  }, [supabase, matchId]);

  const youWon = state.winner === userId;
  useEffect(() => {
    playSound(state.winner === "draw" ? "confirm" : youWon ? "success" : "fail");
  }, [state.winner, youWon]);

  const winner = players.find((p) => p.id === state.winner);
  const resigner = players.find((p) => p.id === state.resignedBy);
  const headline =
    state.winner === "draw" ? "A draw!" : youWon ? "You win!" : `${winner?.name ?? "Your opponent"} wins`;
  const subline = resigner
    ? `${resigner.id === userId ? "You" : resigner.name} resigned.`
    : state.winner === "draw"
      ? "Honours even."
      : youWon
        ? "Well played."
        : "Better luck next time.";

  const summary = [
    `Countdowndle duel — ${players.map((p) => `${p.name} ${state.scores[p.id] ?? 0}`).join(" · ")}`,
    ...state.history.map(
      (r, i) => `${i + 1}. ${r.kind}: ${players.map((p) => r.points[p.id] ?? 0).join("–")}`,
    ),
    resigner ? `${resigner.name} resigned` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Panel className="flex w-full max-w-lg flex-col items-center gap-5 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="flex flex-col items-center gap-1"
      >
        <span className="text-xs font-bold tracking-[0.14em] text-accent uppercase">Final result</span>
        <h2 className={`font-serif text-4xl font-semibold ${youWon ? "text-forest" : "text-ink"}`}>{headline}</h2>
        <p className="text-sm text-ink-soft">{subline}</p>
      </motion.div>

      <div className="flex w-full items-center justify-center gap-6">
        {players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-6">
            {i > 0 && <span className="font-serif text-2xl text-tile-edge">—</span>}
            <div className="flex min-w-0 flex-col items-center">
              <span className="max-w-[9rem] truncate text-sm font-bold text-ink">
                {p.name}
                {p.id === userId ? " (you)" : ""}
              </span>
              <span
                className={`font-serif text-5xl font-bold ${p.id === state.winner ? "text-forest" : "text-ink"}`}
              >
                <CountUp to={state.scores[p.id] ?? 0} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {state.history.length > 0 && (
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 border-t border-dashed border-tile-edge pt-4 text-left">
          <span className="text-xs font-bold tracking-[0.14em] text-accent uppercase">Round</span>
          {players.map((p) => (
            <span key={p.id} className="truncate text-right text-xs font-bold tracking-[0.14em] text-accent uppercase">
              {p.name}
            </span>
          ))}
          {state.history.map((r, idx) => (
            <motion.div
              key={idx}
              className="contents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + idx * 0.15 }}
            >
              <span className="font-serif text-base font-semibold capitalize text-ink">{r.kind}</span>
              {players.map((p) => {
                const points = r.points[p.id] ?? 0;
                const sub = subs.find((s) => s.player_id === p.id && s.rounds.idx === idx);
                return (
                  <span key={p.id} className="flex items-baseline justify-end gap-2">
                    <span className="truncate font-serif text-sm text-ink-soft">{detailFor(r.kind, sub?.payload, points)}</span>
                    <span className="w-8 text-right font-serif text-lg font-semibold text-forest">+{points}</span>
                  </span>
                );
              })}
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Home</ButtonLink>
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(summary);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied!" : "Copy result"}
        </Button>
        <ButtonLink href="/duel" variant="primary">
          Play another duel
        </ButtonLink>
      </div>
    </Panel>
  );
}
