import Phaser from 'phaser';
import { level1 } from '../../data/level1';
import { generatePuzzle } from '../../core/puzzle/generator';
import { matchSelection } from '../../core/puzzle/selection';
import type { PlacedWord, Puzzle } from '../../core/puzzle/types';
import { FILLS, FONT, INK, LAYOUT } from '../config';
import { LetterTile } from '../objects/LetterTile';
import { TouchDebugOverlay } from '../objects/TouchDebugOverlay';
import { WordSelection } from '../objects/WordSelection';

interface Pill {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  w: number;
  h: number;
}

const DPR = window.devicePixelRatio || 1;

export class GameScene extends Phaser.Scene {
  private puzzle!: Puzzle;
  private tiles: LetterTile[][] = [];
  private boardX = 0;
  private boardY = 0;
  private cell = 0;

  private foundWords = new Set<string>();
  private selection!: WordSelection;
  private pillsByWord = new Map<string, Pill>();
  private pillsOrder: Pill[] = [];

  private pointerDown = false;
  private isComplete = false;
  private replayButton: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Container | null = null;
  private debugTouch = false;
  private debugTouchOverlay: TouchDebugOverlay | null = null;

  private headerText: Phaser.GameObjects.Text | null = null;
  private feedbackPanel: Phaser.GameObjects.Graphics | null = null;
  private feedbackText: Phaser.GameObjects.Text | null = null;
  private readonly refreshInputBounds = (): void => this.scale.updateBounds();

  constructor() {
    super('Game');
  }

  create(): void {
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('gameobjectup', this.onObjectUp, this);

    this.scale.on('resize', this.recenter, this);

    // En móvil el rectángulo CSS del canvas puede moverse cuando aparece u
    // oculta la barra del navegador, sin que Phaser reciba un resize del juego.
    // La captura asegura que el rectángulo se refresque antes de que Phaser
    // transforme este mismo pointerdown a coordenadas del mundo.
    this.game.canvas.addEventListener('pointerdown', this.refreshInputBounds, {
      capture: true,
      passive: true,
    });
    window.visualViewport?.addEventListener('resize', this.refreshInputBounds);
    window.visualViewport?.addEventListener('scroll', this.refreshInputBounds);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroyInputBoundsSync, this);
    this.scale.updateBounds();

    this.debugTouch = new URLSearchParams(window.location.search).has('debugTouch');

    this.loadLevel();
  }

  private destroyInputBoundsSync(): void {
    this.game.canvas.removeEventListener('pointerdown', this.refreshInputBounds, true);
    window.visualViewport?.removeEventListener('resize', this.refreshInputBounds);
    window.visualViewport?.removeEventListener('scroll', this.refreshInputBounds);
  }

  private ensureDebugOverlay(): void {
    this.debugTouchOverlay?.destroy();
    this.debugTouchOverlay = null;
    if (this.debugTouch) this.debugTouchOverlay = new TouchDebugOverlay(this);
  }

  private loadLevel(): void {
    this.puzzle = generatePuzzle({
      size: level1.size,
      words: level1.words,
      directions: level1.directions,
      seed: level1.seed,
    });

    this.isComplete = false;
    this.pointerDown = false;
    this.foundWords.clear();
    this.selection = new WordSelection([], level1.directions, 0, 0);
    this.replayButton = null;
    this.overlay = null;

    this.buildBoard();
    this.ensureDebugOverlay();
  }

  private computeLayout(): { cell: number; boardX: number; boardY: number } {
    const availW = this.scale.width - LAYOUT.margin * 2;
    const availH = this.scale.height - LAYOUT.headerH - LAYOUT.bottomH;
    const cell = Phaser.Math.Clamp(Math.floor(Math.min(availW / this.puzzle.size, availH / this.puzzle.size)), 44, 100);
    const boardPx = cell * this.puzzle.size;
    return {
      cell,
      boardX: Math.floor((this.scale.width - boardPx) / 2),
      boardY: Math.floor(LAYOUT.headerH - 8 + (availH - boardPx) / 2),
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
      .text(this.scale.width / 2, 28, `NIVEL ${level1.id} 🌱`, {
        fontFamily: FONT,
        fontSize: '30px',
        color: INK.dark,
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

    const maxSteps = Math.max(...this.puzzle.words.map((placed) => placed.word.length)) - 1;
    this.selection = new WordSelection(this.tiles, level1.directions, this.cell, maxSteps);

    this.feedbackPanel = this.add.graphics().setDepth(95).setAlpha(0);
    this.feedbackText = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '52px',
        color: INK.body,
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);
  }

  private buildPills(): void {
    const padX = 16;
    const padY = 9;

    this.pillsOrder = this.puzzle.words.map((placed) => {
      const label = this.add.text(0, 0, placed.word, {
        fontFamily: FONT,
        fontSize: '24px',
        color: INK.body,
        fontStyle: 'bold',
        resolution: DPR,
      });
      const w = label.width + padX * 2;
      const h = label.height + padY * 2;
      const container = this.add.container(0, 0);
      const rect = this.add.graphics();
      container.add(rect);
      label.setOrigin(0.5);
      container.add(label);
      container.setSize(w, h);
      this.pillsByWord.set(placed.word, { container, label, w, h });
      return { container, label, w, h };
    });

    this.recenterPills();
  }

  private recenterPills(): void {
    const gap = 12;
    const totalW = this.pillsOrder.reduce((sum, pill) => sum + pill.w, 0) + gap * (this.pillsOrder.length - 1);
    let cursorX = this.scale.width / 2 - totalW / 2;
    for (const pill of this.pillsOrder) {
      pill.container.setPosition(cursorX + pill.w / 2, LAYOUT.headerH - 22);
      cursorX += pill.w + gap;
    }
  }

  private markPillFound(word: string): void {
    const pill = this.pillsByWord.get(word);
    if (!pill) return;
    pill.label.setColor(INK.muted);
    const line = this.add
      .rectangle(pill.label.x, pill.label.y + 3, pill.label.width + 10, 3, FILLS.strikethrough, 1)
      .setDepth(5);
    const check = this.add
      .text(pill.label.x - pill.label.width / 2 - 14, pill.label.y, '✓', {
        fontFamily: FONT,
        fontSize: '24px',
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
      scale: 1.15,
      duration: 110,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private recenter(): void {
    if (!this.puzzle) return;
    const availH = this.scale.height - LAYOUT.headerH - LAYOUT.bottomH;
    const boardPx = this.cell * this.puzzle.size;
    this.boardX = Math.floor((this.scale.width - boardPx) / 2);
    this.boardY = Math.floor(LAYOUT.headerH - 8 + (availH - boardPx) / 2);

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

    if (this.feedbackText && this.feedbackPanel) {
      const cx = this.scale.width / 2;
      const cy = this.scale.height / 2 - 8;
      this.feedbackPanel.setPosition(cx, cy);
      this.feedbackText.setPosition(cx, cy);
    }

    this.overlay?.setPosition(this.scale.width / 2, this.scale.height / 2);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isComplete) return;

    // No usamos el gameobjectdown para iniciar una palabra: los bounds de un
    // objeto interactivo pueden quedar desfasados respecto al canvas durante
    // un resize móvil. La cuadrícula sí es la fuente de verdad visual.
    const tile = this.tileNearestTo(pointer.worldX, pointer.worldY);
    if (!tile) return;

    this.pointerDown = true;
    this.selection.startAt(tile);
  }

  private tileNearestTo(worldX: number, worldY: number): LetterTile | null {
    if (this.cell === 0) return null;

    // Selecciona la letra cuyo centro está más cerca del puntero, siempre que
    // el punto permanezca dentro de la caja visual de esa letra.
    const col = Math.round((worldX - this.boardX - this.cell / 2) / this.cell);
    const row = Math.round((worldY - this.boardY - this.cell / 2) / this.cell);
    const tile = this.tiles[row]?.[col];
    if (!tile) return null;

    const half = this.cell / 2;
    return Math.abs(worldX - tile.x) <= half && Math.abs(worldY - tile.y) <= half ? tile : null;
  }

  private onObjectUp(_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject): void {
    if (gameObject === this.replayButton && this.replayButton !== null && this.replayButton.active) {
      this.loadLevel();
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerDown || !this.selection.isActive() || this.isComplete) return;

    this.selection.moveTo(pointer.worldX, pointer.worldY);
  }

  private onPointerUp(_pointer: Phaser.Input.Pointer): void {
    this.pointerDown = false;
    if (!this.selection.isActive() || this.isComplete) return;

    const cells = this.selection.tiles.map((tile) => ({ row: tile.row, col: tile.col }));
    const remaining = this.puzzle.words.filter((word) => !this.foundWords.has(word.word));
    const placed = matchSelection(cells, remaining);

    if (placed) {
      this.onWordFound(placed);
    } else {
      for (const tile of this.selection.tiles) tile.shake();
    }
    this.selection.clear();
  }

  private onWordFound(placed: PlacedWord): void {
    for (const tile of this.selection.tiles) {
      tile.setTileState('found');
      tile.pop();
    }

    this.foundWords.add(placed.word);
    this.markPillFound(placed.word);
    this.showFeedback(placed.word);

    if (this.foundWords.size === this.puzzle.words.length) {
      this.time.delayedCall(400, () => this.completeLevel());
    }
  }

  private showFeedback(word: string): void {
    if (!this.feedbackText || !this.feedbackPanel) return;

    this.feedbackText.setText(`${word} ✓`);

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 - 8;
    this.feedbackPanel.setPosition(cx, cy);
    this.feedbackText.setPosition(cx, cy);

    const padX = 38;
    const w = this.feedbackText.width + padX * 2;
    const h = 30 + this.feedbackText.height + 18;
    this.feedbackPanel.clear();
    this.feedbackPanel.fillStyle(FILLS.panel, 0.95);
    this.feedbackPanel.fillRoundedRect(-w / 2, -h / 2, w, h, 26);
    this.feedbackPanel.lineStyle(4, FILLS.panelBorder, 1);
    this.feedbackPanel.strokeRoundedRect(-w / 2, -h / 2, w, h, 26);

    const group: Array<Phaser.GameObjects.Graphics | Phaser.GameObjects.Text> = [
      this.feedbackPanel,
      this.feedbackText,
    ];
    for (const target of group) {
      this.tweens.killTweensOf(target);
      target.setScale(0.6);
      target.setAlpha(1);
    }
    this.tweens.add({
      targets: group,
      scale: 1,
      alpha: 1,
      duration: 170,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: group, alpha: 0, scale: 0.85, delay: 800, duration: 220 });
      },
    });
  }

  private completeLevel(): void {
    this.isComplete = true;
    this.selection.clear();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const overlay = this.add.container(cx, cy).setDepth(199);
    this.overlay = overlay;

    const panel = this.add.graphics();
    panel.fillStyle(FILLS.panel, 0.96);
    panel.fillRoundedRect(-240, -130, 480, 260, 28);
    panel.lineStyle(4, FILLS.panelBorder, 1);
    panel.strokeRoundedRect(-240, -130, 480, 260, 28);
    overlay.add(panel);

    const title = this.add
      .text(0, -64, '¡NIVEL COMPLETADO!', {
        fontFamily: FONT,
        fontSize: '36px',
        color: INK.dark,
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(0.5)
      .setScale(0)
      .setAlpha(0)
      .setDepth(1);
    overlay.add(title);

    const sub = this.add
      .text(0, -4, '🎉 ¡GENIAL! Encontraste todas las palabras', {
        fontFamily: FONT,
        fontSize: '22px',
        color: INK.body,
        resolution: DPR,
      })
      .setOrigin(0.5)
      .setDepth(1);
    overlay.add(sub);

    const button = this.buildButton();
    button.setPosition(0, 58);
    overlay.add(button);

    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' });
  }

  private buildButton(): Phaser.GameObjects.Container {
    const label = this.add
      .text(0, 0, 'CONTINUAR', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(0.5);
    const padX = 30;
    const padY = 12;
    const w = label.width + padX * 2;
    const h = label.height + padY * 2;

    const rect = this.add.graphics();
    rect.fillStyle(FILLS.button, 1);
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
}
