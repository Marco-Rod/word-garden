import Phaser from 'phaser';

interface DebugTarget {
  name: string;
  text: Phaser.GameObjects.Text;
}

const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * Diagnóstico temporal para comparar la geometría real de Phaser contra el
 * viewport/canvas que Safari expone. Se activa únicamente con ?debugLayout.
 */
export class LayoutDebugOverlay {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly info: Phaser.GameObjects.Text;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly targets: DebugTarget[] = [];
  private destroyed = false;
  private lastRenderAt = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(10_000);
    this.info = scene.add.text(6, 6, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#102030',
      padding: { x: 5, y: 4 },
      resolution: window.devicePixelRatio || 1,
    }).setDepth(10_001).setOrigin(0);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.render, this);
    this.render(true);
  }

  track(name: string, text: Phaser.GameObjects.Text): void {
    this.targets.push({ name, text });
    this.render(true);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.render, this);
    this.graphics.destroy();
    this.info.destroy();
    for (const label of this.labels) label.destroy();
    this.labels.length = 0;
  }

  private render(force = false): void {
    if (this.destroyed) return;
    const now = performance.now();
    // Evita que el modo de diagnóstico altere el problema al crear/destruir
    // textos 60 veces por segundo. Sigue actualizándose durante un resize.
    if (!force && now - this.lastRenderAt < 250) return;
    this.lastRenderAt = now;
    const canvas = this.scene.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    const viewport = window.visualViewport;
    this.info.setText([
      '?debugLayout',
      `viewport ${round(viewport?.width ?? window.innerWidth)} x ${round(viewport?.height ?? window.innerHeight)} | DPR ${window.devicePixelRatio || 1}`,
      `Phaser ${this.scene.scale.width} x ${this.scene.scale.height} | canvas CSS ${round(canvasRect.width)} x ${round(canvasRect.height)}`,
      `canvas interno ${canvas.width} x ${canvas.height}`,
    ].join('\n'));

    this.graphics.clear();
    for (const label of this.labels) label.destroy();
    this.labels.length = 0;

    for (const { name, text } of this.targets) {
      if (!text.active) continue;
      const bounds = text.getBounds();
      this.graphics.lineStyle(2, 0xff1744, 0.95);
      this.graphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      const parent = (text as unknown as { parentContainer?: Phaser.GameObjects.Container }).parentContainer;
      const label = this.scene.add.text(
        Math.max(0, bounds.x),
        Math.max(0, bounds.y - 14),
        `${name} ${round(bounds.width)}x${round(bounds.height)} @ ${round(bounds.x)},${round(bounds.y)} fs:${text.style.fontSize} scale:${round(text.scaleX)},${round(text.scaleY)} parent:${round(parent?.scaleX ?? 1)},${round(parent?.scaleY ?? 1)}`,
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#b00020',
          padding: { x: 2, y: 1 },
          resolution: window.devicePixelRatio || 1,
        },
      ).setDepth(10_001).setOrigin(0);
      this.labels.push(label);
    }
  }
}

export const isLayoutDebugEnabled = (): boolean => new URLSearchParams(window.location.search).has('debugLayout');

type TextTest = 'padding' | 'system' | null;

const getTextTest = (): TextTest => {
  const value = new URLSearchParams(window.location.search).get('textTest');
  return value === 'padding' || value === 'system' ? value : null;
};

/** Applies an A/B rendering experiment only to the explicitly tracked texts. */
export const applyLayoutTextTest = (text: Phaser.GameObjects.Text): void => {
  switch (getTextTest()) {
    case 'padding':
      text.setPadding(2, 4, 2, 6);
      break;
    case 'system':
      text.setFontFamily('Arial, sans-serif');
      break;
  }
};
