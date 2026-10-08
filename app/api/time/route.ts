import { NextResponse } from "next/server";

// Lets clients estimate their clock offset from the server's, so countdowns
// derived from a server-side deadline are accurate despite clock skew.
export async function GET() {
  return NextResponse.json({ now: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
