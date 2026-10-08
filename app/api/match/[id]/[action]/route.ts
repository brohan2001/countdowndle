import { NextResponse } from "next/server";
import {
  advance, answerConundrum, buzzConundrum, declareNumbers, nextRound,
  proveNumbers, startMatch, submitLetters,
} from "@/lib/match/server/matchService";
import { authedDeps, errorResponse, readJson } from "@/lib/match/server/http";
import type { ProofStep } from "@/lib/numbers/proof";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Bad match id" }, { status: 400 });

  const auth = await authedDeps();
  if (auth instanceof NextResponse) return auth;
  const { deps, userId } = auth;
  const body = await readJson(request);
  const bad = (message: string) => NextResponse.json({ error: message }, { status: 400 });

  try {
    switch (action) {
      case "start":
        await startMatch(deps, userId, id);
        return NextResponse.json({ ok: true });
      case "next":
        await nextRound(deps, userId, id);
        return NextResponse.json({ ok: true });
      case "letters":
        if (typeof body.word !== "string" || body.word.length > 20) return bad("word required");
        await submitLetters(deps, userId, id, body.word);
        return NextResponse.json({ ok: true });
      case "declare":
        if (typeof body.value !== "number") return bad("value required");
        await declareNumbers(deps, userId, id, body.value);
        return NextResponse.json({ ok: true });
      case "prove":
        if (!Array.isArray(body.steps) || body.steps.length > 6) return bad("steps required");
        await proveNumbers(deps, userId, id, body.steps as ProofStep[]);
        return NextResponse.json({ ok: true });
      case "buzz":
        await buzzConundrum(deps, userId, id);
        return NextResponse.json({ ok: true });
      case "answer":
        if (typeof body.guess !== "string" || body.guess.length > 20) return bad("guess required");
        return NextResponse.json(await answerConundrum(deps, userId, id, body.guess));
      case "advance":
        return NextResponse.json(await advance(deps, userId, id));
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 404 });
    }
  } catch (e) {
    return errorResponse(e);
  }
}
