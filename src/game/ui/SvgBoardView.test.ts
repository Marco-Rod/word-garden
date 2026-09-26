import { describe, expect, it } from 'vitest';
import { getWordListLayout } from './SvgBoardView';

describe('getWordListLayout', () => {
  it('reserves every chip row before the board for an eight-word 9×9 level', () => {
    const layout = getWordListLayout(393, [
      'AMISTAD', 'AVENTURA', 'JARDIN', 'TESORO',
      'CAMINO', 'ESTRELLA', 'SONRISA', 'VICTORIA',
    ]);

    expect(layout.columns).toBe(2);
    expect(layout.areaH).toBeGreaterThanOrEqual(270);
    expect(layout.pillW).toBeGreaterThanOrEqual(150);
  });

  it('uses fewer columns rather than letting a long label escape its chip', () => {
    const layout = getWordListLayout(393, ['EXPLORACION', 'UNIVERSO', 'ESTRELLA']);

    expect(layout.columns).toBe(1);
    expect(layout.pillW).toBeGreaterThanOrEqual(300);
  });
});
