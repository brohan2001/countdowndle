// Plays a full quick-format duel through the authoritative service against a
// LOCAL Supabase, with two real signed-in users. Skipped without the stack.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  ServerDeps, MatchError, createMatch, joinMatch, startMatch, nextRound, submitLetters,
  declareNumbers, proveNumbers, buzzConundrum, answerConundrum, advance,
} from "@/lib/match/server/matchService";
import { mulberry32 } from "@/lib/shared/random";
import { parseWordList } from "@/lib/letters/dictionary";
import { MatchState } from "@/lib/match/types";

function loadEnv(): Record<string, string> {
  if (!existsSync(".env.local")) return {};
  return Object.fromEntries(
    readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const run = !!url && /127\.0\.0\.1|localhost/.test(url) && anon && service ? describe : describe.skip;

run("full duel through the authoritative service (local stack)", () => {
  const admin = createClient(url, service ?? "", { auth: { persistSession: false } });
  const dictionary = parseWordList(readFileSync("public/dictionary/words.txt", "utf8"));
  const solutions: string[] = JSON.parse(readFileSync("public/dictionary/conundrums.json", "utf8"));
  let offset = 0;
  const deps: ServerDeps = { admin, dictionary, solutions, rng: mulberry32(2026), now: () => Date.now() + offset };

  let reachable = true;
  let ca: SupabaseClient, cb: SupabaseClient, cc: SupabaseClient;
  let A = "", B = "", C = "";
  let matchId = "";

  beforeAll(async () => {
    try { await fetch(`${url}/auth/v1/health`); } catch { reachable = false; return; }
    const mk = async () => {
      const c = createClient(url, anon, { auth: { persistSession: false } });
      return { c, id: (await c.auth.signInAnonymously()).data.user!.id };
    };
    const [a, b, c] = [await mk(), await mk(), await mk()];
    ca = a.c; cb = b.c; cc = c.c; A = a.id; B = b.id; C = c.id;
  });
  afterAll(async () => {
    if (!reachable) return;
    if (matchId) await admin.from("matches").delete().eq("id", matchId);
    for (const id of [A, B, C]) if (id) await admin.auth.admin.deleteUser(id);
  });

  const state = async (): Promise<MatchState> =>
    (await admin.from("matches").select("state").eq("id", matchId).single()).data!.state as MatchState;
  const roundRow = async (idx: number) =>
    (await admin.from("rounds").select("*").eq("match_id", matchId).eq("idx", idx).single()).data!;
  const secret = async (roundId: string) =>
    (await admin.from("round_secrets").select("secret_data").eq("round_id", roundId).single()).data!.secret_data;
  const expectFail = async (p: Promise<unknown>, status: number) => {
    const err = await p.then(() => null, (e: unknown) => e);
    expect(err).toBeInstanceOf(MatchError);
    expect((err as MatchError).status).toBe(status);
  };

  it("lobby: create, join, and only the host can start", async () => {
    if (!reachable) return;
    const created = await createMatch(deps, A);
    matchId = created.matchId;
    expect(created.code).toMatch(/^[A-Z2-9]{6}$/);
    await expectFail(startMatch(deps, A, matchId), 409); // needs two players
    await expectFail(joinMatch(deps, B, "ZZZZZZ"), 404);
    await joinMatch(deps, B, created.code.toLowerCase());
    await joinMatch(deps, B, created.code); // rejoin is idempotent
    await expectFail(joinMatch(deps, C, created.code), 409); // full
    await expectFail(startMatch(deps, B, matchId), 403);
    await startMatch(deps, A, matchId);
    expect((await state()).phase).toBe("playing");
    expect((await ca.from("matches").select("id")).data).toHaveLength(1);
    expect((await cc.from("matches").select("id")).data).toEqual([]); // outsider
  });

  it("letters: server validates words; results hidden until both submit", async () => {
    if (!reachable) return;
    const row = await roundRow(0);
    const board = (row.public_data as { board: { letter: string }[] }).board;
    expect(board).toHaveLength(9);
    expect((await ca.from("round_secrets").select("*")).data).toEqual([]);

    const best = (await secret(row.id)) as { top: string[] };
    await submitLetters(deps, A, matchId, best.top[0]);
    await expectFail(submitLetters(deps, A, matchId, best.top[0]), 409); // one each
    await expectFail(submitLetters(deps, C, matchId, "word"), 403); // outsider
    const midRound = await state();
    expect(midRound.phase).toBe("playing");
    // Readable state shows A has submitted but not how well.
    expect(midRound.round?.kind === "letters" && midRound.round.points).toEqual({ [A]: 0 });
    const viaB = (await cb.from("matches").select("state").eq("id", matchId).single()).data!.state as MatchState;
    expect(viaB.round?.kind === "letters" && viaB.round.points).toEqual({ [A]: 0 });
    expect((await cb.from("round_submissions").select("*").eq("round_id", row.id)).data).toEqual([]); // B can't see A's word yet
    await submitLetters(deps, B, matchId, "zzzzqqqq"); // not a word -> 0

    const s = await state();
    expect(s.phase).toBe("reveal");
    expect(s.scores[A]).toBe(best.top[0].length === 9 ? 18 : best.top[0].length);
    expect(s.scores[B]).toBe(0);
    expect((await ca.from("round_secrets").select("*")).data).toHaveLength(1); // revealed now
    expect((await cb.from("round_submissions").select("*").eq("round_id", row.id)).data).toHaveLength(2);
    expect((await cc.from("round_secrets").select("*")).data).toEqual([]);
    const players = (await admin.from("match_players").select("player_id, score").eq("match_id", matchId)).data!;
    expect(players.find((p) => p.player_id === A)!.score).toBe(s.scores[A]);
  });

  it("numbers: declarations private, deadline enforced by the server, proof validated", async () => {
    if (!reachable) return;
    await nextRound(deps, A, matchId);
    const row = await roundRow(1);
    const pub = row.public_data as { numbers: number[]; target: number };
    const sol = (await secret(row.id)) as { value: number; steps: { a: number; op: string; b: number }[] };
    expect(pub.numbers).toHaveLength(6);

    await declareNumbers(deps, A, matchId, 1);
    await declareNumbers(deps, A, matchId, sol.value); // update: latest wins
    await declareNumbers(deps, B, matchId, 999);
    const visible = await state();
    expect(visible.round?.kind === "numbers" && visible.round.declarations).toEqual({}); // redacted
    expect((await cb.from("round_submissions").select("*").eq("round_id", row.id)).data).toHaveLength(1); // B sees only their own declaration

    expect((await advance(deps, A, matchId)).applied).toBe(false); // not due
    offset += 33_000; // clock passes the 30s declare deadline plus the 2s grace
    await expectFail(declareNumbers(deps, A, matchId, 5), 409); // beyond grace
    expect((await advance(deps, B, matchId)).applied).toBe(true);

    const proving = await state();
    expect(proving.round?.kind === "numbers" && proving.round.stage).toBe("proving");
    const order = proving.round?.kind === "numbers" ? proving.round.order : [];
    const closestIsA = Math.abs(sol.value - pub.target) <= Math.abs(999 - pub.target);
    expect(order[0]).toBe(closestIsA ? A : B);
    const first = order[0];
    const wrongPlayer = first === A ? B : A;
    await expectFail(proveNumbers(deps, wrongPlayer, matchId, []), 409);

    const steps = sol.steps.map(({ a, op, b }) => ({ a, op: op as "+", b }));
    if (first === A) {
      await proveNumbers(deps, A, matchId, steps);
      expect((await state()).phase).toBe("reveal");
    } else {
      await proveNumbers(deps, B, matchId, [{ a: 1, op: "+", b: 1 }]); // bogus proof fails
      expect((await state()).phase).toBe("playing");
      await proveNumbers(deps, A, matchId, steps);
      expect((await state()).phase).toBe("reveal");
    }
    expect((await cb.from("round_submissions").select("*").eq("round_id", row.id)).data).toHaveLength(2);
  });

  it("conundrum: one winner of a concurrent buzz; wrong answer locks out; opponent solves", async () => {
    if (!reachable) return;
    offset = 0; // buzz times come from the DB clock, so use real time from here
    await nextRound(deps, B, matchId);
    const row = await roundRow(2);
    const { solution } = (await secret(row.id)) as { solution: string };
    expect((row.public_data as { scrambled: string }).scrambled).not.toBe(solution);
    expect(JSON.stringify(row.public_data)).not.toContain(solution);

    const results = await Promise.allSettled([buzzConundrum(deps, A, matchId), buzzConundrum(deps, B, matchId)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const s1 = await state();
    const buzzer = s1.round?.kind === "conundrum" ? s1.round.buzzedBy! : "";
    const other = buzzer === A ? B : A;
    expect([A, B]).toContain(buzzer);

    expect((await answerConundrum(deps, buzzer, matchId, "wronganswer")).correct).toBe(false);
    await expectFail(buzzConundrum(deps, buzzer, matchId), 409); // locked out
    await buzzConundrum(deps, other, matchId);
    expect((await answerConundrum(deps, other, matchId, ` ${solution.toUpperCase()} `)).correct).toBe(true);

    const s = await state();
    expect(s.phase).toBe("reveal");
    expect(s.scores[other]).toBeGreaterThanOrEqual(10);

    await nextRound(deps, A, matchId);
    const final = await state();
    expect(final.phase).toBe("final");
    expect(final.winner).not.toBeNull();
    expect((await admin.from("matches").select("status").eq("id", matchId).single()).data!.status).toBe("finished");
  });

  it("liveness: lapsed deadlines advance every round; a buzzer who stalls is marked wrong", async () => {
    if (!reachable) return;
    offset = 0;
    const m = await createMatch(deps, A);
    const id = m.matchId;
    try {
      await joinMatch(deps, B, m.code);
      await startMatch(deps, A, id);
      const phase = async () => ((await admin.from("matches").select("state").eq("id", id).single()).data!.state as MatchState);

      // Letters: nobody submits; the deadline lapses -> reveal with 0-0.
      expect((await advance(deps, A, id)).applied).toBe(false);
      offset += 33_000;
      expect((await advance(deps, A, id)).applied).toBe(true);
      expect((await phase()).phase).toBe("reveal");
      offset = 0;
      await nextRound(deps, A, id);

      // Numbers: nobody declares -> reveal at 0-0.
      offset += 33_000;
      expect((await advance(deps, B, id)).applied).toBe(true);
      expect((await phase()).phase).toBe("reveal");
      offset = 0;
      await nextRound(deps, B, id);

      // Conundrum: A buzzes then stalls past the 10s answer window.
      await buzzConundrum(deps, A, id);
      expect((await advance(deps, B, id)).applied).toBe(false); // window still open
      offset += 13_000;
      expect((await advance(deps, B, id)).applied).toBe(true);
      const s = await phase();
      expect(s.phase).toBe("playing");
      expect(s.round?.kind === "conundrum" && s.round.lockedOut).toEqual([A]);
      await expectFail(buzzConundrum(deps, A, id), 409);
      await buzzConundrum(deps, B, id); // B gets the remaining time
      offset += 33_000; // B stalls too and the round clock lapses
      await advance(deps, A, id);
      await advance(deps, A, id);
      expect((await phase()).phase).toBe("reveal");
      expect((await phase()).scores).toEqual({ [A]: 0, [B]: 0 });
    } finally {
      offset = 0;
      await admin.from("matches").delete().eq("id", id);
    }
  });
});
