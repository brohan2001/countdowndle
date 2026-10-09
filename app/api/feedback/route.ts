import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { readJson } from "@/lib/match/server/http";
import { RATE_LIMIT_PER_HOUR, parseFeedback } from "@/lib/feedback/validate";

// Hash the client address so rate limiting works without storing raw IPs.
function clientHash(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(`countdowndle-feedback:${ip}`).digest("hex");
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "The feedback form is offline — please email instead." }, { status: 503 });
  }
  const parsed = parseFeedback(await readJson(request));
  if (!parsed.ok) {
    // Pretend success to bots so they don't adapt.
    if (parsed.spam) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const hash = clientHash(request);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("client_hash", hash)
      .gte("created_at", since);
    if (countError) throw countError;
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json({ error: "Thanks — that's plenty for now. Try again in an hour." }, { status: 429 });
    }

    // Attach the user if signed in (guest or account); feedback works signed out too.
    const { data } = await (await createClient()).auth.getUser();
    const { error } = await admin.from("feedback").insert({
      ...parsed.value,
      user_id: data.user?.id ?? null,
      client_hash: hash,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("feedback route error", e);
    return NextResponse.json({ error: "Couldn't send that — please email instead." }, { status: 500 });
  }
}
