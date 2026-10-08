"use client";

import { LargeCount, NumbersInputMode, NumbersPlayMode } from "@/types/numbers";
import { Button } from "@/components/ui/Button";
import { TabSelector } from "@/components/ui/TabSelector";

const LARGE_COUNT_OPTIONS: { value: LargeCount; label: string }[] = [
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
];

const INPUT_MODE_OPTIONS: { value: NumbersInputMode; label: string }[] = [
  { value: "calculator", label: "Calculator" },
  { value: "freeText", label: "Free text" },
];

const PLAY_MODE_OPTIONS: { value: NumbersPlayMode; label: string }[] = [
  { value: "untimed", label: "Untimed" },
  { value: "declare", label: "Declare" },
];

export interface LargeCountSelectorProps {
  selectedLargeCount: LargeCount | null;
  inputMode: NumbersInputMode;
  playMode: NumbersPlayMode;
  disabled: boolean;
  onSelectLargeCount: (count: LargeCount) => void;
  onSelectInputMode: (mode: NumbersInputMode) => void;
  onSelectPlayMode: (mode: NumbersPlayMode) => void;
  onStart: () => void;
}

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-bold tracking-[0.14em] text-accent uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

export function LargeCountSelector({
  selectedLargeCount,
  inputMode,
  playMode,
  disabled,
  onSelectLargeCount,
  onSelectInputMode,
  onSelectPlayMode,
  onStart,
}: LargeCountSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Labelled label="Large numbers">
        <TabSelector
          label="Large numbers"
          options={LARGE_COUNT_OPTIONS}
          value={selectedLargeCount}
          onChange={onSelectLargeCount}
          disabled={disabled}
        />
      </Labelled>
      <Labelled label="Input mode">
        <TabSelector
          label="Input mode"
          options={INPUT_MODE_OPTIONS}
          value={inputMode}
          onChange={onSelectInputMode}
          disabled={disabled}
        />
      </Labelled>
      <Labelled label="Play mode">
        <TabSelector
          label="Play mode"
          options={PLAY_MODE_OPTIONS}
          value={playMode}
          onChange={onSelectPlayMode}
          disabled={disabled}
        />
      </Labelled>
      <Button
        disabled={disabled || selectedLargeCount === null}
        onClick={onStart}
      >
        Start
      </Button>
    </div>
  );
}
