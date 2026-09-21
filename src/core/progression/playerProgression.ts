import { levelSystem } from './levelProgression';
import { ProgressSystem } from './ProgressSystem';
import { LocalStorageProgressRepository } from './ProgressRepository';

export const progressSystem = new ProgressSystem(levelSystem, new LocalStorageProgressRepository());
