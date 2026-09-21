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

type DirectionUsage = Record<Direction, number>;

interface PuzzleCandidate {
  grid: string[][];
  words: PlacedWord[];
  intersections: number;
  intersectingWords: number;
  directionUsage: DirectionUsage;
  qualityScore: number;
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
  const minIntersections = Math.max(0, Math.floor(options.minIntersections ?? 0));
  const minIntersectingWords = Math.max(0, Math.floor(options.minIntersectingWords ?? 0));
  const maxDirectionSpread = Math.max(0, options.maxDirectionSpread ?? Number.POSITIVE_INFINITY);
  const directionBalance = clamp(options.directionBalance ?? 0, 0, 1);
  const words = normalizeWords(options.words).sort((a, b) => b.length - a.length);
  const rng = mulberry32(seed);
  const attempts = size * size * 4;
  let best: PuzzleCandidate | null = null;
  let bestMeetingRequirements: PuzzleCandidate | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const candidateGrid = createGrid(size);
    const candidatePlaced: PlacedWord[] = [];
    const directionUsage = emptyDirectionUsage();
    let failed = false;

    for (const word of words) {
      const candidates = allCandidates(candidateGrid, size, word, directions);
      if (candidates.length === 0) {
        failed = true;
        break;
      }
      const chosen = chooseCandidate(candidates, intersectionPreference, directionBalance, directionUsage, rng);
      candidatePlaced.push(placeWord(candidateGrid, word, chosen.start, chosen.direction));
      directionUsage[chosen.direction]++;
    }
    if (!failed) {
      const intersectionMetrics = measureIntersections(candidatePlaced);
      const candidate: PuzzleCandidate = {
        grid: candidateGrid,
        words: candidatePlaced,
        intersections: intersectionMetrics.intersections,
        intersectingWords: intersectionMetrics.intersectingWords,
        directionUsage,
        qualityScore: qualityScore(
          intersectionMetrics.intersections,
          intersectionMetrics.intersectingWords,
          directionUsage,
          directions,
          directionBalance,
        ),
      };
      if (!best || candidate.qualityScore > best.qualityScore) best = candidate;
      if (
        meetsRequirements(candidate, minIntersections, minIntersectingWords, maxDirectionSpread) &&
        (!bestMeetingRequirements || candidate.qualityScore > bestMeetingRequirements.qualityScore)
      ) {
        bestMeetingRequirements = candidate;
      }
    }
  }

  // Un mínimo eleva la calidad, pero nunca impide entregar una sopa válida.
  const selected = bestMeetingRequirements ?? best;
  if (!selected) throw new Error('Unable to generate puzzle');
  const { grid, words: placed, intersections, intersectingWords, directionUsage, qualityScore: selectedQuality } = selected;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] === '') {
        grid[row][col] = FILL_ALPHABET[Math.floor(rng() * FILL_ALPHABET.length)];
      }
    }
  }

  const puzzle: Puzzle = {
    size,
    grid,
    words: placed,
    stats: { intersections, intersectingWords, directionUsage, qualityScore: selectedQuality },
  };
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

function chooseCandidate(
  candidates: PlacementCandidate[],
  intersectionPreference: number,
  directionBalance: number,
  usage: DirectionUsage,
  rng: () => number,
): PlacementCandidate {
  const highestUsage = Math.max(...Object.values(usage));
  const weights = candidates.map((candidate) => {
    const intersectionWeight = intersectionPreference * candidate.intersections * 12;
    const directionBonus = directionBalance * (highestUsage - usage[candidate.direction] + 1) * 5;
    return 1 + intersectionWeight + directionBonus;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = rng() * total;
  for (let index = 0; index < candidates.length; index++) {
    cursor -= weights[index];
    if (cursor <= 0) return candidates[index];
  }
  return candidates[candidates.length - 1];
}

function emptyDirectionUsage(): DirectionUsage {
  return { RIGHT: 0, DOWN: 0, DIAGONAL_DOWN_RIGHT: 0 };
}

function qualityScore(
  intersections: number,
  intersectingWords: number,
  usage: DirectionUsage,
  directions: Direction[],
  directionBalance: number,
): number {
  const enabledUsage = directions.map((direction) => usage[direction]);
  const activeDirections = enabledUsage.filter((count) => count > 0).length;
  const spread = Math.max(...enabledUsage) - Math.min(...enabledUsage);
  return intersections * 100 + intersectingWords * 40 + directionBalance * (activeDirections * 30 - spread * 8);
}

function meetsRequirements(
  candidate: PuzzleCandidate,
  minIntersections: number,
  minIntersectingWords: number,
  maxDirectionSpread: number,
): boolean {
  return (
    candidate.intersections >= minIntersections &&
    candidate.intersectingWords >= minIntersectingWords &&
    directionSpread(candidate.directionUsage) <= maxDirectionSpread
  );
}

function directionSpread(usage: DirectionUsage): number {
  const values = Object.values(usage);
  return Math.max(...values) - Math.min(...values);
}

function measureIntersections(words: PlacedWord[]): { intersections: number; intersectingWords: number } {
  const cellOwners = new Map<string, number[]>();
  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    const delta = DIRECTION_DELTAS[word.direction];
    for (let step = 0; step < word.word.length; step++) {
      const key = `${word.start.row + delta.row * step},${word.start.col + delta.col * step}`;
      const owners = cellOwners.get(key) ?? [];
      owners.push(wordIndex);
      cellOwners.set(key, owners);
    }
  }

  let intersections = 0;
  const participants = new Set<number>();
  for (const owners of cellOwners.values()) {
    if (owners.length < 2) continue;
    intersections += owners.length - 1;
    owners.forEach((owner) => participants.add(owner));
  }
  return { intersections, intersectingWords: participants.size };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
