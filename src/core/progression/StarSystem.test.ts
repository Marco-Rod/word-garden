import { describe, expect, it } from 'vitest';
import { calculateStars } from './StarSystem';

describe('calculateStars', () => {
  it('requires completion for stars', () => {
    expect(calculateStars({ completed: false, errors: 0, efficiency: 1 })).toBe(0);
  });

  it('rewards completion even when there are many errors', () => {
    expect(calculateStars({ completed: true, errors: 3, efficiency: 1 })).toBe(1);
  });

  it('awards two stars with up to two errors', () => {
    expect(calculateStars({ completed: true, errors: 2, efficiency: 0 })).toBe(2);
  });

  it('requires a perfect and efficient game for three stars', () => {
    expect(calculateStars({ completed: true, errors: 0, efficiency: 0.69 })).toBe(2);
    expect(calculateStars({ completed: true, errors: 0, efficiency: 0.7 })).toBe(3);
  });
});
