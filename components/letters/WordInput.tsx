"use client";

import { useState, SubmitEvent } from "react";
import { Button } from "@/components/ui/Button";

export interface WordInputProps {
  disabled: boolean; // true whenever phase !== 'solving'
  onSubmit: (word: string) => void;
}

export function WordInput({ disabled, onSubmit }: WordInputProps) {
  const [value, setValue] = useState("");

  // Clear stale text when the round ends (adjust state during render rather
  // than in an effect, so there is no extra cascading render).
  const [wasDisabled, setWasDisabled] = useState(disabled);
  if (disabled !== wasDisabled) {
    setWasDisabled(disabled);
    if (disabled) setValue("");
  }

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = value.trim();
    if (!trimmed) return;

    onSubmit(trimmed);
    setValue("");
  }

  const isSubmitDisabled = disabled || value.trim().length === 0;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? "Waiting for round…" : "Enter your word"}
        aria-label="Your word"
        autoComplete="off"
        spellCheck={false}
        className="w-56 rounded-desk border-[1.5px] border-tile-edge bg-paper px-4 py-2 font-serif text-xl font-semibold tracking-wider text-ink uppercase placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-soft/60 placeholder:normal-case focus:border-brass focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      <Button type="submit" disabled={isSubmitDisabled}>
        Submit
      </Button>
    </form>
  );
}
