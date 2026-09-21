import { describe, expect, it } from 'vitest';
import { calculateStars } from './StarSystem';

describe('calculateStars', () => {
  it('requires completion for stars', () => {
    expect(calculateStars({ completed: false, errors: 0, efficiency: 1 })).toBe(0);
  });

  it('awards one star with two or more errors', () => {
    expect(calculateStars({ completed: true, errors: 2, efficiency: 1 })).toBe(1);
    expect(calculateStars({ completed: true, errors: 3, efficiency: 1 })).toBe(1);
    expect(calculateStars({ completed: true, errors: 10, efficiency: 1 })).toBe(1);
  });

  it('awards two stars with one error', () => {
    expect(calculateStars({ completed: true, errors: 1, efficiency: 0 })).toBe(2);
  });

  it('awards three stars for a perfect game regardless of time', () => {
    expect(calculateStars({ completed: true, errors: 0, efficiency: 0 })).toBe(3);
  });
});
