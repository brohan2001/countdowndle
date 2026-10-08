# RUNLOG

| Time | Checkpoint | Gate | Notes |
|---|---|---|---|
| 2026-10-09 | checkpoint/baseline | n/a | Committed all prior work; .history/ ignored; PLAN copied to docs/. |
| 2026-10-09 | checkpoint/test-harness | tsc ✓ lint ✓ test 42 ✓ build ✓ | vitest installed; reducers exported for tests; fixed 3 pre-existing react-hooks lint errors (useCountdown, WordInput, ScoreDisplay) with behaviour preserved; .history/ lint-ignored; CLAUDE.md rewritten. |
| 2026-10-09 | checkpoint/numbers-timed-prove | tsc ✓ lint ✓ test 49 ✓ build ✓ | PROVE_TIMEOUT, PROVE_TAP_SECONDS, ProveClock (key-remount per tap), calculator forced for proof, proof must be a step result, auto-finish on proven step. needs-visual-QA |
| 2026-10-09 | checkpoint/seeded-prng | tsc ✓ lint ✓ test 57 ✓ | mulberry32, cyrb53 hashString, rngFromString, randomInt, non-mutating shuffle; optional rng threaded through letter/number draws. |
| 2026-10-09 | checkpoint/letters-bag | tsc ✓ lint ✓ test 61 ✓ build ✓ | Finite shuffled vowel/consonant decks in state (LetterDecks), drawn from top; RESET_ROUND/RANDOM_FILL accept optional rng; tile ids are deterministic (tile-N). |
| 2026-10-09 | checkpoint/letters-trie | tsc ✓ lint ✓ test 71 ✓ | Trie (insert/has/hasPrefix/findWords), getTrie WeakMap cache; verified vs brute force on the real dictionary. |
| 2026-10-09 | checkpoint/letters-best-word | tsc ✓ lint ✓ test 76 ✓ | analyzeBestWords + RoundResultPanel section (best length, longest set, also-ran list, matched-best). needs-visual-QA |
| 2026-10-09 | checkpoint/numbers-solver | tsc ✓ lint ✓ test 82 ✓ build ✓ | solveNumbers (pair DFS, applyOperator legality, memo by sorted state, early exit); worst case <30ms so no Web Worker needed; shown in NumbersResultPanel. needs-visual-QA. M1 complete. |
| 2026-10-09 | checkpoint/ui-tokens | tsc ✓ build ✓ | @theme tokens + Fraunces/Karla via next/font; dark mode removed. (Existing pages still use gray/blue until ported.) |
| 2026-10-09 | checkpoint/ui-primitives | tsc ✓ lint ✓ | Button, Panel, Tile, TabSelector, DialTimer/DialFace (written directly; small enough that delegation overhead exceeded the work). needs-visual-QA |
| 2026-10-09 | checkpoint/ui-letters + checkpoint/ui-numbers (+ home) | tsc ✓ lint ✓ test 82 ✓ build ✓ | Letters and Numbers ported onto Studio Desk primitives, written directly (no agy; user approved for the Numbers port). Timer.tsx removed (DialTimer replaces it); ProveClock uses DialFace; real home page replaces create-next-app. Single commit at user request, tagged twice. needs-visual-QA |
| 2026-10-09 | checkpoint/conundrum-generator | tsc ✓ lint ✓ test 89 ✓ | lib/conundrum/generator.ts (+ scripts/build-conundrums.ts, run via node_modules/.bin/tsx) -> 9324 solutions in public/dictionary/conundrums.json; scrambleWord included. Wordlist is Collins-sized so some answers are obscure; no frequency data available. pnpm-workspace esbuild build set false. |
