import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "./env";

// Browser client: subject to RLS. Use for reads, realtime and auth only.
export function createClient() {
  const { url, key } = requireSupabasePublicEnv();
  return createBrowserClient(url, key);
}
