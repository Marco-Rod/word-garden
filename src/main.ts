import Phaser from 'phaser';
import { GameScene } from './game/scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#8fd3ff',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
  },
  render: {
    antialias: true,
    roundPixels: true,
  },
  scene: [GameScene],
};

new Phaser.Game(config);