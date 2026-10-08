// Offline conundrum selection. Pure functions over a word list so they can be
// unit-tested; scripts/build-conundrums.ts does the file I/O.

export const CONUNDRUM_LENGTH = 9;

export function letterSignature(word: string): string {
  return [...word].sort().join("");
}

function undouble(stem: string): string | null {
  const n = stem.length;
  return n >= 2 && stem[n - 1] === stem[n - 2] ? stem.slice(0, -1) : null;
}

// Candidate base forms a word could have been inflected from. If any is in
// the dictionary the word is an inflection (plural, past tense, -ing) and is
// a poor conundrum: its base word is the "obvious" anagram partner.
export function inflectionStems(word: string): string[] {
  const stems: string[] = [];
  const add = (s: string | null) => {
    if (s && s.length >= 3) stems.push(s);
  };

  if (word.endsWith("ies")) add(word.slice(0, -3) + "y");
  if (word.endsWith("es")) add(word.slice(0, -2));
  if (word.endsWith("s")) add(word.slice(0, -1));

  if (word.endsWith("ied")) add(word.slice(0, -3) + "y");
  if (word.endsWith("ed")) {
    const stem = word.slice(0, -2);
    add(stem);
    add(stem + "e");
    add(undouble(stem));
  }
  if (word.endsWith("d")) add(word.slice(0, -1)); // -ed after e: "baked" -> "bake"

  if (word.endsWith("ing")) {
    const stem = word.slice(0, -3);
    add(stem);
    add(stem + "e");
    add(undouble(stem));
  }
  return stems;
}

export function isInflection(word: string, dictionary: ReadonlySet<string>): boolean {
  return inflectionStems(word).some((stem) => dictionary.has(stem));
}

// Nine-letter words whose letters spell exactly ONE dictionary word (so
// there is a single correct answer) and that are not simple inflections.
export function selectConundrumWords(dictionary: ReadonlySet<string>): string[] {
  const bySignature = new Map<string, string[]>();
  for (const word of dictionary) {
    if (word.length !== CONUNDRUM_LENGTH || !/^[a-z]+$/.test(word)) continue;
    const key = letterSignature(word);
    const group = bySignature.get(key);
    if (group) group.push(word);
    else bySignature.set(key, [word]);
  }

  const result: string[] = [];
  for (const group of bySignature.values()) {
    if (group.length === 1 && !isInflection(group[0], dictionary)) {
      result.push(group[0]);
    }
  }
  return result.sort();
}

// A scramble that is neither the answer nor itself a dictionary word.
// Deterministic for a given rng; falls back after many tries (never in
// practice for 9 distinct-ish letters).
export function scrambleWord(
  solution: string,
  dictionary: ReadonlySet<string>,
  shuffleFn: (letters: string[]) => string[],
): string {
  const letters = [...solution];
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = shuffleFn(letters).join("");
    if (candidate !== solution && !dictionary.has(candidate)) return candidate;
  }
  // Deterministic last resort: rotate by one position.
  return solution.slice(1) + solution[0];
}
