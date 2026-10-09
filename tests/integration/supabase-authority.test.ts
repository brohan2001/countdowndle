// Server-authority model against a LOCAL Supabase: the service role writes,
// real signed-in browser clients only see what RLS allows. Skipped without
// the local stack (see supabase-auth.test.ts).
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(): Record<string, string> {
  if (!existsSync(".env.local")) return {};
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );
}
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const run = !!url && /127\.0\.0\.1|localhost/.test(url) && anon && service ? describe : describe.skip;

run("server authority (local stack)", () => {
  const browser = () => createClient(url, anon, { auth: { persistSession: false } });
  // describe.skip still runs this body, so never pass an undefined URL.
  const admin = createClient(url ?? "http://127.0.0.1:54321", service ?? "unused", { auth: { persistSession: false } });
  let reachable = true;
  beforeAll(async () => {
    try {
      await fetch(`${url}/auth/v1/health`);
    } catch {
      reachable = false;
    }
  });

  it("solutions stay hidden until the server reveals the round", async () => {
    if (!reachable) return;
    const [a, b, outsider] = [browser(), browser(), browser()];
    const ua = (await a.auth.signInAnonymously()).data.user!;
    const ub = (await b.auth.signInAnonymously()).data.user!;
    const uc = (await outsider.auth.signInAnonymously()).data.user!;

    // The server (service role) creates everything.
    const code = Array.from({ length: 6 }, () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 31)]).join("");
    const match = await admin.from("matches").insert({ code, host_id: ua.id, status: "playing" }).select().single();
    expect(match.error).toBeNull();
    const matchId = match.data!.id as string;
    await admin.from("match_players").insert([
      { match_id: matchId, player_id: ua.id, seat: 0 },
      { match_id: matchId, player_id: ub.id, seat: 1 },
    ]);
    const round = await admin
      .from("rounds")
      .insert({
        match_id: matchId,
        idx: 2,
        kind: "conundrum",
        public_data: { scrambled: "nealtbsru" },
        deadline_at: new Date(Date.now() + 30_000).toISOString(),
      })
      .select()
      .single();
    expect(round.error).toBeNull();
    const roundId = round.data!.id as string;
    await admin.from("round_secrets").insert({ round_id: roundId, secret_data: { solution: "ratbleuns" } });

    // Players see the public round, never the solution, pre-reveal.
    expect((await a.from("rounds").select("public_data").eq("id", roundId)).data).toEqual([{ public_data: { scrambled: "nealtbsru" } }]);
    expect((await a.from("round_secrets").select("*")).data).toEqual([]);
    expect((await b.from("round_secrets").select("*")).data).toEqual([]);
    expect((await outsider.from("rounds").select("*")).data).toEqual([]);

    // First buzz wins atomically; the loser's insert violates the unique key.
    const first = await admin.from("buzzes").insert({ round_id: roundId, attempt: 0, player_id: ua.id });
    const second = await admin.from("buzzes").insert({ round_id: roundId, attempt: 0, player_id: ub.id });
    expect(first.error).toBeNull();
    expect(second.error?.code).toBe("23505");

    // Reveal: members now read the solution, the outsider still cannot.
    await admin.from("rounds").update({ status: "revealed" }).eq("id", roundId);
    expect((await a.from("round_secrets").select("secret_data")).data).toEqual([{ secret_data: { solution: "ratbleuns" } }]);
    expect((await b.from("round_secrets").select("secret_data")).data).toHaveLength(1);
    expect((await outsider.from("round_secrets").select("*")).data).toEqual([]);

    await admin.from("matches").delete().eq("id", matchId);
    for (const u of [ua, ub, uc]) await admin.auth.admin.deleteUser(u.id);
  });
});
