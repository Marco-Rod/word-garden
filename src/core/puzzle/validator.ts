import type { Puzzle } from './types';
import { DIRECTION_DELTAS } from './directions';

export function validatePuzzle(puzzle: Puzzle): boolean {
  const { size, grid, words } = puzzle;

  if (!grid || grid.length !== size) return false;

  for (const row of grid) {
    if (!row || row.length !== size) return false;
    for (const letter of row) {
      if (letter === '' || letter === undefined || letter === null) return false;
    }
  }

  for (const placed of words) {
    const delta = DIRECTION_DELTAS[placed.direction];
    if (!delta) return false;

    const expectedEndRow = placed.start.row + delta.row * (placed.word.length - 1);
    const expectedEndCol = placed.start.col + delta.col * (placed.word.length - 1);
    if (expectedEndRow !== placed.end.row || expectedEndCol !== placed.end.col) return false;

    for (let i = 0; i < placed.word.length; i++) {
      const row = placed.start.row + delta.row * i;
      const col = placed.start.col + delta.col * i;
      if (row < 0 || row >= size || col < 0 || col >= size) return false;
      if (grid[row][col] !== placed.word[i]) return false;
    }
  }

  return true;
}