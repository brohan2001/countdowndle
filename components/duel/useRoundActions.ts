"use client";

import { useCallback, useState } from "react";
import { matchAction } from "@/lib/match/client/api";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// POSTs a round action and surfaces the server's error message, if any.
export function useRoundActions(matchId: string) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = useCallback(
    async <T = Record<string, unknown>>(action: string, body?: unknown) => {
      setBusy(true);
      setError(null);
      const res = await matchAction<T>(matchId, action, body);
      if (!res.ok) setError(res.data.error ?? "Something went wrong");
      setBusy(false);
      return res;
    },
    [matchId],
  );

  // Called when a local clock hits zero. The server only acts once the
  // deadline has truly passed, so retry briefly to absorb clock skew.
  const advanceWhenDue = useCallback(async () => {
    for (let i = 0; i < 8; i++) {
      const res = await matchAction<{ applied: boolean }>(matchId, "advance");
      if (!res.ok || res.data.applied) return;
      await sleep(800);
    }
  }, [matchId]);

  return { send, busy, error, advanceWhenDue };
}
