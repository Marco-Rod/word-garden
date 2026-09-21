import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../data/levels';
import { LevelSystem } from './LevelSystem';
import { ProgressSystem } from './ProgressSystem';
import { LocalStorageProgressRepository, type PlayerProgress, type ProgressRepository } from './ProgressRepository';

class MemoryRepository implements ProgressRepository {
  value: PlayerProgress | null = null;
  load(): PlayerProgress | null { return this.value; }
  save(progress: PlayerProgress): void { this.value = JSON.parse(JSON.stringify(progress)) as PlayerProgress; }
}

const complete = (system: ProgressSystem, levelId: number, stars = 3, score = 1_800, elapsedSeconds = 40): PlayerProgress =>
  system.completeLevel({ levelId, stars: stars as 0 | 1 | 2 | 3, score, elapsedSeconds });

describe('ProgressSystem', () => {
  it('starts with only level 1 unlocked', () => {
    const system = new ProgressSystem(new LevelSystem(LEVELS), new MemoryRepository());
    expect(system.isUnlocked(1)).toBe(true);
    expect(system.isUnlocked(2)).toBe(false);
    expect(system.totalStars()).toBe(0);
  });

  it('records independent best records and unlocks the following level', () => {
    const system = new ProgressSystem(new LevelSystem(LEVELS), new MemoryRepository());
    complete(system, 1, 3, 1_800, 40);
    complete(system, 1, 1, 1_200, 55);
    complete(system, 1, 2, 2_100, 35);
    expect(system.isUnlocked(2)).toBe(true);
    expect(system.level(1)).toEqual({ levelId: 1, completed: true, bestStars: 3, bestScore: 2_100, bestTimeSeconds: 35 });
  });

  it('does not unlock a level after the final level', () => {
    const system = new ProgressSystem(new LevelSystem(LEVELS), new MemoryRepository());
    for (const level of LEVELS) complete(system, level.id);
    expect(system.snapshot().highestUnlockedLevel).toBe(10);
    expect(system.isUnlocked(11)).toBe(false);
  });

  it('rejects attempts to start a locked level', () => {
    const system = new ProgressSystem(new LevelSystem(LEVELS), new MemoryRepository());
    expect(() => complete(system, 2)).toThrow('Level 2 is locked');
  });

  it('persists and reloads the exact progress', () => {
    const repository = new MemoryRepository();
    const first = new ProgressSystem(new LevelSystem(LEVELS), repository);
    complete(first, 1, 2, 1_400, 42);
    expect(new ProgressSystem(new LevelSystem(LEVELS), repository).snapshot()).toEqual(first.snapshot());
  });
});

describe('LocalStorageProgressRepository', () => {
  it('falls back safely for corrupt and unknown-version saved data', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    values.set('progress', '{bad json');
    expect(new LocalStorageProgressRepository(storage, 'progress').load()).toBeNull();
    values.set('progress', JSON.stringify({ version: 2, highestUnlockedLevel: 10, levels: {} }));
    expect(new LocalStorageProgressRepository(storage, 'progress').load()).toBeNull();
  });
});
