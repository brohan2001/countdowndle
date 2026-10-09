"use client";

import { useEffect, useMemo, useState } from "react";
import { loadDictionary } from "@/lib/letters/dictionary";
import { checkWord } from "@/lib/letters/wordCheck";
import { scoreWord } from "@/lib/letters/scoring";
import { MAX_BOARD_SIZE, MIN_WORD_LENGTH } from "@/types/letters";
import { playSound } from "@/lib/shared/sound";
import { Panel } from "@/components/ui/Panel";

export function DictionaryChecker() {
  const [dictionary, setDictionary] = useState<Set<string> | null>(null);
  const [conundrums, setConundrums] = useState<Set<string> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    loadDictionary()
      .then((d) => alive && setDictionary(d))
      .catch(() => alive && setLoadError("Couldn't load the word list."));
    fetch("/dictionary/conundrums.json")
      .then((r) => (r.ok ? (r.json() as Promise<string[]>) : []))
      .then((list) => alive && setConundrums(new Set(list)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const result = useMemo(
    () => (dictionary && query ? checkWord(dictionary, query) : null),
    [dictionary, query],
  );

  return (
    <Panel className="flex w-full flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(input);
          if (dictionary && input.trim()) {
            const r = checkWord(dictionary, input);
            playSound(r.status === "checked" && r.inList ? "success" : "fail");
          }
        }}
      >
        <label htmlFor="dict-word" className="sr-only">Word to check</label>
        <input
          id="dict-word"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={dictionary ? "Type a word…" : "Loading the word list…"}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={30}
          className="min-w-0 flex-1 rounded-desk border-[1.5px] border-tile-edge bg-paper px-4 py-2 font-serif text-2xl font-semibold tracking-wider text-ink uppercase placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
        <button
          type="submit"
          disabled={!dictionary || input.trim() === ""}
          className="rounded-desk border-[1.5px] border-forest bg-forest px-5 py-2 text-sm font-bold text-cream shadow-paper transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Check
        </button>
      </form>

      {loadError && <p role="alert" className="text-sm font-bold text-urgent">{loadError}</p>}

      <div aria-live="polite">
        {result?.status === "bad-characters" && (
          <p className="text-sm font-bold text-urgent">Letters A–Z only — no spaces, hyphens or apostrophes.</p>
        )}
        {result?.status === "checked" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-serif text-3xl font-semibold tracking-wider text-ink uppercase">{result.word}</span>
              <span
                className={`rounded-desk border-[1.5px] px-2 py-0.5 text-sm font-bold ${
                  result.inList ? "border-forest text-forest" : "border-urgent text-urgent"
                }`}
              >
                {result.inList ? "✓ In the list" : "✗ Not in the list"}
              </span>
              <span className="text-sm text-ink-soft">{result.word.length} letters</span>
            </div>
            {result.inList && (
              <ul className="flex flex-col gap-1 text-sm text-ink">
                <li>
                  {result.playable
                    ? `Scores ${scoreWord(result.word)} in Letters here${result.word.length === MAX_BOARD_SIZE ? " (nine-letter bonus)" : ""}.`
                    : result.tooShort
                      ? `Too short to score here (minimum ${MIN_WORD_LENGTH} letters).`
                      : `Longer than ${MAX_BOARD_SIZE} letters, so it can never be played.`}
                </li>
                {result.word.length === MAX_BOARD_SIZE && conundrums && (
                  <li>
                    {conundrums.has(result.word)
                      ? "It's one of the conundrum answers."
                      : "Not used as a conundrum answer (it has an anagram partner or is an inflection)."}
                  </li>
                )}
              </ul>
            )}
            {result.anagrams.length > 0 && (
              <p className="text-sm text-ink-soft">
                <span className="text-xs font-bold tracking-[0.14em] text-accent uppercase">Anagrams in the list </span>
                <span className="font-serif text-base font-semibold tracking-wide text-ink uppercase">
                  {result.anagrams.slice(0, 12).join(" · ")}
                  {result.anagrams.length > 12 && ` +${result.anagrams.length - 12}`}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
