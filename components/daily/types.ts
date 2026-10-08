export interface DailyStageProps {
  dayKey: string;
  dictionary: Set<string>;
  solutions: string[]; // conundrum answers (used only by the conundrum stage)
  onComplete: (points: number) => void; // idempotent: may fire more than once
  onContinue: () => void;
}
