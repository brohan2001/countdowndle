import { LetterTile, WordValidationResult, MIN_WORD_LENGTH } from "@/types/letters";

let cachedDictionaryPromise: Promise<Set<string>> | null = null;

export function parseWordList(raw: string): Set<string> {
  // TODO: split `raw` into individual words and build a Set from them
  const wordSet = new Set(
    raw.split(/\r?\n/).map(line => line.trim()).filter(line =>line.length > 0));

    return wordSet;
  
}

export function loadDictionary(): Promise<Set<string>> {
  // TODO: if cachedDictionaryPromise is null, fetch + parse and store the promise in it.
  // Then return cachedDictionaryPromise (non-null at this point).
  if(!cachedDictionaryPromise){
    cachedDictionaryPromise = (async() =>{
        const response = await fetch('/dictionary/words.txt');
        if(!response.ok){
            throw new Error(`Failed to load dictionary: ${response.statusText}`);
        }

        const raw = await response.text();

        return parseWordList(raw);
    })().catch((error) =>{
        cachedDictionaryPromise = null;
        throw error;
    });
  }
  return cachedDictionaryPromise;
}

export function isValidWord(dictionary: Set<string>, word: string): boolean {
  // TODO: return dictionary.has(...) using a normalized (lowercase) version of `word`
  return dictionary.has(word.toLowerCase());
}

export function canBuildFromBoard(word: string, board: LetterTile[]): boolean{
    const targetWord = word.toLowerCase();

    const boardCounts = new Map<string, number>();
    for (const tile of board){
        const char = tile.letter.toLowerCase();
        boardCounts.set(char, (boardCounts.get(char) || 0) + 1);
    }

    const wordCounts = new Map<string, number>();
    for (const char of targetWord){
        wordCounts.set(char, (wordCounts.get(char) || 0) + 1);
    }

    for (const [char, requiredCount] of wordCounts){
        const availableCount = boardCounts.get(char) || 0;

        if (requiredCount > availableCount){
            return false;
        }
    }
    return true;
}

export function validateWord(
  word: string,
  board: LetterTile[],
  dictionary: Set<string>
): WordValidationResult {
  // TODO: run these checks in order, returning as soon as one fails:
  // 1. empty        -> { status: 'invalid-empty', word }
  // 2. too short     -> { status: 'invalid-too-short', word }   (use MIN_WORD_LENGTH)
  // 3. not buildable -> { status: 'invalid-not-on-board', word } (use canBuildFromBoard)
  // 4. not a word    -> { status: 'invalid-not-a-word', word }   (use isValidWord)
  // else             -> { status: 'valid', word }
  word = word.trim();
  if (!word){
    return {status: 'invalid-empty', word: word};
  }
  else if (word.length < MIN_WORD_LENGTH){
    return {status: 'invalid-too-short', word: word};
  }
  else if (!canBuildFromBoard(word, board)){
    return {status: 'invalid-not-on-board', word: word};
  }  
  else if (!isValidWord(dictionary, word)){
    return {status: 'invalid-not-a-word', word: word};
  }
  else{
    return {status: 'valid', word: word};
  }
}

