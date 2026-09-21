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

interface PlacementCandidate {
  start: Position;
  direction: Direction;
  intersections: number;
}

function placementCandidate(
  grid: string[][],
  size: number,
  word: string,
  start: Position,
  direction: Direction,
): PlacementCandidate | null {
  const delta = DIRECTION_DELTAS[direction];
  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const row = start.row + delta.row * i;
    const col = start.col + delta.col * i;
    if (row < 0 || row >= size || col < 0 || col >= size) return null;
    const existing = grid[row][col];
    if (existing !== '' && existing !== word[i]) return null;
    if (existing === word[i]) intersections++;
  }
  return { start, direction, intersections };
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
  const intersectionPreference = clamp(options.intersectionPreference ?? 0, 0, 1);
  const words = normalizeWords(options.words).sort((a, b) => b.length - a.length);
  const rng = mulberry32(seed);
  const attempts = size * size * 4;
  let grid: string[][] | null = null;
  let placed: PlacedWord[] | null = null;
  let intersections = 0;

  for (let attempt = 0; attempt < attempts && placed === null; attempt++) {
    const candidateGrid = createGrid(size);
    const candidatePlaced: PlacedWord[] = [];
    let candidateIntersections = 0;
    let failed = false;

    for (const word of words) {
      const candidates = allCandidates(candidateGrid, size, word, directions);
      if (candidates.length === 0) {
        failed = true;
        break;
      }
      const chosen = chooseCandidate(candidates, intersectionPreference, rng);
      candidatePlaced.push(placeWord(candidateGrid, word, chosen.start, chosen.direction));
      candidateIntersections += chosen.intersections;
    }
    if (!failed) {
      grid = candidateGrid;
      placed = candidatePlaced;
      intersections = candidateIntersections;
    }
  }

  if (!grid || !placed) throw new Error('Unable to generate puzzle');

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === '') {
        grid[row][col] = FILL_ALPHABET[Math.floor(rng() * FILL_ALPHABET.length)];
      }
    }
  }

  const puzzle: Puzzle = { size, grid, words: placed, stats: { intersections } };
  if (!validatePuzzle(puzzle)) {
    throw new Error('Unable to generate puzzle');
  }
  return puzzle;
}

function allCandidates(grid: string[][], size: number, word: string, directions: Direction[]): PlacementCandidate[] {
  const candidates: PlacementCandidate[] = [];
  for (const direction of directions) {
    const delta = DIRECTION_DELTAS[direction];
    const maxStartRow = size - delta.row * (word.length - 1);
    const maxStartCol = size - delta.col * (word.length - 1);
    for (let row = 0; row < maxStartRow; row++) {
      for (let col = 0; col < maxStartCol; col++) {
        const candidate = placementCandidate(grid, size, word, { row, col }, direction);
        if (candidate) candidates.push(candidate);
      }
    }
  }
  return candidates;
}

function chooseCandidate(candidates: PlacementCandidate[], preference: number, rng: () => number): PlacementCandidate {
  const weights = candidates.map((candidate) => 1 + preference * candidate.intersections * 12);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = rng() * total;
  for (let index = 0; index < candidates.length; index++) {
    cursor -= weights[index];
    if (cursor <= 0) return candidates[index];
  }
  return candidates[candidates.length - 1];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
