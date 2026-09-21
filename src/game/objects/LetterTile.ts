import Phaser from 'phaser';

export type TileState = 'idle' | 'selected' | 'found';

const FILLS: Record<TileState, number> = {
  idle: 0xffffff,
  selected: 0xffe082,
  found: 0xa5d6a7,
};

const STROKES: Record<TileState, number> = {
  idle: 0x29b6f6,
  selected: 0xfb8c00,
  found: 0x43a047,
};

export class LetterTile extends Phaser.GameObjects.Container {
  readonly row: number;
  readonly col: number;
  readonly letter: string;

  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private tileState: TileState = 'idle';

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
        fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Arial Rounded MT Bold", Arial, sans-serif',
        fontSize: `${Math.round(size * 0.52)}px`,
        color: '#5d4037',
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
    this.bg.fillStyle(FILLS[state], 1);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    this.bg.lineStyle(Math.max(2, Math.round(Math.min(w, h) * 0.05)), STROKES[state], 1);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  }
}