"use client";

import { useState } from "react";
import Link from "next/link";
import { useDuelMatch } from "@/lib/match/client/useDuelMatch";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { DuelLettersRound } from "./DuelLettersRound";
import { DuelNumbersRound } from "./DuelNumbersRound";
import { DuelConundrumRound } from "./DuelConundrumRound";
import { DuelReveal } from "./DuelReveal";
import { DuelFinal } from "./DuelFinal";
import { useRoundActions } from "./useRoundActions";
import { GuestSignIn } from "@/components/auth/GuestSignIn";
import { useLeaveGuard } from "@/lib/shared/leaveGuard";

export function DuelRoom({ code }: { code: string }) {
  const view = useDuelMatch(code);
  const inMatch = view.state?.phase === "playing" || view.state?.phase === "reveal";
  useLeaveGuard(inMatch, "Leave the duel? You can come back with the room link, or resign below.");

  if (view.status === "unconfigured") {
    return <Notice title="Online play isn't switched on here" body="Solo games and the Daily Countdown work without it." />;
  }
  if (view.status === "loading") return <p className="text-ink-soft">Finding your room…</p>;
  if (view.status === "needs-auth") {
    return (
      <Notice title="Join this duel" body="Pick a name and you're in — no account needed.">
        <GuestSignIn cta="Join as guest" />
        <Link href={`/account?next=/duel/${code}`} className="text-sm font-bold text-accent underline">
          Or sign in to your account
        </Link>
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
      {state.phase !== "final" && <Scoreboard view={view} />}
      {state.phase === "lobby" && <Lobby view={view} code={code} />}
      {state.phase === "playing" && state.round?.kind === "letters" && <DuelLettersRound key={view.round?.id} view={view} />}
      {state.phase === "playing" && state.round?.kind === "numbers" && <DuelNumbersRound key={view.round?.id} view={view} />}
      {state.phase === "playing" && state.round?.kind === "conundrum" && <DuelConundrumRound key={view.round?.id} view={view} />}
      {state.phase === "reveal" && <DuelReveal key={view.round?.id} view={view} />}
      {state.phase === "final" && <DuelFinal view={view} />}
      {(state.phase === "playing" || state.phase === "reveal") && <ResignButton matchId={view.matchId!} />}
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

function ResignButton({ matchId }: { matchId: string }) {
  const { send, busy, error } = useRoundActions(matchId);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col items-center gap-2">
      {confirming ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-ink">Resign this duel?</span>
          <Button variant="danger" disabled={busy} onClick={() => void send("resign")}>Yes, resign</Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>Keep playing</Button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="text-sm font-bold text-ink-soft underline hover:text-urgent">
          Resign
        </button>
      )}
      {error && <p role="alert" className="text-sm font-bold text-urgent">{error}</p>}
    </div>
  );
}
