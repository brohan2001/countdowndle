import { ModeMenu, type MenuItem } from "@/components/home/ModeMenu";

const PRIMARY: MenuItem[] = [
  {
    href: "/daily",
    title: "Daily Countdown",
    blurb: "One shared set of puzzles a day. Keep your streak, share your grid.",
    glyph: "☀",
    tone: "brass",
  },
  {
    href: "/duel",
    title: "Duel",
    blurb: "Play a friend live: one round of each, highest score wins.",
    glyph: "VS",
    tone: "urgent",
  },
  {
    href: "/letters",
    title: "Letters",
    blurb: "Nine tiles, thirty seconds. Make the longest word you can.",
    glyph: "A",
    tone: "forest",
  },
  {
    href: "/numbers",
    title: "Numbers",
    blurb: "Six numbers and a target. Reach it, or get as close as you dare.",
    glyph: "#",
    tone: "accent",
  },
  {
    href: "/conundrum",
    title: "Conundrum",
    blurb: "A nine-letter scramble. Buzz in when you see it.",
    glyph: "?",
    tone: "ink",
  },
];

const SECONDARY: MenuItem[] = [
  { href: "/dictionary", title: "Dictionary", blurb: "Is it a word?", glyph: "Aa", tone: "paper" },
  { href: "/account", title: "Account", blurb: "Guest or signed in", glyph: "@", tone: "paper" },
  { href: "/contact", title: "Feedback", blurb: "Bugs, ideas, hello", glyph: "✉", tone: "paper" },
];

const TITLE = "COUNTDOWNDLE";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 aria-label="Countdowndle" className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
          {TITLE.split("").map((ch, i) => (
            <span
              key={i}
              aria-hidden
              className="flex h-9 w-7 items-center justify-center rounded-desk border-[1.5px] border-tile-edge bg-paper font-serif text-xl font-bold text-ink shadow-paper sm:h-12 sm:w-10 sm:text-3xl"
            >
              {ch}
            </span>
          ))}
        </h1>
        <p className="text-ink-soft">
          Letters, numbers and conundrums — play daily or head to head.
        </p>
      </header>

      <ModeMenu primary={PRIMARY} secondary={SECONDARY} />
    </main>
  );
}
