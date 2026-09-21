export type Direction = 'RIGHT' | 'DOWN' | 'DIAGONAL_DOWN_RIGHT';

export interface Position {
  row: number;
  col: number;
}

export interface Cell {
  row: number;
  col: number;
  letter: string;
}

export interface PlacedWord {
  word: string;
  start: Position;
  end: Position;
  direction: Direction;
}

export interface Puzzle {
  size: number;
  grid: string[][];
  words: PlacedWord[];
}

export interface PuzzleOptions {
  size: number;
  words: string[];
  directions?: Direction[];
  seed: number;
}

export interface LevelDefinition {
  id: number;
  size: number;
  words: string[];
  directions: Direction[];
  seed: number;
}