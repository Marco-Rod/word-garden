import Phaser from 'phaser';

// Safari puede elegir métricas inconsistentes al resolver la pila que incluye
// fuentes de emoji. La interfaz informativa usa una fuente de sistema estable;
// los textos decorativos, chips y letras del tablero conservan su estilo actual.
export const SAFE_UI_FONT = 'Arial, sans-serif';

export const createSafeText = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text => scene.add.text(x, y, text, { ...style, fontFamily: SAFE_UI_FONT });
