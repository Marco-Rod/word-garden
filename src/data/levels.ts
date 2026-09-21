import type { LevelDefinition } from '../core/puzzle/types';
import { WORD_SETS } from './words';

export const LEVELS: readonly LevelDefinition[] = [
  { id: 1, size: 5, words: [...WORD_SETS.level1], directions: ['RIGHT'], intersectionPreference: 0, minIntersections: 0, directionBalance: 0, seed: 1001 },
  { id: 2, size: 5, words: [...WORD_SETS.level2], directions: ['RIGHT'], intersectionPreference: 0, minIntersections: 0, directionBalance: 0, seed: 1002 },
  { id: 3, size: 5, words: [...WORD_SETS.level3], directions: ['RIGHT'], intersectionPreference: 0.15, minIntersections: 0, directionBalance: 0, seed: 1003 },
  { id: 4, size: 6, words: [...WORD_SETS.level4], directions: ['RIGHT'], intersectionPreference: 0.3, minIntersections: 0, directionBalance: 0, seed: 1004 },
  { id: 5, size: 6, words: [...WORD_SETS.level5], directions: ['RIGHT', 'DOWN'], intersectionPreference: 0.45, minIntersections: 1, directionBalance: 0.25, seed: 1005 },
  { id: 6, size: 6, words: [...WORD_SETS.level6], directions: ['RIGHT', 'DOWN'], intersectionPreference: 0.55, minIntersections: 1, directionBalance: 0.5, seed: 1006 },
  { id: 7, size: 7, words: [...WORD_SETS.level7], directions: ['RIGHT', 'DOWN'], intersectionPreference: 0.65, minIntersections: 2, directionBalance: 0.5, seed: 1007 },
  { id: 8, size: 7, words: [...WORD_SETS.level8], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], intersectionPreference: 0.75, minIntersections: 2, directionBalance: 0.8, seed: 1008 },
  { id: 9, size: 7, words: [...WORD_SETS.level9], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], intersectionPreference: 0.85, minIntersections: 3, directionBalance: 0.8, seed: 1009 },
  { id: 10, size: 8, words: [...WORD_SETS.level10], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], intersectionPreference: 0.9, minIntersections: 4, directionBalance: 0.8, seed: 1010 },
];
