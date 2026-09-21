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
    this.origin = tile;
    // Una letra encontrada puede pertenecer a otra palabra cruzada. La
    // conservamos verde, pero permitimos iniciar una selección desde ella.
    if (tile.getTileState() !== 'found') tile.setTileState('selected');
    this.selected.push(tile);
  }

  moveTo(worldX: number, worldY: number): void {
    if (!this.origin) return;
    const origin = this.origin;

    const dRow = worldY - origin.y;
    const dCol = worldX - origin.x;

    // Un dedo raramente inicia un arrastre en la dirección exacta. Recalculamos
    // la previsualización desde el origen para que un micro-movimiento inicial
    // no bloquee permanentemente una palabra horizontal, vertical o diagonal.
    const dir = bestAllowedDirection(this.allowedDirections, dRow, dCol);
    if (!dir) return;
    this.locked = dir;

    const projection = projectGesture(dir, dRow, dCol);
    if (projection.perp / this.cellSize > this.toleranceCells) return;

    const delta = DIRECTION_DELTAS[dir];
    // La proyección usa un vector unitario. En diagonal, un paso de celda
    // mide √2 × cellSize; sin esta normalización dos pasos se redondeaban a
    // tres y palabras como SOL nunca coincidían exactamente.
    const stepDistance = this.cellSize * Math.hypot(delta.row, delta.col);
    const steps = this.clampByEdges(origin, dir, cellPrefixSteps(projection.t / stepDistance, this.maxSteps));

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

  private clampByEdges(origin: LetterTile, dir: Direction, steps: number): number {
    const delta = DIRECTION_DELTAS[dir];
    let cap = steps;
    for (let k = 1; k <= steps; k++) {
      const tile = this.grid[origin.row + delta.row * k]?.[origin.col + delta.col * k];
      // Las letras encontradas son transitables: pueden ser el cruce de una
      // palabra pendiente. Solo el borde limita el arrastre.
      if (!tile) {
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
