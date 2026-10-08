import { NextResponse } from "next/server";
import { joinMatch } from "@/lib/match/server/matchService";
import { authedDeps, errorResponse, readJson } from "@/lib/match/server/http";

export async function POST(request: Request) {
  const auth = await authedDeps();
  if (auth instanceof NextResponse) return auth;
  const body = await readJson(request);
  if (typeof body.code !== "string" || body.code.length > 12) {
    return NextResponse.json({ error: "A room code is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await joinMatch(auth.deps, auth.userId, body.code));
  } catch (e) {
    return errorResponse(e);
  }
}
