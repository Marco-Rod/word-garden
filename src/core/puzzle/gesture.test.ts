import { describe, expect, it } from 'vitest';
import { bestAllowedDirection, cellPrefixSteps, projectGesture } from './gesture';
import type { Direction } from './types';

const RIGHT: Direction[] = ['RIGHT'];
const ALL: Direction[] = ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'];

describe('bestAllowedDirection', () => {
  it('snaps a slightly diagonal gesture to RIGHT when only RIGHT is allowed', () => {
    expect(bestAllowedDirection(RIGHT, 0.3, 2.2)).toBe('RIGHT');
    expect(bestAllowedDirection(RIGHT, 2.0, 2.2)).toBe('RIGHT');
  });

  it('chooses RIGHT for a horizontal gesture with vertical wobble', () => {
    expect(bestAllowedDirection(ALL, 0.3, 2.2)).toBe('RIGHT');
  });

  it('chooses DOWN for a vertical gesture with horizontal wobble', () => {
    expect(bestAllowedDirection(ALL, 2.2, 0.3)).toBe('DOWN');
  });

  it('chooses the diagonal when the gesture is genuinely diagonal', () => {
    expect(bestAllowedDirection(ALL, 2.0, 2.0)).toBe('DIAGONAL_DOWN_RIGHT');
    expect(bestAllowedDirection(ALL, 2.6, 2.4)).toBe('DIAGONAL_DOWN_RIGHT');
  });

  it('prefers a cardinal over diagonal for a mostly-horizontal long drag', () => {
    expect(bestAllowedDirection(ALL, 1.0, 3.0)).toBe('RIGHT');
  });

  it('does not lock onto a direction the gesture is not heading toward', () => {
    expect(bestAllowedDirection(RIGHT, -2.0, 0)).toBeNull();
    expect(bestAllowedDirection(ALL, -2.0, -2.0)).toBeNull();
    expect(bestAllowedDirection(ALL, 0.2, 0.2)).toBeNull();
  });

  it('returns null when no direction is allowed', () => {
    expect(bestAllowedDirection([], 3, 3)).toBeNull();
  });
});

describe('projectGesture', () => {
  it('projects onto RIGHT ignoring vertical offset', () => {
    const { t, perp } = projectGesture('RIGHT', 0.3, 2.2);
    expect(t).toBeCloseTo(2.2, 5);
    expect(perp).toBeCloseTo(0.3, 5);
  });

  it('reports zero perp when perfectly on the ray', () => {
    const p = projectGesture('DIAGONAL_DOWN_RIGHT', 2, 2);
    expect(p.perp).toBeCloseTo(0, 5);
    expect(p.t).toBeCloseTo(2 * Math.SQRT2, 5);
  });

  it('reports a large perp for a direction crossing the ray', () => {
    const p = projectGesture('RIGHT', 1.0, 2.2);
    expect(p.perp).toBeCloseTo(1.0, 5);
  });
});

describe('cellPrefixSteps', () => {
  it('selects the tile nearest to the projected position', () => {
    expect(cellPrefixSteps(2.2, 10)).toBe(2);
    expect(cellPrefixSteps(2.7, 10)).toBe(3);
  });

  it('clamps to the cap', () => {
    expect(cellPrefixSteps(9, 3)).toBe(3);
  });

  it('never goes below the origin', () => {
    expect(cellPrefixSteps(-2.5, 3)).toBe(0);
  });

  it('is safe for non-finite inputs', () => {
    expect(cellPrefixSteps(Number.NaN, 3)).toBe(0);
    expect(cellPrefixSteps(Number.POSITIVE_INFINITY, 3)).toBe(0);
  });
});