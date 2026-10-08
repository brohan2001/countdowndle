"use client";

import { useState } from "react";
import { DailyScores, formatShare } from "@/lib/daily/share";
import { Streaks } from "@/lib/daily/storage";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export interface DailySummaryProps {
  dayKey: string;
  scores: DailyScores;
  streaks: Streaks;
}

export function DailySummary({ dayKey, scores, streaks }: DailySummaryProps) {
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const share = formatShare(dayKey, scores);
  const total =
    (scores.letters ?? 0) + (scores.numbers ?? 0) + (scores.conundrum ?? 0);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(share);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  };

  return (
    <Panel className="flex w-full max-w-md flex-col items-center gap-4">
      <h2 className="font-serif text-2xl font-semibold text-ink">
        Today&apos;s desk is done
      </h2>
      <p className="font-serif text-4xl font-bold text-ink">{total}</p>
      <dl className="grid grid-cols-2 gap-x-8 text-center">
        <div>
          <dt className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
            Streak
          </dt>
          <dd className="font-serif text-2xl font-semibold">{streaks.current}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
            Best
          </dt>
          <dd className="font-serif text-2xl font-semibold">{streaks.best}</dd>
        </div>
      </dl>
      <pre className="text-center text-2xl leading-relaxed whitespace-pre-wrap">
        {share}
      </pre>
      <Button onClick={copy}>
        {copied === "yes" ? "Copied!" : "Copy result"}
      </Button>
      {copied === "no" && (
        <p className="text-sm text-urgent">Couldn&apos;t copy — select the text above.</p>
      )}
    </Panel>
  );
}
