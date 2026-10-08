export type GameMode = 'letters' | 'numbers' | 'conundrum';

export interface ScoreEntry {
  round: number;
  mode: GameMode;
  points: number;
  timestamp: number; // Date.now()
}