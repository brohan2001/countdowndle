import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireSupabasePublicEnv } from "./env";

// Service-role client: BYPASSES RLS. This is the authoritative writer for
// matches, rounds, submissions and buzzes. `server-only` makes importing this
// file from a client component a build error.
export function createAdminClient() {
  const { url } = requireSupabasePublicEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
