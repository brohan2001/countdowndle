# Countdown: Orchestrated Build Plan (Opus planning → Sonnet orchestrating → agy workers)

## Context
On 2026-10-09 the user said they were turning this into an "agent subagent automated LLM project", and the mission brief explains what that means.
- **The Mentorship Rules are fully superseded.** Claude, as lead orchestrator, writes the reducers, algorithms and architecture. Bounded tasks go to `agy` workers.
- **Scope grows** to cover:
  - a finite letter bag and seeded RNG;
  - a Trie best-word solver;
  - a Numbers solver;
  - Conundrum;
  - Daily mode;
  - real-time 1v1 on Supabase, with both anonymous play and accounts;
  - deployment on Vercel.

A **different session (Sonnet 5.5)** will execute this plan, so the plan has to stand on its own.

### Decisions (user, 2026-10-09)

| Topic | Decision |
|---|---|
| Mentorship rules | Fully superseded. LEARNING.md becomes a short "what was built and why" log per checkpoint. |
| Letters draw | Finite bag: weighted multiset, Fisher-Yates shuffle, drawn without replacement, held in reducer state. |
| Conundrum rules | "Whatever is in the current version of the game", read as the real TV show: **flat 10 points with no time bonus**. This overrides the brief's remaining-time bonus. The answer is a unique 9-letter anagram with plurals and inflections filtered out. Solo: a wrong buzz scores 0 and ends the round. Duel: a wrong buzz locks that player out and the opponent gets the remaining time. |
| 1v1 | Real-time rooms now, on Supabase (Postgres + Realtime + Auth). |
| Identity | Anonymous play (Supabase anonymous sign-in plus a display name) **and** full accounts. An anonymous user can upgrade by linking an identity, keeping their history. |
| Deploy | Vercel. |

| Numbers declare mode | Becomes Apterous-style, and is the **only Apterous feature in scope now**.<br>• Declare inside the 30 s. The declaration **can be updated while the clock runs**.<br>• Then prove it in the **calculator only**, even if free text was used to work it out.<br>• **Per-tap clock:** each tile or operator tap must land within `PROVE_TAP_SECONDS = 5` of the previous one, and every tap resets the clock. There is no total cap.<br>• A stall fails the proof, scoring 0. This replaces today's untimed `proving` phase. |
| Other Apterous features | Formats, bots, Goatdown and ratings are **deferred** to "Later". |
| UI | Studio Desk applies **site-wide**: every page, including home, auth, lobby, daily and results. Exact spec in §1b. |
| Execution | The user will run with permissions bypassed, so the M5/M6 account steps remain the only hard stops. |

### Defaults I chose (flag if wrong)
- The Daily key uses the player's **local** date (Wordle-style).
- Duel format starts as "quick" (Letters, Numbers, Conundrum), with "full show" as a later option.
- Daily stays localStorage-first. It syncs to the DB when signed in, from M6 onward.

---

## 1. Current State Audit (verified in the repo, 2026-10-09)

**Letters: complete and playable.**
- `lib/letters/{lettersPool,scoring,dictionary,useLettersGame}.ts` and `components/letters/*` are wired together in `app/letters/page.tsx`.
- Draws come from an *infinite weighted pool* via `Math.random` (`lettersPool.ts:61`).
- `dictionary.ts` caches `/dictionary/words.txt` into a `Set` and has `canBuildFromBoard` and `validateWord` helpers.
- The wordlist has 126,750 words, 18,887 of them nine letters long. **Its source and license are unrecorded**, which blocks public deployment.

**Numbers: logic complete and play-tested in every mode combination.**
- `arithmetic.ts#applyOperator` is the single legality rule; the solver must reuse it.
- `expression.ts` is a recursive-descent parser with no `eval`.
- `useNumbersGame.ts#canWork` is the shared guard.

**Shared code.**
- `lib/shared/random.ts#shuffle` is already a correct Fisher-Yates but **mutates its input**.
- `useCountdown.ts` keeps ticks local and fires `onExpire` once.
- `components/ui/{Timer,ScoreDisplay}.tsx` exist.
- `Math.random` is called directly in 3 places, so nothing is seedable yet.

**Conundrum:** only partial types (`types/conundrum.ts`).

**UI:** default Tailwind everywhere.
- The Studio Desk spec is locked in CLAUDE.md decision 4 but not implemented.
- `app/page.tsx` is still the create-next-app page with a stray Timer test.

**Infrastructure.**
- There are no tests and vitest isn't installed.
- Git now works, but the only commit is create-next-app's, so **all the work so far is uncommitted**.
- `.history/` (VS Code) is untracked.

**agy.**
- Installed. Available models are `gemini-3.8-flash-{low,medium,high}`, `gemini-3.1-pro-{low,high}`, `claude-sonnet-4-6` and `claude-opus-4-6-thinking`.
- **Sonnet 5.5 isn't available in agy**, so the strongest Claude worker is `claude-sonnet-4-6`.

---

## 1b. Studio Desk spec (exact values from the chosen mockup; becomes `@theme` tokens)

**Colors**

| Role | Value |
|---|---|
| Page background | `#efe6d3`, with a 1px border `#d8c9a3` on framed panels |
| Ink (titles, text) | `#3c2b1e` |
| Secondary text | `#5a4632` |
| Accent text (score, labels) | `#8a5a20` |
| Tile and card paper | `#f9f3e4` |
| Tile, input and tab border | `1.5px #c9b98f` |
| Inactive tab | `#e7dabd` |
| Brass (timer rim, active-tab edge) | `#b8944f` |
| Primary button | bg `#2f4a3c`, text `#efe6d3` |
| Urgent timer | `#a8402a` |
| Dial face | `#f7f0e0` |
| Paper shadow | `0 2px 3px rgba(74,52,40,.15)` |
| Dial shadow | `0 4px 10px rgba(74,52,40,.18), inset 0 0 0 2px #efe6d3` |

**Type**
- **Fraunces** (500/600/700): titles at 600, tile letters at 600, timer numerals at 700, word input.
- **Karla** (400–700): chrome, labels and buttons, with buttons at 700.

**Shapes**
- Radius 5px everywhere.
- Tabs are rounded on the top corners only (`5px 5px 0 0`), with no bottom border. The active tab is paper-colored with an inset `0 -2px 0 #b8944f`.
- Tiles alternate `rotate(-1.4deg)` on odd and `rotate(1.2deg)` on even.

**Elements**
- Topbar: a `1px dashed #c9b98f` bottom border.
- Dial timer: 92px circle with a 5px brass border and a `seconds` label (9px, `.14em` tracking, uppercase, `#8a5a20`). It goes urgent at ≤5 s.

**Not in the mockup** (extrapolated here; must stay in the same language):
- Result panels: paper cards.
- Number tiles: the same Tile primitive.
- Operator keys: Tile-style.
- Lobby and room lists: paper cards on cream.
- Dark mode: **out of scope for now**. A later "night desk" palette would need its own design pass.

---

## 1c. Apterous feature research (apterous.org, wiki.apterous.org)

Most rule detail sits behind the logged-in "Rules" tab, so this list combines the public wiki, the homepage and the TV rules. The user can paste the Rules-tab text to sharpen it. **Only mechanics are taken; Apterous's names and branding, such as its bot names, are not reused.**

| Apterous feature | What it is | Plan placement |
|---|---|---|
| Declare / prove (numbers) | Declare during the clock and update it as you improve, then prove the working in a short window. | **M1, in scope now** (per-tap 5 s prove clock) |
| Letters declaration | After time, declare word length (the picker declares first), then reveal. | Deferred |
| Bots at graded difficulty | 8 tiers from weakest to strongest. | Deferred |
| Formats | 15 Rounder (full show), 9 Rounder, "Flat" (no conundrum weighting), Unlimited (no clock), Speed (short clock, e.g. 18 rounds × 10 s). | Deferred |
| Attack modes | Single-round-type sprints: Letters Attack, Numbers Attack, Conundrum Attack. | Deferred |
| Top Dog / Ascension | Survival and escalation ladders (beat a rising target, or keep going until you fail). | Deferred |
| Goatdown variant | 9th letter can be **any chosen letter** (6 s to pick). Conundrum shows 8 letters; if unsolved, the missing letter is revealed plus extra time, and a solve is then worth 7 pts. | Deferred |
| Ratings and stats | Wins and losses, high scores, max-count records, ratings. | Deferred |
| Chat, Duel events, tournaments, Game of the Week, multiple languages, Dark Mode | Community layer. | **Deferred** (beyond this plan) |

---

## 2. Work Breakdown Structure (in execution order; each [ ] = one checkpoint, tag in parentheses)

### M0: Baseline & infrastructure
- [x] Gitignore `.history/`. Commit everything as the baseline (`checkpoint/baseline`).
- [x] Set up vitest:
  - Install vitest (dev dependency).
  - Add `vitest.config.ts` with the `@/` alias and the node environment.
  - Add the scripts `test` and `test:run`.
- [x] Write characterization tests that lock current behaviour before any refactor (`checkpoint/test-harness`). They cover:
  - `arithmetic`
  - `expression`
  - scoring for both games
  - `validateWord`
  - the Letters and Numbers reducer transitions
- [x] Rewrite CLAUDE.md:
  - Replace the Mentorship Rules with the orchestrator workflow and delegation rules.
  - Resolve open question 5.
  - Record the decisions table above.
- [x] Update memory: replace `project_pivot_agent_automation.md` with the resolved decision.

### M1: Core algorithms (run the "Numbers declare + timed prove" item, at the end of this list, **first**)
- [x] **Seeded RNG** in `lib/shared/random.ts`:
  - `type Rng = () => number`, `mulberry32(seed)`, `hashString(s): number` (cyrb53).
  - `shuffle(items, rng = Math.random)` becomes non-mutating, returning a copy. Update its callers.
  - Thread an optional `rng` through `drawLetter`, `pickRandomFillCounts`, the `numberPool` draws and `pickTarget`.
  - Tag: `checkpoint/seeded-prng`.
- [x] **Finite letter bag**:
  - Add a vowel deck and a consonant deck (weighted multisets) to `LettersGameState`.
  - Shuffle them on `NEW_ROUND` using the injected rng.
  - `SELECT_LETTER` and `RANDOM_FILL` draw from the top immutably. No `.push` and no derived counts in state.
  - Tag: `checkpoint/letters-bag`.
- [x] **Trie** in `lib/letters/trie.ts`:
  - `insert`, `has`, `hasPrefix`.
  - `findWords(counts: Map<string, number>)` is a DFS that only follows letters whose remaining count is above 0.
  - It is built lazily from the cached word text after the round ends.
  - Tag: `checkpoint/letters-trie`.
- [x] **Best-word analysis** in `RoundResultPanel`: the longest word(s), the top N, and whether the player matched the maximum (`checkpoint/letters-best-word`).
- [x] **Numbers solver** in `lib/numbers/solver.ts`:
  - DFS over the remaining multiset. At each step it takes an unordered pair and one of `+ − × ÷` via `applyOperator`.
  - Pruning:
    - Return early on an exact hit.
    - Apply `+` and `×` to a pair only once (they're commutative).
    - Skip ×1 and ÷1.
    - Memoize sorted states.
  - It returns `NumbersStep[]` so `StepHistory` can render the solution.
  - It runs at round end. If profiling shows it takes more than 50 ms, it moves to a Web Worker.
  - Tag: `checkpoint/numbers-solver`.
- [x] **Numbers declare + timed prove (Apterous-style). This is the first task after M0.**
  - **Reducer (`useNumbersGame.ts`):**
    - `DECLARE` is allowed repeatedly while `solving`; the latest value wins.
    - On `TIME_EXPIRED` with a declaration, the phase goes to `proving` and `inputMode` is forced to `'calculator'` for the proof.
    - On `TIME_EXPIRED` with no declaration, the phase goes to `roundOver`, scoring `invalid-empty` (0).
    - New action `PROVE_TIMEOUT` goes to `roundOver`, scoring `invalid-unproven` (0).
    - The proof succeeds when a confirmed step's result equals the declared value; reuse `buildDeclareResult`.
  - **Per-tap clock (UI-local, no ticks in the reducer):**
    - A small `ProveClock` component wraps `useCountdown({ durationSeconds: PROVE_TAP_SECONDS, onExpire: () => dispatch({type:'PROVE_TIMEOUT'}) })` and auto-starts on mount.
    - The page keeps a local `tapCount` that it increments in the tile and operator click handlers while the phase is `proving`, and renders `<ProveClock key={tapCount} />`.
    - **Remounting** gives an exact fresh 5 s on each tap. That is cleaner than `reset()`+`start()`, which would keep the old interval phase. Undo or clear also counts as a tap.
    - Show the clock as a small DialTimer variant.
  - **Types:** add `PROVE_TAP_SECONDS = 5` and the `PROVE_TIMEOUT` action to `types/numbers.ts`. `canWork` is unchanged (declare mode only works while proving).
  - **Tests:**
    - Declaration update.
    - Expiry with and without a declaration.
    - Proof success.
    - `PROVE_TIMEOUT` → 0.
    - `PROVE_TIMEOUT` ignored outside `proving`.
  - Tag: `checkpoint/numbers-timed-prove`.

### M2: Visual skins (Studio Desk; comes before Conundrum's UI so nothing is styled twice)
- [x] Tokens and fonts: Tailwind v4 `@theme` tokens in `app/globals.css`, Fraunces and Karla via `next/font` in `app/layout.tsx` (`checkpoint/ui-tokens`).
- [x] Primitives in `components/ui/`: `Button`, `Tile`, `Panel`, `TabSelector`, `DialTimer` (replacing `Timer`) (`checkpoint/ui-primitives`).
- [ ] Port Letters, then Numbers, onto the primitives. Markup and classes only (`checkpoint/ui-letters`, `checkpoint/ui-numbers`).
- [ ] Real home page and mode selector in `app/page.tsx` (`checkpoint/ui-home`).

### M3: Conundrum engine
- [ ] **Offline generator** `scripts/build-conundrums.ts` (run with `pnpm tsx`):
  - Take the 9-letter words and group them by sorted-letter signature.
  - Keep signatures that have exactly one word.
  - Filter out inflections: drop a word if it ends in `s`/`es`/`ed`/`ing` and its stem is in the dictionary.
  - Write `public/dictionary/conundrums.json`.
  - Tag: `checkpoint/conundrum-generator`.
- [ ] **Scramble:** `shuffle(solution)`, rejected if it equals the solution or is itself a dictionary word.
- [ ] **Types and reducer:**
  - `ConundrumPhase = 'idle' | 'solving' | 'buzzed' | 'roundOver'`, plus the full `ConundrumGameState` and `ConundrumGameAction`.
  - `BUZZ` captures the time remaining once. Ticks never enter the reducer.
  - Scoring is a flat 10.
  - Tag: `checkpoint/conundrum-reducer`.
- [ ] **UI:** `app/conundrum/page.tsx` and `components/conundrum/*`, built on the M2 primitives (`checkpoint/conundrum-ui`).

### M4: Daily mode (local-first)
- [ ] `lib/daily/seed.ts`: `dailyKey(date)` → local `YYYY-MM-DD`; `dailyRng(key, gameId)`, which gives each game its own stream.
- [ ] Deterministic daily puzzles:
  - Letters: a preset board drawn from the seeded bag.
  - Numbers: the large count, tiles and target.
  - Conundrum: an index into `conundrums.json`.
- [ ] `lib/daily/storage.ts`:
  - A versioned localStorage key `countdown:daily:v1` holding the result history.
  - Every read and write is wrapped in try/catch.
  - **Current and best streak are derived from the history**, not stored.
- [ ] `lib/daily/share.ts`: a spoiler-free emoji grid of score bands only.
- [ ] `/daily` route (`checkpoint/daily-seed`, `checkpoint/daily-storage`, `checkpoint/daily-ui`).

### M5: Deploy the static app
- [ ] Record the dictionary license. **This is a blocker; the user must confirm the source.**
- [ ] User: create a GitHub remote and a Vercel project, then push.
- [ ] Claude: add GitHub Actions CI running tsc, lint, vitest and build (`checkpoint/deploy-static`).

### M6: Backend — Supabase (auth + DB)
- [ ] **User steps** (outward-facing, so they can't run overnight):
  - Create the Supabase project.
  - Enable anonymous sign-ins and the email/OAuth providers.
  - Put `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel.
- [ ] Supabase clients:
  - `@supabase/supabase-js` and `@supabase/ssr`.
  - `lib/supabase/{client,server}.ts` and middleware for session refresh.
- [ ] Migrations in `supabase/migrations/`:
  - Tables: `profiles` (display_name, is_anonymous), `matches`, `match_players`, `rounds` (server-held puzzle + solution), `round_submissions`.
  - **RLS on every table**: players read only their own matches, and solutions are readable only after the round ends.
- [ ] Auth UI:
  - Play anonymously with a display name.
  - Sign up or in.
  - "Save your progress" upgrades an anonymous account via `linkIdentity`/`updateUser`.
- Tags: `checkpoint/supabase-auth`, `checkpoint/db-schema`.

### M7: Real-time 1v1 duels
- [ ] **Match engine** in `lib/match/`:
  - A pure match reducer with the phases `lobby → round[i] (playing → reveal) → final`.
  - Match scoring that composes the three games' round results.
  - Transport-agnostic, and unit-tested.
- [ ] **Authority on the server.** Next.js route handlers or server actions running with the service role:
  - generate the puzzles from a server seed;
  - validate submissions (reusing `validateWord`, `expression`/`applyOperator` and the solver);
  - advance the phases.
  - The client never receives a Conundrum solution before reveal, which closes the CLAUDE.md spoiler issue.
- [ ] **Rooms.**
  - Create a room to get a 6-char code and a link.
  - Supabase Realtime **presence** shows who's in the lobby.
  - **Broadcast** carries phase changes.
  - Postgres is the source of truth, so a reconnect re-fetches state.
- [ ] **Timing.**
  - The server stores `round_started_at`.
  - Each client derives its remaining time locally with `useCountdown` seeded from that timestamp. There is no per-tick network or reducer traffic.
  - The server enforces the deadline with a grace window.
- [ ] **Conundrum buzzer.**
  - A buzz is an insert into `buzzes` under a unique `(round_id)` constraint, so the first insert wins atomically.
  - A wrong answer locks that player out, and the opponent gets the remaining time.
- [ ] **Letters picker turn and Numbers declare-mode duel:**
  - Picker turns alternate.
  - In declare mode, both players declare and the closest proves.
- Tags: `checkpoint/match-engine`, `checkpoint/rooms`, `checkpoint/duel-letters`, `checkpoint/duel-numbers`, `checkpoint/duel-conundrum`.
- *Teaching notes go into LEARNING.md*: RLS, why the server is authoritative, clock-skew handling and unique-constraint races.

### Later (not in this plan)
Apterous extras (format engine + presets: 15/9-rounder, Speed, Unlimited, Attack modes, Top Dog; graded bots via Trie/solver; Letters length-declaration flow; Goatdown variant; Elo ratings + stats page), leaderboards UI, server-synced daily stats, chat, tournaments and events, spectating, other languages, the dark "night desk" palette, and the forum.

---

## 3. Delegation Matrix

| Work | Claude (Sonnet 5.5 orchestrator) | agy worker | Model (fallback) |
|---|---|---|---|
| RNG, bag, every reducer and its state shape | writes | – | – |
| Trie, best-word DFS, Numbers solver | writes | test files from a given API and case list | flash-high (flash-medium) |
| Conundrum generator and reducer | writes | – | – |
| Daily seed and storage schema | writes | `share.ts` formatter, date helpers and their tests | flash-medium |
| Characterization tests (M0) | lists the cases | writes the test files | flash-medium |
| UI tokens and fonts | writes (it is the visual contract) | – | – |
| UI primitives | specifies the props and the Studio Desk spec | implements one file per task | flash-high (flash-medium) |
| Porting Letters/Numbers/Conundrum markup | reviews | implements one page per task | claude-sonnet-4-6 (gemini-3.1-pro-high, then flash-high) |
| Supabase schema, RLS, server authority, realtime, auth | writes (security-critical) | – | – |
| Auth/lobby form markup | specifies | implements the skin | flash-high |
| Commits, tags, CLAUDE.md, LEARNING.md, RUNLOG | only Claude | never | – |

**Worker brief template.** agy has no repo memory, so every brief is self-contained. It contains:
1. One-sentence goal.
2. The **exact allowed file paths**, plus "touch nothing else, never run git".
3. The relevant types and interfaces, pasted inline.
4. The signatures, the expected input/output and the edge cases.
5. Style rules:
   - match the surrounding code;
   - keep reducers immutable;
   - store no derived state;
   - no `eval`/`new Function`;
   - Tailwind tokens only, no raw hex.
6. The acceptance checks.

**Invocation:**
```
agy -p "$(cat brief.md)" --model gemini-3.8-flash-medium --mode accept-edits --print-timeout 10m
```
- Run it from the repo root.
- Afterwards, compare `git status --porcelain` with the allowed list and revert any stray file.
- On a rate-limit or error, retry once on the fallback model, then do the task directly.

---

## 4. Verification & Checkpoint Strategy

**Gate.** All of these must pass before any commit:
1. `pnpm tsc --noEmit`
2. `pnpm lint`
3. `pnpm test:run`
4. `pnpm build`. Run this at milestone ends and on any checkpoint that touches config.

**Review.**
- Claude reads every worker diff.
- Tests must assert behaviour; snapshots of whatever the code printed don't count.
- Invariants are grepped in `lib/**/use*.ts`:
  - no `.push(`, `.sort(` or `.splice(` on state;
  - no tick state in reducers;
  - no `eval`.

**UI checkpoints.**
- Use the `run` skill or `pnpm dev` to get a screenshot or a manual run.
- Overnight UI tags are marked `needs-visual-QA` in RUNLOG.

**Backend checkpoints.**
- Apply migrations to a local Supabase (`supabase start`, Docker), or to a dev project if that's unavailable.
- Write RLS tests that confirm a second user can't read another match's solution.
- Run a two-browser manual duel smoke test.

**Commits and tags.**
- Commit message: `checkpoint: letters-trie — <summary>`.
- Annotated tag: `checkpoint/letters-trie`. Git refs can't contain `: `, so the tag uses `/`.

**Branches.**
- Use `build/m<N>-<name>`, merged with `--no-ff` into `main` when the milestone is green.

**Rollback.**
- To revisit a checkpoint: `git switch -c redo/<x> checkpoint/<tag>`.
- Use `git revert` on `main`.
- Never use `reset --hard` or force-push without user approval.

**Overnight run.**
- `docs/RUNLOG.md` records the time, the checkpoint, the gate output summary and any skipped or failed tasks with the reason.
- A red gate is never committed: the run logs it and moves on to the next independent task.
- **Stop points that need the user:**
  - the dictionary license;
  - creating the GitHub/Vercel/Supabase accounts and env vars;
  - any destructive git operation.

**Prerequisite.**
- Before an unattended run, the user allowlists `pnpm`, `git add/commit/tag/switch/merge` and `agy`, e.g. via `/fewer-permission-prompts`.
- Without that, the session stalls on prompts.

---

## 5. First actions for the executing session
1. Read this plan and CLAUDE.md. Copy this plan into the repo as `docs/PLAN.md`, committed with the baseline, so it survives model switches and new sessions. Tick its checkboxes as checkpoints land.
2. M0: baseline commit → vitest → characterization tests → CLAUDE.md rewrite.
3. Continue in WBS order. M1–M4 can run autonomously.
4. Pause at M5 and M6 for the user steps.
