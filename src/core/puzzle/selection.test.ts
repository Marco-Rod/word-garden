import { describe, expect, it } from 'vitest';
import { generatePuzzle } from './generator';
import { matchSelection, wordCells } from './selection';
import type { Direction } from './types';

const LEVEL_1 = { size: 5, words: ['GATO', 'OSO', 'PATO'], directions: ['RIGHT'] as Direction[], seed: 1001 };

describe('matchSelection', () => {
  const puzzle = generatePuzzle(LEVEL_1);
  const gato = puzzle.words.find((w) => w.word === 'GATO');

  it('returns the word when the selection matches exactly', () => {
    expect(gato).toBeDefined();
    expect(matchSelection(wordCells(gato!), puzzle.words)?.word).toBe('GATO');
  });

  it('returns undefined when the selection is in reverse order', () => {
    expect(matchSelection(wordCells(gato!).reverse(), puzzle.words)).toBeUndefined();
  });

  it('returns undefined on an empty selection', () => {
    expect(matchSelection([], puzzle.words)).toBeUndefined();
  });

  it('returns undefined when lengths differ', () => {
    const cells = wordCells(gato!);
    expect(matchSelection([cells[0], cells[1]], puzzle.words)).toBeUndefined();
  });
});