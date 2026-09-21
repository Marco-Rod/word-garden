import { describe, expect, it } from 'vitest';
import { generatePuzzle } from './generator';
import { validatePuzzle } from './validator';
import { matchSelection, wordCells } from './selection';
import type { Direction, Puzzle } from './types';

const LEVEL_1 = { size: 5, words: ['GATO', 'OSO', 'PATO'], directions: ['RIGHT'] as Direction[], seed: 1001 };

describe('generatePuzzle', () => {
  it('creates the requested grid size', () => {
    const puzzle = generatePuzzle(LEVEL_1);
    expect(puzzle.grid).toHaveLength(5);
    expect(puzzle.grid.every((row) => row.length === 5)).toBe(true);
  });

  it('places every requested word', () => {
    const puzzle = generatePuzzle(LEVEL_1);
    expect(puzzle.words.map((w) => w.word).sort()).toEqual(['GATO', 'OSO', 'PATO']);

    for (const placed of puzzle.words) {
      const letters = wordCells(placed)
        .map((cell) => puzzle.grid[cell.row][cell.col])
        .join('');
      expect(letters).toBe(placed.word);
    }
  });

  it('places words only in the first direction of level 1', () => {
    const puzzle = generatePuzzle(LEVEL_1);
    expect(puzzle.words.every((w) => w.direction === 'RIGHT')).toBe(true);
    for (const placed of puzzle.words) {
      expect(placed.end).toEqual({ row: placed.start.row, col: placed.start.col + placed.word.length - 1 });
    }
  });

  it('never places letters outside the grid', () => {
    const puzzle = generatePuzzle(LEVEL_1);
    for (const placed of puzzle.words) {
      for (const cell of wordCells(placed)) {
        expect(cell.row).toBeGreaterThanOrEqual(0);
        expect(cell.row).toBeLessThan(puzzle.size);
        expect(cell.col).toBeGreaterThanOrEqual(0);
        expect(cell.col).toBeLessThan(puzzle.size);
      }
    }
  });

  it('generates identical puzzles with the same seed', () => {
    const a = generatePuzzle(LEVEL_1);
    const b = generatePuzzle(LEVEL_1);
    expect(a.grid).toEqual(b.grid);
    expect(a.words.map((w) => `${w.word}@${w.start.row},${w.start.col}:${w.direction}`)).toEqual(
      b.words.map((w) => `${w.word}@${w.start.row},${w.start.col}:${w.direction}`),
    );
    expect(a.stats).toEqual(b.stats);
  });

  it('records same-letter intersections without allowing conflicting collisions', () => {
    const puzzles = Array.from({ length: 30 }, (_, index) =>
      generatePuzzle({
        size: 5,
        words: ['GATO', 'OSO'],
        directions: ['RIGHT', 'DOWN'],
        intersectionPreference: 1,
        seed: index + 1,
      }),
    );
    expect(puzzles.some((puzzle) => puzzle.stats.intersections > 0)).toBe(true);
    expect(puzzles.every(validatePuzzle)).toBe(true);
  });

  it('normalizes words to uppercase', () => {
    const puzzle = generatePuzzle({ ...LEVEL_1, words: ['gato', 'oso'] });
    expect(puzzle.words.map((w) => w.word).sort()).toEqual(['GATO', 'OSO']);
  });

  it('validates the generated puzzle', () => {
    const puzzle = generatePuzzle(LEVEL_1);
    expect(validatePuzzle(puzzle)).toBe(true);
  });

  it('every placed word can be resolved by selecting its cells', () => {
    const puzzle = generatePuzzle(LEVEL_1);
    for (const placed of puzzle.words) {
      expect(matchSelection(wordCells(placed), puzzle.words)?.word).toBe(placed.word);
    }
  });

  it('throws when a word cannot fit in the grid', () => {
    expect(() => generatePuzzle({ size: 3, words: ['ELEFANTE'], directions: ['RIGHT'], seed: 1 })).toThrow();
  });

  it('produces valid puzzles with several directions', () => {
    const directions: Direction[] = ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'];
    for (let seed = 1; seed <= 60; seed++) {
      const puzzle = generatePuzzle({
        size: 7,
        words: ['LUNA', 'SOL', 'PLAYA', 'RIO'],
        directions,
        seed,
      });
      expect(puzzle.words).toHaveLength(4);
      expect(validatePuzzle(puzzle)).toBe(true);
    }
  });

  it('produces valid puzzles across many seeds for the level 1 config', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const puzzle = generatePuzzle({ ...LEVEL_1, seed });
      expect(validatePuzzle(puzzle)).toBe(true);
    }
  });
});

describe('validatePuzzle', () => {
  it('rejects a puzzle with a missing word in the grid', () => {
    const puzzle = generatePuzzle(LEVEL_1) as Puzzle;
    const target = puzzle.words[0];
    puzzle.grid[target.start.row][target.start.col] = 'X';
    expect(validatePuzzle(puzzle)).toBe(false);
  });

  it('rejects a puzzle with an empty cell', () => {
    const puzzle = generatePuzzle(LEVEL_1) as Puzzle;
    puzzle.grid[0][0] = '';
    expect(validatePuzzle(puzzle)).toBe(false);
  });

  it('rejects a skewed grid', () => {
    const puzzle = generatePuzzle(LEVEL_1) as Puzzle;
    puzzle.grid.pop();
    expect(validatePuzzle(puzzle)).toBe(false);
  });
});
