/**
 * Fisher-Yates shuffle: randomize an array in-place.
 * Learn more: https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 */
export function shuffle<T>(items: T[]): T[] {
  // TODO: Implement Fisher-Yates shuffle.
  // 1. Start from the end of the array.
  // 2. For each index i, pick a random index j between 0 and i (inclusive).
  // 3. Swap items[i] and items[j].
  // 4. Return the shuffled array.
  //
  // Pseudocode:
  //   for i from end to start:
  //     j = random int between 0 and i
  //     swap array[i] and array[j]
  //   return array
  //
  // Hint: Use Math.random() for randomness. Math.floor(Math.random() * max) gives an int from 0 to max-1.
  for(let i = items.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i+1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}