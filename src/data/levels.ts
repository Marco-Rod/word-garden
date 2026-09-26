import type { LevelDefinition } from '../core/puzzle/types';
import { WORD_SETS } from './words';
import { LEVEL_THEMES } from './themes';

export const LEVELS: readonly LevelDefinition[] = [
  { id: 1, size: 5, words: [...WORD_SETS.level1], directions: ['RIGHT'], allowIntersections: false, intersectionPreference: 0, minIntersections: 0, directionBalance: 0, seed: 1001, tutorial: { title: '¡VAMOS A JUGAR!', message: 'Encuentra las palabras\nde izquierda a derecha →', type: 'horizontal' } },
  { id: 2, size: 5, words: [...WORD_SETS.level2], directions: ['RIGHT'], allowIntersections: false, intersectionPreference: 0, minIntersections: 0, directionBalance: 0, seed: 1002 },
  { id: 3, size: 5, words: [...WORD_SETS.level3], directions: ['DOWN'], allowIntersections: false, intersectionPreference: 0, minIntersections: 0, directionBalance: 0, seed: 1003, tutorial: { title: '¡ALGO NUEVO!', message: 'Ahora algunas palabras\nvan hacia abajo ↓', type: 'vertical' } },
  { id: 4, size: 6, words: [...WORD_SETS.level4], directions: ['RIGHT', 'DOWN'], allowIntersections: false, intersectionPreference: 0, minIntersections: 0, directionBalance: 0.25, seed: 1004, tutorial: { title: '¡AHORA COMBINEMOS!', message: 'Las palabras pueden ir\na la derecha → o hacia abajo ↓', type: 'horizontal-vertical' } },
  { id: 5, size: 6, words: [...WORD_SETS.level5], directions: ['RIGHT', 'DOWN'], allowIntersections: true, intersectionPreference: 0.45, minIntersections: 1, directionBalance: 0.25, seed: 1005, tutorial: { title: '¡SE PUEDEN CRUZAR!', message: 'Dos palabras pueden\ncompartir una letra ✦', type: 'intersection' } },
  { id: 6, size: 6, words: [...WORD_SETS.level6], directions: ['RIGHT', 'DOWN'], allowIntersections: true, intersectionPreference: 0.55, minIntersections: 1, directionBalance: 0.5, seed: 1006 },
  { id: 7, size: 7, words: [...WORD_SETS.level7], directions: ['DIAGONAL_DOWN_RIGHT'], allowIntersections: false, intersectionPreference: 0, minIntersections: 0, directionBalance: 0, seed: 1007, tutorial: { title: '¡DIAGONALES!', message: 'Mira también\nen diagonal ↘', type: 'diagonal' } },
  { id: 8, size: 7, words: [...WORD_SETS.level8], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.75, minIntersections: 2, directionBalance: 0.8, minIntersectingWords: 3, maxDirectionSpread: 2, seed: 1008, tutorial: { title: '¡TODO JUNTO!', message: 'Ahora busca palabras\nhorizontales →, verticales ↓\ny diagonales ↘', type: 'all-directions' } },
  { id: 9, size: 7, words: [...WORD_SETS.level9], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.85, minIntersections: 3, directionBalance: 0.8, minIntersectingWords: 4, maxDirectionSpread: 2, seed: 1009 },
  { id: 10, size: 8, words: [...WORD_SETS.level10], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.9, minIntersections: 4, directionBalance: 0.8, minIntersectingWords: 5, maxDirectionSpread: 2, seed: 1010, tutorial: { title: '🌟 DESAFÍO FINAL', message: '¡Ahora todo junto!\nHorizontales → y verticales ↓\nDiagonales ↘\ny palabras cruzadas ✦', type: 'final-challenge' } },
  { id: 11, size: 8, words: [...WORD_SETS.level11], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.78, minIntersections: 2, directionBalance: 0.8, minIntersectingWords: 3, maxDirectionSpread: 2, seed: 2011 },
  { id: 12, size: 8, words: [...WORD_SETS.level12], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.82, minIntersections: 3, directionBalance: 0.8, minIntersectingWords: 4, maxDirectionSpread: 2, seed: 2012 },
  { id: 13, size: 8, words: [...WORD_SETS.level13], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.86, minIntersections: 3, directionBalance: 0.85, minIntersectingWords: 4, maxDirectionSpread: 2, seed: 2013 },
  { id: 14, size: 8, words: [...WORD_SETS.level14], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.88, minIntersections: 4, directionBalance: 0.85, minIntersectingWords: 5, maxDirectionSpread: 2, seed: 2014 },
  { id: 15, size: 8, words: [...WORD_SETS.level15], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.9, minIntersections: 4, directionBalance: 0.85, minIntersectingWords: 5, maxDirectionSpread: 2, seed: 2015 },
  { id: 16, size: 9, words: [...WORD_SETS.level16], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.86, minIntersections: 3, directionBalance: 0.8, minIntersectingWords: 4, maxDirectionSpread: 2, seed: 2016 },
  { id: 17, size: 9, words: [...WORD_SETS.level17], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.88, minIntersections: 4, directionBalance: 0.8, minIntersectingWords: 5, maxDirectionSpread: 2, seed: 2017 },
  { id: 18, size: 9, words: [...WORD_SETS.level18], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.9, minIntersections: 4, directionBalance: 0.85, minIntersectingWords: 5, maxDirectionSpread: 2, seed: 2018 },
  { id: 19, size: 9, words: [...WORD_SETS.level19], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.9, minIntersections: 4, directionBalance: 0.85, minIntersectingWords: 5, maxDirectionSpread: 2, seed: 2019 },
  { id: 20, size: 9, words: [...WORD_SETS.level20], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], allowIntersections: true, intersectionPreference: 0.92, minIntersections: 5, directionBalance: 0.85, minIntersectingWords: 6, maxDirectionSpread: 2, seed: 2020, tutorial: { title: '🌟 GRAN AVENTURA', message: '¡Llegaste al desafío\ndel Bosque de Aventuras!', type: 'final-challenge' } },
  ...buildExpansionLevels(),
];

function buildExpansionLevels(): LevelDefinition[] {
  return LEVEL_THEMES.filter((theme) => theme.startLevel >= 21).flatMap((theme) => {
    const bank = theme.words ?? [];
    return Array.from({ length: 5 }, (_, index) => {
      const id = theme.startLevel + index;
      const count = index < 3 ? 6 : index === 3 ? 7 : 8;
      const words = Array.from({ length: count }, (_, wordIndex) => bank[(index * 2 + wordIndex) % bank.length]);
      return {
        id,
        size: Math.max(index < 2 ? 8 : 9, ...words.map((word) => word.length)),
        words,
        directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'],
        allowIntersections: true,
        intersectionPreference: .65 + index * .04,
        minIntersections: 1 + Math.floor(index / 2),
        directionBalance: .45,
        seed: 3000 + id,
        ...(id === 100 ? { tutorial: { title: '🌟 GRAN FINAL', message: '¡El gran viaje\nllega a su desafío final!', type: 'final-challenge' as const } } : {}),
      };
    });
  });
}
