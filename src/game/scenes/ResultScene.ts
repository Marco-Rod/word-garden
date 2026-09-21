import Phaser from 'phaser';
import { levelSystem } from '../../core/progression/levelProgression';
import { FILLS, FONT, INK } from '../config';
import { getLayoutMetrics } from '../layout/ResponsiveLayout';
import { isLayoutDebugEnabled, LayoutDebugOverlay } from '../objects/LayoutDebugOverlay';
import { createSafeText } from '../objects/SafeText';
import type { GameSessionResult } from '../session/GameSession';

export interface ResultSceneData {
  result: GameSessionResult;
  totalScore: number;
}

const DPR = window.devicePixelRatio || 1;

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultSceneData;
  private buttons: Array<{ bounds: Phaser.Geom.Rectangle; action: () => void; visual: Phaser.GameObjects.Container }> = [];
  private readonly refreshInputBounds = (): void => this.scale.updateBounds();
  private layoutDebugOverlay: LayoutDebugOverlay | null = null;

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
    this.layoutDebugOverlay?.destroy();
    this.layoutDebugOverlay = null;
    this.children.removeAll(true);
    this.buttons = [];
    const { result, totalScore } = this.resultData;
    const isFinal = !levelSystem.next(result.levelId);
    const layout = getLayoutMetrics(this.scale);
    const compact = layout.isCompact;
    const cx = layout.width / 2;
    const cy = layout.height / 2;
    const panelW = Math.min(layout.contentWidth, 500);
    const panelH = Math.min(layout.contentHeight, isFinal ? 410 : 510);
    const top = cy - panelH / 2;

    const panel = this.add.graphics();
    panel.fillStyle(FILLS.panel, 0.97);
    panel.fillRoundedRect(cx - panelW / 2, top, panelW, panelH, 28);
    panel.lineStyle(4, FILLS.panelBorder, 1);
    panel.strokeRoundedRect(cx - panelW / 2, top, panelW, panelH, 28);

    this.addText(cx, top + 42, isFinal ? '¡INCREÍBLE! 🎉' : '¡MUY BIEN!', compact ? 31 : 36, INK.dark, true);
    if (isFinal) {
      this.addText(cx, top + 84, 'Completaste todos\nnuestros niveles 🌱', compact ? 21 : 24, INK.body);
    } else {
      this.addText(cx, top + 78, `NIVEL ${result.levelId}`, compact ? 22 : 25, INK.body, true, true);
    }

    this.addStars(cx, top + (isFinal ? 145 : 128), result.stars, compact);
    const scoreY = top + (isFinal ? 205 : 185);
    const scoreText = this.addText(cx, scoreY, `🏆 ${result.score.toLocaleString('es-MX')} puntos`, compact ? 24 : 28, INK.dark, true, true);
    const statTexts: Array<{ label: Phaser.GameObjects.Text; value: Phaser.GameObjects.Text }> = [];

    if (!isFinal) {
      statTexts.push(this.addStat(cx, panelW, scoreY + 48, 'Palabras', `${result.foundWords.length}/${levelSystem.get(result.levelId)?.words.length ?? 0}`, compact));
      statTexts.push(this.addStat(cx, panelW, scoreY + 78, 'Tiempo', `${Math.round(result.elapsedSeconds)} s`, compact));
      statTexts.push(this.addStat(cx, panelW, scoreY + 108, 'Errores', `${result.errors}`, compact));
    }
    const totalY = scoreY + (isFinal ? 62 : 150);
    const totalText = this.addText(cx, totalY, `TOTAL DE LA PARTIDA\n${totalScore.toLocaleString('es-MX')} PTS`, compact ? 16 : 18, INK.dark, true, true);
    if (!isFinal) {
      this.addButton(cx, totalY + 58, 'SIGUIENTE NIVEL ▶', () => {
        this.scene.start('Game', { levelId: levelSystem.next(result.levelId)!.id });
      }, false, panelW, compact);
    }
    this.addButton(cx, totalY + (isFinal ? 110 : 128), 'MAPA', () => this.scene.start('LevelMap'), true, panelW, compact);

    if (isLayoutDebugEnabled()) {
      this.layoutDebugOverlay = new LayoutDebugOverlay(this);
      this.layoutDebugOverlay.track('Result.score', scoreText);
      statTexts.forEach(({ label, value }, index) => {
        this.layoutDebugOverlay?.track(`Result.stat${index + 1}.label`, label);
        this.layoutDebugOverlay?.track(`Result.stat${index + 1}.value`, value);
      });
      this.layoutDebugOverlay.track('Result.total', totalText);
    }
  }

  private addStars(x: number, y: number, earned: number, compact: boolean): void {
    const spacing = compact ? 50 : 58;
    const size = compact ? 37 : 42;
    for (let index = 0; index < 3; index++) {
      const star = this.addText(x + (index - 1) * spacing, y, index < earned ? '⭐' : '☆', size, '#f9a825', true);
      star.setScale(0);
      this.tweens.add({ targets: star, scale: 1, duration: 250, delay: index * 250, ease: 'Back.Out' });
    }
  }

  private addText(x: number, y: number, text: string, size: number, color: string, bold = false, useSafeText = false): Phaser.GameObjects.Text {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? 'bold' : undefined,
      align: 'center',
      resolution: DPR,
    };
    const label = (useSafeText ? createSafeText(this, x, y, text, style) : this.add.text(x, y, text, style)).setOrigin(0.5);
    return label;
  }

  private addStat(cx: number, panelW: number, y: number, label: string, value: string, compact: boolean): { label: Phaser.GameObjects.Text; value: Phaser.GameObjects.Text } {
    const inset = compact ? 42 : 42;
    const size = compact ? 18 : 20;
    const labelText = this.add.text(cx - panelW / 2 + inset, y, label, { fontFamily: FONT, fontSize: `${size}px`, color: INK.body, resolution: DPR }).setOrigin(0, 0.5);
    const valueText = createSafeText(this, cx + panelW / 2 - inset, y, value, { fontFamily: FONT, fontSize: `${size}px`, color: INK.dark, fontStyle: 'bold', resolution: DPR }).setOrigin(1, 0.5);
    return { label: labelText, value: valueText };
  }

  private addButton(x: number, y: number, label: string, onClick: () => void, secondary = false, panelW = 500, compact = false): void {
    const width = Math.min(panelW - 36, 330);
    const height = compact ? 60 : 66;
    const button = this.add.container(x, y).setSize(width, height);
    const background = this.add.graphics();
    background.fillStyle(secondary ? FILLS.panelBorder : FILLS.button, 1);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 20);
    button.add([background, this.addText(0, 0, label, compact ? 20 : 22, '#ffffff', true)]);
    this.buttons.push({ bounds: new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height), action: onClick, visual: button });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.buttons.find(({ bounds }) => Phaser.Geom.Rectangle.Contains(bounds, pointer.worldX, pointer.worldY))?.visual.setScale(0.96);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    for (const button of this.buttons) button.visual.setScale(1);
    this.buttons.find(({ bounds }) => Phaser.Geom.Rectangle.Contains(bounds, pointer.worldX, pointer.worldY))?.action();
  }
}
