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
  stats: {
    intersections: number;
    intersectingWords: number;
    directionUsage: Record<Direction, number>;
    qualityScore: number;
  };
}

export interface PuzzleDifficulty {
  intersectionPreference: number;
  minIntersections: number;
  directionBalance: number;
  minIntersectingWords?: number;
  maxDirectionSpread?: number;
}

export interface PuzzleOptions {
  size: number;
  words: string[];
  directions?: Direction[];
  intersectionPreference?: number;
  minIntersections?: number;
  directionBalance?: number;
  minIntersectingWords?: number;
  maxDirectionSpread?: number;
  seed: number;
}

export interface LevelDefinition extends PuzzleDifficulty {
  id: number;
  size: number;
  words: string[];
  directions: Direction[];
  seed: number;
}
