import Phaser from 'phaser';
import { levelSystem } from '../../core/progression/levelProgression';
import { progressSystem } from '../../core/progression/playerProgression';
import { FILLS, FONT, INK } from '../config';

const DPR = window.devicePixelRatio || 1;

interface LevelButton {
  levelId: number;
  bounds: Phaser.Geom.Rectangle;
}

export class LevelSelectScene extends Phaser.Scene {
  private buttons: LevelButton[] = [];

  constructor() {
    super('LevelSelect');
  }

  create(): void {
    this.draw();
    this.input.on('pointerup', this.onPointerUp, this);
    this.scale.on('resize', this.draw, this);
  }

  private draw(): void {
    this.children.removeAll(true);
    this.buttons = [];
    const cx = this.scale.width / 2;
    const availableW = Math.min(this.scale.width - 32, 520);
    const columns = 2;
    const gap = 14;
    const cardW = Math.floor((availableW - gap) / columns);
    const cardH = Phaser.Math.Clamp(Math.floor((this.scale.height - 150 - gap * 4) / 5), 76, 96);
    const startX = cx - availableW / 2;
    const startY = 118;
    const progress = progressSystem.snapshot();

    this.addText(cx, 38, '🌱 WORD GARDEN', 31, INK.dark, true);
    this.addText(cx, 78, `⭐ ${progressSystem.totalStars()} / ${levelSystem.all().length * 3}`, 22, INK.body, true);

    for (let index = 0; index < levelSystem.all().length; index++) {
      const definition = levelSystem.all()[index];
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const unlocked = progressSystem.isUnlocked(definition.id);
      const record = progress.levels[definition.id];
      const card = this.add.graphics();
      card.fillStyle(unlocked ? FILLS.panel : 0x90a4ae, unlocked ? 0.98 : 0.62);
      card.fillRoundedRect(x, y, cardW, cardH, 18);
      card.lineStyle(3, unlocked ? FILLS.panelBorder : 0x78909c, 1);
      card.strokeRoundedRect(x, y, cardW, cardH, 18);
      if (unlocked) {
        this.addText(x + cardW / 2, y + cardH * 0.34, `NIVEL ${definition.id}`, 21, INK.dark, true);
        const stars = record?.completed ? `${'⭐'.repeat(record.bestStars)}${'☆'.repeat(3 - record.bestStars)}` : 'JUGAR';
        this.addText(x + cardW / 2, y + cardH * 0.72, stars, record?.completed ? 22 : 19, record?.completed ? '#f9a825' : INK.body, true);
        this.buttons.push({ levelId: definition.id, bounds: new Phaser.Geom.Rectangle(x, y, cardW, cardH) });
      } else {
        this.addText(x + cardW / 2, y + cardH * 0.42, '🔒', 29, INK.white, true);
        this.addText(x + cardW / 2, y + cardH * 0.74, `NIVEL ${definition.id}`, 16, INK.white, true);
      }
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const button = this.buttons.find(({ bounds }) => Phaser.Geom.Rectangle.Contains(bounds, pointer.worldX, pointer.worldY));
    if (button) this.scene.start('Game', { levelId: button.levelId });
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
}
