// A prefix tree over lowercase words. A Set answers "is this a word?" in
// O(1) but can't answer "does anything start with these letters?", which is
// what lets the solver stop exploring a branch the moment no word can
// continue from it.

interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
}

function createNode(): TrieNode {
  return { children: new Map(), isWord: false };
}

export class Trie {
  private root = createNode();
  private wordCount = 0;

  get size(): number {
    return this.wordCount;
  }

  insert(word: string): void {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      let next = node.children.get(char);
      if (!next) {
        next = createNode();
        node.children.set(char, next);
      }
      node = next;
    }
    if (!node.isWord) {
      node.isWord = true;
      this.wordCount++;
    }
  }

  private find(prefix: string): TrieNode | null {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      const next = node.children.get(char);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  has(word: string): boolean {
    return this.find(word)?.isWord ?? false;
  }

  hasPrefix(prefix: string): boolean {
    return this.find(prefix) !== null;
  }

  // Every dictionary word buildable from the given letter multiset
  // (letter -> available count, lowercase), each letter used at most as many
  // times as it is available. DFS: only descend into a child whose letter is
  // still available, decrementing on the way down and restoring on the way
  // back. Results are sorted longest first, then alphabetically.
  findWords(counts: ReadonlyMap<string, number>, minLength = 1): string[] {
    const remaining = new Map(counts);
    const found: string[] = [];

    const visit = (node: TrieNode, prefix: string): void => {
      if (node.isWord && prefix.length >= minLength) {
        found.push(prefix);
      }
      for (const [char, child] of node.children) {
        const available = remaining.get(char) ?? 0;
        if (available <= 0) continue;
        remaining.set(char, available - 1);
        visit(child, prefix + char);
        remaining.set(char, available);
      }
    };

    visit(this.root, "");

    return found.sort((a, b) => b.length - a.length || a.localeCompare(b));
  }
}

export function buildTrie(words: Iterable<string>): Trie {
  const trie = new Trie();
  for (const word of words) {
    trie.insert(word);
  }
  return trie;
}

export function countLetters(letters: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const letter of letters) {
    const key = letter.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// Built once per dictionary Set and reused, so the ~127k-word trie is only
// constructed lazily (after the first round ends), never on page load.
const trieCache = new WeakMap<Set<string>, Trie>();

export function getTrie(dictionary: Set<string>): Trie {
  let trie = trieCache.get(dictionary);
  if (!trie) {
    trie = buildTrie(dictionary);
    trieCache.set(dictionary, trie);
  }
  return trie;
}
