// Two-browser duel smoke test: two guests play a full quick match through the
// real UI against a LOCAL Supabase + `pnpm dev`. Not part of the gate
// (needs Docker, a browser and ~45s). See docs/E2E.md.
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const ROOT = process.env.REPO_ROOT ?? process.cwd();
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = (process.env.SHOTS_DIR ?? "/tmp/duel-shots") + "/";
const env = Object.fromEntries(readFileSync(`${ROOT}/.env.local`, "utf8").split("\n").filter(l => l.includes("=")).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const words = readFileSync(`${ROOT}/public/dictionary/words.txt`, "utf8").split("\n").filter(Boolean);

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
const mkPlayer = async (name) => {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return { name, page, errors };
};
const shot = (p, n) => p.page.screenshot({ path: `${SHOTS}${n}.png`, fullPage: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const A = await mkPlayer("Alice");
const B = await mkPlayer("Bob");

// ---- lobby. Alice signs in as a guest inline on /duel; Bob opens the room
// link signed out and joins as a guest right there (no /account detour).
await A.page.goto(`${BASE}/duel`);
await A.page.getByLabel("Display name").fill(A.name);
await A.page.getByRole("button", { name: "Play as guest" }).click();
await A.page.getByText(/Playing as/).waitFor({ timeout: 15000 });
await A.page.getByRole("button", { name: "Create room" }).click();
await A.page.waitForURL(/\/duel\/[A-Z2-9]{6}$/);
const code = A.page.url().split("/").pop();
log("room", code);
await B.page.goto(`${BASE}/duel/${code}`);
await B.page.getByLabel("Display name").fill(B.name);
await B.page.getByRole("button", { name: "Join as guest" }).click();
log("both signed in as guests inline");
await A.page.getByText("Both players are here.").waitFor({ timeout: 15000 });
await shot(A, "01-lobby-host");
await B.page.getByText("Waiting for the host to start.").waitFor();
await A.page.getByRole("button", { name: "Start the match" }).click();

// ---- letters
await A.page.getByRole("group", { name: "Letters board" }).waitFor({ timeout: 15000 });
await B.page.getByRole("group", { name: "Letters board" }).waitFor({ timeout: 15000 });
const letters = (await A.page.getByRole("group", { name: "Letters board" }).innerText()).replace(/\s+/g, "").toLowerCase();
const canMake = (w) => { const c = {}; for (const ch of letters) c[ch] = (c[ch] ?? 0) + 1; for (const ch of w) { if (!c[ch]) return false; c[ch]--; } return true; };
const best = words.filter((w) => w.length >= 4 && canMake(w)).sort((a, b) => b.length - a.length)[0];
log("board", letters, "best word", best);
await shot(A, "02-letters");
await A.page.getByLabel("Your word").fill(best);
await A.page.getByRole("button", { name: "Submit" }).click();
await A.page.getByText("Word locked in").waitFor({ timeout: 10000 });
await B.page.getByLabel("Your word").fill("zzzzzz");
await B.page.getByRole("button", { name: "Submit" }).click();
await A.page.getByRole("heading", { name: /letters — result/i }).waitFor({ timeout: 15000 });
await shot(A, "03-letters-reveal");
log("letters revealed");
await A.page.getByRole("button", { name: "Next round" }).click();

// ---- numbers: A declares the sum of two tiles, B declares 999 (unprovable)
await A.page.getByLabel("Declared number").waitFor({ timeout: 15000 });
await B.page.getByLabel("Declared number").waitFor({ timeout: 15000 });
const tileNums = (await A.page.locator("div.font-serif.text-2xl, div.font-serif.text-3xl").allInnerTexts()).map((t) => t.trim()).filter((t) => /^\d+$/.test(t)).map(Number);
log("numbers tiles", tileNums);
const [x, y] = tileNums.slice(0, 2);
await shot(A, "04-numbers-declare");
await A.page.getByLabel("Declared number").fill(String(x + y));
await A.page.getByRole("button", { name: "Declare" }).click();
await B.page.getByLabel("Declared number").fill("999");
await B.page.getByRole("button", { name: "Declare" }).click();
log("declared; waiting for the server deadline (~30s)");

const proverPage = async () => {
  for (let i = 0; i < 60; i++) {
    for (const P of [A, B]) if (await P.page.getByText(/^Prove \d+/).count()) return P;
    await A.page.waitForTimeout(1000);
  }
  throw new Error("nobody got to prove");
};
const first = await proverPage();
log("first to prove:", first.name);
await shot(first, "05-numbers-proving");
const proving = first;
const declaredText = await proving.page.getByText(/^Prove \d+/).innerText();
if (proving === A) {
  const rack = proving.page.locator("button[aria-pressed]").filter({ hasText: /^\d+$/ });
  const vals = await rack.allInnerTexts();
  const ix = vals.findIndex((v) => Number(v) === x);
  const iy = vals.findIndex((v, i) => Number(v) === y && i !== ix);
  await rack.nth(ix).click();
  await proving.page.getByRole("button", { name: "Operator +" }).click();
  await rack.nth(iy).click();
  await proving.page.getByRole("button", { name: "Confirm" }).click();
  log("A proved", declaredText);
} else {
  // Bob can't prove 999; give up so the turn passes to Alice.
  await proving.page.getByRole("button", { name: "Give up" }).click();
  log("B gave up; waiting for Alice's turn");
  await A.page.getByText(/^Prove \d+/).waitFor({ timeout: 20000 });
  const rack = A.page.locator("button[aria-pressed]").filter({ hasText: /^\d+$/ });
  const vals = await rack.allInnerTexts();
  const ix = vals.findIndex((v) => Number(v) === x);
  const iy = vals.findIndex((v, i) => Number(v) === y && i !== ix);
  await rack.nth(ix).click();
  await A.page.getByRole("button", { name: "Operator +" }).click();
  await rack.nth(iy).click();
  await A.page.getByRole("button", { name: "Confirm" }).click();
  log("A proved after B failed");
}
await A.page.getByRole("heading", { name: /numbers — result/i }).waitFor({ timeout: 20000 });
await shot(A, "06-numbers-reveal");
log("numbers revealed");
await B.page.getByRole("button", { name: "Next round" }).click();

// ---- conundrum
await A.page.getByRole("button", { name: "Buzz!" }).waitFor({ timeout: 15000 });
await shot(A, "07-conundrum");
const matchId = (await admin.from("matches").select("id").eq("code", code).single()).data.id;
const roundId = (await admin.from("rounds").select("id").eq("match_id", matchId).eq("idx", 2).single()).data.id;
const solution = (await admin.from("round_secrets").select("secret_data").eq("round_id", roundId).single()).data.secret_data.solution;
await A.page.getByRole("button", { name: "Buzz!" }).click();
await A.page.getByLabel("Your answer").waitFor({ timeout: 10000 });
await B.page.getByText(/buzzed — they're answering/).waitFor({ timeout: 10000 });
await shot(B, "08-conundrum-opponent-answering");
await A.page.getByLabel("Your answer").fill("wrongword");
await A.page.getByRole("button", { name: "Answer" }).click();
await A.page.getByText(/locked out/).waitFor({ timeout: 10000 });
await B.page.getByRole("button", { name: "Buzz!" }).click();
await B.page.getByLabel("Your answer").fill(solution);
await B.page.getByRole("button", { name: "Answer" }).click();
await A.page.getByRole("heading", { name: /conundrum — result/i }).waitFor({ timeout: 15000 });
await shot(A, "09-conundrum-reveal");
log("conundrum revealed; solution", solution);
await A.page.getByRole("button", { name: "See final result" }).click();
await A.page.getByRole("link", { name: "Play another duel" }).waitFor({ timeout: 15000 });
await shot(A, "10-final-A");
await shot(B, "11-final-B");
log("FINAL A:", (await A.page.locator("h2").first().innerText()), "| B:", (await B.page.locator("h2").first().innerText()));

// ---- second match: Bob resigns mid-letters
await A.page.goto(`${BASE}/duel`);
await A.page.getByRole("button", { name: "Create room" }).click();
await A.page.waitForURL((u) => /\/duel\/[A-Z2-9]{6}$/.test(u.pathname) && !u.pathname.endsWith(code));
const code2 = A.page.url().split("/").pop();
await B.page.goto(`${BASE}/duel/${code2}`);
await A.page.getByText("Both players are here.").waitFor({ timeout: 15000 });
await A.page.getByRole("button", { name: "Start the match" }).click();
await B.page.getByRole("group", { name: "Letters board" }).waitFor({ timeout: 15000 });
await B.page.getByRole("button", { name: "Resign" }).click();
await B.page.getByRole("button", { name: "Yes, resign" }).click();
await A.page.getByText("Bob resigned.").waitFor({ timeout: 15000 });
await shot(A, "12-resigned-A");
log("resign: A sees", await A.page.locator("h2").first().innerText());
const matchId2 = (await admin.from("matches").select("id").eq("code", code2).single()).data.id;

for (const P of [A, B]) if (P.errors.length) console.log(P.name, "browser errors:", P.errors.slice(0, 5));
await admin.from("matches").delete().in("id", [matchId, matchId2]);
await browser.close();
log("E2E PASS");
