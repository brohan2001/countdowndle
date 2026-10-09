import { MAX_BOARD_SIZE, MIN_WORD_LENGTH } from "@/types/letters";
import { letterSignature } from "@/lib/conundrum/generator";

// Groups the word list by sorted letters, so every anagram of a word is one
// Map lookup. Built once per dictionary (about 127k words, well under 100ms).
const anagramIndexes = new WeakMap<Set<string>, Map<string, string[]>>();

export function getAnagramIndex(dictionary: Set<string>): Map<string, string[]> {
  let index = anagramIndexes.get(dictionary);
  if (!index) {
    index = new Map();
    for (const word of dictionary) {
      const key = letterSignature(word);
      const group = index.get(key);
      if (group) group.push(word);
      else index.set(key, [word]);
    }
    anagramIndexes.set(dictionary, index);
  }
  return index;
}

export type WordCheck =
  | { status: "empty" }
  | { status: "bad-characters"; word: string }
  | {
      status: "checked";
      word: string;
      inList: boolean;
      // Long enough and short enough to score in the Letters game here.
      playable: boolean;
      tooShort: boolean;
      tooLong: boolean;
      anagrams: string[]; // other listed words using exactly the same letters
    };

export function checkWord(dictionary: Set<string>, input: string): WordCheck {
  const word = input.trim().toLowerCase();
  if (word === "") return { status: "empty" };
  if (!/^[a-z]+$/.test(word)) return { status: "bad-characters", word };

  const inList = dictionary.has(word);
  const tooShort = word.length < MIN_WORD_LENGTH;
  const tooLong = word.length > MAX_BOARD_SIZE;
  const anagrams = (getAnagramIndex(dictionary).get(letterSignature(word)) ?? [])
    .filter((w) => w !== word)
    .sort();
  return {
    status: "checked",
    word,
    inList,
    playable: inList && !tooShort && !tooLong,
    tooShort,
    tooLong,
    anagrams,
  };
}
