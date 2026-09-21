import Phaser from 'phaser';
import { FILLS, OUTLINES, FONT, INK } from '../config';

export type TileState = 'idle' | 'selected' | 'found';

const STATE_FILLS: Record<TileState, number> = {
  idle: FILLS.tileIdle,
  selected: FILLS.tileSelected,
  found: FILLS.tileFound,
};

const STATE_STROKES: Record<TileState, number> = {
  idle: OUTLINES.tileIdle,
  selected: OUTLINES.tileSelected,
  found: OUTLINES.tileFound,
};

export class LetterTile extends Phaser.GameObjects.Container {
  readonly row: number;
  readonly col: number;
  readonly letter: string;

  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private tileState: TileState = 'idle';
  private foundColors: { fill: number; stroke: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    row: number,
    col: number,
    letter: string,
    size: number,
    x: number,
    y: number,
  ) {
    super(scene, x, y);
    this.row = row;
    this.col = col;
    this.letter = letter;

    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, letter, {
        fontFamily: FONT,
        fontSize: `${Math.round(size * 0.52)}px`,
        color: INK.body,
        fontStyle: 'bold',
        resolution: window.devicePixelRatio || 1,
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);
    this.setSize(size, size);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size),
      Phaser.Geom.Rectangle.Contains,
    );
    this.redraw('idle');
  }

  setTileState(state: TileState): void {
    if (state === this.tileState) return;
    this.tileState = state;
    this.redraw(state);
  }

  getTileState(): TileState {
    return this.tileState;
  }

  setFoundColor(fill: number, stroke: number): void {
    this.foundColors = { fill, stroke };
    this.tileState = 'found';
    this.redraw('found');
  }

  pop(): void {
    this.setScale(1);
    this.scene.tweens.add({ targets: this, scale: 1.3, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  }

  shake(): void {
    this.setScale(1);
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.85,
      scaleY: 1.15,
      duration: 60,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeInOut',
    });
  }

  private redraw(state: TileState): void {
    const w = this.width;
    const h = this.height;
    const radius = Math.round(Math.min(w, h) * 0.18);
    this.bg.clear();
    const fill = state === 'found' && this.foundColors ? this.foundColors.fill : STATE_FILLS[state];
    const stroke = state === 'found' && this.foundColors ? this.foundColors.stroke : STATE_STROKES[state];
    this.bg.fillStyle(fill, 1);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    this.bg.lineStyle(Math.max(2, Math.round(Math.min(w, h) * 0.05)), stroke, 1);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  }
}
