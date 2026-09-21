import type { LevelDefinition } from '../../core/puzzle/types';
import { calculateEfficiency, calculateScore } from '../../core/scoring/ScoreSystem';
import { calculateStars } from '../../core/progression/StarSystem';

export interface GameSessionResult {
  levelId: number;
  elapsedSeconds: number;
  errors: number;
  foundWords: string[];
  efficiency: number;
  score: number;
  stars: number;
}

export function targetSecondsForLevel(level: LevelDefinition): number {
  return 30 + level.size * 3 + level.words.length * 10;
}

export class GameSession {
  private readonly found = new Set<string>();
  private startedAt: number | null = null;
  private errors = 0;
  private completed = false;

  constructor(private readonly level: LevelDefinition) {}

  start(timestamp = Date.now()): void {
    if (this.startedAt !== null) throw new Error('Session has already started');
    this.startedAt = timestamp;
  }

  wordFound(word: string): boolean {
    this.requireActive();
    if (!this.level.words.includes(word) || this.found.has(word)) return false;
    this.found.add(word);
    return true;
  }

  registerError(): void {
    this.requireActive();
    this.errors++;
  }

  complete(timestamp = Date.now()): GameSessionResult {
    this.requireActive();
    if (this.found.size !== this.level.words.length) {
      throw new Error('Cannot complete before finding every word');
    }
    this.completed = true;
    const elapsedSeconds = Math.max(0, (timestamp - this.startedAt!) / 1000);
    const efficiency = calculateEfficiency(elapsedSeconds, targetSecondsForLevel(this.level));
    const score = calculateScore({
      wordLengths: this.level.words.map((word) => word.length),
      errors: this.errors,
      elapsedSeconds,
      targetSeconds: targetSecondsForLevel(this.level),
    });
    return {
      levelId: this.level.id,
      elapsedSeconds,
      errors: this.errors,
      foundWords: [...this.found],
      efficiency,
      score: score.total,
      stars: calculateStars({ completed: true, errors: this.errors, efficiency }),
    };
  }

  private requireActive(): void {
    if (this.startedAt === null) throw new Error('Session has not started');
    if (this.completed) throw new Error('Session has already completed');
  }
}
