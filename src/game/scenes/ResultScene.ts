import Phaser from 'phaser';
import { levelSystem } from '../../core/progression/levelProgression';
import { FILLS, FONT, INK } from '../config';
import type { GameSessionResult } from '../session/GameSession';
import { runProgress } from '../session/RunProgress';

export interface ResultSceneData {
  result: GameSessionResult;
  totalScore: number;
}

const DPR = window.devicePixelRatio || 1;

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultSceneData;
  private buttonBounds: Phaser.Geom.Rectangle | null = null;
  private buttonAction: (() => void) | null = null;
  private buttonVisual: Phaser.GameObjects.Container | null = null;
  private readonly refreshInputBounds = (): void => this.scale.updateBounds();

  constructor() {
    super('Result');
  }

  create(data: ResultSceneData): void {
    this.resultData = data;
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.game.canvas.addEventListener('pointerdown', this.refreshInputBounds, { capture: true, passive: true });
    window.visualViewport?.addEventListener('resize', this.refreshInputBounds);
    window.visualViewport?.addEventListener('scroll', this.refreshInputBounds);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroyInputBoundsSync, this);
    this.scale.updateBounds();
    this.draw();
    this.scale.on('resize', this.draw, this);
  }

  private destroyInputBoundsSync(): void {
    this.game.canvas.removeEventListener('pointerdown', this.refreshInputBounds, true);
    window.visualViewport?.removeEventListener('resize', this.refreshInputBounds);
    window.visualViewport?.removeEventListener('scroll', this.refreshInputBounds);
  }

  private draw(): void {
    this.children.removeAll(true);
    this.buttonBounds = null;
    this.buttonAction = null;
    this.buttonVisual = null;
    const { result, totalScore } = this.resultData;
    const isFinal = !levelSystem.next(result.levelId);
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const panelW = Math.min(this.scale.width - 32, 500);
    const panelH = Math.min(this.scale.height - 32, isFinal ? 500 : 530);

    const panel = this.add.graphics();
    panel.fillStyle(FILLS.panel, 0.97);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 28);
    panel.lineStyle(4, FILLS.panelBorder, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 28);

    this.addText(cx, cy - panelH / 2 + 58, isFinal ? '¡INCREÍBLE! 🎉' : '¡MUY BIEN!', 36, INK.dark, true);
    if (isFinal) {
      this.addText(cx, cy - panelH / 2 + 108, 'Completaste todos\nnuestros niveles 🌱', 24, INK.body);
    } else {
      this.addText(cx, cy - panelH / 2 + 108, `NIVEL ${result.levelId}`, 25, INK.body, true);
    }

    this.addStars(cx, cy - panelH / 2 + (isFinal ? 180 : 165), result.stars);
    const scoreY = cy - panelH / 2 + (isFinal ? 235 : 225);
    this.addText(cx, scoreY, `🏆 ${result.score.toLocaleString('es-MX')} puntos`, 28, INK.dark, true);

    if (!isFinal) {
      this.addText(cx, scoreY + 54, `Palabras    ${result.foundWords.length}/${levelSystem.get(result.levelId)?.words.length ?? 0}`, 20, INK.body);
      this.addText(cx, scoreY + 84, `Tiempo       ${Math.round(result.elapsedSeconds)}s`, 20, INK.body);
      this.addText(cx, scoreY + 114, `Errores      ${result.errors}`, 20, INK.body);
    }
    this.addText(cx, cy + panelH / 2 - 120, `Total  ${totalScore.toLocaleString('es-MX')} puntos`, 22, INK.dark, true);
    this.addButton(cx, cy + panelH / 2 - 54, isFinal ? 'JUGAR DE NUEVO' : 'SIGUIENTE NIVEL ▶', () => {
      if (isFinal) {
        runProgress.reset();
        this.scene.start('Game', { levelId: 1 });
      } else {
        this.scene.start('Game', { levelId: levelSystem.next(result.levelId)!.id });
      }
    });
  }

  private addStars(x: number, y: number, earned: number): void {
    for (let index = 0; index < 3; index++) {
      const star = this.addText(x + (index - 1) * 58, y, index < earned ? '⭐' : '☆', 42, '#f9a825', true);
      star.setScale(0);
      this.tweens.add({ targets: star, scale: 1, duration: 250, delay: index * 250, ease: 'Back.Out' });
    }
  }

  private addText(x: number, y: number, text: string, size: number, color: string, bold = false): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? 'bold' : undefined,
      align: 'center',
      resolution: DPR,
    }).setOrigin(0.5);
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): void {
    const width = 330;
    const height = 72;
    const button = this.add.container(x, y).setSize(width, height);
    const background = this.add.graphics();
    background.fillStyle(FILLS.button, 1);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 20);
    button.add([background, this.addText(0, 0, label, 25, '#ffffff', true)]);
    this.buttonBounds = new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height);
    this.buttonAction = onClick;
    this.buttonVisual = button;
  }

  private isInsideButton(pointer: Phaser.Input.Pointer): boolean {
    return this.buttonBounds !== null && Phaser.Geom.Rectangle.Contains(this.buttonBounds, pointer.worldX, pointer.worldY);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isInsideButton(pointer)) this.buttonVisual?.setScale(0.96);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const action = this.buttonAction;
    this.buttonVisual?.setScale(1);
    if (action && this.isInsideButton(pointer)) action();
  }
}
