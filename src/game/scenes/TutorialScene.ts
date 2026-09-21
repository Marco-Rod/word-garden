import Phaser from 'phaser';
import { levelSystem } from '../../core/progression/levelProgression';
import { FILLS, FONT, INK, OUTLINES, WORD_FOUND_COLORS } from '../config';
import { fitTextToWidth, getLayoutMetrics } from '../layout/ResponsiveLayout';

interface TutorialSceneData {
  levelId: number;
}

type TutorialType =
  | 'horizontal'
  | 'vertical'
  | 'horizontal-vertical'
  | 'intersection'
  | 'diagonal'
  | 'all-directions'
  | 'final-challenge';

const DPR = window.devicePixelRatio || 1;

export class TutorialScene extends Phaser.Scene {
  private buttonBounds: Phaser.Geom.Rectangle | null = null;
  private levelId = 1;

  constructor() {
    super('Tutorial');
  }

  create(data: TutorialSceneData): void {
    const level = levelSystem.get(data.levelId);
    if (!level?.tutorial) {
      this.scene.start('Game', { levelId: data.levelId, tutorialAcknowledged: true });
      return;
    }
    this.levelId = data.levelId;
    this.draw(level.tutorial.title, level.tutorial.message, level.tutorial.type);
    this.input.on('pointerup', this.onPointerUp, this);
    this.scale.on('resize', () => this.draw(level.tutorial!.title, level.tutorial!.message, level.tutorial!.type), this);
  }

  private draw(title: string, message: string, type: TutorialType): void {
    this.children.removeAll(true);
    const layout = getLayoutMetrics(this.scale);
    const cx = layout.width / 2;
    const cy = layout.height / 2;
    const panelW = Math.min(layout.contentWidth, 480);
    const panelH = Math.min(layout.contentHeight, 480);
    const panel = this.add.graphics();
    panel.fillStyle(FILLS.panel, 0.97);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 28);
    panel.lineStyle(4, FILLS.panelBorder, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 28);

    const top = cy - panelH / 2;
    const mobile = layout.isCompact;
    const lineCount = message.split('\n').length;
    const messageSize = type === 'final-challenge' ? (mobile ? 18 : 20) : (mobile ? 20 : 22);
    const messageY = top + 108 + Math.max(0, lineCount - 2) * 12;
    const estimatedMessageBottom = messageY + (lineCount * (messageSize + 3)) / 2;
    const gridSize = type === 'final-challenge' ? 142 : 166;
    const buttonY = cy + panelH / 2 - 52;
    const earliestGridCenter = estimatedMessageBottom + 18 + gridSize / 2;
    const latestGridCenter = buttonY - 49 - gridSize / 2;
    const gridY = Math.max(earliestGridCenter, Math.min(latestGridCenter, (earliestGridCenter + latestGridCenter) / 2));

    const titleText = this.addText(cx, top + 48, title, mobile ? 26 : 30, INK.dark, true);
    fitTextToWidth(titleText, title, panelW - 42, mobile ? 26 : 30, 20);
    this.addText(cx, messageY, message, messageSize, INK.body);
    this.addExampleGrid(cx, gridY, type, type === 'final-challenge');

    const width = Math.min(panelW - 54, 320);
    const height = 70;
    const y = cy + panelH / 2 - 52;
    const button = this.add.graphics();
    button.fillStyle(FILLS.button, 1);
    button.fillRoundedRect(cx - width / 2, y - height / 2, width, height, 20);
    this.addText(cx, y, this.levelId === 1 ? 'JUGAR' : this.levelId === 10 ? '¡VAMOS!' : 'ENTENDIDO', 25, '#ffffff', true);
    this.buttonBounds = new Phaser.Geom.Rectangle(cx - width / 2, y - height / 2, width, height);
  }

  private addExampleGrid(x: number, y: number, type: TutorialType, compact = false): void {
    const size = 5;
    const cell = compact ? 26 : 30;
    const gap = compact ? 3 : 4;
    const total = size * cell + (size - 1) * gap;
    const left = x - total / 2;
    const top = y - total / 2;
    const letters = Array.from({ length: size }, () => Array<string>(size).fill(''));
    const colors = Array.from({ length: size }, () => Array<number>(size).fill(-1));
    const addWord = (word: string, row: number, col: number, dRow: number, dCol: number, color: number): void => {
      for (let index = 0; index < word.length; index++) {
        const r = row + dRow * index;
        const c = col + dCol * index;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        letters[r][c] = word[index];
        colors[r][c] = color;
      }
    };

    if (type === 'horizontal') addWord('CASA', 2, 0, 0, 1, 0);
    if (type === 'vertical') addWord('PATO', 0, 2, 1, 0, 1);
    if (type === 'horizontal-vertical') {
      addWord('CASA', 1, 0, 0, 1, 0);
      addWord('PASA', 0, 1, 1, 0, 1);
    }
    if (type === 'intersection') {
      addWord('GATO', 1, 0, 0, 1, 0);
      addWord('PATO', 0, 1, 1, 0, 1);
    }
    if (type === 'diagonal') addWord('GATO', 0, 0, 1, 1, 2);
    if (type === 'all-directions' || type === 'final-challenge') {
      addWord('SOL', 0, 0, 0, 1, 0);
      addWord('PATO', 0, 4, 1, 0, 1);
      addWord('GATO', 1, 0, 1, 1, 2);
    }

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const tile = this.add.graphics();
        const px = left + col * (cell + gap);
        const py = top + row * (cell + gap);
        const color = colors[row][col] >= 0 ? WORD_FOUND_COLORS[colors[row][col] % WORD_FOUND_COLORS.length] : null;
        tile.fillStyle(color?.fill ?? FILLS.tileIdle, 1);
        tile.fillRoundedRect(px, py, cell, cell, 7);
        tile.lineStyle(2, color?.stroke ?? OUTLINES.tileIdle, 1);
        tile.strokeRoundedRect(px, py, cell, cell, 7);
        if (letters[row][col]) this.addText(px + cell / 2, py + cell / 2, letters[row][col], compact ? 15 : 17, INK.body, true);
      }
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

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.buttonBounds && Phaser.Geom.Rectangle.Contains(this.buttonBounds, pointer.worldX, pointer.worldY)) {
      this.scene.start('Game', { levelId: this.levelId, tutorialAcknowledged: true });
    }
  }
}
