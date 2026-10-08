// Integration tests against a LOCAL Supabase (`supabase start`). They are
// skipped automatically when the local env is not configured, so CI without
// Docker stays green. Run with: pnpm vitest run tests/integration
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
const isLocal = !!url && /127\.0\.0\.1|localhost/.test(url);
const run = isLocal && !!anon && !!service ? describe : describe.skip;

run("supabase auth + profiles (local stack)", () => {
  const fresh = () => createClient(url, anon, { auth: { persistSession: false } });
  const admin = () => createClient(url, service, { auth: { persistSession: false } });
  let reachable = true;

  beforeAll(async () => {
    try {
      await fetch(`${url}/auth/v1/health`);
    } catch {
      reachable = false;
    }
  });

  it("anonymous sign-in creates an anonymous profile with a default name", async () => {
    if (!reachable) return;
    const c = fresh();
    const { data, error } = await c.auth.signInAnonymously();
    expect(error).toBeNull();
    const id = data.user!.id;
    const { data: profile } = await c.from("profiles").select("*").eq("id", id).single();
    expect(profile?.is_anonymous).toBe(true);
    expect(profile?.display_name).toMatch(/^Player [0-9a-f]{4}$/);
    await admin().auth.admin.deleteUser(id);
  });

  it("a user can set their display name (and only theirs)", async () => {
    if (!reachable) return;
    const a = fresh();
    const b = fresh();
    const ua = (await a.auth.signInAnonymously()).data.user!;
    const ub = (await b.auth.signInAnonymously()).data.user!;
    const renamed = await a.from("profiles").update({ display_name: "Rowan" }).eq("id", ua.id).select();
    expect(renamed.data?.[0]?.display_name).toBe("Rowan");
    const attack = await a.from("profiles").update({ display_name: "Pwned" }).eq("id", ub.id).select();
    expect(attack.data).toEqual([]);
    const tooLong = await a.from("profiles").update({ display_name: "x".repeat(40) }).eq("id", ua.id);
    expect(tooLong.error).not.toBeNull();
    await admin().auth.admin.deleteUser(ua.id);
    await admin().auth.admin.deleteUser(ub.id);
  });

  it("browser clients cannot read matches or write anything but their name", async () => {
    if (!reachable) return;
    const c = fresh();
    const u = (await c.auth.signInAnonymously()).data.user!;
    const read = await c.from("matches").select("*");
    expect(read.data).toEqual([]);
    const write = await c.from("matches").insert({ code: "ABC234", host_id: u.id });
    expect(write.error).not.toBeNull();
    const secrets = await c.from("round_secrets").select("*");
    expect(secrets.data).toEqual([]);
    await admin().auth.admin.deleteUser(u.id);
  });

  it("an anonymous account upgrades in place, keeping its id and flipping is_anonymous", async () => {
    if (!reachable) return;
    const c = fresh();
    const anonUser = (await c.auth.signInAnonymously()).data.user!;
    const email = `upgrade-${Date.now()}@example.test`;
    const { error: e1 } = await c.auth.updateUser({ email, password: "correct-horse-battery" });
    expect(e1).toBeNull();
    // The local stack has email confirmations off, so the upgrade is
    // immediate. A hosted project with confirmations on flips is_anonymous
    // only after the user clicks the emailed link.
    const { data } = await admin().auth.admin.getUserById(anonUser.id);
    expect(data.user?.id).toBe(anonUser.id);
    expect(data.user?.is_anonymous).toBe(false);
    const { data: profile } = await admin().from("profiles").select("is_anonymous").eq("id", anonUser.id).single();
    expect(profile?.is_anonymous).toBe(false);
    await admin().auth.admin.deleteUser(anonUser.id);
  });
});
