# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Workflow: Claude as lead orchestrator (approved by the user, 2026-10-09)

The execution plan is `docs/PLAN.md` (copy of the root `PLAN.md`). Read it at the start of a session, tick its `[ ]` checkboxes as checkpoints land, and log each run in `docs/RUNLOG.md`.

- **Claude writes** reducers, algorithms, architecture, tests and CLAUDE.md/LEARNING.md. The old Mentorship Rules (no game logic from Claude, user runs all commands, TODO scaffolding) are **superseded**.
- **Delegation:** bounded, self-contained tasks (primitives, page ports, test files from a given API) go to `agy` workers per the matrix and brief template in PLAN.md §3. Workers never run git. Claude reviews every diff and is the only one who commits or tags.
- **Gate before any commit:** `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test:run`, plus `pnpm build` at milestone ends or config changes. A red gate is never committed.
- **Commits:** `checkpoint: <name> — <summary>` with an annotated tag `checkpoint/<name>`. Branches `build/m<N>-<name>`, merged `--no-ff`. Never `reset --hard` or force-push without approval.
- **Stop and ask the user** at: the dictionary license; creating GitHub/Vercel/Supabase accounts and env vars; any destructive git operation.
- **Invariants kept:** derived state is never stored, timer ticks stay local (never in reducers), reducers are immutable, no `eval`/`new Function`.
- **UI:** Studio Desk is site-wide; exact values are in PLAN.md §1b.
- **Resolved decisions** (finite letter bag, seeded RNG, Conundrum flat 10 pts, Supabase 1v1 with anonymous + accounts, Vercel, Apterous-style timed prove with `PROVE_TAP_SECONDS = 5`): see the decisions table in PLAN.md.

---

## Current Project Scope

**Phase 1 (Current): Core Games, Local-Only, No Backend**

Three games run entirely client-side on `localhost`:

- **Letters Game**: Pick 9 vowels/consonants, 30-second timer, submit a word, validate against a local dictionary, score by word length.
- **Numbers Game**: 6 numbers (4 from {25, 50, 75, 100}, 2 from {1-10}), random target 100-999, 30-second timer, arithmetic to reach/approach target.
- **Conundrum**: 9-letter anagram, 30-second race to unscramble before timer expires.

_Explicitly deferred:_

- Auth / user accounts
- Database (Supabase / any persistence)
- Daily challenges / puzzle fetching
- Leaderboards / streaks / forum
- Mobile/responsive polish (iterate once core mechanics work)
- "Best possible word" solver (a Trie-based stretch goal after MVP)

**Phase 2 (Future):** Backend (auth, DB, leaderboards, daily challenges, forum).

---

## Architecture & Design Principles

### Folder Structure

```
/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # root layout
│   ├── page.tsx                  # Home: mode selector
│   ├── letters/                  # /letters — LettersGame page
│   ├── numbers/                  # /numbers — NumbersGame page
│   └── conundrum/                # /conundrum — ConundrumGame page
├── components/
│   ├── ui/                       # Shared primitives: Button, Timer, ScoreDisplay, Card
│   ├── layout/                   # Header, navigation
│   ├── letters/                  # LettersGame orchestrator + subcomponents (LettersBoard, LetterSelector, etc.)
│   ├── numbers/                  # NumbersGame + subcomponents
│   └── conundrum/                # ConundrumGame + subcomponents
├── lib/
│   ├── letters/                  # Game logic: useLettersGame (reducer), letterPool, scoring, dictionary
│   ├── numbers/                  # Game logic: useNumbersGame, numbersLogic, etc.
│   ├── conundrum/                # Game logic: useConundrumGame, conundrumLogic, etc.
│   └── shared/                   # Shared utilities: useCountdown, random.ts (shuffle)
├── types/
│   ├── common.ts                 # GameMode, ScoreEntry, shared types
│   ├── letters.ts                # Full type definitions for Letters Game
│   ├── numbers.ts                # Type definitions for Numbers Game
│   └── conundrum.ts              # Type definitions for Conundrum Game
├── public/
│   └── dictionary/               # wordlist file goes here later (user sources it)
```

**Convention:** `components/<game>/` mirrors `lib/<game>/` so ownership and responsibility are obvious. Shared UI (`Timer`, `ScoreDisplay`) lives in `components/ui/`. Game-specific logic never leaks into `components/ui/`.

### State Management

**Letters Game (reference pattern for others):**

- Core game state (phase, board, timer, score, history) lives in a `useLettersGame()` hook backed by `useReducer`.
- Reducer is a pure function receiving `(state, action)` and returning new state atomically. Discriminated union actions (`LettersGameAction = { type: 'SELECT_LETTER'; letterType } | { type: 'SUBMIT_WORD' } | ...`) ensure type-safe, enumerated transitions.
- **Why not plain useState:** Phase-gated transitions like "9th letter picked → flip phase to 'solving' → start timer" are easier to reason about and test as one reducer case than as several sequenced `setState` calls that could interleave oddly.
- **Carve-outs:** `currentInput` (typed word) stays local to `WordInput` component via `useState` — lifted only via `onSubmit(word)` callback. This avoids re-rendering the entire game tree on every keystroke. Timer uses a self-contained `useCountdown` hook that only calls `onExpire()` into the reducer when time is up — similar performance reason.
- **Derived values:** Counts (e.g., "vowels selected") are never separate state — derived from `board.filter(t => t.type === 'vowel').length` to prevent drift bugs.

### Design & UI/UX

- **No generic "AI slop":** No Tailwind grey-card templates, minimal corporate layouts. Aim for bespoke, tactile, intentional design.
- **Minimalist:** Clean typography, clear hierarchy, deliberate whitespace. Each visual element has a purpose.
- **Tactile feedback:** Tile reveals, button interactions, timer animations (color shifts in final seconds) use Framer Motion to feel responsive and satisfying.
- **Offline-first:** All 3 core games work without a server. Dictionary is bundled locally.

### Technology Stack

- **Framework:** Next.js (App Router), TypeScript, React 18+
- **Styling:** Tailwind CSS (utility-first, but with intentional design)
- **Animation:** Framer Motion (for reveals, transitions, timer feel)
- **Package manager:** pnpm (fast, disk-efficient)
- **Dictionary:** Local wordlist (`public/dictionary/words.txt`), loaded into `Set<string>` for O(1) validation. Trie-based search (for "best possible word" feature) is a deferred stretch goal.
- **No backend yet:** All state client-side (React hooks). Phase 2 will introduce a Supabase backend.

---

## Development Commands

```bash
# Start dev server
pnpm dev

# Type check
pnpm tsc --noEmit

# Build for production
pnpm build

# Run a specific test (if we add testing later)
pnpm test
```

Environment note: git works (Xcode license accepted). Tests: `pnpm test:run` (integration tests skip without a local Supabase).

---

## Key Decisions & Tradeoffs (Documented for Future Reference)

1. **Local wordlist vs. dictionary API:** We chose local. It's instant (O(1) lookup), offline-capable, and suitable for a timed local-first game. Downside: we must source/license the wordlist ourselves (flagged as a TODO).

2. **useReducer vs. useState:** We use `useReducer` for phase-gated transitions. Reason: atomic multi-field updates (9th letter picked → phase transitions → timer starts) are clearer as one reducer case than several sequenced state setters. We keep `currentInput` and timer local via their own hooks (performance carve-outs).

3. **Set vs. Trie for dictionary:** MVP uses `Set<string>` for "is this word valid?" checks. A Trie earns its place once we add a stretch goal (finding the best possible word from a board's letters using prefix search + letter constraints). Marked as a deferred feature for after core games work.

4. **Client-side solution visibility (Conundrum):** Currently, the solution is sent to the client (inspectable via devtools) because Conundrum validation happens client-side. A Phase 2 decision: move validation to a server-side API route to prevent spoilers. Flagged in `src/types/conundrum.ts`.

---

## When Helping on This Project

- **Code review:** Before accepting a PR or saying "looks good," ask: Does this handle empty boards? What happens if the timer expires mid-keystroke? Did we accidentally lift state that should stay local? Run `pnpm tsc --noEmit` and `pnpm dev` to verify rendering.
- **Explain requirements first:** Don't hand over component sketches until you've explained the problem. "We need to track the board because..." not "Here's a component that tracks the board."
- **Point to the plan:** If scope starts drifting (e.g., "let's add mobile polish now" or "let's set up Supabase auth"), refer to the plan at `/Users/rohanbalasubramanian/.claude/plans/role-philosophy-precious-puppy.md`. Phase 1 is core games only.
- **Resist over-engineering:** No premature abstraction, no generic "future-proofing." Three similar tile components are fine; a `TileFactory` is not. If the user asks, encourage them to feel the pain point first before refactoring.
- **Teach data structures:** When dictionary/scoring/number solving come up, use them as teaching moments. Explain why a Trie makes prefix search efficient, how a Set's hash-based lookup is O(1), why a reducer pattern is easier to test than scattered state setters.

---

## Important Constraints

- **Dictionary wordlist:** The user must source this themselves from a licensed English wordlist (e.g., SCOWL, ENABLE, or public-domain Wiktionary dump). Do not fabricate or hallucinate word lists.
- **No third-party services yet:** No APIs, no Supabase, no auth. Phase 2 only.

---

## Memory & Context

This project is tied to a longer-term learning journey. Each session, refer to the project plan file and maintain continuity on what was built and what's next. Update this `CLAUDE.md` as the project grows (new decisions, new constraints, new tech choices).

---

## Progress Snapshot (updated 2026-10-09, end of the first orchestrated run)

Source of truth for status is `docs/PLAN.md` (ticked checkboxes) and `docs/RUNLOG.md` (per-checkpoint gate results and deviations). `LEARNING.md` has the "what and why" log and the backend teaching notes.

**Done and merged to `main` (tags `checkpoint/*`):**
- M0 baseline + vitest characterization tests; lint errors fixed; CLAUDE.md workflow rewritten.
- M1 seeded RNG, finite letter bag, Trie + best-word panel, Numbers solver, Apterous-style timed prove (`PROVE_TAP_SECONDS = 5`, `PROVE_TIMEOUT`).
- M2 Studio Desk tokens/fonts/primitives; Letters, Numbers and home ported (`DialTimer` replaced `Timer`).
- M3 Conundrum: offline generator (9,324 answers), reducer (flat 10 pts), UI.
- M4 Daily (`/daily`): seeded puzzles, versioned localStorage, derived streaks, spoiler-free share. `dates.ts`/`share.ts` were delegated to `agy` and reviewed.
- M5 (partial): CI workflow only.
- M6/M7: Supabase schema + RLS (pgTAP, mutation-checked), clients, `proxy.ts`, `/account`, authoritative `matchService`, route handlers, `/duel` realtime UI, two-browser E2E (`scripts/e2e-duel.mjs`, `docs/E2E.md`). All verified against a LOCAL Supabase (Docker).

**Blocked on the user (hard stops from PLAN.md):**
1. **Dictionary license** — `public/dictionary/words.txt` has no recorded source/license (`docs/DICTIONARY.md`). Do not deploy publicly until confirmed.
2. **GitHub remote + Vercel project** — create, then push (nothing has been pushed).
3. **Hosted Supabase project** — create it, enable anonymous sign-ins and providers, run the two migrations, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Vercel. Hosted-only behaviour (email confirmation, redirect URLs, realtime config) is unverified.
4. **Visual QA** — duel screens were reviewed from screenshots; Letters/Numbers/Conundrum/Daily/account pages were only smoke-tested (HTTP 200) plus the duel E2E.

**Known gaps / deliberate deviations:** per-tap proof clock is client-side (server caps the whole proof at 90 s); duel letters picker turns are nominal; no rate limiting; no abandon/forfeit handling; `agy` workers can't run shell commands headless (allowlist needed if you want them to self-run tests).

**Later (not in plan):** formats/bots/Goatdown/ratings, leaderboards UI, night-desk dark palette, chat, tournaments, other languages.

**Environment notes:** use `node_modules/.bin/tsx` for scripts (pnpm's build-script approval blocks `pnpm tsx`); `.env.local` holds only local demo Supabase keys (gitignored); Docker Desktop must be running for `supabase start` and the integration tests (they skip automatically without the stack).
