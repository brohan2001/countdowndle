# Two-browser duel smoke test

`scripts/e2e-duel.mjs` plays a full Letters → Numbers → Conundrum duel between two guest
players through the real UI (lobby, declare/prove with the per-tap clock, buzz and lockout,
final result), reading the conundrum solution straight from the local DB to answer it.

Not part of the CI gate: it needs Docker, a browser and about 45 seconds.

```
supabase start                         # local stack; .env.local holds the local keys
pnpm dev -p 3114                       # in another terminal

# Playwright is deliberately NOT a project dependency. Install it elsewhere
# (ES modules resolve packages relative to the script, so run a copy from there):
mkdir /tmp/e2e && cd /tmp/e2e && npm init -y && npm i playwright @supabase/supabase-js
npx playwright install chromium
cp <repo>/scripts/e2e-duel.mjs . && REPO_ROOT=<repo> node e2e-duel.mjs
#   (set CHROMIUM_PATH to a headless shell if Playwright's own download is unavailable)
```

Screenshots land in `$SHOTS_DIR` (default `/tmp/duel-shots`).

Last run: 2026-10-09, 3/3 passes, no browser console errors.
