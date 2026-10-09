"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRoom, joinRoom } from "@/lib/match/client/api";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export function DuelEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <Panel className="w-full max-w-md text-center">
        <p className="font-serif text-xl font-semibold text-ink">Online play isn&apos;t switched on here</p>
        <p className="mt-2 text-sm text-ink-soft">Solo games and the Daily Countdown work without it.</p>
      </Panel>
    );
  }

  const go = async (action: () => Promise<{ ok: boolean; status: number; data: { error?: string; code?: string } }>, fallbackCode?: string) => {
    setBusy(true);
    setError(null);
    const res = await action();
    if (!res.ok) {
      setError(res.status === 401 ? "Sign in first (guests welcome)." : (res.data.error ?? "Something went wrong"));
      setBusy(false);
      return;
    }
    router.push(`/duel/${res.data.code ?? fallbackCode}`);
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
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
      <p className="text-center text-sm text-ink-soft">
        Need a name first? <Link href="/account" className="font-bold text-accent underline">Go to your account</Link>
      </p>
    </div>
  );
}
