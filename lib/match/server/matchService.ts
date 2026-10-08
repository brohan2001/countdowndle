// Authoritative duel logic. Runs on the server with the service-role client;
// browsers can only read (RLS) and call the thin route handlers around these
// functions. Puzzles and solutions are generated here, validated here, and
// solutions are only written where RLS releases them after reveal.
import type { SupabaseClient } from "@supabase/supabase-js";
import { ANSWER_WINDOW_SECONDS } from "@/types/conundrum";
import { validateWord } from "../../letters/dictionary";
import { scoreWord } from "../../letters/scoring";
import { analyzeBestWords } from "../../letters/bestWords";
import { getTrie } from "../../letters/trie";
import { solveNumbers } from "../../numbers/solver";
import { ProofStep, validateProof } from "../../numbers/proof";
import { makePuzzle, pickSolution } from "../../conundrum/puzzle";
import { lettersBoardFromRng, numbersPuzzleFromRng } from "../../daily/puzzles";
import { Rng } from "../../shared/random";
import { createMatchState, matchReducer } from "../matchReducer";
import { LetterTile } from "@/types/letters";
import { MatchAction, MatchState, PlayerId, RoundKind } from "../types";

export const LETTERS_SECONDS = 30;
export const NUMBERS_DECLARE_SECONDS = 30;
// Overall cap for the proving stage. The 5s per-tap clock is enforced in the
// client UI (ticks are not sent over the network); the server bounds the whole
// proof so a stalled or cheating client can't hold the match open.
export const PROOF_CAP_SECONDS = 90;
export const CONUNDRUM_SECONDS = 30;
export const GRACE_MS = 2000;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // matches the DB check (no 0/1/I/L/O)

export class MatchError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ServerDeps {
  admin: SupabaseClient;
  dictionary: Set<string>;
  solutions: string[];
  rng: Rng;
  now: () => number; // ms; injectable for tests
}

interface LoadedMatch {
  id: string;
  code: string;
  hostId: string;
  version: number;
  state: MatchState;
}

interface RoundRow {
  id: string;
  idx: number;
  kind: RoundKind;
  public_data: Record<string, unknown>;
  status: "playing" | "revealed";
  deadline_at: string;
}

function fail(status: number, message: string): never {
  throw new MatchError(status, message);
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error || res.data === null) fail(500, `${what}: ${res.error?.message ?? "no data"}`);
  return res.data;
}

// ---------------------------------------------------------------- loading

async function loadMatch(deps: ServerDeps, matchId: string): Promise<LoadedMatch> {
  const res = await deps.admin
    .from("matches")
    .select("id, code, host_id, version, state")
    .eq("id", matchId)
    .maybeSingle();
  if (res.error) fail(500, res.error.message);
  if (!res.data) fail(404, "Match not found");
  return {
    id: res.data.id,
    code: res.data.code,
    hostId: res.data.host_id,
    version: res.data.version,
    state: res.data.state as MatchState,
  };
}

async function loadRound(deps: ServerDeps, matchId: string, idx: number): Promise<RoundRow> {
  const res = await deps.admin
    .from("rounds")
    .select("id, idx, kind, public_data, status, deadline_at")
    .eq("match_id", matchId)
    .eq("idx", idx)
    .maybeSingle();
  if (res.error) fail(500, res.error.message);
  if (!res.data) fail(404, "Round not found");
  return res.data as RoundRow;
}

function requireMember(state: MatchState, userId: string): void {
  if (!state.players.includes(userId)) fail(403, "Not in this match");
}

// While a round is in play, the persisted (readable) match state hides what
// each player has committed: numbers declarations, and letters points (which
// would reveal how good the opponent's word was). The truth lives in
// round_submissions, which RLS keeps private to its author until reveal, and
// is merged back in here before the engine runs.
async function hydrate(deps: ServerDeps, match: LoadedMatch): Promise<MatchState> {
  const round = match.state.round;
  if (match.state.phase !== "playing" || round === null) return match.state;

  const needsDeclarations = round.kind === "numbers" && round.stage === "declaring";
  if (!needsDeclarations && round.kind !== "letters") return match.state;

  const row = await loadRound(deps, match.id, match.state.roundIndex);
  const subs = await deps.admin
    .from("round_submissions")
    .select("player_id, payload, points")
    .eq("round_id", row.id);
  if (subs.error) fail(500, subs.error.message);

  if (round.kind === "letters") {
    const points: Record<PlayerId, number> = {};
    for (const s of subs.data ?? []) points[s.player_id] = s.points as number;
    return { ...match.state, round: { ...round, points } };
  }
  if (round.kind === "numbers") {
    const declarations: Record<PlayerId, number> = {};
    for (const s of subs.data ?? []) {
      const declared = (s.payload as { declared?: unknown }).declared;
      if (typeof declared === "number") declarations[s.player_id] = declared;
    }
    return { ...match.state, round: { ...round, declarations } };
  }
  return match.state;
}

function redact(state: MatchState): MatchState {
  const round = state.round;
  if (state.phase !== "playing" || round === null) return state;
  if (round.kind === "numbers" && round.stage === "declaring") {
    return { ...state, round: { ...round, declarations: {} } };
  }
  if (round.kind === "letters") {
    // Keep WHO has submitted (so the UI can say "waiting"), hide how well.
    return {
      ...state,
      round: { ...round, points: Object.fromEntries(Object.keys(round.points).map((p) => [p, 0])) },
    };
  }
  return state;
}

// ------------------------------------------------------------ persistence

async function persist(
  deps: ServerDeps,
  match: LoadedMatch,
  before: MatchState,
  after: MatchState,
): Promise<void> {
  const status = after.phase === "lobby" ? "lobby" : after.phase === "final" ? "finished" : "playing";
  const res = await deps.admin
    .from("matches")
    .update({ state: redact(after), status, version: match.version + 1 })
    .eq("id", match.id)
    .eq("version", match.version)
    .select("id");
  if (res.error) fail(500, res.error.message);
  if (!res.data || res.data.length === 0) fail(409, "Match changed, retry");

  // Entering reveal: release this round's secrets via RLS (status flip).
  if (after.phase === "reveal" && before.phase !== "reveal") {
    const upd = await deps.admin
      .from("rounds")
      .update({ status: "revealed" })
      .eq("match_id", match.id)
      .eq("idx", after.roundIndex);
    if (upd.error) fail(500, upd.error.message);
  }

  await Promise.all(
    after.players.map((p) =>
      deps.admin.from("match_players").update({ score: after.scores[p] ?? 0 }).eq("match_id", match.id).eq("player_id", p),
    ),
  );
}

// Load, let `fn` compute the next state (and do its own side effects), then
// persist with a version check. Retries when another request got in first.
async function mutate(
  deps: ServerDeps,
  matchId: string,
  userId: string,
  fn: (ctx: { match: LoadedMatch; state: MatchState }) => Promise<MatchState>,
): Promise<MatchState> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const match = await loadMatch(deps, matchId);
    requireMember(match.state, userId);
    const state = await hydrate(deps, match);
    const next = await fn({ match, state });
    if (next === state) return state; // engine rejected / nothing to do
    try {
      await persist(deps, match, state, next);
      return next;
    } catch (e) {
      if (e instanceof MatchError && e.status === 409 && attempt < 3) continue;
      throw e;
    }
  }
  return fail(409, "Match changed, retry");
}

// -------------------------------------------------------------- puzzles

interface GeneratedRound {
  publicData: Record<string, unknown>;
  secretData: Record<string, unknown>;
  numbersTarget: number;
  seconds: number;
}

function generateRound(deps: ServerDeps, kind: RoundKind): GeneratedRound {
  switch (kind) {
    case "letters": {
      const board = lettersBoardFromRng(deps.rng);
      const best = analyzeBestWords(getTrie(deps.dictionary), board, null);
      return {
        publicData: { board },
        secretData: { bestLength: best.bestLength, top: best.top, longest: best.longest },
        numbersTarget: 1,
        seconds: LETTERS_SECONDS,
      };
    }
    case "numbers": {
      const puzzle = numbersPuzzleFromRng(deps.rng);
      const solution = solveNumbers(puzzle.drawnNumbers, puzzle.target);
      return {
        publicData: {
          numbers: puzzle.drawnNumbers.map((t) => t.value),
          target: puzzle.target,
        },
        secretData: {
          value: solution.value,
          steps: solution.steps.map((s) => ({
            a: s.operand1.value,
            op: s.operator,
            b: s.operand2.value,
            result: s.resultTile.value,
          })),
        },
        numbersTarget: puzzle.target,
        seconds: NUMBERS_DECLARE_SECONDS,
      };
    }
    case "conundrum": {
      const solution = pickSolution(deps.solutions, deps.rng);
      const puzzle = makePuzzle(solution, deps.dictionary, deps.rng);
      return {
        publicData: { scrambled: puzzle.scrambled },
        secretData: { solution: puzzle.solution },
        numbersTarget: 1,
        seconds: CONUNDRUM_SECONDS,
      };
    }
  }
}

async function insertRound(
  deps: ServerDeps,
  matchId: string,
  idx: number,
  kind: RoundKind,
  generated: GeneratedRound,
): Promise<void> {
  const inserted = await deps.admin
    .from("rounds")
    .insert({
      match_id: matchId,
      idx,
      kind,
      public_data: generated.publicData,
      deadline_at: new Date(deps.now() + generated.seconds * 1000).toISOString(),
    })
    .select("id")
    .single();
  const row = unwrap(inserted, "insert round");
  const secret = await deps.admin
    .from("round_secrets")
    .insert({ round_id: row.id, secret_data: generated.secretData });
  if (secret.error) fail(500, secret.error.message);
}

async function setDeadline(deps: ServerDeps, roundId: string, seconds: number): Promise<void> {
  const res = await deps.admin
    .from("rounds")
    .update({ deadline_at: new Date(deps.now() + seconds * 1000).toISOString() })
    .eq("id", roundId);
  if (res.error) fail(500, res.error.message);
}

function checkInTime(deps: ServerDeps, round: RoundRow): void {
  if (deps.now() > new Date(round.deadline_at).getTime() + GRACE_MS) fail(409, "Too late");
}

// -------------------------------------------------------------- lobby

function newCode(rng: Rng): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)]).join("");
}

export async function createMatch(deps: ServerDeps, userId: string): Promise<{ matchId: string; code: string }> {
  const state = matchReducer(createMatchState(), { type: "JOIN", player: userId });
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode(deps.rng);
    const res = await deps.admin
      .from("matches")
      .insert({ code, host_id: userId, state })
      .select("id")
      .single();
    if (res.error?.code === "23505") continue; // code collision, try another
    const row = unwrap(res, "create match");
    const seat = await deps.admin.from("match_players").insert({ match_id: row.id, player_id: userId, seat: 0 });
    if (seat.error) fail(500, seat.error.message);
    return { matchId: row.id, code };
  }
  return fail(500, "Could not allocate a room code");
}

export async function joinMatch(deps: ServerDeps, userId: string, rawCode: string): Promise<{ matchId: string }> {
  const code = rawCode.trim().toUpperCase();
  const found = await deps.admin.from("matches").select("id").eq("code", code).maybeSingle();
  if (found.error) fail(500, found.error.message);
  if (!found.data) fail(404, "No room with that code");
  const matchId = found.data.id as string;

  const match = await loadMatch(deps, matchId);
  if (match.state.players.includes(userId)) return { matchId }; // rejoin / reconnect
  if (match.state.phase !== "lobby" || match.state.players.length >= 2) fail(409, "Room is full or already started");

  const next = matchReducer(match.state, { type: "JOIN", player: userId });
  const seat = await deps.admin.from("match_players").insert({ match_id: matchId, player_id: userId, seat: 1 });
  if (seat.error) fail(409, "Room is full"); // unique(match_id, seat) lost a race
  await persist(deps, match, match.state, next);
  return { matchId };
}

export async function startMatch(deps: ServerDeps, userId: string, matchId: string): Promise<void> {
  await mutate(deps, matchId, userId, async ({ match, state }) => {
    if (match.hostId !== userId) fail(403, "Only the host can start");
    if (state.phase !== "lobby" || state.players.length !== 2) fail(409, "Need two players in the lobby");
    const generated = generateRound(deps, state.format[0]);
    const next = matchReducer(state, { type: "START", numbersTarget: generated.numbersTarget });
    await insertRound(deps, match.id, 0, state.format[0], generated);
    return next;
  });
}

export async function nextRound(deps: ServerDeps, userId: string, matchId: string): Promise<void> {
  await mutate(deps, matchId, userId, async ({ match, state }) => {
    if (state.phase !== "reveal") fail(409, "Round is not over");
    const idx = state.roundIndex + 1;
    if (idx >= state.format.length) {
      return matchReducer(state, { type: "NEXT_ROUND", numbersTarget: 1 });
    }
    const generated = generateRound(deps, state.format[idx]);
    const next = matchReducer(state, { type: "NEXT_ROUND", numbersTarget: generated.numbersTarget });
    await insertRound(deps, match.id, idx, state.format[idx], generated);
    return next;
  });
}

// ------------------------------------------------------------- gameplay

function currentRoundOrFail(state: MatchState, kind: RoundKind): void {
  if (state.phase !== "playing" || state.round?.kind !== kind) fail(409, `Not a ${kind} round in play`);
}

export async function submitLetters(deps: ServerDeps, userId: string, matchId: string, word: string): Promise<void> {
  await mutate(deps, matchId, userId, async ({ match, state }) => {
    currentRoundOrFail(state, "letters");
    const row = await loadRound(deps, match.id, state.roundIndex);
    checkInTime(deps, row);
    const board = row.public_data.board as LetterTile[];
    const validation = validateWord(String(word ?? ""), board, deps.dictionary);
    const points = validation.status === "valid" ? scoreWord(validation.word) : 0;
    const next = matchReducer(state, { type: "LETTERS_SUBMIT", player: userId, points });
    if (next === state) fail(409, "Already submitted");
    const sub = await deps.admin.from("round_submissions").insert({
      round_id: row.id,
      player_id: userId,
      payload: { word: validation.word, status: validation.status },
      points,
    });
    if (sub.error) fail(409, "Already submitted");
    return next;
  });
}

export async function declareNumbers(deps: ServerDeps, userId: string, matchId: string, value: number): Promise<void> {
  await mutate(deps, matchId, userId, async ({ match, state }) => {
    currentRoundOrFail(state, "numbers");
    const row = await loadRound(deps, match.id, state.roundIndex);
    checkInTime(deps, row);
    const next = matchReducer(state, { type: "NUMBERS_DECLARE", player: userId, value });
    if (next === state) fail(400, "Invalid declaration");
    const sub = await deps.admin
      .from("round_submissions")
      .upsert({ round_id: row.id, player_id: userId, payload: { declared: value }, points: 0 }, { onConflict: "round_id,player_id" });
    if (sub.error) fail(500, sub.error.message);
    // The persisted state redacts declarations; the engine result is only
    // kept so `mutate` knows something changed.
    return next;
  });
}

export async function proveNumbers(
  deps: ServerDeps,
  userId: string,
  matchId: string,
  steps: ProofStep[],
): Promise<void> {
  await mutate(deps, matchId, userId, async ({ match, state }) => {
    currentRoundOrFail(state, "numbers");
    const engineRound = state.round;
    if (engineRound?.kind !== "numbers" || engineRound.stage !== "proving") fail(409, "Not proving");
    if (engineRound.order[engineRound.proofIndex] !== userId) fail(409, "Not your turn to prove");
    const row = await loadRound(deps, match.id, state.roundIndex);
    checkInTime(deps, row);
    const drawn = row.public_data.numbers as number[];
    const declared = engineRound.declarations[userId];
    const proven = validateProof(drawn, steps, declared);
    const next = matchReducer(state, { type: "NUMBERS_PROOF", player: userId, proven });
    const sub = await deps.admin
      .from("round_submissions")
      .update({ payload: { declared, steps, proven }, points: next.round?.kind === "numbers" ? (next.round.points[userId] ?? 0) : 0 })
      .eq("round_id", row.id)
      .eq("player_id", userId);
    if (sub.error) fail(500, sub.error.message);
    if (next.phase === "playing") await setDeadline(deps, row.id, PROOF_CAP_SECONDS);
    return next;
  });
}

export async function buzzConundrum(deps: ServerDeps, userId: string, matchId: string): Promise<void> {
  await mutate(deps, matchId, userId, async ({ match, state }) => {
    currentRoundOrFail(state, "conundrum");
    const engineRound = state.round;
    if (engineRound?.kind !== "conundrum") return state;
    const row = await loadRound(deps, match.id, state.roundIndex);
    checkInTime(deps, row);
    const next = matchReducer(state, { type: "CONUNDRUM_BUZZ", player: userId });
    if (next === state) fail(409, "Can't buzz now");
    // The unique (round_id, attempt) key makes this the atomic "first buzz wins".
    const buzz = await deps.admin
      .from("buzzes")
      .insert({ round_id: row.id, attempt: engineRound.lockedOut.length, player_id: userId });
    if (buzz.error?.code === "23505") fail(409, "Too late — someone buzzed first");
    if (buzz.error) fail(500, buzz.error.message);
    return next;
  });
}

async function latestBuzzAt(deps: ServerDeps, roundId: string, playerId: string): Promise<number | null> {
  const res = await deps.admin
    .from("buzzes")
    .select("created_at")
    .eq("round_id", roundId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (res.error) fail(500, res.error.message);
  return res.data ? new Date(res.data.created_at as string).getTime() : null;
}

export async function answerConundrum(
  deps: ServerDeps,
  userId: string,
  matchId: string,
  guess: string,
): Promise<{ correct: boolean }> {
  let correct = false;
  await mutate(deps, matchId, userId, async ({ match, state }) => {
    currentRoundOrFail(state, "conundrum");
    const engineRound = state.round;
    if (engineRound?.kind !== "conundrum" || engineRound.buzzedBy !== userId) fail(409, "You haven't buzzed");
    const row = await loadRound(deps, match.id, state.roundIndex);
    const buzzedAt = await latestBuzzAt(deps, row.id, userId);
    const inWindow =
      buzzedAt !== null && deps.now() <= buzzedAt + ANSWER_WINDOW_SECONDS * 1000 + GRACE_MS;
    const secret = await deps.admin.from("round_secrets").select("secret_data").eq("round_id", row.id).single();
    const solution = (unwrap(secret, "load secret").secret_data as { solution: string }).solution;
    correct = inWindow && String(guess ?? "").trim().toLowerCase() === solution;
    return matchReducer(state, { type: "CONUNDRUM_ANSWER", player: userId, correct });
  });
  return { correct };
}

// Any member may call this when their local clock reaches zero. The server
// only acts if the deadline has genuinely passed, so a client with a fast
// clock can't end a round early.
export async function advance(deps: ServerDeps, userId: string, matchId: string): Promise<{ applied: boolean }> {
  let applied = false;
  await mutate(deps, matchId, userId, async ({ match, state }) => {
    if (state.phase !== "playing" || state.round === null) return state;
    const row = await loadRound(deps, match.id, state.roundIndex);
    const now = deps.now();
    const deadline = new Date(row.deadline_at).getTime();

    // A buzzer who sat on the floor past their answer window gets a wrong answer.
    if (state.round.kind === "conundrum" && state.round.buzzedBy !== null) {
      const buzzedAt = await latestBuzzAt(deps, row.id, state.round.buzzedBy);
      if (buzzedAt !== null && now > buzzedAt + ANSWER_WINDOW_SECONDS * 1000 + GRACE_MS) {
        applied = true;
        return matchReducer(state, { type: "CONUNDRUM_ANSWER", player: state.round.buzzedBy, correct: false });
      }
    }

    if (now < deadline) return state; // not due yet
    const action: MatchAction = { type: "TIME_EXPIRED" };
    const next = matchReducer(state, action);
    if (next === state) return state;
    applied = true;
    if (next.phase === "playing" && next.round?.kind === "numbers" && next.round.stage === "proving") {
      await setDeadline(deps, row.id, PROOF_CAP_SECONDS);
    }
    return next;
  });
  return { applied };
}
