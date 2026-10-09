"use client";

import { useSyncExternalStore } from "react";
import { DailyGame } from "@/components/daily/DailyGame";

const noopSubscribe = () => () => {};

export default function DailyPage() {
  // false on the server and during hydration, true afterwards: lets the
  // game read the local date and localStorage without a hydration mismatch.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <h1 className="font-serif text-3xl font-semibold text-ink">Daily Countdown</h1>
      {mounted && <DailyGame />}
    </main>
  );
}
