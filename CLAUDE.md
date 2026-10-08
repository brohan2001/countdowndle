# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ READ FIRST: ACTIVE BUILD PLAN (2026-10-09). This overrides the sections below where they conflict.

**Before doing anything else in a new session, read `PLAN.md` at the repo root in full, then work through it.** It is the approved, self-contained execution plan.

- **Workflow change, approved by the user on 2026-10-09:** the Mentorship Rules below (no game logic from Claude, user runs all commands, TODO scaffolding) are **superseded**. Claude is now the lead orchestrator. It writes the reducers, algorithms and architecture itself, delegates bounded tasks to `agy` CLI workers, and commits at checkpoints. The details are in PLAN.md §3–4. This also resolves "Open question" 5 in the Progress Snapshot.
- **Where to start:** PLAN.md §5, "First actions". The order is:
  1. M0 baseline commit, vitest and characterization tests.
  2. M1, starting with **Numbers declare + per-tap 5 s prove clock**.
  3. The rest of the WBS, in order.
- **Track progress in PLAN.md:** tick its `[ ]` checkboxes as checkpoints land, and log each run in `docs/RUNLOG.md`.
- **Stop and ask the user** at:
  - the dictionary license;
  - creating GitHub, Vercel or Supabase accounts and env vars;
  - any destructive git operation.
- **Keep from below:** the architecture and state invariants (derived state, local timer ticks, immutable reducers), the Studio Desk UI spec (exact values are in PLAN.md §1b) and the folder conventions.

---

## Project Philosophy & Mentorship Approach

This is a **learning-first** project. The user is building a local-first Countdown game clone (British TV show: Letters, Numbers, Conundrum rounds) to learn software engineering, algorithms, frontend development, and eventually backend architecture — writing code themselves, not passively copy-pasting.

**Core Mentorship Rules** (these are non-negotiable directives):

1. **Never generate complete game logic or solutions.** Types/interfaces are fully specified (they're contracts, not logic), but component and logic files are scaffolded with `// TODO` comments for the user to implement. When teaching a concept (e.g., useReducer for phase-gated state machines, Trie for prefix search), explain the _why_ before suggesting any code approach.

2. **Explain before building.** Don't hand over a command or file without explaining its purpose and tradeoffs. For example:
   - Before `pnpm create next-app`, explain what each flag does and why we chose App Router over Pages Router.
   - Before a type definition, explain what makes it the right shape for this problem.
   - Before sketching a component hierarchy, explain what responsibilities live where and why.
     e
3. **Review the user's code critically.** When the user writes and pastes back their implementation, review it for:
   - Bugs and edge cases ("What happens if the board is empty here?")
   - Performance ("This re-renders on every keystroke — can we fix that?")
   - Idiomatic practices ("React patterns suggest... instead")
   - Architecture ("This couples two concerns — could we separate them?")
   - Do not rubber-stamp it.

4. **Hands-on execution only, with one explicit, user-granted exception.** The user runs setup commands, creates all game-related files, and writes all game _logic_ (reducers, `lib/`, types). I do not run `mkdir`, `pnpm create`, `git commit`, or write logic in any `.tsx`/`.ts` game file. The long-standing exception is this `CLAUDE.md` file itself.
   - **New exception, agreed 2026-09-26:** after Numbers' calculator + free-text + declare/prove logic was built and play-tested, the user asked me to take over the _UI/visual_ layer directly — writing and editing component markup, Tailwind classes, and `globals.css` myself, across both Letters and Numbers, to standardize the look and move it away from a generic "AI-generated" Tailwind default (see Progress Snapshot). This exception covers **styling and markup only**. Game _logic_ (reducers, `lib/*`, types, scoring, parsers) stays the user's to write; I still explain and review it rather than writing it for them. If scope drifts back toward logic while "doing UI," stop and hand it back.

5. **Teach incrementally.** Start with the simplest case (local state, 30-second timer, letter selection) before tackling advanced topics (useReducer with phase machines, Trie-based dictionary searches, component composition patterns). Encourage the user to ask questions and experiment.

6. **Backend/systems teaching is part of the scope.** When we reach auth, databases, leaderboards, or server-side logic, be explicit about _how production systems actually work_. Recommend learning resources (e.g., articles on password hashing, ACID properties, caching strategies). Don't just gloss over these as "use Supabase and it's fine."

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

Environment note (2026-10-09): `git` fails on this machine until the user runs `sudo xcodebuild -license` in their own terminal (unaccepted Xcode license). Claude can't run it (needs sudo).

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
- **Hands-on execution:** The user creates all game files and runs all commands. I provide guidance/review, not implementations.

---

## Memory & Context

This project is tied to a longer-term learning journey. Each session, refer to the project plan file and maintain continuity on what was built and what's next. Update this `CLAUDE.md` as the project grows (new decisions, new constraints, new tech choices).

---

## Progress Snapshot (updated 2026-10-09)

**Letters Game: COMPLETE — logic, UI, and post-MVP polish, playable end-to-end in the browser.**

- Logic layer (`lib/letters/lettersPool.ts`, `scoring.ts`, `dictionary.ts`, `useLettersGame.ts`) done and type-check clean.
- UI layer done and wired: `components/ui/Timer.tsx`, `components/ui/ScoreDisplay.tsx`, `components/letters/{LettersBoard,LetterSelector,WordInput,RoundResultPanel}.tsx`, orchestrated by `app/letters/page.tsx`.
- Post-MVP additions: letter-count display hidden; real min-vowel/consonant rule enforced as two independent upper-bound caps (`vowels ≤ 5`, `consonants ≤ 6`, proven equivalent given the board always fills to 9); a "Random" fill button (`pickRandomFillCounts` + `RANDOM_FILL` action).
- Still deferred, confirmed with the user: best-possible-word solver + multi-word list (Trie-based stretch goal), and the Framer Motion tile-reveal animation on `LettersBoard`.
- **UI currently looks like default/generic Tailwind** (grays, blue buttons, uniform rounded corners, no real typographic hierarchy) — flagged by the user as the first thing to fix in the upcoming UI pass (see "Next Planned Work" below). Nothing about Letters' logic changes; only its markup/styling will.

**Numbers Game: logic COMPLETE (calculator mode, free-text mode, and two play modes), UI functional but unstyled-by-design (plain Tailwind, will be redone in the UI pass). Play-tested end-to-end by the user across every mode combination — "everything tested and works."**

- **Types** (`types/numbers.ts`): `NumbersGamePhase` is `'selecting' | 'solving' | 'proving' | 'roundOver'` (the earlier stray `'idle'` was removed — it was dead, no action ever left it). Two independent axes on top of the base state: `NumbersInputMode` (`'calculator' | 'freeText'` — _how_ you build an answer) and `NumbersPlayMode` (`'declare' | 'untimed'` — _when/how_ the round is timed and scored). `NumbersValidationStatus` has 10 values including `invalid-unproven`. `OPERATOR_SYMBOLS`/`OPERATOR_ORDER`/`ROUND_DURATION_SECONDS` live here too.
- **`lib/numbers/numberPool.ts`**: draws `largeCount` (0-4, player-chosen) distinct large tiles (25/50/75/100, no duplicates — real tile set only has one each) via `shuffle`, plus `6 - largeCount` small tiles (1-10, two each) via the same weighted-cumulative-sum pick as Letters' `drawLetter`. `pickTarget()` gives 100-999.
- **`lib/numbers/scoring.ts`**: `evaluateAnswer` (difference → status band) + `scoreResult` (status → 10/7/5/0 points), pure and shared by every mode.
- **`lib/numbers/arithmetic.ts`**: `applyOperator(a, op, b): number | null` — the single source of truth for Countdown's legality rules (subtraction must stay positive, division must be exact). Shared by the calculator reducer cases _and_ the free-text parser, so the two input modes can never disagree about what's legal.
- **`lib/numbers/expression.ts`**: a hand-written recursive-descent parser/evaluator for free-text answers (`expression → term → factor` grammar, so `*`/`/` bind tighter than `+`/`-` with no special-cased precedence logic). Deliberately **never uses `eval`/`new Function`** — player input must not run as code, and `eval` would also accept decimals/negatives/unlimited reuse that the real game forbids. Normalizes `× x ÷ −` to `* - /` before tokenizing (the operator buttons show the pretty symbols). Reports `usedOperator` so a bare number (no actual work) can't be scored as an answer. Length-capped by the reducer to prevent a deep-nesting stack-overflow crash.
- **`lib/numbers/useNumbersGame.ts`**: full reducer. Exports `canWork(state)` — the one shared "can the player currently build a solution" rule (untimed: while `solving`; declare: only while `proving`) — used by both the reducer's own guards and the page's disabled props, so they can't drift apart. `buildRoundResult` branches into `buildCalculatorResult` / `buildFreeTextResult` / `buildDeclareResult` depending on play mode and input mode; a round with zero real work (no confirmed steps, no operator used in free text) always scores `invalid-empty`/0 regardless of mode, kept consistent on purpose.
- **UI** (`app/numbers/page.tsx` + `components/numbers/{LargeCountSelector,TileRack,OperatorBar,StepHistory,NumbersResultPanel}.tsx`): fully wired and functional, Tailwind-styled just enough to be usable (selected/disabled states visible) — **not yet standardized or "designed"**, see below.
- **Known, accepted UX gap:** an illegal calculator step (e.g. 3 − 5) silently does nothing — no player-facing explanation yet.

**Decisions made 2026-09-26/27, driving the next phase of work:**

1. **Two Numbers play modes are a deliberate, permanent feature**, not a stopgap: `declare` (competitive/1v1-style — 30s to declare a number, then an untimed `proving` phase to show the working; unproven = 0 pts) and `untimed` (Countdowndle-style — no countdown, live entry). Real 1v1 play needs a backend (Phase 2) — only the local flow exists today.
2. **UI/CSS ownership handed to Claude** (see Mentorship Rule 4's exception above) once logic was done and play-tested. Goals: standardize Letters + Numbers on shared primitives/tokens (`components/ui/`, `globals.css`) instead of each game re-inventing buttons/panels; get away from the default-Tailwind "AI-generated" look (generic grays, blue everything, uniform rounded corners, no hierarchy); take some visual/tactile inspiration from the real show's board and clock **without** copying its logo, exact palette, or other trademarked assets — this project uses its own branding.
3. **After the UI pass:** backend (auth, DB, leaderboards — Phase 2) and the two solvers (Letters' Trie-based best-word solver, a Numbers solver) get built together, combined rather than sequentially.
4. **UI direction chosen 2026-10-09: "Studio Desk"** (Direction B of 10 static mockups; published as a private artifact at https://claude.ai/artifact/PDivci7ZqVqbAh2F9Lbnkw, which may become unavailable, so the spec below is the source of truth). **Not implemented yet.**
   - **Palette:** cream background `#efe6d3`, paper tiles `#f9f3e4`, tile/card border `#c9b98f`, brass accent and timer rim `#b8944f`, forest-green primary button `#2f4a3c`, ink-brown text `#3c2b1e`, secondary brown `#5a4632`, rust for urgent/final-seconds timer `#a8402a`.
   - **Type:** Fraunces (serif; titles, timer numerals, tile letters, word input) and Karla (sans; UI chrome, buttons, labels). Load via `next/font` in `app/layout.tsx`.
   - **Treatment:** tiles sit at faint alternating hand-placed rotations (about -1.4deg / +1.2deg) with a soft paper shadow; selector buttons look like index-card tabs (rounded top corners only, active tab is paper-colored with a brass top edge); the timer is a round brass-rimmed dial with a small "seconds" label; the topbar has a dashed brass underline; corners are modest (about 5px), not uniformly rounded.
5. **Open question (2026-10-09):** the user said they are "completely making this project an agent subagent automated LLM project from now." What this means (a workflow change, a product-scope change, or something else) is **not yet clarified**. Next session: ask before changing workflow or scope. Until the user confirms, the Mentorship Rules above still apply.

**Full session-by-session detail — every concept taught, every bug found and fixed — lives in `LEARNING.md`.** Read its "Phase 5: Numbers Game" section for the complete Numbers build (all TODO-driven stages, every bug caught in review) before continuing.

---

## Next Planned Work (as of 2026-09-27)

In order:

1. **UI normalization pass across Letters + Numbers** (Claude leads, per the new exception in Mentorship Rule 4). The mockup and direction-pick step is **done**: the user chose "Studio Desk" (see decision 4 above for the full spec). Remaining: put the tokens in `globals.css` (Tailwind v4 `@theme`), load Fraunces and Karla with `next/font` in `app/layout.tsx`, build shared primitives (`Button`, `Tile`, `Panel`, a brass-dial `Timer`, etc. in `components/ui/`), then port both games' existing markup onto them. Also replace the leftover default `create-next-app` home page (`app/page.tsx`, which still has a stray Timer test) with the real mode selector. Own branding, show-inspired physicality but not the show's logo/exact palette.
2. **Conundrum Game** — not started at all yet (types/logic/UI all TODO), likely after the UI pass so it's built directly on the new shared primitives instead of needing a second restyle later.
3. **Backend + solvers, combined:** Phase 2 backend (auth, DB, leaderboards, daily challenges — see Phase 2 section above) alongside the Letters Trie-based best-word solver and a Numbers solver (exhaustive/near-exhaustive search over the 6 drawn numbers), since the user wants these done together rather than sequentially.
4. 1v1 competitive play for Numbers' `declare` mode depends on the backend above — not buildable standalone.

---

## Getting Started (for future sessions)

If you're a Claude instance coming into this repo mid-project:

1. Read this `CLAUDE.md` first, including the **Progress Snapshot** and **Next Planned Work** sections above — they tell you exactly what's done and what's next.
2. Read `LEARNING.md` for the full detail behind that snapshot (concepts taught, bugs found, design decisions and why).
3. Check the plan file at `/Users/rohanbalasubramanian/.claude/plans/role-philosophy-precious-puppy.md` for longer-horizon phase context.
4. Understand the folder structure above and the state management pattern (useReducer for phase machines, local hooks for performance).
5. The user will give you a task; explain the "why" before implementing, scaffold TODOs for the user to fill in, and review their code critically.
