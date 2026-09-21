import type { Direction, PlacedWord, Position, Puzzle, PuzzleOptions } from './types';
import { DIRECTION_DELTAS } from './directions';
import { mulberry32 } from './random';
import { validatePuzzle } from './validator';

const FILL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function normalizeWords(words: string[]): string[] {
  return words.map((word) => word.toUpperCase().replace(/\s+/g, ''));
}

function createGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array<string>(size).fill(''));
}

function canPlace(grid: string[][], size: number, word: string, start: Position, direction: Direction): boolean {
  const delta = DIRECTION_DELTAS[direction];
  for (let i = 0; i < word.length; i++) {
    const row = start.row + delta.row * i;
    const col = start.col + delta.col * i;
    if (row < 0 || row >= size || col < 0 || col >= size) return false;
    const existing = grid[row][col];
    if (existing !== '' && existing !== word[i]) return false;
  }
  return true;
}

function placeWord(grid: string[][], word: string, start: Position, direction: Direction): PlacedWord {
  const delta = DIRECTION_DELTAS[direction];
  const end: Position = {
    row: start.row + delta.row * (word.length - 1),
    col: start.col + delta.col * (word.length - 1),
  };
  for (let i = 0; i < word.length; i++) {
    grid[start.row + delta.row * i][start.col + delta.col * i] = word[i];
  }
  return { word, start, end, direction };
}

export function generatePuzzle(options: PuzzleOptions): Puzzle {
  const { size, seed } = options;
  const directions = options.directions ?? ['RIGHT'];
  const words = normalizeWords(options.words).sort((a, b) => b.length - a.length);
  const rng = mulberry32(seed);
  const grid = createGrid(size);
  const placed: PlacedWord[] = [];

  for (const word of words) {
    let placedWord: PlacedWord | null = null;
    const attempts = size * size * 4;

    for (let attempt = 0; attempt < attempts && placedWord === null; attempt++) {
      const direction = directions[Math.floor(rng() * directions.length)];
      const delta = DIRECTION_DELTAS[direction];
      const maxStartRow = size - delta.row * (word.length - 1);
      const maxStartCol = size - delta.col * (word.length - 1);
      if (maxStartRow <= 0 || maxStartCol <= 0) continue;

      const start: Position = {
        row: Math.floor(rng() * maxStartRow),
        col: Math.floor(rng() * maxStartCol),
      };
      if (!canPlace(grid, size, word, start, direction)) continue;

      placedWord = placeWord(grid, word, start, direction);
    }

    if (placedWord === null) {
      throw new Error(`Unable to place word "${word}" in a ${size}x${size} puzzle`);
    }
    placed.push(placedWord);
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === '') {
        grid[row][col] = FILL_ALPHABET[Math.floor(rng() * FILL_ALPHABET.length)];
      }
    }
  }

  const puzzle: Puzzle = { size, grid, words: placed };
  if (!validatePuzzle(puzzle)) {
    throw new Error('Unable to generate puzzle');
  }
  return puzzle;
}