import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "./env";

// Refreshes the auth cookies on every matched request so server code always
// sees a fresh session. A no-op when Supabase is not configured, so the
// static single-player app works without any backend.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = getSupabasePublicEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Validates the JWT (and refreshes it if needed). Do not run other logic
  // between creating the client and this call.
  await supabase.auth.getClaims();

  return response;
}
