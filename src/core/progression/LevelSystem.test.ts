import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../data/levels';
import { LEVEL_THEMES, themeForLevel } from '../../data/themes';
import { generatePuzzle } from '../puzzle/generator';
import { LevelSystem } from './LevelSystem';

describe('LevelSystem', () => {
  const system = new LevelSystem(LEVELS);

  it('provides the one hundred ordered levels', () => {
    expect(system.all().map((level) => level.id)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(system.get(1)?.size).toBe(5);
    expect(system.get(100)?.size).toBe(9);
  });

  it('introduces one mechanic at a time through tutorial levels', () => {
    expect(system.get(1)?.tutorial?.type).toBe('horizontal');
    expect(system.get(3)?.directions).toEqual(['DOWN']);
    expect(system.get(4)?.tutorial?.type).toBe('horizontal-vertical');
    expect(system.get(5)).toMatchObject({ allowIntersections: true, minIntersections: 1, tutorial: { type: 'intersection' } });
    expect(system.get(7)).toMatchObject({ directions: ['DIAGONAL_DOWN_RIGHT'], allowIntersections: false });
    expect(system.get(8)?.tutorial?.type).toBe('all-directions');
    expect(system.get(10)?.tutorial?.type).toBe('final-challenge');
  });

  it('finds the next level and ends after level 100', () => {
    expect(system.next(1)?.id).toBe(2);
    expect(system.next(10)?.id).toBe(11);
    expect(system.next(20)?.id).toBe(21);
    expect(system.next(100)).toBeUndefined();
    expect(system.next(99)?.id).toBe(100);
  });

  it('groups content into five-level themes and keeps expansion grids at 8×8 or 9×9', () => {
    expect(LEVEL_THEMES).toHaveLength(20);
    expect(themeForLevel(11)?.id).toBe('forest');
    expect(themeForLevel(16)?.id).toBe('space');
    expect(themeForLevel(100)?.id).toBe('final');
    for (const level of system.all().filter((level) => level.id >= 11)) expect(level.size).toBeGreaterThanOrEqual(8);
    for (const level of system.all().filter((level) => level.id >= 11)) expect(level.size).toBeLessThanOrEqual(9);
  });

  it('contains puzzle definitions that can be generated deterministically', () => {
    for (const level of system.all()) {
      let puzzle;
      try { puzzle = generatePuzzle(level); } catch { throw new Error(`level ${level.id} could not generate`); }
      expect(puzzle.words).toHaveLength(level.words.length);
    }
  });

  it('meets the official minimum intersections from levels 5 to 10', () => {
    for (const level of system.all().filter((candidate) => candidate.id >= 5 && candidate.id <= 20)) {
      const puzzle = generatePuzzle(level);
      expect(puzzle.stats.intersections, `level ${level.id}`).toBeGreaterThanOrEqual(level.minIntersections);
    }
  });

  it('uses every enabled direction in the advanced official levels', () => {
    for (const level of system.all().filter((candidate) => candidate.id >= 8 && candidate.id <= 20)) {
      const usage = generatePuzzle(level).stats.directionUsage;
      for (const direction of level.directions) {
        expect(usage[direction], `level ${level.id}: ${direction}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('meets the advanced composition requirements for intersections and spread', () => {
    for (const level of system.all().filter((candidate) => candidate.id >= 8 && candidate.id <= 20)) {
      const stats = generatePuzzle(level).stats;
      expect(stats.intersectingWords, `level ${level.id}`).toBeGreaterThanOrEqual(level.minIntersectingWords!);
      const usage = level.directions.map((direction) => stats.directionUsage[direction]);
      expect(Math.max(...usage) - Math.min(...usage), `level ${level.id}`).toBeLessThanOrEqual(level.maxDirectionSpread!);
    }
  });
});
