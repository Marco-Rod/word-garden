export type Direction = 'right' | 'down' | 'diagonal';

export const DIRECTION_DELTAS: Record<Direction, readonly [number, number]> = {
  right: [0, 1],
  down: [1, 0],
  diagonal: [1, 1],
};

export interface CellPosition {
  row: number;
  col: number;
}

export interface PlacedWord {
  word: string;
  start: CellPosition;
  direction: Direction;
  cells: CellPosition[];
}

export interface Puzzle {
  seed: number;
  size: number;
  grid: string[][];
  words: PlacedWord[];
}

export interface PuzzleOptions {
  size: number;
  words: string[];
  directions?: Direction[];
  seed?: number;
}

const FILL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeWords(words: string[]): string[] {
  return words.map((word) => word.toUpperCase().replace(/\s+/g, ''));
}

function createGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array<string>(size).fill(''));
}

export function generatePuzzle(options: PuzzleOptions): Puzzle {
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000);
  const rng = mulberry32(seed);
  const size = options.size;
  const directions = options.directions ?? ['right'];
  const words = normalizeWords(options.words).sort((a, b) => b.length - a.length);
  const grid = createGrid(size);
  const placed: PlacedWord[] = [];

  const canPlace = (word: string, row: number, col: number, delta: readonly [number, number]): boolean => {
    for (let i = 0; i < word.length; i++) {
      const r = row + delta[0] * i;
      const c = col + delta[1] * i;
      if (r < 0 || r >= size || c < 0 || c >= size) return false;
      const cell = grid[r][c];
      if (cell !== '' && cell !== word[i]) return false;
    }
    return true;
  };

  for (const word of words) {
    let placedWord: PlacedWord | null = null;
    const attempts = size * size * 4;

    for (let attempt = 0; attempt < attempts && placedWord === null; attempt++) {
      const direction = directions[Math.floor(rng() * directions.length)];
      const delta = DIRECTION_DELTAS[direction];
      const maxStartRow = size - delta[0] * (word.length - 1);
      const maxStartCol = size - delta[1] * (word.length - 1);
      if (maxStartRow <= 0 || maxStartCol <= 0) continue;

      const row = Math.floor(rng() * maxStartRow);
      const col = Math.floor(rng() * maxStartCol);
      if (!canPlace(word, row, col, delta)) continue;

      const cells: CellPosition[] = [];
      for (let i = 0; i < word.length; i++) {
        const r = row + delta[0] * i;
        const c = col + delta[1] * i;
        grid[r][c] = word[i];
        cells.push({ row: r, col: c });
      }
      placedWord = { word, start: { row, col }, direction, cells };
    }

    if (placedWord === null) {
      throw new Error(`No se pudo colocar la palabra "${word}" en una sopa de ${size}x${size}`);
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

  return { seed, size, grid, words: placed };
}