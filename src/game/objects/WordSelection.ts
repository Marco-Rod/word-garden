import { DIRECTION_DELTAS } from '../../core/puzzle/directions';
import { bestAllowedDirection, cellPrefixSteps, projectGesture } from '../../core/puzzle/gesture';
import type { Direction } from '../../core/puzzle/types';
import type { LetterTile } from './LetterTile';

export const SELECTION_TOLERANCE_CELLS = 0.7;

export class WordSelection {
  private origin: LetterTile | null = null;
  private locked: Direction | null = null;
  private selected: LetterTile[] = [];

  constructor(
    private readonly grid: LetterTile[][],
    private readonly allowedDirections: Direction[],
    private readonly cellSize: number,
    private readonly maxSteps: number,
    private readonly toleranceCells = SELECTION_TOLERANCE_CELLS,
  ) {}

  get tiles(): readonly LetterTile[] {
    return this.selected;
  }

  get length(): number {
    return this.selected.length;
  }

  get isLocked(): boolean {
    return this.locked !== null;
  }

  isActive(): boolean {
    return this.selected.length > 0;
  }

  startAt(tile: LetterTile): void {
    this.clear();
    if (tile.getTileState() === 'found') return;
    this.origin = tile;
    tile.setTileState('selected');
    this.selected.push(tile);
  }

  moveTo(worldX: number, worldY: number): void {
    if (!this.origin) return;
    const origin = this.origin;

    const dRow = worldY - origin.y;
    const dCol = worldX - origin.x;

    let dir = this.locked;
    if (!dir) {
      const snapped = bestAllowedDirection(this.allowedDirections, dRow, dCol);
      if (!snapped) return;
      this.locked = snapped;
      dir = snapped;
    }

    let projection = projectGesture(dir, dRow, dCol);
    if (projection.perp / this.cellSize > this.toleranceCells) return;

    let steps = this.clampByFoundAndEdges(
      origin,
      dir,
      cellPrefixSteps(projection.t / this.cellSize, this.maxSteps),
    );

    if (steps === 0 && this.locked === dir) {
      const alt = bestAllowedDirection(this.allowedDirections, dRow, dCol);
      if (alt && alt !== dir) {
        this.locked = alt;
        dir = alt;
        projection = projectGesture(alt, dRow, dCol);
        if (projection.perp / this.cellSize <= this.toleranceCells) {
          steps = this.clampByFoundAndEdges(
            origin,
            dir,
            cellPrefixSteps(projection.t / this.cellSize, this.maxSteps),
          );
        }
      }
    }

    this.applyPrefix(origin, dir, steps);
  }

  clear(): void {
    for (const tile of this.selected) {
      if (tile.getTileState() === 'selected') tile.setTileState('idle');
    }
    this.selected = [];
    this.origin = null;
    this.locked = null;
  }

  private clampByFoundAndEdges(origin: LetterTile, dir: Direction, steps: number): number {
    const delta = DIRECTION_DELTAS[dir];
    let cap = steps;
    for (let k = 1; k <= steps; k++) {
      const tile = this.grid[origin.row + delta.row * k]?.[origin.col + delta.col * k];
      if (!tile || tile.getTileState() === 'found') {
        cap = Math.min(cap, k - 1);
        break;
      }
    }
    return cap;
  }

  private applyPrefix(origin: LetterTile, dir: Direction, steps: number): void {
    const delta = DIRECTION_DELTAS[dir];
    const desired: LetterTile[] = [];
    for (let k = 0; k <= steps; k++) {
      const tile = this.grid[origin.row + delta.row * k]?.[origin.col + delta.col * k];
      if (!tile) break;
      desired.push(tile);
    }

    const old = this.selected;
    const oldSet = new Set(old);
    const desiredSet = new Set(desired);
    for (const tile of old) {
      if (!desiredSet.has(tile) && tile.getTileState() === 'selected') tile.setTileState('idle');
    }
    for (const tile of desired) {
      if (!oldSet.has(tile) && tile.getTileState() !== 'found') tile.setTileState('selected');
    }
    this.selected = desired;
  }
}