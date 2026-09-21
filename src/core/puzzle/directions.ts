import type { Direction, Position } from './types';

export const DIRECTION_DELTAS: Record<Direction, Position> = {
  RIGHT: { row: 0, col: 1 },
  DOWN: { row: 1, col: 0 },
  DIAGONAL_DOWN_RIGHT: { row: 1, col: 1 },
};