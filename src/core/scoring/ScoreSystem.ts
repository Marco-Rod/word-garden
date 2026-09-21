export interface ScoreInput {
  wordLengths: readonly number[];
  errors: number;
  elapsedSeconds: number;
  targetSeconds: number;
}

export interface ScoreBreakdown {
  words: number;
  completion: number;
  perfect: number;
  efficiency: number;
  total: number;
}

export const SCORE_PER_WORD = 100;
export const SCORE_PER_LETTER = 10;
export const COMPLETION_BONUS = 500;
export const PERFECT_BONUS = 300;
export const MAX_EFFICIENCY_BONUS = 500;

export function calculateEfficiency(elapsedSeconds: number, targetSeconds: number): number {
  if (targetSeconds <= 0) return 0;
  return Math.max(0, Math.min(1, (targetSeconds - elapsedSeconds) / targetSeconds));
}

export function calculateScore(input: ScoreInput): ScoreBreakdown {
  const words = input.wordLengths.reduce((total, length) => total + SCORE_PER_WORD + length * SCORE_PER_LETTER, 0);
  const efficiency = Math.round(calculateEfficiency(input.elapsedSeconds, input.targetSeconds) * MAX_EFFICIENCY_BONUS);
  const perfect = input.errors === 0 ? PERFECT_BONUS : 0;
  const completion = COMPLETION_BONUS;
  return { words, completion, perfect, efficiency, total: words + completion + perfect + efficiency };
}
