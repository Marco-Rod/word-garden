import { describe, expect, it } from 'vitest';
import { LEVEL_THEMES, THEME_VISUALS, visualForLevel } from './themes';

describe('world theme visuals', () => {
  it('provides a visual treatment for each of the twenty worlds', () => {
    expect(LEVEL_THEMES).toHaveLength(20);
    for (const theme of LEVEL_THEMES) {
      expect(THEME_VISUALS[theme.id], theme.id).toBeDefined();
      expect(THEME_VISUALS[theme.id].boardBackground, theme.id).toMatch(/^#/);
    }
  });

  it('uses the same world visual for every level in its five-level range', () => {
    for (const theme of LEVEL_THEMES) {
      expect(visualForLevel(theme.startLevel)).toBe(THEME_VISUALS[theme.id]);
      expect(visualForLevel(theme.endLevel)).toBe(THEME_VISUALS[theme.id]);
    }
  });
});
