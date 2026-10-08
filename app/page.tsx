import Link from "next/link";
import { Panel } from "@/components/ui/Panel";

const MODES = [
  {
    href: "/letters",
    title: "Letters",
    blurb: "Nine tiles, thirty seconds. Make the longest word you can.",
  },
  {
    href: "/numbers",
    title: "Numbers",
    blurb: "Six numbers and a target. Reach it, or get as close as you dare.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12">
      <header className="border-b border-dashed border-tile-edge pb-4">
        <h1 className="font-serif text-4xl font-semibold text-ink">
          Countdown Desk
        </h1>
        <p className="mt-1 text-ink-soft">
          Letters, numbers and conundrums, played at a paper desk.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODES.map((mode) => (
          <Link key={mode.href} href={mode.href} className="group">
            <Panel className="h-full transition group-hover:-translate-y-0.5 group-hover:border-brass">
              <h2 className="font-serif text-2xl font-semibold text-ink">
                {mode.title}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{mode.blurb}</p>
            </Panel>
          </Link>
        ))}
      </div>
    </main>
  );
}
