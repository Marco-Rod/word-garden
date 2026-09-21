import { describe, expect, it } from 'vitest';
import { generatePuzzle, type Direction } from './WordSearchGenerator';
import { matchSelection } from './wordDetection';

describe('generatePuzzle', () => {
  it('crea un grid cuadrado del tamaño indicado', () => {
    const puzzle = generatePuzzle({ size: 5, words: ['GATO', 'PERRO', 'OSO'], directions: ['right'], seed: 1 });
    expect(puzzle.grid).toHaveLength(5);
    expect(puzzle.grid.every((row) => row.length === 5)).toBe(true);
  });

  it('coloca todas las palabras y deja sus letras en el grid', () => {
    const puzzle = generatePuzzle({ size: 5, words: ['PERRO', 'GATO', 'OSO'], directions: ['right'], seed: 1 });
    expect(puzzle.words.map((w) => w.word).sort()).toEqual(['GATO', 'OSO', 'PERRO']);
    for (const placed of puzzle.words) {
      expect(placed.direction).toBe('right');
      expect(placed.cells).toHaveLength(placed.word.length);
      const letters = placed.cells.map((c) => puzzle.grid[c.row][c.col]).join('');
      expect(letters.toUpperCase()).toBe(placed.word.toUpperCase());
    }
  });

  it('con la misma semilla siempre genera la misma sopa', () => {
    const a = generatePuzzle({ size: 5, words: ['GATO', 'PERRO', 'OSO'], seed: 42 });
    const b = generatePuzzle({ size: 5, words: ['GATO', 'PERRO', 'OSO'], seed: 42 });
    expect(a.grid).toEqual(b.grid);
    expect(a.words.map((w) => `${w.word}@${w.start.row},${w.start.col}:${w.direction}`)).toEqual(
      b.words.map((w) => `${w.word}@${w.start.row},${w.start.col}:${w.direction}`),
    );
  });

  it('todas las palabras son resolubles seleccionando sus celdas en orden', () => {
    const puzzle = generatePuzzle({ size: 5, words: ['PERRO', 'GATO', 'OSO'], directions: ['right'], seed: 1 });
    expect(puzzle.words).toHaveLength(3);
    for (const placed of puzzle.words) {
      const found = matchSelection(placed.cells, puzzle.words);
      expect(found?.word).toBe(placed.word);
    }
  });

  it('maneja palabras en varias direcciones', () => {
    const directions: Direction[] = ['right', 'down', 'diagonal'];
    const puzzle = generatePuzzle({ size: 7, words: ['LUNA', 'SOL', 'PLAYA', 'RIO'], directions, seed: 99 });
    expect(puzzle.words).toHaveLength(4);
    const dirs = new Set(puzzle.words.map((w) => w.direction));
    expect(dirs.size).toBeGreaterThan(0);
  });

  it('lanza un error si la palabra no cabe por tamaño', () => {
    expect(() =>
      generatePuzzle({ size: 3, words: ['ELEFANTE'], directions: ['right'], seed: 1 }),
    ).toThrow();
  });
});

describe('matchSelection', () => {
  const puzzle = generatePuzzle({ size: 5, words: ['GATO', 'PERRO', 'OSO'], directions: ['right'], seed: 1 });
  const gato = puzzle.words.find((w) => w.word === 'GATO')!;

  it('devuelve la palabra cuando la selección coincide exactamente', () => {
    expect(matchSelection(gato.cells, puzzle.words)?.word).toBe('GATO');
  });

  it('no devuelve nada si la selección está en orden inverso', () => {
    expect(matchSelection([...gato.cells].reverse(), puzzle.words)).toBeUndefined();
  });

  it('no devuelve nada con selección vacía', () => {
    expect(matchSelection([], puzzle.words)).toBeUndefined();
  });

  it('no devuelve nada si el tamaño no coincide', () => {
    expect(matchSelection([gato.cells[0], gato.cells[1]], puzzle.words)).toBeUndefined();
  });
});