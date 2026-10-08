"use client";

import Link from "next/link";
import { useDuelMatch } from "@/lib/match/client/useDuelMatch";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { DuelLettersRound } from "./DuelLettersRound";
import { DuelNumbersRound } from "./DuelNumbersRound";
import { DuelConundrumRound } from "./DuelConundrumRound";
import { DuelReveal } from "./DuelReveal";
import { useRoundActions } from "./useRoundActions";

export function DuelRoom({ code }: { code: string }) {
  const view = useDuelMatch(code);

  if (view.status === "unconfigured") {
    return <Notice title="Online play isn't switched on here" body="Solo games and the daily desk work without it." />;
  }
  if (view.status === "loading") return <p className="text-ink-soft">Finding your room…</p>;
  if (view.status === "needs-auth") {
    return (
      <Notice title="Sign in to play a duel" body="Guests are welcome — pick a name and you're in.">
        <Link href="/account" className="font-bold text-accent underline">Go to your desk</Link>
      </Notice>
    );
  }
  if (view.status === "error") {
    return (
      <Notice title="Can't open that room" body={view.error ?? "Something went wrong."}>
        <Link href="/duel" className="font-bold text-accent underline">Back to duels</Link>
      </Notice>
    );
  }

  const state = view.state!;
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Scoreboard view={view} />
      {state.phase === "lobby" && <Lobby view={view} code={code} />}
      {state.phase === "playing" && state.round?.kind === "letters" && <DuelLettersRound key={view.round?.id} view={view} />}
      {state.phase === "playing" && state.round?.kind === "numbers" && <DuelNumbersRound key={view.round?.id} view={view} />}
      {state.phase === "playing" && state.round?.kind === "conundrum" && <DuelConundrumRound key={view.round?.id} view={view} />}
      {state.phase === "reveal" && <DuelReveal key={view.round?.id} view={view} />}
      {state.phase === "final" && <Final view={view} />}
    </div>
  );
}

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <Panel className="flex w-full max-w-md flex-col items-center gap-2 text-center">
      <p className="font-serif text-xl font-semibold text-ink">{title}</p>
      <p className="text-sm text-ink-soft">{body}</p>
      {children}
    </Panel>
  );
}

function Scoreboard({ view }: { view: ReturnType<typeof useDuelMatch> }) {
  return (
    <div className="flex w-full max-w-md justify-between gap-4 border-b border-dashed border-tile-edge pb-3">
      {view.players.map((p) => (
        <div key={p.id} className="flex flex-col items-center">
          <span className="flex items-center gap-1 text-sm font-bold text-ink">
            <span
              aria-label={view.online.has(p.id) ? "online" : "offline"}
              className={`inline-block h-2 w-2 rounded-full ${view.online.has(p.id) ? "bg-forest" : "bg-tile-edge"}`}
            />
            {p.name}{p.id === view.userId ? " (you)" : ""}
          </span>
          <span className="font-serif text-3xl font-semibold text-ink">
            {view.state?.scores[p.id] ?? p.score}
          </span>
        </div>
      ))}
    </div>
  );
}

function Lobby({ view, code }: { view: ReturnType<typeof useDuelMatch>; code: string }) {
  const { send, busy, error } = useRoundActions(view.matchId!);
  const isHost = view.userId === view.hostId;
  const ready = view.players.length === 2;
  const link = typeof window !== "undefined" ? `${window.location.origin}/duel/${code}` : `/duel/${code}`;

  return (
    <Panel className="flex w-full max-w-md flex-col items-center gap-4 text-center">
      <span className="text-xs font-bold tracking-[0.14em] text-accent uppercase">Room code</span>
      <p className="font-serif text-5xl font-bold tracking-[0.2em] text-ink">{code}</p>
      <p className="text-sm text-ink-soft">Send this link to your opponent:</p>
      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Room link" className="w-full rounded-desk border-[1.5px] border-tile-edge bg-dial px-3 py-2 text-center text-sm text-ink" />
      <p className="font-bold text-ink">{ready ? "Both players are here." : "Waiting for an opponent…"}</p>
      {isHost ? (
        <Button disabled={!ready || busy} onClick={() => void send("start")}>Start the match</Button>
      ) : (
        <p className="text-sm text-ink-soft">Waiting for the host to start.</p>
      )}
      {error && <p role="alert" className="text-sm font-bold text-urgent">{error}</p>}
    </Panel>
  );
}

function Final({ view }: { view: ReturnType<typeof useDuelMatch> }) {
  const state = view.state!;
  const winner = view.players.find((p) => p.id === state.winner);
  const headline = state.winner === "draw" ? "A draw!" : state.winner === view.userId ? "You win!" : `${winner?.name ?? "Your opponent"} wins`;
  return (
    <Panel className="flex w-full max-w-md flex-col items-center gap-3 text-center">
      <h2 className="font-serif text-3xl font-semibold text-ink">{headline}</h2>
      <p className="text-sm text-ink-soft">
        {view.players.map((p) => `${p.name} ${state.scores[p.id] ?? 0}`).join(" — ")}
      </p>
      <Link href="/duel" className="font-bold text-accent underline">Play another duel</Link>
    </Panel>
  );
}
