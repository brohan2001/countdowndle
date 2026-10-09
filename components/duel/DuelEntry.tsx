"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRoom, joinRoom, type ActionResult } from "@/lib/match/client/api";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { GuestSignIn } from "@/components/auth/GuestSignIn";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

type RoomAction = () => Promise<ActionResult<{ code?: string; matchId?: string }>>;

export function DuelEntry() {
  if (!isSupabaseConfigured()) {
    return (
      <Panel className="w-full max-w-md text-center">
        <p className="font-serif text-xl font-semibold text-ink">Online play isn&apos;t switched on here</p>
        <p className="mt-2 text-sm text-ink-soft">Solo games and the Daily Countdown work without it.</p>
      </Panel>
    );
  }
  return <ConfiguredDuelEntry />;
}

function ConfiguredDuelEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // undefined = still checking, null = signed out
  const [playerName, setPlayerName] = useState<string | null | undefined>(undefined);
  // The room action that was waiting for a guest sign-in, re-run afterwards.
  const pending = useRef<{ action: RoomAction; fallbackCode?: string } | null>(null);
  const [askName, setAskName] = useState(false);

  useEffect(() => {
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!alive) return;
        const user = data.user;
        setPlayerName(user ? ((user.user_metadata?.display_name as string | undefined) || "Guest") : null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const go = async (action: RoomAction, fallbackCode?: string) => {
    setBusy(true);
    setError(null);
    const res = await action();
    if (!res.ok) {
      setBusy(false);
      if (res.status === 401) {
        pending.current = { action, fallbackCode };
        setAskName(true);
        return;
      }
      setError(res.data.error ?? "Something went wrong");
      return;
    }
    router.push(`/duel/${res.data.code ?? fallbackCode}`);
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      {(askName || playerName === null) && (
        <Panel className="flex flex-col items-center gap-3 text-center">
          <h2 className="font-serif text-2xl font-semibold text-ink">Who&apos;s playing?</h2>
          <p className="text-sm text-ink-soft">No account needed — pick a name and go.</p>
          <GuestSignIn
            onSignedIn={() => {
              setAskName(false);
              setPlayerName("Guest");
              const next = pending.current;
              pending.current = null;
              if (next) void go(next.action, next.fallbackCode);
            }}
          />
          <Link href="/account?next=/duel" className="text-sm font-bold text-accent underline">
            Or sign in to your account
          </Link>
        </Panel>
      )}
      <Panel className="flex flex-col items-center gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">Start a room</h2>
        <Button disabled={busy} onClick={() => void go(createRoom)}>Create room</Button>
      </Panel>
      <Panel className="flex flex-col items-center gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">Join a room</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const c = code.trim().toUpperCase();
            if (c) void go(() => joinRoom(c), c);
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            placeholder="ABC234"
            aria-label="Room code"
            autoComplete="off"
            className="w-32 rounded-desk border-[1.5px] border-tile-edge bg-paper px-3 py-2 text-center font-serif text-xl font-semibold tracking-[0.2em] text-ink uppercase focus:border-brass focus:outline-none"
          />
          <Button type="submit" disabled={busy || code.trim() === ""}>Join</Button>
        </form>
      </Panel>
      {error && <p role="alert" className="text-center text-sm font-bold text-urgent">{error}</p>}
      {playerName && (
        <p className="text-center text-sm text-ink-soft">
          Playing as <span className="font-bold text-ink">{playerName}</span> ·{" "}
          <Link href="/account?next=/duel" className="font-bold text-accent underline">Account</Link>
        </p>
      )}
    </div>
  );
}
