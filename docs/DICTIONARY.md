# Dictionary provenance — BLOCKER for public deployment

`public/dictionary/words.txt` (126,750 words; 18,887 of length 9) has **no recorded source or license**.
`public/dictionary/conundrums.json` is derived from it by `scripts/build-conundrums.ts`.

Before pushing to a public host (PLAN.md M5), the owner must confirm where the list came from and that its
license permits redistribution, or replace it with a clearly licensed list (e.g. SCOWL, ENABLE) and re-run:

    node_modules/.bin/tsx scripts/build-conundrums.ts

Claude must not guess or assert a license for this file.
