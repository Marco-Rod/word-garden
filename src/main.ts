import Phaser from 'phaser';
import { COLOR_BACKGROUND } from './game/config';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';
import { ResultScene } from './game/scenes/ResultScene';
import { TutorialScene } from './game/scenes/TutorialScene';
import { LevelSelectScene } from './game/scenes/LevelSelectScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: COLOR_BACKGROUND,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
  },
  input: {
    touch: {
      capture: true,
    },
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
  scene: [BootScene, LevelSelectScene, TutorialScene, GameScene, ResultScene],
};

new Phaser.Game(config);
