import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseWordList } from "../../letters/dictionary";

// Read once per server instance. Static path.join(process.cwd(), ...) lets
// Next's file tracing include these files in the deployed function.
let cache: { dictionary: Set<string>; solutions: string[] } | null = null;

export function loadServerAssets(): { dictionary: Set<string>; solutions: string[] } {
  if (!cache) {
    const dir = path.join(process.cwd(), "public", "dictionary");
    cache = {
      dictionary: parseWordList(readFileSync(path.join(dir, "words.txt"), "utf8")),
      solutions: JSON.parse(readFileSync(path.join(dir, "conundrums.json"), "utf8")) as string[],
    };
  }
  return cache;
}
