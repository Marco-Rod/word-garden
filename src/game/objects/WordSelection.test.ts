import { describe, expect, it } from 'vitest';
import type { LetterTile, TileState } from './LetterTile';
import { WordSelection } from './WordSelection';

function tile(row: number, col: number, state: TileState = 'idle'): LetterTile {
  let current = state;
  return {
    row,
    col,
    x: col * 50,
    y: row * 50,
    getTileState: () => current,
    setTileState: (next: TileState) => {
      current = next;
    },
  } as unknown as LetterTile;
}

describe('WordSelection intersections', () => {
  it('can pass through a found letter to select a crossing word', () => {
    const grid = [[tile(0, 0), tile(0, 1, 'found'), tile(0, 2), tile(0, 3)]];
    const selection = new WordSelection(grid, ['RIGHT'], 50, 3);

    selection.startAt(grid[0][0]);
    selection.moveTo(150, 0);

    expect(selection.tiles.map((candidate) => candidate.col)).toEqual([0, 1, 2, 3]);
    expect(grid[0][1].getTileState()).toBe('found');
  });

  it('can start a new crossing word on a found letter', () => {
    const grid = [[tile(0, 0, 'found'), tile(0, 1), tile(0, 2)]];
    const selection = new WordSelection(grid, ['RIGHT'], 50, 2);

    selection.startAt(grid[0][0]);
    selection.moveTo(100, 0);

    expect(selection.tiles.map((candidate) => candidate.col)).toEqual([0, 1, 2]);
    expect(grid[0][0].getTileState()).toBe('found');
  });

  it('corrects an early wobble when the final gesture points to another direction', () => {
    const grid = [
      [tile(0, 0), tile(0, 1), tile(0, 2)],
      [tile(1, 0), tile(1, 1), tile(1, 2)],
      [tile(2, 0), tile(2, 1), tile(2, 2)],
    ];
    const selection = new WordSelection(grid, ['RIGHT', 'DOWN'], 50, 2);

    selection.startAt(grid[0][0]);
    selection.moveTo(55, 15);
    selection.moveTo(10, 100);

    expect(selection.tiles.map((candidate) => [candidate.row, candidate.col])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
  });

  it('selects the exact number of diagonal cells', () => {
    const grid = [
      [tile(0, 0), tile(0, 1), tile(0, 2)],
      [tile(1, 0), tile(1, 1), tile(1, 2)],
      [tile(2, 0), tile(2, 1), tile(2, 2)],
    ];
    const selection = new WordSelection(grid, ['DIAGONAL_DOWN_RIGHT'], 50, 2);

    selection.startAt(grid[0][0]);
    selection.moveTo(100, 100);

    expect(selection.tiles.map((candidate) => [candidate.row, candidate.col])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });
});
