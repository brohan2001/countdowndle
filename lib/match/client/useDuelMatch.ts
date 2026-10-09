"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { joinRoom, measureClockOffset } from "./api";
import type { MatchState } from "../types";

export interface DuelPlayer {
  id: string;
  name: string;
  seat: number;
  score: number;
}

export interface DuelRound {
  id: string;
  idx: number;
  kind: "letters" | "numbers" | "conundrum";
  publicData: Record<string, unknown>;
  status: "playing" | "revealed";
  deadlineMs: number; // server clock
}

export type DuelStatus = "loading" | "unconfigured" | "needs-auth" | "error" | "ready";

export interface DuelView {
  status: DuelStatus;
  error: string | null;
  userId: string | null;
  matchId: string | null;
  hostId: string | null;
  state: MatchState | null;
  players: DuelPlayer[];
  round: DuelRound | null;
  secrets: Record<number, Record<string, unknown>>; // by round idx, revealed only
  online: Set<string>;
  clockOffset: number; // server - client, ms
}

const INITIAL: DuelView = {
  status: "loading",
  error: null,
  userId: null,
  matchId: null,
  hostId: null,
  state: null,
  players: [],
  round: null,
  secrets: {},
  online: new Set(),
  clockOffset: 0,
};

// Postgres is the source of truth. Realtime/Presence only say "something
// changed" or "who is here"; every change triggers a full snapshot re-read
// (RLS limits it to what this player may see), so a reconnect or a missed
// event can never leave the UI stale.
export function useDuelMatch(code: string): DuelView {
  const supabase = useMemo(() => (isSupabaseConfigured() ? createClient() : null), []);
  const [view, setView] = useState<DuelView>(
    supabase ? INITIAL : { ...INITIAL, status: "unconfigured" },
  );
  const matchIdRef = useRef<string | null>(null);
  // Snapshots overlap (initial load, subscribe, each change event). Only the
  // most recently STARTED one may apply, or a slow older read could overwrite
  // newer data with stale data.
  const seqRef = useRef(0);

  const snapshot = useCallback(async () => {
    if (!supabase) return;
    const seq = ++seqRef.current;
    const isStale = () => seq !== seqRef.current;
    const { data: userData } = await supabase.auth.getUser();
    if (isStale()) return;
    const user = userData.user;
    if (!user) {
      setView((v) => ({ ...v, status: "needs-auth" }));
      return;
    }

    let match = (await supabase.from("matches").select("id, host_id, state").eq("code", code).maybeSingle()).data;
    if (isStale()) return;
    if (!match) {
      // Not a member yet: ask the server to seat us, then re-read.
      const joined = await joinRoom(code);
      if (isStale()) return;
      if (!joined.ok) {
        setView((v) => ({ ...v, status: "error", error: joined.data.error ?? "Couldn't join that room" }));
        return;
      }
      match = (await supabase.from("matches").select("id, host_id, state").eq("code", code).maybeSingle()).data;
      if (isStale()) return;
      if (!match) {
        setView((v) => ({ ...v, status: "error", error: "Room not found" }));
        return;
      }
    }
    matchIdRef.current = match.id;
    const state = match.state as MatchState;

    const [playersRes, roundsRes, secretsRes] = await Promise.all([
      supabase.from("match_players").select("player_id, seat, score, profiles(display_name)").eq("match_id", match.id),
      supabase.from("rounds").select("id, idx, kind, public_data, status, deadline_at").eq("match_id", match.id),
      supabase.from("round_secrets").select("secret_data, rounds!inner(idx, match_id)").eq("rounds.match_id", match.id),
    ]);

    if (isStale()) return;
    const players: DuelPlayer[] = (playersRes.data ?? [])
      .map((p) => {
        const profile = p.profiles as unknown as { display_name: string } | null;
        return { id: p.player_id as string, seat: p.seat as number, score: p.score as number, name: profile?.display_name ?? "Player" };
      })
      .sort((a, b) => a.seat - b.seat);

    const rows = roundsRes.data ?? [];
    const current = rows.find((r) => r.idx === state.roundIndex && state.round !== null);
    const round: DuelRound | null = current
      ? {
          id: current.id as string,
          idx: current.idx as number,
          kind: current.kind as DuelRound["kind"],
          publicData: current.public_data as Record<string, unknown>,
          status: current.status as DuelRound["status"],
          deadlineMs: new Date(current.deadline_at as string).getTime(),
        }
      : null;

    const secrets: Record<number, Record<string, unknown>> = {};
    for (const s of secretsRes.data ?? []) {
      const r = s.rounds as unknown as { idx: number };
      secrets[r.idx] = s.secret_data as Record<string, unknown>;
    }

    setView((v) => ({
      ...v,
      status: "ready",
      error: null,
      userId: user.id,
      matchId: match.id as string,
      hostId: match.host_id as string,
      state,
      players,
      round,
      secrets,
    }));
  }, [supabase, code]);

  // Initial load + clock offset.
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    // Deferred so the (async) load never runs as a synchronous effect body.
    void Promise.resolve().then(() => {
      if (alive) return snapshot();
    });
    measureClockOffset().then((clockOffset) => {
      if (alive) setView((v) => ({ ...v, clockOffset }));
    });
    // Signing in as a guest right on the room page re-reads (and seats us).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (alive && (event === "SIGNED_IN" || event === "SIGNED_OUT")) void snapshot();
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, snapshot]);

  // Realtime change notifications + presence, once we know the match.
  const matchId = view.matchId;
  const userId = view.userId;
  useEffect(() => {
    if (!supabase || !matchId || !userId) return;
    const channel = supabase.channel(`room:${matchId}`, { config: { presence: { key: userId } } });
    const refresh = () => void snapshot();

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_players", filter: `match_id=eq.${matchId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `match_id=eq.${matchId}` }, refresh)
      .on("presence", { event: "sync" }, () => {
        setView((v) => ({ ...v, online: new Set(Object.keys(channel.presenceState())) }));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ at: Date.now() });
          refresh(); // re-read after (re)connect so nothing is missed
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, matchId, userId, snapshot]);

  return view;
}
