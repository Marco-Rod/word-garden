import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../data/levels';
import { GameSession } from './GameSession';

describe('GameSession', () => {
  it('completes a perfect session deterministically', () => {
    const session = new GameSession(LEVELS[0]);
    session.start(0);
    for (const word of LEVELS[0].words) session.wordFound(word);
    const result = session.complete(15_000);

    expect(result).toMatchObject({ levelId: 1, errors: 0, foundWords: LEVELS[0].words, stars: 3 });
    expect(result.score).toBeGreaterThan(0);
  });

  it('tracks mistakes and lowers stars without making score negative', () => {
    const session = new GameSession(LEVELS[0]);
    session.start(0);
    session.registerError();
    session.registerError();
    session.registerError();
    for (const word of LEVELS[0].words) session.wordFound(word);
    const result = session.complete(15_000);

    expect(result.errors).toBe(3);
    expect(result.stars).toBe(1);
    expect(result.score).toBeGreaterThan(0);
  });

  it('cannot complete before finding every word', () => {
    const session = new GameSession(LEVELS[0]);
    session.start(0);
    session.wordFound(LEVELS[0].words[0]);
    expect(() => session.complete(15_000)).toThrow('Cannot complete before finding every word');
  });
});
