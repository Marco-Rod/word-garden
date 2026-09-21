import Phaser from 'phaser';
import levelList from '../data/levels.json';
import wordsData from '../data/words.json';
import { generatePuzzle, type Direction, type PlacedWord, type Puzzle } from '../systems/WordSearchGenerator';
import { matchSelection } from '../systems/wordDetection';
import { LetterTile } from '../objects/LetterTile';

interface WordInfo {
  hint: string;
  emoji: string;
  category: string;
}

interface Pill {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  w: number;
  h: number;
}

const WORDS_INFO = wordsData as Record<string, WordInfo>;

const DPR = window.devicePixelRatio || 1;

const FONT =
  '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Arial Rounded MT Bold", Arial, sans-serif';

const CONFETTI_COLORS = [0xff5252, 0xffd740, 0x40c4ff, 0x69f0ae, 0xba68c8];

const HEADER_H = 104;
const BOTTOM_H = 46;
const MARGIN = 28;

export class GameScene extends Phaser.Scene {
  private puzzle!: Puzzle;
  private tiles: LetterTile[][] = [];
  private boardX = 0;
  private boardY = 0;
  private cell = 0;

  private selection: LetterTile[] = [];
  private remaining: PlacedWord[] = [];
  private pillsByWord = new Map<string, Pill>();
  private pillsOrder: Pill[] = [];
  private foundCount = 0;

  private pointerDown = false;
  private isComplete = false;
  private replayButton: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Container | null = null;

  private headerText: Phaser.GameObjects.Text | null = null;
  private banner: Phaser.GameObjects.Graphics | null = null;
  private bigText: Phaser.GameObjects.Text | null = null;
  private hintLine: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Game');
  }

  create(): void {
    this.input.on('gameobjectdown', this.onObjectDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('gameobjectup', this.onObjectUp, this);

    this.scale.on('resize', this.recenter, this);

    this.ensureConfettiTexture();
    this.loadLevel(0, 1);
  }

  private loadLevel(index: number, seed?: number): void {
    this.isComplete = false;
    this.pointerDown = false;
    this.selection = [];
    this.replayButton = null;
    this.overlay = null;

    const level = levelList[index];
    this.puzzle = generatePuzzle({
      size: level.size,
      words: level.words,
      directions: level.directions as Direction[],
      seed,
    });

    this.buildBoard();
  }

  private computeLayout(): { cell: number; boardX: number; boardY: number } {
    const availW = this.scale.width - MARGIN * 2;
    const availH = this.scale.height - HEADER_H - BOTTOM_H;
    const size = this.puzzle.size;
    const cell = Phaser.Math.Clamp(Math.floor(Math.min(availW / size, availH / size)), 44, 100);
    const boardPx = cell * size;
    return {
      cell,
      boardX: Math.floor((this.scale.width - boardPx) / 2),
      boardY: Math.floor(HEADER_H - 8 + (availH - boardPx) / 2),
    };
  }

  private buildBoard(): void {
    this.children.removeAll(true);
    this.pillsByWord.clear();
    this.pillsOrder = [];

    const layout = this.computeLayout();
    this.cell = layout.cell;
    this.boardX = layout.boardX;
    this.boardY = layout.boardY;

    this.headerText = this.add
      .text(this.scale.width / 2, 28, '🌳 ¡Encuentra las palabras!', {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#1b4f72',
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(0.5);

    this.buildPills();

    this.tiles = [];
    for (let row = 0; row < this.puzzle.size; row++) {
      const tileRow: LetterTile[] = [];
      for (let col = 0; col < this.puzzle.size; col++) {
        const tile = new LetterTile(
          this,
          row,
          col,
          this.puzzle.grid[row][col],
          this.cell,
          this.boardX + col * this.cell + this.cell / 2,
          this.boardY + row * this.cell + this.cell / 2,
        );
        tile.setDepth(10);
        this.add.existing<LetterTile>(tile);
        tileRow.push(tile);
      }
      this.tiles.push(tileRow);
    }

    this.remaining = [...this.puzzle.words];
    this.foundCount = 0;

    this.banner = this.add.graphics().setDepth(95).setAlpha(0);
    this.bigText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '52px',
        color: '#4e342e',
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);
    this.hintLine = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#5d4037',
        resolution: DPR,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(101);
  }

  private buildPills(): void {
    const padX = 16;
    const padY = 9;

    const labels = this.puzzle.words.map((placed) => {
      const info = WORDS_INFO[placed.word];
      return this.add.text(0, 0, `${info?.emoji ?? '✨'} ${placed.word}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#5d4037',
        fontStyle: 'bold',
        resolution: DPR,
      });
    });

    const items = this.puzzle.words.map((placed, i) => {
      const label = labels[i];
      return {
        word: placed.word,
        label,
        w: label.width + padX * 2,
        h: label.height + padY * 2,
      };
    });

    this.pillsOrder = items.map((item) => {
      const container = this.add.container(0, 0);
      const rect = this.add.graphics();
      container.add(rect);
      item.label.setOrigin(0.5);
      container.add(item.label);
      container.setSize(item.w, item.h);
      this.pillsByWord.set(item.word, {
        container,
        label: item.label,
        w: item.w,
        h: item.h,
      });
      return { container, label: item.label, w: item.w, h: item.h };
    });

    this.recenterPills();
  }

  private recenter(): void {
    if (!this.puzzle) return;
    const availH = this.scale.height - HEADER_H - BOTTOM_H;
    const boardPx = this.cell * this.puzzle.size;
    this.boardX = Math.floor((this.scale.width - boardPx) / 2);
    this.boardY = Math.floor(HEADER_H - 8 + (availH - boardPx) / 2);

    for (let row = 0; row < this.tiles.length; row++) {
      for (let col = 0; col < this.tiles[row].length; col++) {
        this.tiles[row][col].setPosition(
          this.boardX + col * this.cell + this.cell / 2,
          this.boardY + row * this.cell + this.cell / 2,
        );
      }
    }

    this.recenterPills();
    this.headerText?.setPosition(this.scale.width / 2, 28);

    if (this.bigText && this.banner) {
      const cx = this.scale.width / 2;
      const cy = this.scale.height / 2 - 8;
      this.banner.setPosition(cx, cy);
      this.bigText.setPosition(cx, cy - 26);
      this.hintLine?.setPosition(cx, cy + 30);
    }

    this.overlay?.setPosition(this.scale.width / 2, this.scale.height / 2);
  }

  private recenterPills(): void {
    const gap = 12;
    const totalW = this.pillsOrder.reduce((sum, pill) => sum + pill.w, 0) + gap * (this.pillsOrder.length - 1);
    let cursorX = this.scale.width / 2 - totalW / 2;
    for (const pill of this.pillsOrder) {
      pill.container.setPosition(cursorX + pill.w / 2, HEADER_H - 22);
      cursorX += pill.w + gap;
    }
  }

  private markPillFound(word: string): void {
    const pill = this.pillsByWord.get(word);
    if (!pill) return;
    pill.label.setColor('#9e9e9e');
    const line = this.add
      .rectangle(pill.label.x, pill.label.y + 3, pill.label.width + 10, 3, 0x2e7d32, 1)
      .setDepth(5);
    const check = this.add
      .text(pill.label.x - pill.label.width / 2 - 14, pill.label.y, '✓', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#2e7d32',
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(1, 0.5)
      .setDepth(5);
    pill.container.add(line);
    pill.container.add(check);
    this.tweens.add({
      targets: pill.container,
      scale: 1.18,
      duration: 120,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private onObjectDown(_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject): void {
    if (gameObject instanceof LetterTile) {
      this.pointerDown = true;
      if (this.isComplete) return;
      this.clearSelection();
      const tile = gameObject;
      if (tile.getTileState() === 'found') return;
      tile.setTileState('selected');
      this.selection.push(tile);
    }
  }

  private onObjectUp(_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject): void {
    if (gameObject === this.replayButton && this.replayButton !== null && this.replayButton.active) {
      this.loadLevel(0);
    }
  }

  private toGridCoords(pointer: Phaser.Input.Pointer): { row: number; col: number } | null {
    const row = Math.round((pointer.worldY - this.boardY) / this.cell - 0.5);
    const col = Math.round((pointer.worldX - this.boardX) / this.cell - 0.5);
    if (row < 0 || row >= this.puzzle.size || col < 0 || col >= this.puzzle.size) return null;

    const centerX = this.boardX + col * this.cell + this.cell / 2;
    const centerY = this.boardY + row * this.cell + this.cell / 2;
    if (Math.abs(pointer.worldX - centerX) > this.cell * 0.55) return null;
    if (Math.abs(pointer.worldY - centerY) > this.cell * 0.55) return null;

    return { row, col };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerDown || this.selection.length === 0 || this.isComplete) return;

    const target = this.toGridCoords(pointer);
    if (!target) return;
    const tile = this.tiles[target.row][target.col];
    if (!tile || tile.getTileState() === 'found') return;
    if (tile === this.selection[this.selection.length - 1]) return;

    this.extendSelectionToTarget(tile);
  }

  private extendSelectionToTarget(target: LetterTile): void {
    const last = this.selection[this.selection.length - 1];
    const dr = Math.sign(target.row - last.row);
    const dc = Math.sign(target.col - last.col);

    let currentRow = last.row;
    let currentCol = last.col;

    while (currentRow !== target.row || currentCol !== target.col) {
      const nextRow = currentRow + (currentRow === target.row ? 0 : dr);
      const nextCol = currentCol + (currentCol === target.col ? 0 : dc);
      const next = this.tiles[nextRow]?.[nextCol];
      if (!next) return;
      if (next.getTileState() === 'found') return;

      const already = this.selection.indexOf(next);
      if (already !== -1) {
        const removed = this.selection.splice(already + 1);
        for (const tile of removed) tile.setTileState('idle');
        return;
      }

      next.setTileState('selected');
      this.selection.push(next);
      currentRow = nextRow;
      currentCol = nextCol;
    }
  }

  private onPointerUp(_pointer: Phaser.Input.Pointer): void {
    this.pointerDown = false;
    if (this.selection.length === 0) return;
    this.resolveSelection();
  }

  private resolveSelection(): void {
    const cells = this.selection.map((tile) => ({ row: tile.row, col: tile.col }));
    const match = matchSelection(cells, this.remaining);

    if (match) {
      const tiles = [...this.selection];
      this.clearSelection();
      this.onWordFound(match, tiles);
    } else {
      const tiles = [...this.selection];
      this.clearSelection();
      for (const tile of tiles) {
        tile.shake();
        this.time.delayedCall(180, () => {
          if (tile.getTileState() === 'selected') tile.setTileState('idle');
        });
      }
    }
  }

  private onWordFound(placed: PlacedWord, tiles: LetterTile[]): void {
    for (const tile of tiles) {
      tile.setTileState('found');
      tile.pop();
    }

    this.remaining = this.remaining.filter((w) => w.word !== placed.word);
    this.foundCount += 1;

    const info = WORDS_INFO[placed.word];
    const emoji = info?.emoji ?? '✨';
    const hint = info?.hint ?? '';

    this.showWordBanner(placed.word, emoji, hint);
    this.markPillFound(placed.word);

    const lastTile = tiles[tiles.length - 1];
    this.burst(lastTile.x, lastTile.y, 22);

    if (this.remaining.length === 0) {
      this.time.delayedCall(350, () => this.onLevelComplete());
    }
  }

  private showWordBanner(word: string, emoji: string, hint: string): void {
    if (!this.banner || !this.bigText) return;

    this.bigText.setText(`${emoji}  ${word}`);
    this.hintLine?.setText(`${emoji} ${hint}`);

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 - 8;
    this.banner.setPosition(cx, cy);
    this.bigText.setPosition(cx, cy - 26);
    this.hintLine?.setPosition(cx, cy + 30);

    this.drawBanner();

    const group: Array<Phaser.GameObjects.Graphics | Phaser.GameObjects.Text> = [
      this.banner,
      this.bigText,
    ];
    if (hint !== '') group.push(this.hintLine!);
    else this.hintLine?.setAlpha(0);

    for (const target of group) {
      this.tweens.killTweensOf(target);
      target.setScale(0.55);
      target.setAlpha(1);
    }
    this.tweens.add({
      targets: group,
      scale: 1,
      alpha: 1,
      duration: 170,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: group,
          alpha: 0,
          scale: 0.85,
          delay: 900,
          duration: 220,
        });
      },
    });
  }

  private drawBanner(): void {
    if (!this.banner || !this.bigText) return;
    const padX = 38;
    const innerW = Math.max(this.bigText.width, this.hintLine?.width ?? 0);
    const w = innerW + padX * 2;
    const h = 30 + this.bigText.height + 16 + (this.hintLine?.height ?? 0) + 22;
    this.banner.clear();
    this.banner.fillStyle(0xffffff, 0.95);
    this.banner.fillRoundedRect(-w / 2, -h / 2, w, h, 28);
    this.banner.lineStyle(5, 0xffca28, 1);
    this.banner.strokeRoundedRect(-w / 2, -h / 2, w, h, 28);
  }

  private onLevelComplete(): void {
    this.isComplete = true;
    this.clearSelection();
    this.burst(this.scale.width / 2, this.scale.height / 2, 90);

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const overlay = this.add.container(cx, cy).setDepth(199);
    this.overlay = overlay;

    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 0.95);
    panel.fillRoundedRect(-270, -160, 540, 320, 28);
    panel.lineStyle(4, 0xffca28, 1);
    panel.strokeRoundedRect(-270, -160, 540, 320, 28);
    overlay.add(panel);

    const title = this.add
      .text(0, -104, '¡NIVEL COMPLETADO!', {
        fontFamily: FONT,
        fontSize: '38px',
        color: '#1b4f72',
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(0.5)
      .setScale(0)
      .setAlpha(0)
      .setDepth(1);
    overlay.add(title);

    const stars = this.add
      .text(0, -34, '⭐⭐⭐', {
        fontFamily: FONT,
        fontSize: '62px',
        resolution: DPR,
      })
      .setOrigin(0.5)
      .setScale(0)
      .setAlpha(0)
      .setDepth(1);
    overlay.add(stars);

    const sub = this.add
      .text(0, 14, '¡Encontraste todas las palabras!', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#5d4037',
        resolution: DPR,
      })
      .setOrigin(0.5)
      .setDepth(1);
    overlay.add(sub);

    const button = this.buildButton();
    button.setPosition(0, 92);
    overlay.add(button);

    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' });
    this.tweens.add({ targets: stars, scale: 1, alpha: 1, delay: 320, duration: 320, ease: 'Back.easeOut' });

    this.time.delayedCall(700, () => this.burst(cx, cy - 40, 60));
  }

  private buildButton(): Phaser.GameObjects.Container {
    const label = this.add
      .text(0, 0, 'Jugar otra vez 🔄', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(0.5);
    const padX = 28;
    const padY = 12;
    const w = label.width + padX * 2;
    const h = label.height + padY * 2;

    const rect = this.add.graphics();
    rect.fillStyle(0xfb8c00, 1);
    rect.fillRoundedRect(-w / 2, -h / 2, w, h, 20);

    const container = this.add.container(0, 0);
    container.add(rect);
    container.add(label);
    container.setSize(w, h);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerover', () => container.setScale(1.07));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerdown', () => container.setScale(0.95));
    this.replayButton = container;
    return container;
  }

  private clearSelection(): void {
    for (const tile of this.selection) {
      if (tile.getTileState() === 'selected') tile.setTileState('idle');
    }
    this.selection = [];
  }

  private burst(x: number, y: number, quantity: number): void {
    const emitter = this.add.particles(x, y, 'confetti', {
      speed: { min: 60, max: 180 },
      lifespan: 700,
      scale: { start: 0.65, end: 0 },
      gravityY: 260,
      emitting: false,
      tint: CONFETTI_COLORS,
      rotate: { min: 0, max: 360 },
    });
    this.time.delayedCall(800, () => emitter.destroy());
    emitter.explode(quantity);
  }

  private ensureConfettiTexture(): void {
    if (this.textures.exists('confetti')) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('confetti', 8, 8);
    g.destroy();
  }
}