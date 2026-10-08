import { evaluateAnswer, scoreResult } from "../numbers/scoring";
import { CONUNDRUM_POINTS } from "@/types/conundrum";
import {
  MatchAction,
  MatchState,
  NumbersRound,
  PlayerId,
  QUICK_FORMAT,
  RoundKind,
  RoundOutcome,
  RoundState,
} from "./types";

export function createMatchState(format: RoundKind[] = QUICK_FORMAT): MatchState {
  return {
    phase: "lobby",
    players: [],
    format,
    roundIndex: 0,
    round: null,
    scores: {},
    history: [],
    winner: null,
  };
}

function isPlayer(state: MatchState, player: PlayerId): boolean {
  return state.players.includes(player);
}

function startRound(
  state: MatchState,
  roundIndex: number,
  numbersTarget: number,
): MatchState {
  const kind = state.format[roundIndex];
  let round: RoundState;
  switch (kind) {
    case "letters":
      round = {
        kind,
        picker: state.players[roundIndex % state.players.length],
        points: {},
      };
      break;
    case "numbers":
      round = {
        kind,
        target: numbersTarget,
        stage: "declaring",
        declarations: {},
        order: [],
        proofIndex: 0,
        points: {},
      };
      break;
    case "conundrum":
      round = { kind, buzzedBy: null, lockedOut: [], winner: null, points: {} };
      break;
  }
  return { ...state, phase: "playing", roundIndex, round };
}

// Move the current round into 'reveal': bank its points into the scores.
function reveal(state: MatchState): MatchState {
  if (state.round === null) return state;
  const points = state.round.points;
  const scores = { ...state.scores };
  for (const player of state.players) {
    scores[player] = (scores[player] ?? 0) + (points[player] ?? 0);
  }
  const outcome: RoundOutcome = {
    kind: state.round.kind,
    points: Object.fromEntries(state.players.map((p) => [p, points[p] ?? 0])),
  };
  return {
    ...state,
    phase: "reveal",
    scores,
    history: [...state.history, outcome],
  };
}

function distanceOf(round: NumbersRound, player: PlayerId): number {
  return Math.abs(round.declarations[player] - round.target);
}

// Closest declaration proves first; players tied on distance are adjacent in
// `order`, and each of them gets to prove.
function provingOrder(round: NumbersRound): PlayerId[] {
  return Object.keys(round.declarations).sort(
    (a, b) => distanceOf(round, a) - distanceOf(round, b),
  );
}

function pointsForDeclaration(round: NumbersRound, player: PlayerId): number {
  return scoreResult(evaluateAnswer(round.target, round.declarations[player]));
}

// After a proof result, decide whether proving continues or the round ends.
function advanceProof(
  state: MatchState,
  round: NumbersRound,
  proven: boolean,
): MatchState {
  const nextIndex = round.proofIndex + 1;
  const current = round.order[round.proofIndex];
  const next = round.order[nextIndex];

  // A successful proof (even one worth 0 points) ends proving unless the next player is tied on
  // distance with the one who just proved (then they get their turn too).
  const tiedWithNext =
    next !== undefined && distanceOf(round, next) === distanceOf(round, current);
  const proofsDone =
    next === undefined || (proven && !tiedWithNext);

  if (proofsDone) return reveal({ ...state, round: { ...round, proofIndex: nextIndex } });
  return { ...state, round: { ...round, proofIndex: nextIndex } };
}

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case "JOIN": {
      if (
        state.phase !== "lobby" ||
        state.players.length >= 2 ||
        isPlayer(state, action.player)
      ) {
        return state;
      }
      return {
        ...state,
        players: [...state.players, action.player],
        scores: { ...state.scores, [action.player]: 0 },
      };
    }

    case "START": {
      if (state.phase !== "lobby" || state.players.length !== 2) return state;
      return startRound(state, 0, action.numbersTarget);
    }

    case "NEXT_ROUND": {
      if (state.phase !== "reveal") return state;
      const nextIndex = state.roundIndex + 1;
      if (nextIndex >= state.format.length) {
        const [a, b] = state.players;
        const winner =
          state.scores[a] === state.scores[b]
            ? "draw"
            : state.scores[a] > state.scores[b]
              ? a
              : b;
        return { ...state, phase: "final", round: null, winner };
      }
      return startRound(state, nextIndex, action.numbersTarget);
    }

    case "LETTERS_SUBMIT": {
      const round = state.round;
      if (
        state.phase !== "playing" ||
        round?.kind !== "letters" ||
        !isPlayer(state, action.player) ||
        round.points[action.player] !== undefined // one submission each
      ) {
        return state;
      }
      const points = { ...round.points, [action.player]: Math.max(0, action.points) };
      const next: MatchState = { ...state, round: { ...round, points } };
      return state.players.every((p) => points[p] !== undefined) ? reveal(next) : next;
    }

    case "NUMBERS_DECLARE": {
      const round = state.round;
      if (
        state.phase !== "playing" ||
        round?.kind !== "numbers" ||
        round.stage !== "declaring" ||
        !isPlayer(state, action.player) ||
        !Number.isInteger(action.value) ||
        action.value <= 0
      ) {
        return state;
      }
      return {
        ...state,
        round: {
          ...round,
          declarations: { ...round.declarations, [action.player]: action.value },
        },
      };
    }

    case "NUMBERS_PROOF": {
      const round = state.round;
      if (
        state.phase !== "playing" ||
        round?.kind !== "numbers" ||
        round.stage !== "proving" ||
        round.order[round.proofIndex] !== action.player
      ) {
        return state;
      }
      const points = action.proven
        ? { ...round.points, [action.player]: pointsForDeclaration(round, action.player) }
        : round.points;
      return advanceProof(state, { ...round, points }, action.proven);
    }

    case "CONUNDRUM_BUZZ": {
      const round = state.round;
      if (
        state.phase !== "playing" ||
        round?.kind !== "conundrum" ||
        !isPlayer(state, action.player) ||
        round.buzzedBy !== null || // first buzz wins; a late buzz is ignored
        round.lockedOut.includes(action.player)
      ) {
        return state;
      }
      return { ...state, round: { ...round, buzzedBy: action.player } };
    }

    case "CONUNDRUM_ANSWER": {
      const round = state.round;
      if (
        state.phase !== "playing" ||
        round?.kind !== "conundrum" ||
        round.buzzedBy !== action.player
      ) {
        return state;
      }
      if (action.correct) {
        return reveal({
          ...state,
          round: {
            ...round,
            buzzedBy: null,
            winner: action.player,
            points: { [action.player]: CONUNDRUM_POINTS },
          },
        });
      }
      // Wrong: locked out; the opponent gets the remaining time.
      const lockedOut = [...round.lockedOut, action.player];
      const next: MatchState = {
        ...state,
        round: { ...round, buzzedBy: null, lockedOut },
      };
      return lockedOut.length >= state.players.length ? reveal(next) : next;
    }

    case "TIME_EXPIRED": {
      const round = state.round;
      if (state.phase !== "playing" || round === null) return state;

      switch (round.kind) {
        case "letters":
          return reveal(state);

        case "numbers": {
          if (round.stage === "declaring") {
            const order = provingOrder(round);
            if (order.length === 0) return reveal(state); // nobody declared
            return {
              ...state,
              round: { ...round, stage: "proving", order, proofIndex: 0 },
            };
          }
          // Proving: the server's per-tap clock lapsed for whoever is up.
          const current = round.order[round.proofIndex];
          return matchReducer(state, {
            type: "NUMBERS_PROOF",
            player: current,
            proven: false,
          });
        }

        case "conundrum":
          return reveal(state);
      }
    }
  }
}
