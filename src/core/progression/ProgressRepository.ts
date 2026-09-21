export type Stars = 0 | 1 | 2 | 3;

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  bestStars: Stars;
  bestScore: number;
  bestTimeSeconds?: number;
}

export interface PlayerProgress {
  version: 1;
  highestUnlockedLevel: number;
  levels: Record<number, LevelProgress>;
}

export interface ProgressRepository {
  load(): PlayerProgress | null;
  save(progress: PlayerProgress): void;
}

export const PROGRESS_STORAGE_KEY = 'word-garden-progress-v1';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class LocalStorageProgressRepository implements ProgressRepository {
  constructor(
    private readonly storage: StorageLike | null = typeof localStorage === 'undefined' ? null : localStorage,
    private readonly key = PROGRESS_STORAGE_KEY,
  ) {}

  load(): PlayerProgress | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (!isPlayerProgress(value)) return null;
      return value;
    } catch {
      return null;
    }
  }

  save(progress: PlayerProgress): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.key, JSON.stringify(progress));
    } catch {
      // El juego sigue funcionando aunque el navegador no permita guardar.
    }
  }
}

function isPlayerProgress(value: unknown): value is PlayerProgress {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PlayerProgress>;
  return candidate.version === 1 && typeof candidate.highestUnlockedLevel === 'number' && !!candidate.levels && typeof candidate.levels === 'object';
}
