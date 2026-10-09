import type { Metadata } from "next";
import { DictionaryChecker } from "@/components/dictionary/DictionaryChecker";

export const metadata: Metadata = {
  title: "Dictionary checker — Countdowndle",
  description: "Check whether a word is in Countdowndle's word list, and see exactly where the list comes from.",
};

const label = "text-xs font-bold tracking-[0.14em] text-accent uppercase";

export default function DictionaryPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-semibold text-ink">Dictionary checker</h1>
        <p className="mt-1 text-ink-soft">Is it a word? Check it against the exact list the games use.</p>
      </div>

      <p className="w-full rounded-desk border-[1.5px] border-dashed border-brass bg-dial px-4 py-3 text-sm text-ink">
        <strong>Heads up:</strong> this is <em>not</em> the official Countdown dictionary. The TV show adjudicates
        with the Oxford Dictionaries; Countdowndle uses a free spell-checker word list. Most everyday words agree,
        but some words the show allows will be missing here, and a few allowed here would be rejected on the show.
      </p>

      <DictionaryChecker />

      <section className="flex w-full flex-col gap-3 text-sm text-ink">
        <h2 className="font-serif text-2xl font-semibold text-ink">Where the words come from</h2>
        <p>
          The list is built from the <strong>English Speller Database</strong> (ESDB, formerly SCOWL) by Kevin
          Atkinson, using the generator at{" "}
          <a href="https://app.aspell.net/create" className="font-bold text-accent underline" target="_blank" rel="noreferrer">
            app.aspell.net/create
          </a>
          . Its main sources are 12dicts and ENABLE2K, both in the public domain.
        </p>

        <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-desk border-[1.5px] border-tile-edge bg-paper p-4">
          <span className={label}>Size</span><span>70 (&ldquo;large&rdquo;)</span>
          <span className={label}>Spelling</span><span>British, -ize / Oxford (e.g. <em>organize</em>, <em>colour</em>)</span>
          <span className={label}>Variants</span><span>Level 1 (default)</span>
          <span className={label}>Accents</span><span>Stripped (<em>café</em> → <em>cafe</em>)</span>
          <span className={label}>Words</span><span>126,750 (18,887 of them nine letters long)</span>
        </div>

        <p className={label}>Then, in order</p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Drop anything starting with a capital letter (proper nouns such as <em>London</em>).</li>
          <li>Drop anything that isn&apos;t letters only: hyphenated words, words with apostrophes, abbreviations.</li>
          <li>Lowercase the rest, so a handful of brand words survive in lowercase (e.g. <em>ipad</em>).</li>
          <li>Sort and remove duplicates.</li>
        </ol>
        <p>
          Conundrum answers are a subset: nine-letter words with exactly one arrangement in the list, skipping plurals
          and other simple inflections, so there&apos;s only ever one right answer.
        </p>
        <p>
          Anyone can rebuild the list byte for byte with <code className="rounded bg-tab px-1">scripts/build-wordlist.sh</code>{" "}
          in the source code. You can also{" "}
          <a href="/dictionary/words.txt" className="font-bold text-accent underline">download the raw list</a>.
        </p>

        <h3 className="mt-2 font-serif text-lg font-semibold text-ink">License</h3>
        <p className="text-ink-soft">
          Copyright 2000–2026 by Kevin Atkinson. Permission to use, copy, modify, distribute and sell any part of the
          English Speller Database, or word lists created from it, is granted without fee, provided the copyright
          notice and this permission notice appear in all copies.{" "}
          <a href="/dictionary/LICENSE-ESDB.txt" className="font-bold text-accent underline">Full notice</a>.
        </p>
      </section>
    </main>
  );
}
