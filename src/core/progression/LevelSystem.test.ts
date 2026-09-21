import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../data/levels';
import { generatePuzzle } from '../puzzle/generator';
import { LevelSystem } from './LevelSystem';

describe('LevelSystem', () => {
  const system = new LevelSystem(LEVELS);

  it('provides the ten ordered levels', () => {
    expect(system.all().map((level) => level.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(system.get(1)?.size).toBe(5);
    expect(system.get(10)?.size).toBe(8);
  });

  it('finds the next level and ends after level 10', () => {
    expect(system.next(1)?.id).toBe(2);
    expect(system.next(10)).toBeUndefined();
    expect(system.next(99)).toBeUndefined();
  });

  it('contains puzzle definitions that can be generated deterministically', () => {
    for (const level of system.all()) {
      const puzzle = generatePuzzle(level);
      expect(puzzle.words).toHaveLength(level.words.length);
    }
  });

  it('introduces intersections across the official mid-game levels', () => {
    const intersections = system.all()
      .filter((candidate) => candidate.id >= 5)
      .map((level) => generatePuzzle(level).stats.intersections);
    expect(intersections.some((count) => count > 0)).toBe(true);
    expect(intersections[intersections.length - 1]).toBeGreaterThan(0);
  });
});
