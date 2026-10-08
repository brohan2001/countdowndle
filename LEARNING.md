# LEARNING.md — Countdown Project Learning Journey

This file documents what you've learned building this project, the architectural decisions, key concepts, and the chronological process. Use this to solidify understanding and refer back to when you forget *why* we made certain choices.

---

## Phase 1: Foundation & Architecture (Completed)

### What You Built
- Initialized a Next.js 16 project with TypeScript and Tailwind CSS
- Created a folder structure that separates concerns (game-specific UI/logic in their own folders, shared utilities in `lib/shared/`)
- Defined TypeScript type contracts for all three games
- Scaffolded utility functions (Fisher-Yates shuffle, countdown timer hook)

### Commands You Ran

```bash
# Create a new Next.js app with TypeScript, Tailwind, and App Router
pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"

# Install animation library
pnpm add framer-motion

# Create folder structure for games and utilities
mkdir -p components/ui components/layout components/letters components/numbers components/conundrum
mkdir -p lib/letters lib/numbers lib/conundrum lib/shared
mkdir -p types
mkdir -p public/dictionary
mkdir -p app/letters app/numbers app/conundrum
```

### Why These Choices Mattered

#### Next.js App Router (not Pages Router)
- **App Router** (used here) is modern Next.js (13+). Routes are defined by folder structure: `app/letters/page.tsx` becomes `/letters`.
- **Pages Router** (older way) used `pages/` folder and is now legacy.
- We chose App Router because it's the current best practice, has better performance (server components by default), and is what you should learn.

#### `--src-dir` Flag (attempted but not critical)
- Puts all source under `src/` folder, keeping root clean.
- Your setup put code at the root `/app` instead — not ideal, but doesn't break anything. If you want to refactor to `src/` later, it's a mechanical change.

#### Folder Structure Philosophy
The structure mirrors **responsibility** and **reusability**:
```
components/
  ├── ui/              # Shared across ALL games (Button, Timer, ScoreDisplay)
  ├── letters/         # ONLY Letters Game UI
  ├── numbers/         # ONLY Numbers Game UI
  └── conundrum/       # ONLY Conundrum Game UI

lib/
  ├── letters/         # ONLY Letters Game logic
  ├── numbers/         # ONLY Numbers Game logic
  ├── conundrum/       # ONLY Conundrum Game logic
  └── shared/          # Utilities reused across games (useCountdown, shuffle)
```

**Why?** 
- If you need to debug Letters scoring, look in `lib/letters/scoring.ts` — nowhere else.
- If Timer needs changes, it's in `components/ui/Timer.tsx` — all games benefit.
- No tangled dependencies, no "oops I broke Numbers while fixing Letters."

---

## Key Concept 1: TypeScript & Type Contracts

### What is TypeScript?
TypeScript is **JavaScript + a type system**. Instead of:
```javascript
// JavaScript — no type info
function getName(user) {
  return user.name; // What if `user` doesn't have a `name` field?
}
```

You write:
```typescript
// TypeScript — types are contracts
interface User {
  name: string;
  age: number;
}

function getName(user: User): string {
  return user.name; // TypeScript ENSURES `user` has `name: string`
}
```

The TypeScript compiler checks your code *before* you run it. If you try to call `getName({ age: 25 })` (missing `name`), the compiler yells: **error TS2345: Argument of type '{ age: number }' is not assignable to parameter of type 'User'.**

**Why it matters for a game:**
- A game has complex state (board, timer, score, round history). TypeScript prevents you from accidentally trying to read `board.vowelCount` when that field doesn't exist, or passing the wrong type to a function.
- Compile-time errors are caught before runtime. Much better than a game crash mid-round.

### Types You Created

**`types/common.ts`:**
```typescript
export type GameMode = 'letters' | 'numbers' | 'conundrum';
```
This says: "A game mode is *exactly one* of these three strings — nothing else." If you try to pass `'tetris'`, TypeScript yells.

**`types/letters.ts`:**
```typescript
export interface LetterTile {
  id: string;        // unique ID per tile (e.g., first E drawn has a different id than second E)
  letter: string;    // the actual letter (A-Z)
  type: LetterType;  // 'vowel' or 'consonant'
}
```
This is a **contract** for a tile. Every time you create a tile, you must provide all three fields with the right types. Miss one? TypeScript error.

---

## Key Concept 2: Discriminated Unions (Tagged Unions)

This is a pattern you used in `LettersGameAction`. It's powerful and worth understanding deeply.

### The Problem It Solves
Imagine you have actions: SELECT_LETTER (needs a letterType), SUBMIT_WORD (doesn't need extra data), RESET_ROUND (doesn't need extra data).

Naive approach:
```typescript
interface GameAction {
  type: 'SELECT_LETTER' | 'SUBMIT_WORD' | 'RESET_ROUND';
  letterType?: string;  // optional, but when?
  // other optional fields?
}
```

Problem: The `type` and the fields are disconnected. What stops you from dispatching `{ type: 'SELECT_LETTER' }` without a `letterType`? The type system doesn't know they're related.

### The Solution: Discriminated Union
```typescript
type GameAction =
  | { type: 'SELECT_LETTER'; letterType: LetterType }  // Must have letterType
  | { type: 'SUBMIT_WORD' }                            // No extra fields
  | { type: 'RESET_ROUND' };
```

Now, TypeScript knows:
- If `type === 'SELECT_LETTER'`, then `letterType` **must** exist.
- If `type === 'SUBMIT_WORD'`, there's no `letterType` field.

When you write your reducer:
```typescript
switch (action.type) {
  case 'SELECT_LETTER':
    // Inside this case, TypeScript KNOWS action.letterType exists
    // If you try to read action.foo, TypeScript errors
    return { ...state, board: [...state.board, drawLetter(action.letterType)] };
  case 'SUBMIT_WORD':
    // Inside this case, action only has `type`, no letterType
    // If you try to use action.letterType, TypeScript errors
    return { ...state, phase: 'roundOver' };
}
```

**Why this matters:** You can't accidentally dispatch malformed actions or read fields that don't exist. The type system **forces** correctness.

---

## Key Concept 3: Game State Phases (Union Types for State Shape)

Look at this from `types/letters.ts`:
```typescript
export type LettersGamePhase = 
  | 'idle'       // pre-game
  | 'selecting'  // player calling letters
  | 'solving'    // timer running, player typing
  | 'roundOver'; // result shown
```

This is a **state machine** in type form.

### Why Not Use Booleans?
```typescript
// BAD approach
interface GameState {
  isGameStarted: boolean;
  isTimerRunning: boolean;
  isRoundOver: boolean;
}
```

Problem: What if `isGameStarted = true`, `isTimerRunning = false`, `isRoundOver = true`? That's nonsense — the game started, timer stopped, but round is over? When did that happen?

### The Better Approach
```typescript
// GOOD approach
type Phase = 'idle' | 'selecting' | 'solving' | 'roundOver';
```

The game is in *exactly one* phase at a time. TypeScript ensures it. Render logic becomes clear:
```typescript
if (phase === 'selecting') {
  return <LetterSelector />;
} else if (phase === 'solving') {
  return <Timer /> and <WordInput />;
} else if (phase === 'roundOver') {
  return <ResultPanel />;
}
```

---

## Key Concept 4: Derived Values vs. Stored State

In `types/letters.ts`, the `LettersGameState` has:
```typescript
board: LetterTile[];  // e.g., [ {id: '1', letter: 'A', type: 'vowel'}, {id: '2', letter: 'E', type: 'vowel'} ]
```

You could be tempted to also store:
```typescript
// BAD: redundant
vowelCount: number;    // e.g., 2
consonantCount: number; // e.g., 0
```

**Don't do this.** Why? Because now you have two "sources of truth." If you update `board` but forget to update `vowelCount`, they're out of sync. Bug.

Instead, **derive** the values:
```typescript
// In your component or computed selector:
const vowelCount = state.board.filter(t => t.type === 'vowel').length;
const consonantCount = state.board.filter(t => t.type === 'consonant').length;
```

It costs nearly nothing (9 tiles is tiny). The benefit: single source of truth, impossible to drift.

---

## Key Concept 5: State Management — useState vs. useReducer

### When to Use `useState`
Simple, independent pieces of state:
```typescript
const [name, setName] = useState('');
const [email, setEmail] = useState('');
```

### When to Use `useReducer`
Complex state with **multi-field, phase-gated transitions**. Your Letters Game has this:

Transition example: "9th letter drawn"
- Must append letter to `board`
- Must flip `phase` from 'selecting' to 'solving'
- Must start the timer
- Must reset `currentInput`

All at once, atomically. With `useState`, you'd do:
```typescript
const [board, setBoard] = useState([]);
const [phase, setPhase] = useState('selecting');
const [timeRemaining, setTimeRemaining] = useState(30);
const [input, setInput] = useState('');

function selectLetter(letterType) {
  const newTile = drawLetter(letterType);
  setBoard(b => [...b, newTile]);  // Update 1
  if (board.length === 8) {        // But what is board.length here?
    setPhase('solving');            // Update 2 — happens later? or now?
    setTimeRemaining(30);           // Update 3
    setInput('');                   // Update 4
  }
}
```

React batches these updates, but reasoning about *which value each `setState` sees* is error-prone. The more setters, the worse.

With `useReducer`:
```typescript
const [state, dispatch] = useReducer(gameReducer, initialState);

function selectLetter(letterType) {
  dispatch({ type: 'SELECT_LETTER', letterType });
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'SELECT_LETTER': {
      const newTile = drawLetter(action.letterType);
      const newBoard = [...state.board, newTile];
      const isGameStarting = newBoard.length === MAX_BOARD_SIZE;
      return {
        ...state,
        board: newBoard,
        phase: isGameStarting ? 'solving' : 'selecting',
        timeRemaining: isGameStarting ? 30 : state.timeRemaining,
        currentInput: isGameStarting ? '' : state.currentInput,
      };
    }
    // ... other cases
  }
}
```

One function, one `action`, one return value. All fields update atomically. Easy to test. Easy to reason about.

**Rule of thumb:** If your state has 3+ fields and they're interdependent, use `useReducer`.

---

## Key Concept 6: Algorithms — Fisher-Yates Shuffle

You created `lib/shared/random.ts` with a TODO for Fisher-Yates shuffle. This is a classic algorithm worth understanding.

### The Problem
You need to pick a random letter from the bag. Naive approach:
```typescript
// BAD: biased
const letters = ['A', 'B', 'C', 'D', 'E'];
const randomIndex = Math.floor(Math.random() * letters.length);
return letters[randomIndex];
```

Looks right, but there's a subtle bias if you do this many times. You're not uniformly sampling.

### The Solution: Fisher-Yates
```typescript
// GOOD: uniformly random
function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]]; // swap
  }
  return items;
}

// Usage: pick a letter
const bag = ['A', 'A', 'E', 'E', 'I', ...];
const shuffled = shuffle([...bag]); // shuffle a copy
return shuffled[0]; // first element is now random
```

**Why it's better:**
- Uniformly random: every permutation has equal probability.
- O(n) time, O(1) space (only one pass through the array).
- Standard solution used everywhere.

You'll implement this when we get to the logic phase.

---

## Key Concept 7: React Hooks — useEffect & Stale Closures

In `lib/shared/useCountdown.ts`, there's a TODO about **stale closures**. This is a common React gotcha.

### The Problem
```typescript
function useCountdown(durationSeconds) {
  const [seconds, setSeconds] = useState(durationSeconds);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(seconds - 1);  // BUG: seconds is stale
    }, 1000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array means this runs once
}
```

Why is it buggy?
1. Component first renders. `seconds = 30`.
2. `useEffect` runs once (empty dependency array). It sets up an interval.
3. Interval callback captures `seconds = 30` in a closure.
4. After 1 second, interval fires. It calls `setSeconds(30 - 1)`.
5. Component re-renders. `seconds = 29`.
6. But the interval callback **still has the old closure** with `seconds = 30`.
7. After another second, interval fires again. It calls `setSeconds(30 - 1)` again (not `29 - 1`).
8. Timer ticks to 29 twice, never goes to 28. Broken.

### The Fix
Use the **functional update** form of `setState`:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setSeconds(prev => prev - 1);  // prev is always current state
  }, 1000);
  return () => clearInterval(interval);
}, []); // Safe to have empty dependency array now
```

Or add `seconds` to the dependency array (makes the interval restart every render — expensive, but explicit):
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setSeconds(seconds - 1);
  }, 1000);
  return () => clearInterval(interval);
}, [seconds]); // Re-run when seconds changes
```

You'll hit this when implementing `useCountdown`.

---

## Architecture Decision: Local vs. Lifted State

### For `currentInput` (the typed word)
**Decision: Keep local to `<WordInput />` component, lift only on submit.**

Why? Every keystroke is high-frequency. If you lifted `currentInput` into the game reducer:
- Every keystroke → dispatch `UPDATE_INPUT` action
- Reducer returns new state
- Entire game tree re-renders (board, timer, score display, etc.)
- Wasteful and no benefit (nothing outside WordInput cares about in-progress text)

Better: `<WordInput />` has local `useState` for the text. Only on submit do you call `onSubmit(word)` callback and lift it to the reducer.

### For Timer (`timeRemaining`)
**Decision: Self-contained `useCountdown` hook, only call `onExpire()` into the game reducer when time hits zero.**

Why? Similar to above — if every TICK dispatched into the main reducer, the entire game re-renders 30 times per second. Wasteful.

Better: `useCountdown` manages its own interval and local state. Only when time expires does it call the callback: `onExpire() → dispatch(TIME_EXPIRED)`.

---

## What Comes Next (Phase 2)

You've laid the foundation. Next steps:

1. **Implement the shared utilities** (write the logic for `shuffle` and `useCountdown`)
2. **Build the Letters Game skeleton components** (LettersBoard, LetterSelector, WordInput, etc.)
3. **Implement the useLettersGame reducer** (handle SELECT_LETTER, SUBMIT_WORD, TICK, etc.)
4. **Build letterPool.ts** (create the bag with letter counts)
5. **Build scoring.ts** (word length → points)
6. **Build dictionary.ts** (load wordlist, validate words)
7. **Play the game locally** and iterate on feel/bugs

Then Numbers Game and Conundrum follow the same pattern.

---

## Phase 2: Letters Game Logic Layer (Completed)

All pure logic for the Letters Game is done and type-checks clean end-to-end: `lib/letters/lettersPool.ts`, `lib/letters/scoring.ts`, `lib/letters/dictionary.ts`, `lib/letters/useLettersGame.ts`. The wordlist is sourced and cleaned at `public/dictionary/words.txt`.

### `lettersPool.ts` — the letter bag

`LetterBag` is a **count map** (`{ vowel: { A: 15, E: 21, ... }, consonant: {...} }`), not a flat array — that's how `types/letters.ts` models it, and it drives everything downstream.

**Weighted random selection (the actual algorithm used for `drawLetter`):** rather than flattening the count map into a big array of repeated letters and shuffling it (wasteful — you only need one pick, not a full permutation), we used **cumulative-sum weighted selection**, sometimes called "roulette wheel selection":
1. Sum all the remaining counts for the requested type → `total`.
2. Pick a random number `r` in `[0, total)`.
3. Walk the `[letter, count]` entries, adding each `count` to a running `cumulative` total. The first letter where `r < cumulative` is your pick.

This works directly off the count map — no array-building, no shuffle needed — and naturally weights common letters (bigger counts → bigger "slice" of the random range) without any extra machinery.

**The big lesson from this file: JavaScript objects are references, not values.** `const pool = bag[type]` doesn't copy anything — `pool` and `bag[type]` are two names for the *same* object. Mutating through one mutates the other. This broke `drawLetter` early on (`pool[letter]--` silently mutated the bag passed in by the caller) and is exactly the kind of bug that breaks a `useReducer`-based state machine, since reducers must never mutate the state they're given — only return new objects. The fix pattern, used throughout this whole logic layer: build a *new* object at every level that actually changed (`{ ...pool, [letter]: pool[letter] - 1 }`, then `{ ...bag, [type]: newPool }`), while letting the untouched sibling (e.g. `consonant` when you drew a `vowel`) keep pointing at its original, unchanged reference.

### `scoring.ts` — points

Dead simple by design: `word.length` points, except a full 9-letter word (using every tile) scores double (18). `scoreWord` deliberately does **not** check whether a word is valid — that's `dictionary.ts`'s job. Single responsibility: one function decides "is this allowed," a separate one decides "how many points."

### `dictionary.ts` — wordlist loading + validation

**Wordlist sourcing:** built from SCOWL (Spell Checker Oriented Word Lists), British spelling, filtered to lowercase `a-z` only (no hyphens/apostrophes/punctuation), deduplicated, sorted — 126,750 words after removing proper-noun contamination that leaked in from an initial over-broad SCOWL category selection (caught via spot-checking against known cities/brands/names like `london`, `zyrtec`, `aachen` before the fix; verified clean after).

**Loading pattern — fetch-once, cache-forever-unless-failed:** `loadDictionary()` uses a module-level variable (`let cachedDictionaryPromise`, declared *outside* any function) to remember whether a fetch has already started. Storing the **Promise itself** (not its resolved value) means even multiple calls that happen before the fetch finishes all share the same in-flight request — only one network call ever happens. A `.catch()` chained onto the fetch resets that cached promise back to `null` on failure (so the *next* call gets a fresh retry) while still re-throwing the error (so the *current* caller still learns it failed).

**Two real bugs caught during review, both worth remembering:**
- **Regex escape typo:** `raw.split(/r?\n/)` (missing backslash) matches the literal letter "r" before a newline, not a carriage-return character — this silently ate the trailing `r` off every word ending in `r` right before a line break (`"car"` → `"ca"`). Correct: `/\r?\n/`.
- **Operator precedence in a running count:** `map.set(key, map.get(key) || 0 + 1)` parses as `map.get(key) || (0 + 1)`, not `(map.get(key) || 0) + 1` — since `||` binds looser than `+`. Once a key had any truthy count, the `+1` branch was never reached again, so every count silently capped at 1. This showed up in `canBuildFromBoard`'s letter-frequency counting and would have let players use a tile's letter more times than physically available on the board.

**`validateWord`** composes everything in order, short-circuiting at the first failure: empty (after `.trim()`) → too short (`MIN_WORD_LENGTH`) → not buildable from the board (`canBuildFromBoard`, a frequency-count comparison between the word's letters and the board's) → not a real word (`isValidWord`) → valid.

### `useLettersGame.ts` — the reducer

All six `LettersGameAction` cases are implemented: `SELECT_LETTER`, `UPDATE_INPUT`, `SUBMIT_WORD`, `TIME_EXPIRED`, `RESET_ROUND`, `TICK`.

**A real architecture conflict, resolved twice:** the type contract had a `TICK` action and an `UPDATE_INPUT` action that both implied "dispatch this frequently" (once per second, once per keystroke). But an earlier documented decision (see "Architecture Decision: Local vs. Lifted State" above) specifically avoids exactly that, for performance reasons. Resolution: both became intentional no-ops in the reducer. The timer's live countdown lives entirely inside a `useCountdown`-backed `Timer` component (only `TIME_EXPIRED` — fired once — reaches the reducer); the typed word lives in local `useState` inside `WordInput`, only reaching the reducer via `SUBMIT_WORD`'s payload at submission time. This required changing `SUBMIT_WORD`'s type from `{ type: 'SUBMIT_WORD' }` to `{ type: 'SUBMIT_WORD'; word: string }`.

**Reducers can't do async work — a hard constraint, not a style choice.** `validateWord` needs the loaded dictionary `Set`, but loading it is asynchronous, and a reducer only ever receives `(state, action)` — nothing else, and nothing async. Solution: the dictionary gets passed in as part of the action itself (`SUBMIT_WORD` carries `dictionary: Set<string>`), supplied by whichever component already has it loaded at dispatch time.

**Switch-statement gotchas hit in practice:**
- **Fallthrough:** a `case` without a `return`/`break` falls into the next case. Early on, four unfinished cases (`SELECT_LETTER`, `UPDATE_INPUT`, `SUBMIT_WORD`, `TIME_EXPIRED`) were all bare TODO comments that fell straight through into `RESET_ROUND`'s logic — meaning dispatching any of them would have silently reset the round instead of doing nothing.
- **Shared block scope:** `const`/`let` inside a `case` isn't scoped to that case alone — it's scoped to the whole `switch` — unless each case wraps its body in its own `{ }`. Without that, two different cases declaring a same-named `const` would throw a "cannot redeclare" compile error. Fixed by wrapping every case body in braces.

**A genuine logic bug, not just a typo:** the phase-transition ternary in `SELECT_LETTER` was fully inverted (`updatedBoard.length >= MAX_BOARD_SIZE ? "selecting" : state.phase`) — it never transitioned `'idle' → 'selecting'` while picking letters, and flipped to the wrong phase (`'selecting'` instead of `'solving'`) exactly when the board filled up. Traced through step-by-step to see it, then fixed to `? "solving" : "selecting"`.

**`RESET_ROUND`'s partial-reset pattern:** spreading `createInitialState()` first, then explicitly overriding just `totalScore` and `history` from the *current* state afterward — because object spread applies left-to-right and later keys win. Reversing the order would let the fresh state's `totalScore: 0` clobber the accumulated score every round.

---

## Phase 3: Letters Game UI Layer (Completed)

All six UI pieces are built, reviewed, and wired end-to-end: `components/ui/Timer.tsx`, `components/ui/ScoreDisplay.tsx`, `components/letters/LettersBoard.tsx`, `components/letters/LetterSelector.tsx`, `components/letters/WordInput.tsx`, `components/letters/RoundResultPanel.tsx`, and the orchestrator `app/letters/page.tsx`. The game is playable start to finish in the browser. This was the first phase built almost entirely solo — increasing independence throughout, and a genuine milestone: the Numbers-game groundwork (below) was the first TODO written with zero outside (ChatGPT/Gemini) help.

### `useCountdown.ts` — the recurring "impure updater" bug, twice

The very first version called `options.onExpire?.()` and `setIsRunning(false)` **inside** the functional updater passed to `setSecondsRemaining`. State updater functions are supposed to be pure — React's dev-mode `StrictMode` deliberately double-invokes them to catch exactly this. We predicted this could double-fire `onExpire`, and later found *actual proof* sitting in the Next.js dev log: two identical `"expired"` console lines logged at the same millisecond, from an earlier smoke test. Real, not hypothetical.

**Fix:** split into two effects — one that does a pure decrement (`setSecondsRemaining(prev => Math.max(0, prev - 1))`, safe to double-invoke since it has no side effects), and a second plain `useEffect` (not a state updater, not subject to the same double-invoke rule) that watches `[isRunning, secondsRemaining, options.onExpire]` and fires `onExpire()` exactly once when `secondsRemaining` hits `0`. Also: `start`/`pause`/`reset` were originally plain functions recreated every render, which broke `Timer`'s `useEffect` dependency array (new references every render). Fixed by wrapping all three in `useCallback`.

### `Timer.tsx` — round-reset via `reset()` then `start()`

`Timer` receives `isRunning` as a prop (driven by `phase === 'solving'` in the parent) and syncs it into `useCountdown`'s imperative `start()`/`pause()` via a `useEffect`. The tricky part: on a *second* round, `secondsRemaining` was still sitting at `0` from the previous round's expiry — nothing reset it. Fix: call `reset()` then `start()` when `isRunning` flips to `true`. Because both are synchronous `setState` calls in the same effect, React batches them — the final state after the batch is "full duration, running," not two flickering renders.

### `ScoreDisplay.tsx` — the "how do I re-trigger on a repeated value" problem

Needed a "+N" flash that plays every round, even if two rounds in a row score the same (or zero) points — a value not changing can't trigger a `useEffect` on its own. Solved with a `roundId` prop (`state.history.length`) that changes every round purely to serve as a trigger, independent of the actual `lastRoundPoints` value. Real bug caught: the fade-out `useEffect` was written with **no dependency array at all** (not even `[]`) — meaning it reran on *every* render, including unrelated ones (e.g. `SELECT_LETTER` dispatches during the next round's picking), continually cancelling and restarting the 2-second hide timer so the flash could get stuck showing indefinitely. Fixed with `[roundId, lastRoundPoints]`.

### `LettersBoard.tsx` — key uniqueness and Tailwind gotchas

Real bugs caught: a template-literal typo (`` `empty-{$index}` `` instead of `` `empty-${index}` ``) that gave every placeholder tile the identical key — directly the failure mode the surrounding comment warned about; unreachable dead code after an unconditional early return; and `border-dashed` with no `border`/`border-2` width utility, so the dashed placeholder border never actually rendered (Tailwind's border-style utilities don't imply a width). Layout bug: the board rendered vertically because the wrapping `<div>` had `flex-wrap` but not `flex` — `flex-wrap` alone does nothing without `display: flex` already set.

### `WordInput.tsx` — `SubmitEvent` vs. `FormEvent`, and the round-boundary reset (again)

This installed `@types/react` version marks `FormEvent` as `@deprecated` ("doesn't actually exist... use SubmitEvent instead") — caught and fixed correctly without being told. Also hit the *third* instance of the same bug class as `Timer`'s round-reset and `ScoreDisplay`'s re-trigger: local `useState` text needs to clear when a round ends (otherwise leftover typed text survives into the next round's board), fixed with a `useEffect` on the `disabled` prop clearing `value` whenever it becomes `true` — clearing immediately at round-end rather than waiting for the next round to start, so there's no stale-text flash in between.

### `RoundResultPanel.tsx` — clean switch-to-message mapping

Extracted `getValidationMessage(status)` as a standalone function outside the component, switching over all 6 `WordValidationStatus` values with each case wrapped and returning — sidesteps the shared-block-scope gotcha entirely, and TypeScript can confirm exhaustiveness without a `default` case.

### `app/letters/page.tsx` — the orchestrator

Owns the single `useLettersGame()` call, loads the dictionary once via `useEffect` (with an `isMounted` guard and a real error state), and translates `phase` into each dumb component's simpler prop language. Correctly handled from the start: `canPickLetter` includes `'idle'` (the very first letter pick happens before phase ever becomes `'selecting'`), and `WordInput` is disabled whenever the dictionary isn't loaded yet, not just whenever the round isn't solving.

---

## Phase 4: Letters Game — Post-MVP Rules & Features (Completed)

Three features added after the MVP was already playable, all built solo with much lighter guidance:

### Real vowel/consonant rule — the max-cap equivalence insight

The actual Countdown rule is a **minimum**: at least 3 vowels, at least 4 consonants (out of 9). The user's own insight, simpler than the min-based feasibility check originally proposed: since the board always fills to *exactly* 9, capping `vowels ≤ 5` is mathematically **identical** (`⟺`, not just `⟹`) to enforcing `consonants ≥ 4`, and capping `consonants ≤ 6` is identical to `vowels ≥ 3` — because `consonants = 9 - vowels` always, when the total is fixed. Two independent upper-bound checks, no need to track picks-remaining at all. Enforced in **two places**, matching the existing bag-exhaustion pattern: the reducer's `SELECT_LETTER` case (actual enforcement) and `LetterSelector` (UI preview, disables the button before an illegal click can even happen).

### Random-fill button — the same equivalence, applied to a range

Extends the insight above to compute how many of the *remaining* slots should be vowels vs. consonants: `lowerBound = max(0, 3 - vowelsSoFar)`, `upperBound = min(remainingSlots, 5 - vowelsSoFar)`, pick a random int in `[lowerBound, upperBound]` for `vowelsToAdd`, and `consonantsToAdd` is just the remainder. Proved (not just assumed) that a second bound pair derived from the consonant rule would always be redundant with this one, given the same fixed-total-of-9 algebra.

New reducer action `RANDOM_FILL`, plus a new pure function `pickRandomFillCounts` in `lettersPool.ts`. Two real bugs caught during review, both worth remembering:
- **Guard checked the wrong phase name** (`"solving"` instead of `"selecting"`) — meant the *primary* use case (clicking Random mid-selection) silently skipped all drawing logic while still unconditionally forcing `phase: "solving"`, jumping to a running timer on an incomplete board.
- **Direct mutation of the reducer's input** — `state.bag = bag` inside the draw loop, instead of threading a local `currentBag` variable through. Looked like it worked (nothing else read `state.bag` mid-loop in this one call), but violated the same "reducers must never mutate their input" rule from the very first `lettersPool.ts` review — the same class of "seems fine until React's own internals assume otherwise" issue as the `useCountdown` StrictMode bug above.
- Also fixed on request: the case originally computed conditionally but returned unconditionally (bypassing the guard's protection for the return statement) — restructured to match every other case in the reducer: early `if (!legal) return state;`, then unconditional logic after.
- One UI wiring bug: the new "Random" button was first wired to `disabled={consonantDisabled}` (copy-paste from the Consonant button) instead of the plain `disabled` prop — meant Random incorrectly locked up exactly when it was most useful (after 6 consonants already picked by hand, when auto-filling the rest as vowels is exactly what you'd want).

### Hiding letter counts

Trivial UI change — removed the `({vowelTotal})`/`({consonantTotal})` display text from `LetterSelector`'s buttons. The counts are still computed internally (needed for the exhaustion/cap disabled checks), just not shown.

### Explicitly confirmed out of scope for now

Asked directly whether to build the best-possible-word solver and multi-word list (items originally requested alongside the above) now or defer — user chose to **defer**, matching `CLAUDE.md`'s own documented stretch-goal note (Trie-based, intentionally post-MVP). Not built. Also still deferred, lower priority: the Framer Motion tile-reveal animation on `LettersBoard` (the plain filled/empty version shipped; motion polish was never layered on top).

---

## Phase 5: Numbers Game — Logic Complete (Completed)

Built end-to-end over several sessions, entirely via the paste-back-for-review loop (user writes every logic file from TODO-scaffolded stubs; UI markup was still user-written in this phase — the UI-ownership handoff to Claude happened only at the very end, see below). Fully play-tested afterward by the user across every mode combination.

### Two open design questions, answered before any code

Both were queued at the end of Phase 4 and answered at the start of this phase — recorded here since they shaped everything downstream:
1. **Number draw:** player-chosen large count (0-4), not the fixed 4-large/2-small `CLAUDE.md` literally described — mirrors Letters' interactive vowel/consonant picker rather than an automatic reveal.
2. **Answer input:** a hybrid. Guided calculator (pick two numbers + an operator, repeat) is primary and self-validating; free-text expression entry is a secondary option for typing a faster/already-known solution. Two more small decisions followed naturally: no switching input mode mid-round once the timer's running, and Numbers scoring stays independent per-game (no cross-round/episode cumulative score across Letters→Numbers→Conundrum, at least for now).

### `types/numbers.ts` — the contract, built in layers

Unlike Letters (whose types were mostly fixed upfront), Numbers' types grew in two passes: the base state/actions first, then a second pass adding `NumbersPlayMode` once the declare/prove idea came up (see below). Two axes ended up orthogonal by design: `NumbersInputMode` (calculator vs free-text — *how* you build an answer) and `NumbersPlayMode` (declare vs untimed — *when/how* the round is timed and scored). Either input mode works with either play mode. `NumbersGamePhase` gained a `'proving'` phase for declare mode; the stray `'idle'` phase from the original stub was eventually deleted — it turned out to be genuinely dead: nothing ever transitioned into or out of it, an early real bug (see reducer section).

`NumberTile` deliberately has **no `source: 'large'|'small'` field**, unlike an early instinct to add one — large/small is always derivable from `value` (is it in {25,50,75,100}?), so storing it too would be exactly the kind of redundant-state drift bug the project's own "derived values" rule (Key Concept 4, above) warns about.

### `lib/numbers/numberPool.ts` — drawing tiles, half old pattern half new

Large numbers (25/50/75/100) have **no duplicates** in the real tile set — so drawing `largeCount` of them is just `shuffle([...LARGE_VALUES]).slice(0, count)`, no weighting needed at all. Small numbers (1-10, two each) are structurally identical to Letters' `drawLetter` — same weighted-cumulative-sum pick, same immutable new-pool-per-draw pattern.

**Real bugs caught in review:**
- `slice(count)` instead of `slice(0, count)` — took everything *after* index `count` instead of the first `count` items, so `drawLargeNumbers(0)` returned all 4 large tiles and `drawLargeNumbers(4)` returned zero. Only `count = 2` happened to look right by coincidence.
- A hardcoded `Math.random() * 20` (the *full* pool total) inside `drawSmallNumber` instead of summing the *current* pool each call — after the first draw the real total is 19, but the random draw could still land in `[19, 20)`, falling through every branch and throwing. Probability of the crash grew with each draw (an intermittent, hard-to-reproduce bug — exactly the kind Letters' `drawLetter` avoided by summing the live pool each time).
- `shuffle` mutates its argument in place and returns it — calling it directly on a module-level constant array would permanently reorder that constant the first time it's called. Fixed by always passing a spread copy (`shuffle([...LARGE_VALUES])`).

### `lib/numbers/scoring.ts` — pure and mode-agnostic by design

`evaluateAnswer(target, achievedValue)` → status band (`exact`/`close-1-to-5`/`close-6-to-10`/`valid-further-off`) + `scoreResult(validation)` → points (10/7/5/0). Deliberately takes only a plain number in — doesn't know or care whether that number came from the calculator, the parser, or a declared value, so every mode reuses it identically. Real bug caught: the `valid-further-off` band was left as a leftover `throw new Error("not implemented")` instead of a `return` — any answer more than 10 away from the target crashed instead of scoring 0, which `tsc` can't catch since a `throw` satisfies the return type.

### `lib/numbers/arithmetic.ts` — the single legality gate

`applyOperator(a, op, b): number | null` encodes Countdown's arithmetic rules once: `+`/`*` always fine, `-` must stay positive (not just non-negative — `5 - 5 = 0` was caught as still-illegal in review, since a zero tile is useless), `/` must divide exactly. Both the calculator reducer cases *and* the free-text parser call this same function, so the two input modes can never disagree about what's legal — a fraction is rejected identically either way.

### `lib/numbers/useNumbersGame.ts` — the reducer, built in stages

Built stage-by-stage (selecting → calculator → ending/reset → free text → play modes), each stage playable/testable before the next, mirroring how Letters was built logic-first then UI. Real bugs caught across all stages, roughly in order of how interesting they are:

- **The two-sources-of-truth trap, caught before it happened:** an early `CalculatorStep` design stored `result: number` instead of `resultTile: NumberTile`. Since a confirmed step's result has to become a real pool tile with its own `id` (so it can later be selected as an operand), storing just the number would force the reducer to synthesize a *second*, disconnected id for the pool tile — nothing tying the step to the tile it produced. Fixed before it ever shipped, by making `CalculatorStep.resultTile` the exact same object pushed into `pool`.
- **`largeCount: number` vs. `LargeCount = 0|1|2|3|4`:** the state field's own comment said the range, but the type didn't enforce it, so `{ type: "SET_LARGE_COUNT", largeCount: 47 }` type-checked. Fixed by extracting the literal-union type alias and using it in both the state field and the action payload — "illegal states unrepresentable" made concrete.
- **`largeCount: 0` as the initial value, not `null`:** since the type is `LargeCount | null`, using `0` for "nothing chosen yet" collided with `0` being a legitimate real choice (zero large numbers is a valid pick) — the `largeCount !== null` guard in `START_SOLVING` could then never fail, silently letting a player start without choosing. The general shape of this bug (a sentinel value colliding with a real value) recurred later in `SET_DECLARED_VALUE`'s UI wiring — see below.
- **Timer state reintroduced into the reducer, caught before merging:** an early draft had `timeRemaining: number` in `NumbersGameState` plus a `TICK` action — exactly the performance anti-pattern Letters' own architecture doc (see "Architecture Decision: Local vs. Lifted State," above) was written specifically to avoid. Removed; only `TIME_EXPIRED` (fired once by the self-contained `useCountdown`-backed `Timer`) reaches the reducer.
- **A reachable `throw` in `buildRoundResult`'s free-text branch:** before the parser existed, that branch was `throw new Error("Free-text mode evaluation not yet implemented")` — but free-text mode was already selectable and startable, so picking it and letting the timer expire white-screened the whole app. A reducer must never throw on a *reachable* state; fixed by returning a well-formed `invalid-empty` result instead, ahead of the real parser landing.
- **`SELECT_OPERAND`'s branch ordering, reasoned through explicitly:** clicking an already-selected operand 1 deselects it (and clears operator + operand 2); picking a *different* tile while an operator is pending replaces operand 2 rather than being ignored — this was designed deliberately after noticing the original stub had no way to correct a misclick once all three fields were set, which in a 30-second round could cost the whole attempt.
- **`canWork(state)` — one exported rule, not five copies:** every calculator case and `UPDATE_FREE_TEXT` originally repeated `phase !== 'solving'` guards; once declare mode added a `'proving'` phase where the *same* rule needs to be "only while proving" instead, the condition was extracted into one exported function used by both the reducer's guards and the page's `disabled` props — so the UI and the reducer can't drift apart on when a button should actually do something.

### `lib/numbers/expression.ts` — the free-text parser, the most interesting new algorithm this phase

A hand-written recursive-descent parser/evaluator, chosen deliberately over `eval()`/`new Function()` — not just for the security risk of executing arbitrary text as code, but because `eval` would also happily accept decimals, negative literals, and unlimited reuse of the same number, none of which Countdown's rules allow. A small grammar does the precedence work for free:
```
expression -> term   (("+" | "-") term)*
term       -> factor (("*" | "/") factor)*
factor     -> NUMBER | "(" expression ")"
```
`term` sitting *below* `expression` means `*`/`/` bind tighter than `+`/`-` automatically — no special-cased precedence table needed — and `factor` calling back into `expression` for a parenthesized group is what makes nested brackets work, via ordinary recursion. Every binary combination calls the *same* `applyOperator` the calculator uses, so a failing `-` (negative/zero) and a failing `/` (non-exact) are told apart purely by which operator returned `null` — no separate logic duplicated.

**Real bugs caught in review, across two passes:**
- **Multiplication/division-only answers silently scored as "no work done":** `usedOperator` was only set to `true` inside `parseExpression` (the `+`/`-` level), not `parseTerm` (the `*`/`/` level) — so a fully valid answer like `25 * 4` reported `usedOperator: false` and was scored as `invalid-empty` in every mode that checks it. One-line fix (set the flag in both places), but the kind of asymmetry-between-two-similar-functions bug that's easy to miss without deliberately testing multiplication-only and division-only inputs.
- **A reducer-reachable stack overflow:** ~20,000 nested parentheses crashed the parser with a `RangeError` from unbounded recursion — and since a reducer throwing white-screens the whole app, this had to be prevented rather than just handled. Fixed by capping `UPDATE_FREE_TEXT`'s stored length (100 characters), which bounds nesting depth far below any real stack limit — simpler than making the parser itself iterative.
- **Show-facing operator symbols silently rejected as syntax errors:** the operator buttons display `× − ÷` (nicer than raw `* - /`), but a player typing what they see would fail to parse. Fixed with a small normalize-before-tokenize step (`× x X → *`, `÷ → /`, the Unicode minus `−` U+2212 → `-`, distinct from the ASCII hyphen).
- **Inconsistent "no real work" scoring across modes, caught by deliberately comparing them side by side:** untimed calculator mode with zero confirmed steps correctly scored `invalid-empty`, but declare mode considered *any* drawn number matching the declared value "proven" even with zero steps — so declaring a number that happened to already be on the board scored without the player doing anything. Fixed by requiring real work (a confirmed step, or `usedOperator`) in every mode/input combination consistently.
- Verified by hand-testing ~40 expressions in a disposable scratch copy of the file (never committed) rather than trusting it after `tsc` passed alone: precedence, associativity, brackets, tile-reuse limits (two drawn 75s allow "75" twice, not three times), zero/negative/fractional rejections, malformed input, decimals, leading zeros, and the newly-added Unicode operator aliases.

### Declare / prove — added mid-phase, after the calculator+free-text game was already playable

After playing the finished calculator-mode game, the user proposed a second play mode inspired by competitive formats: declare a number within the 30s timer, then prove it afterward with no time pressure — distinct from the existing "live entry the whole round" flow, which stays as `'untimed'` mode for a Wordle-like solo/practice feel. Both modes were kept (not one replacing the other) specifically because they suit different contexts: `declare` for competitive 1v1 play (needs a backend later), `untimed` for casual/daily-puzzle-style play with no clock pressure at all.

Implementation-wise this meant: a `'proving'` phase, a `playMode` field, a `declaredValue: number | null` field living in **reducer state, not local component state** — the explicit reasoning being that a half-typed declaration must survive the timer hitting zero, which local `useState` inside a component wouldn't guarantee the way Letters' `currentInput` carve-out does (that carve-out works precisely because Letters never needs to *preserve* a half-typed word across a phase transition — Numbers' declaration does).

**Real bug caught in the UI wiring, the same class as the earlier `largeCount: 0` issue:** the declared-value `<input>`'s `onChange` needs an empty box to dispatch `null` ("nothing declared"), not `0` — but `Number("")` evaluates to `0`, not `NaN` or a sentinel. Handled explicitly (`raw === "" ? null : Number(raw)`) rather than trusting `Number()`'s coercion. `SET_DECLARED_VALUE`'s reducer case also rejects anything that isn't a clean positive integer — the reducer treated as the last line of defense, not the input box.

### UI wiring bugs caught late, after the logic was otherwise done

- **Free-text mode showed no numbers at all** — the page's conditional rendering only ever mounted either the calculator pieces (which show `pool`) or the bare text `<input>`, so a free-text player (in either play mode) had nothing on screen telling them what they could type. Fixed by always rendering a disabled `TileRack` fed `drawnNumbers` alongside the text input.
- **Styling looked like plain unstyled text, not buttons** — the first UI pass used made-up class names (`tile-rack`, `selector-button-selected`, etc.) with no corresponding CSS anywhere; Tailwind resets every `<button>` to bare text with no border/background by default, so nothing defined meant nothing rendered. A screenshot made this obvious immediately. Fixed by converting every component to real Tailwind utility classes (matching Letters' `LetterSelector` pattern), with distinct visual states for selected/original/derived tiles and disabled buttons.

### Decision, recorded for future reference: scoring stays independent per game

Explicitly asked and answered: no cross-round/episode cumulative score across Letters→Numbers→Conundrum (the real show's format) for now — each game stays a self-contained module with its own score, like Letters already is. Revisit only if an explicit "episode/match mode" is requested later; until then, no session-level state above the individual game routes is needed.

---

## What's Next: Conundrum, the UI pass, and the backend/solvers

**Numbers Game logic is done and play-tested.** Its UI is functional but intentionally left as plain, minimally-styled Tailwind — a deliberate choice to unblock logic review without also reviewing visual design mid-stream.

**Decided 2026-09-26/27, in order:**
1. **UI normalization pass, Claude-led.** After the Numbers logic was finished and played, the user asked Claude to take over the *visual* layer directly (a new, explicit, narrow exception to this project's "hands-on execution only" rule — logic still stays the user's). Goals: shared primitives/design tokens so Letters and Numbers stop each reinventing buttons and panels; move away from the generic default-Tailwind "AI-generated" look; take tactile/physical inspiration from the real show's board and clock without copying its trademarked assets, since this project uses its own branding. Plan: a few static HTML mockups first to pick a direction, then port into the real components.
2. **Conundrum Game** — not started (types/logic/UI all still TODO). Likely comes after the UI pass, so it's built on the new shared primitives directly.
3. **Backend + both solvers, combined** — Phase 2 backend (auth, DB, leaderboards) alongside the Letters Trie-based best-word solver and a Numbers solver, built together rather than sequentially, per the user's explicit preference.
4. 1v1 competitive play for Numbers' `declare` mode needs the backend above — it's not buildable standalone.

Full detail for each of the four is in `CLAUDE.md`'s "Next Planned Work" section — this file just records *why* each decision was made.

---

## Resources for Deeper Learning

- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **React Hooks Documentation:** https://react.dev/reference/react (especially useReducer, useEffect)
- **Discriminated Unions:** https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions
- **Fisher-Yates Shuffle:** https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
- **Next.js App Router:** https://nextjs.org/docs/app
- **SCOWL / English Speller Database:** https://wordlist.aspell.net/
- **Weighted random selection (roulette wheel selection):** general algorithm reference — search "roulette wheel selection algorithm"
- **JavaScript reference semantics (why mutation is dangerous):** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects

---

## Summary: What You've Learned

✅ **Project Structure:** Why separate concerns (game-specific vs. shared), why folder conventions matter.  
✅ **TypeScript Basics:** Type contracts, interfaces, union types.  
✅ **Discriminated Unions:** Type-safe actions with compile-time guarantees.  
✅ **State Machines:** Using union types for game phases, not booleans.  
✅ **Single Source of Truth:** Derived values, not redundant state.  
✅ **State Management:** useState for simple state, useReducer for complex multi-field transitions.  
✅ **Algorithms:** Fisher-Yates shuffle for uniform randomness.  
✅ **React Hooks:** useEffect, stale closures, functional setState.  
✅ **Architecture Decisions:** When to lift state, when to keep it local.  
✅ **Weighted Random Selection:** Cumulative-sum picking from a frequency map, without flattening into arrays.  
✅ **Reference vs. Value Semantics:** Why mutating a nested object corrupts every other reference to it, and the immutable-update pattern that avoids it.  
✅ **Reducer Purity:** Why reducers can't do async work, and how external async data (the dictionary) has to travel in via the action payload instead.  
✅ **Switch-Statement Gotchas:** Fallthrough when a case is missing `return`, and shared block scope across cases without `{ }`.  
✅ **Operator Precedence Bugs:** `||` vs `+`, and why `map.get(k) || 0 + 1` silently caps every count at 1.  
✅ **Impure State Updaters:** why side effects inside a `setState` updater function are dangerous even when they "seem to work," and how to prove it with real evidence (StrictMode's double-invoke, caught live in a dev log).  
✅ **Re-triggering on a Repeated Value:** why a `useEffect` can't react to "the same value happened again" on its own, and using a dedicated trigger id (`roundId`) instead.  
✅ **Missing vs. Empty Dependency Arrays:** `useEffect(fn)` (no array) reruns on *every* render, a fundamentally different bug than `useEffect(fn, [])`.  
✅ **Constraint Equivalence via a Fixed Total:** proving `max(A) ⟺ min(B)` when `A + B` is always constant — turned a two-sided minimum-enforcement problem into two independent, simpler upper-bound checks (found by the user, not suggested).  
✅ **Reducer Input Mutation:** why writing directly to a reducer's `state` parameter is wrong even when nothing visibly breaks in a single call — the same "seems fine until it isn't" class of bug as the StrictMode issue above.  
✅ **Recursive-Descent Parsing:** a small grammar (`expression → term → factor`) gets operator precedence "for free" purely from which function calls which, with parenthesized groups handled by ordinary recursion back into the top rule.  
✅ **Never `eval()` on user input:** beyond the security risk, `eval` would also silently accept rule-violating input (decimals, negatives, unlimited reuse) that a hand-written parser can reject explicitly.  
✅ **Sentinel-Value Collisions:** `0` colliding with "nothing chosen" (`largeCount`) and `Number("")` silently being `0` instead of `NaN`/null (`declaredValue`) — the same bug shape recurring in two different fields, both needing an explicit `null` check rather than relying on falsiness or type coercion.  
✅ **One Exported Rule Beats Five Copies:** `canWork(state)` — extracting a repeated guard condition into one function that both the reducer and the UI import, so the two can't silently drift apart on when something is actually allowed.  
✅ **Orthogonal State Axes:** `NumbersInputMode` (how) and `NumbersPlayMode` (when/how-scored) as two independent enums rather than one combined one, because every combination of the two is meaningful.  

Next session: **UI normalization pass (Claude-led per the new exception in `CLAUDE.md` Mentorship Rule 4), then Conundrum, then backend + both solvers together.** See `CLAUDE.md`'s "Next Planned Work" section and this file's "What's Next: Conundrum, the UI pass, and the backend/solvers" section above for the full plan.
