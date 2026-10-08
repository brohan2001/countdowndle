import { NextResponse } from "next/server";
import { createMatch } from "@/lib/match/server/matchService";
import { authedDeps, errorResponse } from "@/lib/match/server/http";

export async function POST() {
  const auth = await authedDeps();
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json(await createMatch(auth.deps, auth.userId));
  } catch (e) {
    return errorResponse(e);
  }
}
