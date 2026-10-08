import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cryptoRng } from "@/lib/shared/random";
import { MatchError, ServerDeps } from "./matchService";
import { loadServerAssets } from "./assets";

// Resolves the signed-in user from the cookie session (never from the body)
// and builds the authoritative deps. Returns a NextResponse on failure.
export async function authedDeps(): Promise<{ userId: string; deps: ServerDeps } | NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Online play is not configured" }, { status: 503 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  const { dictionary, solutions } = loadServerAssets();
  return {
    userId: data.user.id,
    deps: { admin: createAdminClient(), dictionary, solutions, rng: cryptoRng(), now: Date.now },
  };
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof MatchError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error("match route error", e); // details stay in server logs
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
