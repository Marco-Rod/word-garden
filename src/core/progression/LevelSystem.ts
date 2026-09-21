import type { LevelDefinition } from '../puzzle/types';

export class LevelSystem {
  private readonly byId: ReadonlyMap<number, LevelDefinition>;

  constructor(private readonly levels: readonly LevelDefinition[]) {
    if (levels.length === 0) throw new Error('LevelSystem requires at least one level');
    this.byId = new Map(levels.map((level) => [level.id, level]));
    if (this.byId.size !== levels.length) throw new Error('Level ids must be unique');
  }

  all(): readonly LevelDefinition[] {
    return this.levels;
  }

  get(levelId: number): LevelDefinition | undefined {
    return this.byId.get(levelId);
  }

  next(levelId: number): LevelDefinition | undefined {
    const index = this.levels.findIndex((level) => level.id === levelId);
    return index < 0 ? undefined : this.levels[index + 1];
  }
}
