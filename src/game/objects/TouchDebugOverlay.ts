import Phaser from 'phaser';

export class TouchDebugOverlay {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly info: Phaser.GameObjects.Text;
  private readonly marker: Phaser.GameObjects.Graphics;

  private readonly last = { x: 0, y: 0 };
  private readonly down = { x: 0, y: 0 };
  private readonly raw = { x: 0, y: 0 };
  private readonly rawWorld = { x: 0, y: 0 };
  private hasMarker = false;
  private hasDown = false;
  private hasRaw = false;
  private hit: { row: number; col: number } | null = null;
  private destroyed = false;

  private readonly onRawDown: (e: PointerEvent) => void;
  private readonly onRawMove: (e: PointerEvent) => void;

  constructor(private readonly scene: Phaser.Scene) {
    const dpr = window.devicePixelRatio || 1;

    this.panel = scene.add.graphics().setDepth(990).setScrollFactor(0);
    this.title = scene.add
      .text(12, 10, 'Touch Debug', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: dpr,
      })
      .setDepth(991)
      .setScrollFactor(0);
    this.info = scene.add
      .text(12, 34, '', {
        fontFamily: '"SF Mono", Consolas, "Courier New", monospace',
        fontSize: '13px',
        color: '#ffffff',
        resolution: dpr,
        align: 'left',
      })
      .setDepth(992)
      .setScrollFactor(0);
    this.marker = scene.add.graphics().setDepth(995).setScrollFactor(0);

    this.onRawDown = (e) => this.captureRaw(e);
    this.onRawMove = (e) => this.captureRaw(e);

    const canvas = scene.game.canvas;
    canvas.addEventListener('pointerdown', this.onRawDown, { passive: true });
    canvas.addEventListener('pointermove', this.onRawMove, { passive: true });

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onPointer, this);
    scene.input.on('pointerup', this.onPointer, this);
    scene.scale.on('resize', this.onResize, this);

    this.redraw();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const canvas = this.scene.game.canvas;
    canvas.removeEventListener('pointerdown', this.onRawDown);
    canvas.removeEventListener('pointermove', this.onRawMove);
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onPointer, this);
    this.scene.input.off('pointerup', this.onPointer, this);
    this.scene.scale.off('resize', this.onResize, this);
    this.panel.destroy();
    this.title.destroy();
    this.info.destroy();
    this.marker.destroy();
  }

  private captureRaw(e: PointerEvent): void {
    const rect = this.scene.game.canvas.getBoundingClientRect();
    this.raw.x = e.clientX - rect.left;
    this.raw.y = e.clientY - rect.top;
    this.rawWorld.x = this.raw.x * (this.scene.scale.width / rect.width);
    this.rawWorld.y = this.raw.y * (this.scene.scale.height / rect.height);
    this.hasRaw = true;
    this.redraw();
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    this.down.x = pointer.worldX;
    this.down.y = pointer.worldY;
    this.hasDown = true;
    this.onPointer(pointer);
  }

  private onPointer(pointer: Phaser.Input.Pointer): void {
    this.last.x = pointer.worldX;
    this.last.y = pointer.worldY;
    this.hasMarker = true;

    const hits = this.scene.input.hitTestPointer(pointer);
    this.hit = null;
    for (const object of hits) {
      const candidate = object as unknown as { row?: unknown; col?: unknown };
      if (typeof candidate.row === 'number') {
        this.hit = {
          row: candidate.row,
          col: typeof candidate.col === 'number' ? candidate.col : -1,
        };
        break;
      }
    }

    this.redraw();
  }

  private onResize(): void {
    this.redraw();
  }

  private redraw(): void {
    const scene = this.scene;
    const canvas = scene.game.canvas;
    const rect = canvas.getBoundingClientRect();
    this.panel.clear();
    this.panel.fillStyle(0x111111, 0.82);
    this.panel.fillRoundedRect(0, 0, 336, 300, 12);

    const rawText = this.hasRaw ? `${this.raw.x.toFixed(0)}, ${this.raw.y.toFixed(0)}` : '-';
    const hitText = this.hit ? `${this.hit.row},${this.hit.col}` : '-';
    const lines = [
      `Viewport    ${Math.round(window.innerWidth)} x ${Math.round(window.innerHeight)}  dpr ${window.devicePixelRatio || 1}`,
      `Canvas CSS  ${Math.round(rect.width)} x ${Math.round(rect.height)}`,
      `Canvas int  ${canvas.width} x ${canvas.height}`,
      `Display     ${Math.round(scene.scale.displaySize.width)} x ${Math.round(scene.scale.displaySize.height)}`,
      `Base        ${Math.round(scene.scale.baseSize.width)} x ${Math.round(scene.scale.baseSize.height)}`,
      `Scale       ${scene.scale.displayScale.x.toFixed(4)} x ${scene.scale.displayScale.y.toFixed(4)}`,
      `Raw CSS px  ${rawText}`,
      `Raw world   ${this.rawWorld.x.toFixed(0)}, ${this.rawWorld.y.toFixed(0)}  (cyan)`,
      `Pointer px  ${this.last.x.toFixed(0)}, ${this.last.y.toFixed(0)}  (red)`,
      `Hit tile    ${hitText}`,
    ];
    this.info.setText(lines.join('\n'));

    this.marker.clear();
    const vx = scene.scale.width / 2;
    const vy = scene.scale.height / 2;
    this.marker.lineStyle(1, 0xffffff, 0.4);
    this.marker.lineBetween(vx - 14, vy, vx + 14, vy);
    this.marker.lineBetween(vx, vy - 14, vx, vy + 14);

    if (this.hasRaw) {
      const rx = this.rawWorld.x;
      const ry = this.rawWorld.y;
      this.marker.lineStyle(2, 0x00ffff, 1);
      this.marker.strokeCircle(rx, ry, 26);
    }
    if (this.hasDown) {
      const sx = this.down.x;
      const sy = this.down.y;
      this.marker.lineStyle(2, 0xffff00, 1);
      this.marker.strokeCircle(sx, sy, 12);
    }
    if (this.hasMarker) {
      const sx = this.last.x;
      const sy = this.last.y;
      this.marker.lineStyle(3, 0xff0000, 1);
      this.marker.strokeCircle(sx, sy, 20);
      this.marker.lineStyle(1.5, 0xff7777, 1);
      this.marker.strokeCircle(sx, sy, 5);
    }
  }
}
