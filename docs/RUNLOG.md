# RUNLOG

| Time | Checkpoint | Gate | Notes |
|---|---|---|---|
| 2026-10-09 | checkpoint/baseline | n/a | Committed all prior work; .history/ ignored; PLAN copied to docs/. |
| 2026-10-09 | checkpoint/test-harness | tsc ✓ lint ✓ test 42 ✓ build ✓ | vitest installed; reducers exported for tests; fixed 3 pre-existing react-hooks lint errors (useCountdown, WordInput, ScoreDisplay) with behaviour preserved; .history/ lint-ignored; CLAUDE.md rewritten. |
| 2026-10-09 | checkpoint/numbers-timed-prove | tsc ✓ lint ✓ test 49 ✓ build ✓ | PROVE_TIMEOUT, PROVE_TAP_SECONDS, ProveClock (key-remount per tap), calculator forced for proof, proof must be a step result, auto-finish on proven step. needs-visual-QA |
