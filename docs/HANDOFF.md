# HANDOFF — read this first in a new chat (written 2026-10-10)

Product: **Countdowndle** (daily mode: **Daily Countdown**). "Studio Desk" is only the name of the visual design language (tokens such as `rounded-desk`); never put "desk" in user-facing copy.

## 1. How to run it

```bash
cd ~/Documents/countdown
pnpm install
pnpm dev                      # http://localhost:3000  (solo games + /daily need nothing else)

# Accounts + duels additionally need Docker + local Supabase:
open -a Docker                # wait until it's running
supabase start                # first run downloads images
pnpm dev
```
- Pages: `/` `/letters` `/numbers` `/conundrum` `/daily` `/account` `/duel` `/duel/[code]`.
- `.env.local` (gitignored) holds only the LOCAL demo Supabase keys. Template: `.env.example`; values from `supabase status -o env`.
- Play a duel with yourself using two browser profiles (tabs in one browser share one login).
- Stop: Ctrl+C, `supabase stop`. `supabase db reset` WIPES local data.
- Gate (all must pass before any commit): `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test:run`, and `pnpm build` at milestone ends. Integration tests auto-skip without local Supabase.

## 2. Status: PLAN.md M0–M7 executed and merged to `main`

Per-checkpoint detail, gate output and deviations: `docs/RUNLOG.md`. "What and why" plus backend teaching notes (RLS, server authority, clock skew, unique-constraint races): `LEARNING.md` (bottom section). Plan with ticked boxes: `docs/PLAN.md`. Git tags `checkpoint/*` mark every checkpoint (`git tag`).

Built: seeded RNG, finite letter bag, Trie + best-word panel, Numbers solver, Apterous-style timed prove (5 s per-tap clock), Studio Desk tokens/primitives, Conundrum (flat 10 pts, 9,324 generated answers), Daily Countdown (seeded, localStorage, derived streaks, share grid), Supabase schema + RLS (pgTAP), auth (guest/accounts/upgrade), authoritative duel service + realtime UI, CI workflow, two-browser E2E (`docs/E2E.md`), rename to Countdowndle (delegated to agy).

## 3. OPEN ISSUES (start here)

1. **No back/navigation.** There is no way to go back or return home from game pages, especially after finishing the Daily Countdown (summary is a dead end). Needs a shared header/nav (home link, and "back to home" after Daily summary / each game's result). Not yet designed or built. User-reported 2026-10-10.
2. **`proxy.ts` blocks every page when Supabase is unreachable.** With `.env.local` set but Supabase not running, `lib/supabase/proxy.ts` `getClaims()` retries and delays each request ~25 s (pages still render, console shows `AuthRetryableFetchError`). Fix: short timeout + swallow errors so solo pages never wait on Supabase. Workaround: `supabase start`, or rename `.env.local`.
3. **Visual QA incomplete.** Only duel screens were reviewed from screenshots. Letters, Numbers, Conundrum, Daily and account pages were only smoke-tested (HTTP 200).

## 4. BLOCKED ON THE USER (hard stops from PLAN.md — do not do without asking)

- **Dictionary license:** `public/dictionary/words.txt` has no recorded source/license (`docs/DICTIONARY.md`). Don't deploy publicly until confirmed.
- **GitHub remote + Vercel project:** user creates, then push. Nothing has ever been pushed.
- **Hosted Supabase project:** user creates it, enables anonymous sign-ins/providers, runs the two migrations in `supabase/migrations/`, sets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and Vercel. Hosted-only behaviour (email confirmation, redirect URLs, realtime config) is unverified.
- Any destructive git operation.

## 5. Known gaps / deliberate deviations

Per-tap 5 s proof clock is client-side only (server caps whole proof at 90 s); duel letters "picker turns" are nominal (server draws the board); no rate limiting; no abandon/forfeit handling (a player who leaves just times out each round); `package.json` name and folder are still `countdown`; historical docs still say "Countdown Desk". Deferred per plan: formats/bots/Goatdown/ratings, leaderboards UI, dark "night desk" palette, chat, tournaments.

## 6. Workflow rules (see CLAUDE.md)

Claude is lead orchestrator and writes logic itself; the old mentorship rules are superseded. Delegate bounded, self-contained tasks to `agy`; Claude reviews every diff, runs the gate, and is the only one who commits/tags (`checkpoint: <name> — <summary>`, annotated tag `checkpoint/<name>`, branches `build/m<N>-<name>` merged `--no-ff`). Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Log each checkpoint in `docs/RUNLOG.md`, tick `docs/PLAN.md`.

## 7. Gotchas learned the hard way

- **agy:** headless mode cannot run shell commands (auto-denied → it writes nothing). Brief it to ONLY edit files and run nothing, list exact allowed files, then verify with tsc/lint/tests yourself. Working call: `agy -p "$(cat brief.md)" --model gemini-3.8-flash-medium --mode accept-edits --print-timeout 10m`. Never use `--dangerously-skip-permissions` or edit the user's agy settings without asking. (Optional for the user: add an allow-rule `command(pnpm test:run)` under `permissions.allow` in agy's settings.json.)
- Scripts: use `node_modules/.bin/tsx scripts/...` (`pnpm tsx` trips pnpm's build-script approval).
- macOS has no `timeout`; use `perl -e 'alarm N; exec @ARGV' cmd`.
- Supabase here does NOT auto-grant table privileges to API roles; migrations must GRANT explicitly (service_role grants are in the schema migration). pgTAP runs as `postgres` and won't catch missing grants; the integration tests do.
- Readable `matches.state` is redacted mid-round (numbers declarations, letters points) and rehydrated from private `round_submissions`; keep that invariant (regression-tested in `tests/integration/duel-flow.test.ts`).
- Next.js 16: middleware is `proxy.ts`; read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md).
- E2E needs Playwright installed OUTSIDE the repo and a Chromium that launches on this macOS (the cached `chromium_headless_shell-1223` worked via `CHROMIUM_PATH`); see `docs/E2E.md`.
- Docker Desktop must be running for `supabase start`; I (Claude) started it with `open -a Docker`.

## 8. Suggested next steps (in order)

1. Fix open issue 1 (shared header/nav + back links, esp. after Daily) and 2 (proxy timeout). Add tests where logic is involved; use the E2E/screenshots to check UI.
2. Visual QA pass over all pages (screenshots via the Playwright setup), fix anything off-spec vs `docs/PLAN.md` §1b.
3. With the user: resolve the dictionary license, create GitHub/Vercel/Supabase, deploy (M5/M6 user steps), then verify hosted behaviour.
