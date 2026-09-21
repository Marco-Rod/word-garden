import type { PlacedWord, Position } from './types';
import { DIRECTION_DELTAS } from './directions';

export function wordCells(placed: PlacedWord): Position[] {
  const delta = DIRECTION_DELTAS[placed.direction];
  return Array.from({ length: placed.word.length }, (_, i) => ({
    row: placed.start.row + delta.row * i,
    col: placed.start.col + delta.col * i,
  }));
}

export function matchSelection(selection: Position[], words: PlacedWord[]): PlacedWord | undefined {
  if (selection.length === 0) return undefined;
  return words.find((placed) => {
    const cells = wordCells(placed);
    return (
      cells.length === selection.length &&
      cells.every((cell, i) => cell.row === selection[i].row && cell.col === selection[i].col)
    );
  });
}