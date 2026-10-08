import { MAX_BOARD_SIZE } from "@/types/letters";

export function scoreWord(word: string): number{
    return word.length === MAX_BOARD_SIZE ? MAX_BOARD_SIZE * 2 : word.length;
}