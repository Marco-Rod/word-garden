import type { LevelSystem } from './LevelSystem';
import type { LevelProgress, PlayerProgress, ProgressRepository, Stars } from './ProgressRepository';

export interface CompleteLevelInput {
  levelId: number;
  stars: Stars;
  score: number;
  elapsedSeconds: number;
}

export function createInitialProgress(): PlayerProgress {
  return { version: 1, highestUnlockedLevel: 1, levels: {} };
}

export class ProgressSystem {
  private progress: PlayerProgress;

  constructor(
    private readonly levelSystem: LevelSystem,
    private readonly repository: ProgressRepository,
  ) {
    this.progress = this.normalize(repository.load());
  }

  snapshot(): PlayerProgress {
    return clone(this.progress);
  }

  isUnlocked(levelId: number): boolean {
    return !!this.levelSystem.get(levelId) && levelId <= this.progress.highestUnlockedLevel;
  }

  level(levelId: number): LevelProgress {
    const saved = this.progress.levels[levelId];
    return saved ? { ...saved } : emptyLevelProgress(levelId);
  }

  totalStars(): number {
    return Object.values(this.progress.levels).reduce((total, level) => total + level.bestStars, 0);
  }

  completeLevel(input: CompleteLevelInput): PlayerProgress {
    if (!this.isUnlocked(input.levelId)) throw new Error(`Level ${input.levelId} is locked`);
    const current = this.level(input.levelId);
    const next: LevelProgress = {
      levelId: input.levelId,
      completed: true,
      bestStars: Math.max(current.bestStars, input.stars) as Stars,
      bestScore: Math.max(current.bestScore, Math.max(0, input.score)),
      ...(bestTime(current.bestTimeSeconds, input.elapsedSeconds) !== undefined
        ? { bestTimeSeconds: bestTime(current.bestTimeSeconds, input.elapsedSeconds) }
        : {}),
    };
    this.progress.levels[input.levelId] = next;
    const following = this.levelSystem.next(input.levelId);
    if (following) this.progress.highestUnlockedLevel = Math.max(this.progress.highestUnlockedLevel, following.id);
    this.persist();
    return this.snapshot();
  }

  private normalize(loaded: PlayerProgress | null): PlayerProgress {
    if (!loaded) return createInitialProgress();
    const highest = Math.min(
      Math.max(1, Math.floor(loaded.highestUnlockedLevel)),
      this.levelSystem.all()[this.levelSystem.all().length - 1].id,
    );
    const levels: Record<number, LevelProgress> = {};
    for (const definition of this.levelSystem.all()) {
      const saved = loaded.levels[definition.id];
      if (!saved || saved.levelId !== definition.id || !saved.completed) continue;
      levels[definition.id] = {
        levelId: definition.id,
        completed: true,
        bestStars: validStars(saved.bestStars) ? saved.bestStars : 0,
        bestScore: finiteNonNegative(saved.bestScore),
        ...(typeof saved.bestTimeSeconds === 'number' && saved.bestTimeSeconds >= 0 && Number.isFinite(saved.bestTimeSeconds)
          ? { bestTimeSeconds: saved.bestTimeSeconds }
          : {}),
      };
    }
    return { version: 1, highestUnlockedLevel: highest, levels };
  }

  private persist(): void {
    this.repository.save(this.snapshot());
  }
}

function emptyLevelProgress(levelId: number): LevelProgress {
  return { levelId, completed: false, bestStars: 0, bestScore: 0 };
}

function bestTime(previous: number | undefined, elapsed: number): number | undefined {
  if (!Number.isFinite(elapsed) || elapsed < 0) return previous;
  return previous === undefined ? elapsed : Math.min(previous, elapsed);
}

function validStars(value: unknown): value is Stars {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function finiteNonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clone(progress: PlayerProgress): PlayerProgress {
  return JSON.parse(JSON.stringify(progress)) as PlayerProgress;
}
