import type { LetterTile } from './LetterTile';

export class WordSelection {
  private selected: LetterTile[] = [];

  constructor(private readonly grid: LetterTile[][]) {}

  get tiles(): readonly LetterTile[] {
    return this.selected;
  }

  get length(): number {
    return this.selected.length;
  }

  get last(): LetterTile | undefined {
    return this.selected[this.selected.length - 1];
  }

  isActive(): boolean {
    return this.selected.length > 0;
  }

  startAt(tile: LetterTile): void {
    this.clear();
    if (tile.getTileState() === 'found') return;
    tile.setTileState('selected');
    this.selected.push(tile);
  }

  extendTo(target: LetterTile): void {
    const last = this.selected[this.selected.length - 1];
    if (!last || target === last) return;

    const existing = this.selected.indexOf(target);
    if (existing !== -1) {
      this.trimTo(existing);
      return;
    }

    let dirRow: number;
    let dirCol: number;
    if (this.selected.length >= 2) {
      const prev = this.selected[this.selected.length - 2];
      dirRow = last.row - prev.row;
      dirCol = last.col - prev.col;
    } else {
      dirRow = Math.sign(target.row - last.row);
      dirCol = Math.sign(target.col - last.col);
    }

    const steps = this.stepsAlongRay(last, target, dirRow, dirCol);
    if (steps === null) return;

    let current = last;
    for (let step = 0; step < steps; step++) {
      const next = this.grid[current.row + dirRow]?.[current.col + dirCol];
      if (!next || next.getTileState() === 'found') return;
      next.setTileState('selected');
      this.selected.push(next);
      current = next;
    }
  }

  clear(): void {
    for (const tile of this.selected) {
      if (tile.getTileState() === 'selected') tile.setTileState('idle');
    }
    this.selected = [];
  }

  private stepsAlongRay(
    from: LetterTile,
    to: LetterTile,
    dirRow: number,
    dirCol: number,
  ): number | null {
    if (dirRow === 0 && dirCol === 0) return null;

    let steps: number;
    if (dirRow !== 0) {
      const dr = to.row - from.row;
      if (dr % dirRow !== 0) return null;
      steps = dr / dirRow;
      if (to.col !== from.col + steps * dirCol) return null;
    } else {
      if (to.row !== from.row) return null;
      const dc = to.col - from.col;
      if (dc % dirCol !== 0) return null;
      steps = dc / dirCol;
    }

    return steps > 0 ? steps : null;
  }

  private trimTo(index: number): void {
    const removed = this.selected.splice(index + 1);
    for (const tile of removed) {
      if (tile.getTileState() === 'selected') tile.setTileState('idle');
    }
  }
}