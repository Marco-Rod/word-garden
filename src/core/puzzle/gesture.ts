import { DIRECTION_DELTAS } from './directions';
import type { Direction } from './types';

export const INTENT_THRESHOLD_CELLS = 0.5;

export interface UnitDir {
  row: number;
  col: number;
}

const UNITS: Record<Direction, UnitDir> = (() => {
  const out = {} as Record<Direction, UnitDir>;
  (Object.keys(DIRECTION_DELTAS) as Direction[]).forEach((dir) => {
    const d = DIRECTION_DELTAS[dir];
    const norm = Math.hypot(d.row, d.col);
    out[dir] = { row: d.row / norm, col: d.col / norm };
  });
  return out;
})();

export function unitDirection(dir: Direction): UnitDir {
  return UNITS[dir];
}

export function bestAllowedDirection(
  allowed: Direction[],
  dr: number,
  dc: number,
  minProjection = INTENT_THRESHOLD_CELLS,
): Direction | null {
  let best: Direction | null = null;
  let bestScore = -Infinity;
  for (const dir of allowed) {
    const u = UNITS[dir];
    const score = dr * u.row + dc * u.col;
    if (score > bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  return best !== null && bestScore >= minProjection ? best : null;
}

export interface Projection {
  t: number;
  perp: number;
}

export function projectGesture(dir: Direction, dr: number, dc: number): Projection {
  const u = UNITS[dir];
  return {
    t: dr * u.row + dc * u.col,
    perp: Math.abs(dr * u.col - dc * u.row),
  };
}

export function cellPrefixSteps(tInCells: number, cap: number): number {
  if (!Number.isFinite(tInCells)) return 0;
  return Math.max(0, Math.min(cap, Math.round(tInCells)));
}