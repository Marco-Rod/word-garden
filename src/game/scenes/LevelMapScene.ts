import Phaser from 'phaser';
import { levelSystem } from '../../core/progression/levelProgression';
import { progressSystem } from '../../core/progression/playerProgression';
import type { LevelProgress } from '../../core/progression/ProgressRepository';
import { FILLS, FONT, INK } from '../config';
import { MapEnvironment } from '../objects/MapEnvironment';

const DPR = window.devicePixelRatio || 1;
const MAP_HEIGHT = 1_470;
const NODE_SPACING = 130;

interface MapNode {
  levelId: number;
  x: number;
  y: number;
  radius: number;
  unlocked: boolean;
}

export class LevelMapScene extends Phaser.Scene {
  private map: Phaser.GameObjects.Container | null = null;
  private nodes: MapNode[] = [];
  private mapOffset = 0;
  private dragStartY: number | null = null;
  private mapOffsetAtDragStart = 0;
  private dragged = false;

  constructor() {
    super('LevelMap');
  }

  create(): void {
    this.draw(true);
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.scale.on('resize', () => this.draw(true), this);
  }

  private draw(centerOnProgress: boolean): void {
    this.children.removeAll(true);
    this.nodes = [];
    const width = this.scale.width;
    const progress = progressSystem.snapshot();
    const highest = Math.min(progress.highestUnlockedLevel, levelSystem.all().length);
    if (centerOnProgress) this.mapOffset = this.offsetNearLevel(highest);

    this.drawWaterBase();
    this.map = this.add.container(0, this.mapOffset);
    const positions = levelSystem.all().map((level, index) => ({
      level,
      x: this.pathX(index),
      y: MAP_HEIGHT - 150 - index * NODE_SPACING,
    }));
    const path = positions.map(({ x, y }) => ({ x, y }));
    new MapEnvironment(this, this.map, {
      seed: 'world-1',
      width,
      height: MAP_HEIGHT,
      path,
      nodeZones: positions.map(({ level, x, y }) => ({ x, y, radius: level.id === 10 ? 53 : 40 })),
    }).draw();
    this.drawPath(path);
    for (const { level, x, y } of positions) {
      const unlocked = progressSystem.isUnlocked(level.id);
      const record = progress.levels[level.id];
      const radius = level.id === 10 ? 53 : 40;
      this.drawNode(x, y, level.id, radius, unlocked, record);
      this.nodes.push({ levelId: level.id, x, y, radius, unlocked });
    }
    this.drawHeader(width, progressSystem.totalStars());
  }

  private drawWaterBase(): void {
    const background = this.add.graphics();
    background.fillStyle(0x8fd3ff, 1);
    background.fillRect(0, 0, this.scale.width, this.scale.height);
  }

  private drawHeader(width: number, totalStars: number): void {
    const compact = width < 500;
    const headerH = compact ? 58 : 70;
    const titleY = compact ? 30 : 35;
    const starsY = compact ? 51 : 62;
    const header = this.add.graphics().setDepth(50);
    // La cabecera fija tapa por completo el recorrido que pasa por detrás;
    // así ningún nodo se percibe como cortado durante el desplazamiento.
    header.fillStyle(FILLS.panel, 1);
    header.fillRoundedRect(16, 10, width - 32, headerH, compact ? 18 : 22);
    header.lineStyle(3, FILLS.panelBorder, 0.9);
    header.strokeRoundedRect(16, 10, width - 32, headerH, compact ? 18 : 22);
    this.addText(width / 2, titleY, '🌱 WORD GARDEN', compact ? 22 : 27, INK.dark, true).setDepth(51);
    this.addText(width / 2, starsY, `⭐ ${totalStars} / ${levelSystem.all().length * 3}`, compact ? 15 : 18, INK.body, true).setDepth(51);
    this.addText(width / 2, this.scale.height - 20, 'DESLIZA PARA EXPLORAR', 14, INK.dark, true).setDepth(51).setAlpha(0.75);
  }

  private drawPath(points: Array<{ x: number; y: number }>): void {
    if (!this.map) return;
    const path = this.add.graphics();
    path.lineStyle(25, 0xb8834c, 0.72);
    for (let index = 0; index < points.length - 1; index++) path.lineBetween(points[index].x, points[index].y, points[index + 1].x, points[index + 1].y);
    path.lineStyle(17, 0xf3d18a, 1);
    for (let index = 0; index < points.length - 1; index++) path.lineBetween(points[index].x, points[index].y, points[index + 1].x, points[index + 1].y);
    path.lineStyle(3, 0xffecc0, 0.75);
    for (let index = 0; index < points.length - 1; index++) path.lineBetween(points[index].x, points[index].y, points[index + 1].x, points[index + 1].y);
    this.map.add(path);
  }

  private drawNode(x: number, y: number, levelId: number, radius: number, unlocked: boolean, record: LevelProgress | undefined): void {
    if (!this.map) return;
    const node = this.add.container(x, y);
    const drawing = this.add.graphics();
    const completed = !!record?.completed;
    const isChallenge = levelId === 10;
    let challengeHalo: Phaser.GameObjects.Graphics | null = null;
    if (isChallenge && unlocked) {
      challengeHalo = this.add.graphics();
      challengeHalo.fillStyle(0xffe082, 0.48);
      challengeHalo.fillCircle(0, 0, radius + 15);
      node.add(challengeHalo);
    }
    drawing.fillStyle(completed ? 0x81c784 : unlocked ? 0xffcc80 : 0x90a4ae, unlocked ? 1 : 0.7);
    drawing.fillCircle(0, 0, radius);
    drawing.lineStyle(isChallenge ? 6 : 4, completed ? 0x2e7d32 : unlocked ? 0xef6c00 : 0x607d8b, 1);
    drawing.strokeCircle(0, 0, radius);
    if (completed) {
      drawing.lineStyle(3, 0x66bb6a, 0.9);
      drawing.strokeCircle(0, 0, radius + 5);
    }
    if (isChallenge) {
      drawing.lineStyle(3, completed ? 0x1b5e20 : unlocked ? 0xf9a825 : 0x607d8b, 0.95);
      drawing.strokeCircle(0, 0, radius + 8);
    }
    node.add(drawing);

    if (completed) {
      this.addNodeText(node, 0, -5, `${levelId}`, isChallenge ? 29 : 25, INK.dark, true);
      this.addNodeText(node, 0, radius + 20, `${'⭐'.repeat(record.bestStars)}${'☆'.repeat(3 - record.bestStars)}`, 17, '#f9a825', true);
      this.addGardenGrowth(node, radius, record.bestStars);
      if (isChallenge) {
        this.addNodeText(node, 0, -radius - 26, '🏆', 28, INK.dark, true);
        this.addNodeText(node, -radius - 18, -radius + 2, '🌻', 23, INK.dark, true);
        this.addNodeText(node, radius + 18, -radius + 2, '🌻', 23, INK.dark, true);
      }
    } else if (unlocked) {
      this.addNodeText(node, 0, -7, isChallenge ? '🌟' : '▶', isChallenge ? 25 : 21, INK.dark, true);
      this.addNodeText(node, 0, 20, `${levelId}`, isChallenge ? 27 : 22, INK.dark, true);
      if (isChallenge) this.addNodeText(node, 0, radius + 24, 'DESAFÍO', 16, INK.dark, true);
      if (!isChallenge) {
        this.tweens.add({ targets: node, scale: 1.045, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    } else {
      this.addNodeText(node, 0, -7, '🔒', 22, INK.white, true);
      this.addNodeText(node, 0, 20, `${levelId}`, 21, INK.white, true);
    }
    this.map.add(node);
    if (challengeHalo && !completed) {
      this.tweens.add({
        targets: challengeHalo,
        scale: 1.12,
        alpha: 0.18,
        duration: 1_150,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private addGardenGrowth(node: Phaser.GameObjects.Container, radius: number, stars: number): void {
    const growth = stars === 3 ? '🌷' : stars === 2 ? '🌿' : '🌱';
    const plant = this.add.text(radius * 0.72, -radius * 0.56, growth, { fontFamily: FONT, fontSize: '23px', resolution: DPR }).setOrigin(0.5);
    node.add(plant);
  }

  private addNodeText(node: Phaser.GameObjects.Container, x: number, y: number, text: string, size: number, color: string, bold: boolean): void {
    node.add(this.addText(x, y, text, size, color, bold));
  }

  private pathX(index: number): number {
    const center = this.scale.width / 2;
    const amplitudes = [-0.26, 0.18, -0.12, 0.28, 0.08, -0.24, 0.2, -0.16, 0.25, 0];
    return center + this.scale.width * amplitudes[index];
  }

  private offsetNearLevel(levelId: number): number {
    const index = Math.max(0, levelId - 1);
    const nodeY = MAP_HEIGHT - 150 - index * NODE_SPACING;
    return Phaser.Math.Clamp(this.scale.height * 0.54 - nodeY, this.scale.height - MAP_HEIGHT + 20, 0);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.dragStartY = pointer.worldY;
    this.mapOffsetAtDragStart = this.mapOffset;
    this.dragged = false;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.dragStartY === null || !this.map) return;
    const distance = pointer.worldY - this.dragStartY;
    if (Math.abs(distance) > 6) this.dragged = true;
    this.mapOffset = Phaser.Math.Clamp(this.mapOffsetAtDragStart + distance, this.scale.height - MAP_HEIGHT + 20, 0);
    this.map.setY(this.mapOffset);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.dragStartY === null) return;
    const wasDragged = this.dragged;
    this.dragStartY = null;
    if (wasDragged) return;
    const node = this.nodes.find((candidate) => {
      const dx = pointer.worldX - candidate.x;
      const dy = pointer.worldY - (candidate.y + this.mapOffset);
      return candidate.unlocked && dx * dx + dy * dy <= (candidate.radius + 16) ** 2;
    });
    if (node) this.scene.start('Game', { levelId: node.levelId });
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
