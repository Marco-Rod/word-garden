import type { LevelDefinition } from '../core/puzzle/types';
import { WORD_SETS } from './words';

export const LEVELS: readonly LevelDefinition[] = [
  { id: 1, size: 5, words: [...WORD_SETS.level1], directions: ['RIGHT'], seed: 1001 },
  { id: 2, size: 5, words: [...WORD_SETS.level2], directions: ['RIGHT'], seed: 1002 },
  { id: 3, size: 5, words: [...WORD_SETS.level3], directions: ['RIGHT'], seed: 1003 },
  { id: 4, size: 6, words: [...WORD_SETS.level4], directions: ['RIGHT'], seed: 1004 },
  { id: 5, size: 6, words: [...WORD_SETS.level5], directions: ['RIGHT', 'DOWN'], seed: 1005 },
  { id: 6, size: 6, words: [...WORD_SETS.level6], directions: ['RIGHT', 'DOWN'], seed: 1006 },
  { id: 7, size: 7, words: [...WORD_SETS.level7], directions: ['RIGHT', 'DOWN'], seed: 1007 },
  { id: 8, size: 7, words: [...WORD_SETS.level8], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], seed: 1008 },
  { id: 9, size: 7, words: [...WORD_SETS.level9], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], seed: 1009 },
  { id: 10, size: 8, words: [...WORD_SETS.level10], directions: ['RIGHT', 'DOWN', 'DIAGONAL_DOWN_RIGHT'], seed: 1010 },
];
