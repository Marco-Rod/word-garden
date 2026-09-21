import Phaser from 'phaser';
import { COLOR_BACKGROUND } from './game/config';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';
import { ResultScene } from './game/scenes/ResultScene';
import { TutorialScene } from './game/scenes/TutorialScene';
import { LevelMapScene } from './game/scenes/LevelMapScene';

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
    antialiasGL: true,
    // Este juego usa formas y tipografía suave, no arte de píxel. Evitar el
    // redondeo de píxeles elimina el aspecto dentado al escalar Safari.
    roundPixels: false,
  },
  scene: [BootScene, LevelMapScene, TutorialScene, GameScene, ResultScene],
};

const game = new Phaser.Game(config);

// Safari cambia el viewport disponible cuando muestra u oculta sus barras.
// Phaser debe recibir ese tamaño efectivo, no la resolución física del iPhone.
const refreshViewport = (): void => {
  const viewport = window.visualViewport;
  game.scale.resize(Math.round(viewport?.width ?? window.innerWidth), Math.round(viewport?.height ?? window.innerHeight));
  game.scale.updateBounds();
};

window.visualViewport?.addEventListener('resize', refreshViewport);
window.visualViewport?.addEventListener('scroll', refreshViewport);
window.addEventListener('resize', refreshViewport);
window.addEventListener('orientationchange', refreshViewport);
window.requestAnimationFrame(refreshViewport);
