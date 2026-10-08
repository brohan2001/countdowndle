"use client";

import { useState, SubmitEvent, useEffect } from "react";

export interface WordInputProps {
  disabled: boolean; // true whenever phase !== 'solving'
  onSubmit: (word: string) => void;
}

export function WordInput({ disabled, onSubmit }: WordInputProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (disabled) {
      setValue("");
    }
  }, [disabled]);

  // TODO 1: handleSubmit(e: FormEvent) —
  //   - e.preventDefault() (forms reload the page on submit by default)
  //   - guard: if the trimmed value is empty, do nothing
  //   - call onSubmit(value)
  //   - reset local state back to "" so next round starts blank
  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = value.trim();
    if (!trimmed) return;

    onSubmit(trimmed);
    setValue("");
  }

  const isSubmitDisabled = disabled || value.trim().length === 0;

  return (
    <form
      onSubmit={/* TODO: wire handleSubmit */ handleSubmit}
      className="flex gap-2"
    >
      {
        /* TODO 2: <input> — controlled by `value`/`setValue`, disabled={disabled} */
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "Waiting for round..." : "Enter your word"}
          className="rounded-lg border border-gray-300 px-4 py-2 font-mono uppercase tracking-wider text-black focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900"
        />
      }
      {
        /* TODO 3: submit <button> — disabled when `disabled` is true OR value is
          empty/whitespace-only (mirrors the vowelDisabled/consonantDisabled pattern
          you just used in LetterSelector) */
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>
      }
    </form>
  );
}
