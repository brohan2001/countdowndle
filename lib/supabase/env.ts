// The Supabase browser key is public by design (access is enforced by RLS).
// The service-role key is NOT: it bypasses RLS and must never reach the
// browser, so it is read only in admin.ts (server-only).
export function getSupabasePublicEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicEnv() !== null;
}

export function requireSupabasePublicEnv(): { url: string; key: string } {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  return env;
}
