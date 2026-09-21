import type { CellPosition, PlacedWord } from './WordSearchGenerator';

export function matchSelection(selection: CellPosition[], words: PlacedWord[]): PlacedWord | undefined {
  if (selection.length === 0) return undefined;
  return words.find(
    (placed) =>
      placed.cells.length === selection.length &&
      placed.cells.every((cell, i) => cell.row === selection[i].row && cell.col === selection[i].col),
  );
}