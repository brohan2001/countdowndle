// Run with: pnpm tsx scripts/build-conundrums.ts
import { readFileSync, writeFileSync } from "node:fs";
import { parseWordList } from "../lib/letters/dictionary";
import { selectConundrumWords } from "../lib/conundrum/generator";

const dictionary = parseWordList(
  readFileSync("public/dictionary/words.txt", "utf8"),
);
const words = selectConundrumWords(dictionary);
writeFileSync("public/dictionary/conundrums.json", JSON.stringify(words));
console.log(`${words.length} conundrum solutions written`);
