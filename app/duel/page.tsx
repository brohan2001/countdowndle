import { DuelEntry } from "@/components/duel/DuelEntry";

export default function DuelPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-ink">Duel</h1>
      <p className="text-ink-soft">Letters, numbers and a conundrum — head to head.</p>
      <DuelEntry />
    </main>
  );
}
