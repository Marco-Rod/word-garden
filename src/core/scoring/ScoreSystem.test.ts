import { describe, expect, it } from 'vitest';
import { calculateEfficiency, calculateScore } from './ScoreSystem';

describe('calculateEfficiency', () => {
  it('only grants a bonus for finishing before the target time', () => {
    expect(calculateEfficiency(30, 60)).toBe(0.5);
    expect(calculateEfficiency(60, 60)).toBe(0);
    expect(calculateEfficiency(90, 60)).toBe(0);
  });
});

describe('calculateScore', () => {
  it('adds word, completion, perfect and efficiency points deterministically', () => {
    expect(calculateScore({ wordLengths: [4, 5, 3], errors: 0, elapsedSeconds: 30, targetSeconds: 60 })).toEqual({
      words: 420,
      completion: 500,
      perfect: 300,
      efficiency: 250,
      total: 1470,
    });
  });

  it('does not penalize a slower game or errors with negative points', () => {
    const score = calculateScore({ wordLengths: [3], errors: 1, elapsedSeconds: 90, targetSeconds: 60 });
    expect(score).toMatchObject({ words: 130, completion: 500, perfect: 0, efficiency: 0, total: 630 });
  });
});
