import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabasePublicEnv } from "./env";

// Server client acting AS THE SIGNED-IN USER (cookie session, subject to RLS).
// Use it to learn who is calling; use admin.ts for authoritative writes.
export async function createClient() {
  const { url, key } = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, which cannot set cookies. The
          // proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
