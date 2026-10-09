# QA pass — 2026-10-10 (run 2)

I drove a real browser (headless Chromium through Playwright; the chrome-devtools MCP is now installed and loads from the next session) and played these flows:
- Every page at 1280 px and 390 px wide.
- Daily give-up through to the summary and back home.
- Solo Letters round, quit mid-round with the confirm prompt.
- Two full two-browser duels (`scripts/e2e-duel.mjs`): one played to the end, one resigned. Both players joined as guests without visiting `/account`.

There were **no console errors** on any page.

## Found and fixed in this run
| Issue | Fix |
|---|---|
| No way home from any page; Daily summary and duel final were dead ends | Site header (Home/Quit) and footer, Home buttons on every result screen |
| Leaving mid-round silently dropped the round | Header turns into "Quit" and asks first |
| No resign or give-up | Duel Resign (server-authoritative); Daily "Give up today" |
| Prove clock could be stalled forever by toggling a tile, Clear, or undo/redo | Clock resets only on new progress, plus a 30 s total (server 33 s) |
| Guest play looked impossible: `/duel` sent you to `/account`, which showed a required email/password form and lost the room code | Inline "Play as guest" / "Join as guest" on `/duel` and room links; `/account` says the upgrade is optional and returns you via `?next=` |
| Every page waited ~25 s when Supabase was down | Proxy auth refresh gives up after 1.5 s |
| Duel reveal columns didn't line up | Shared grid with header row |
| Final duel screen was one line | `DuelFinal`: per-round breakdown, count-up, Copy result |
| Final screen showed the scoreboard twice | Scoreboard hidden at final |
| Proving in a duel showed three clocks (server total, local total, per-tap) | Local total hidden in duels |
| Proof "Give up" button next to "Resign" was ambiguous | Renamed "Give up proof" |
| Mobile: home title tiles wrapped onto two lines; sound toggle wrapped | Smaller tiles under `sm`; icon-only toggle on mobile |
| Home title was left-aligned | New centred tile wordmark and tetr.io-style menu |

## Seen but not fixed (worth deciding)
1. **Daily replay loophole.** Leaving mid-stage (now behind a confirm) and coming back restarts that stage on the same seeded puzzle, so the player has already seen it. Fix: record a "started" marker and score 0 if the stage is abandoned.
2. **Letters minimum length is 4** (`MIN_WORD_LENGTH`). The show accepts any length. This rarely matters, but it is a deviation.
3. **Duel letter picking is nominal.** The server draws the board; players don't call vowels or consonants in turn.
4. **No rate limiting on match routes** (feedback is limited to 5 per hour).
5. **Walking away from a duel** still just times out each round. Resign now exists, but nothing auto-forfeits an absent player.
6. The header wordmark repeats each page's own `<h1>`. This is cosmetic.

## Suggested features (not built; for the user to prioritise)
1. **Rematch** on the duel final screen: same two players, new room, both seated automatically.
2. **Quick match**: a queue that pairs two waiting players.
3. **Daily leaderboard and global stats** (Supabase), plus a Wordle-style score-distribution chart from local history.
4. **Daily archive**: replay past days (unscored).
5. **Full-show format** (15 rounds) for duels, and a **bot opponent** for solo practice.
6. **Keyboard play**: V/C to pick letters; digits and operators for the numbers calculator.
7. **Night palette** (dark mode) and an installable PWA for offline play.
8. **Shareable duel result card** (an image), not just text.
