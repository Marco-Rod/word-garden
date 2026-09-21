import Phaser from 'phaser';
import { generatePuzzle } from '../../core/puzzle/generator';
import { matchSelection } from '../../core/puzzle/selection';
import { levelSystem } from '../../core/progression/levelProgression';
import type { LevelDefinition, PlacedWord, Puzzle } from '../../core/puzzle/types';
import { FILLS, FONT, INK, LAYOUT, WORD_FOUND_COLORS } from '../config';
import { LetterTile } from '../objects/LetterTile';
import { TouchDebugOverlay } from '../objects/TouchDebugOverlay';
import { WordSelection } from '../objects/WordSelection';
import { GameSession } from '../session/GameSession';
import { runProgress } from '../session/RunProgress';

interface Pill {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  rect: Phaser.GameObjects.Graphics;
  w: number;
  h: number;
}

export interface GameSceneData {
  levelId: number;
  tutorialAcknowledged?: boolean;
}

const DPR = window.devicePixelRatio || 1;

export class GameScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private session!: GameSession;
  private puzzle!: Puzzle;
  private tiles: LetterTile[][] = [];
  private boardX = 0;
  private boardY = 0;
  private cell = 0;

  private foundWords = new Set<string>();
  private selection!: WordSelection;
  private pillsByWord = new Map<string, Pill>();
  private pillsOrder: Pill[] = [];
  private wordColors = new Map<string, (typeof WORD_FOUND_COLORS)[number]>();
  private wordCounter: Phaser.GameObjects.Text | null = null;
  private wordAreaH = LAYOUT.headerH;
  private gestureHint: Phaser.GameObjects.Graphics | null = null;
  private gestureHintTween: Phaser.Tweens.Tween | null = null;
  private hasInteracted = false;

  private pointerDown = false;
  private isComplete = false;
  private debugTouch = false;
  private debugTouchOverlay: TouchDebugOverlay | null = null;

  private headerText: Phaser.GameObjects.Text | null = null;
  private feedbackPanel: Phaser.GameObjects.Graphics | null = null;
  private feedbackText: Phaser.GameObjects.Text | null = null;
  private readonly refreshInputBounds = (): void => this.scale.updateBounds();

  constructor() {
    super('Game');
  }

  create(data: GameSceneData): void {
    const requestedLevel = levelSystem.get(data.levelId);
    if (!requestedLevel) throw new Error(`Unknown level ${data.levelId}`);
    if (requestedLevel.tutorial && !data.tutorialAcknowledged) {
      this.scene.start('Tutorial', { levelId: data.levelId });
      return;
    }
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

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

    this.loadLevel(data.levelId);
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

  private loadLevel(levelId: number): void {
    const level = levelSystem.get(levelId);
    if (!level) throw new Error(`Unknown level ${levelId}`);
    this.level = level;
    this.puzzle = generatePuzzle({
      size: level.size,
      words: level.words,
      directions: level.directions,
      allowIntersections: level.allowIntersections,
      intersectionPreference: level.intersectionPreference,
      minIntersections: level.minIntersections,
      directionBalance: level.directionBalance,
      minIntersectingWords: level.minIntersectingWords,
      maxDirectionSpread: level.maxDirectionSpread,
      seed: level.seed,
    });
    if (this.level.id >= 8 && new URLSearchParams(window.location.search).has('debugPuzzle')) {
      console.info(`LEVEL ${this.level.id}`, this.puzzle.stats);
    }

    this.isComplete = false;
    this.pointerDown = false;
    this.hasInteracted = false;
    this.gestureHintTween?.stop();
    this.gestureHintTween = null;
    this.gestureHint?.destroy();
    this.gestureHint = null;
    this.foundWords.clear();
    this.selection = new WordSelection([], level.directions, 0, 0);
    this.session = new GameSession(level);
    this.session.start();

    this.buildBoard();
    this.ensureDebugOverlay();
    if (this.level.id === 1) this.time.delayedCall(2500, this.showFirstGestureHint, [], this);
  }

  private computeLayout(): { cell: number; boardX: number; boardY: number } {
    const availW = this.scale.width - LAYOUT.margin * 2;
    this.wordAreaH = this.wordListLayout().areaH;
    const availH = this.scale.height - this.wordAreaH - LAYOUT.bottomH;
    const cell = Phaser.Math.Clamp(Math.floor(Math.min(availW / this.puzzle.size, availH / this.puzzle.size)), 36, 100);
    const boardPx = cell * this.puzzle.size;
    return {
      cell,
      boardX: Math.floor((this.scale.width - boardPx) / 2),
      boardY: Math.floor(this.wordAreaH - 8 + (availH - boardPx) / 2),
    };
  }

  private buildBoard(): void {
    this.children.removeAll(true);
    this.pillsByWord.clear();
    this.pillsOrder = [];
    this.wordColors = new Map(
      this.puzzle.words.map((placed, index) => [placed.word, WORD_FOUND_COLORS[index % WORD_FOUND_COLORS.length]]),
    );

    const layout = this.computeLayout();
    this.cell = layout.cell;
    this.boardX = layout.boardX;
    this.boardY = layout.boardY;

    this.headerText = this.add
      .text(this.scale.width / 2, 28, `NIVEL ${this.level.id} 🌱`, {
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
    this.selection = new WordSelection(this.tiles, this.level.directions, this.cell, maxSteps);

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
    const layout = this.wordListLayout();
    const padY = 7;

    this.pillsOrder = this.puzzle.words.map((placed) => {
      const label = this.add.text(0, 0, placed.word, {
        fontFamily: FONT,
        fontSize: `${layout.fontSize}px`,
        color: INK.body,
        fontStyle: 'bold',
        resolution: DPR,
      });
      const w = layout.columnW;
      const h = label.height + padY * 2;
      const container = this.add.container(0, 0);
      const rect = this.add.graphics();
      rect.fillStyle(FILLS.panel, 0.88);
      rect.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      rect.lineStyle(2, FILLS.panelBorder, 0.8);
      rect.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
      container.add(rect);
      label.setOrigin(0.5);
      container.add(label);
      container.setSize(w, h);
      const pill = { container, label, rect, w, h };
      this.pillsByWord.set(placed.word, pill);
      return pill;
    });

    this.wordCounter = this.add
      .text(this.scale.width / 2, 28, `0 / ${this.puzzle.words.length} palabras`, {
        fontFamily: FONT,
        fontSize: '18px',
        color: INK.body,
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(0.5);

    this.recenterPills();
  }

  private recenterPills(): void {
    const layout = this.wordListLayout();
    const startX = (this.scale.width - (layout.columns * layout.columnW + (layout.columns - 1) * layout.gap)) / 2;
    for (let index = 0; index < this.pillsOrder.length; index++) {
      const pill = this.pillsOrder[index];
      const row = Math.floor(index / layout.columns);
      const col = index % layout.columns;
      pill.container.setPosition(
        startX + col * (layout.columnW + layout.gap) + layout.columnW / 2,
        57 + row * (pill.h + layout.gap) + pill.h / 2,
      );
    }
    this.wordCounter?.setPosition(this.scale.width / 2, 28);
  }

  private wordListLayout(): { columns: number; columnW: number; gap: number; fontSize: number; areaH: number } {
    const gap = 8;
    const fontSize = this.scale.width < 400 ? 18 : 21;
    const availableW = this.scale.width - LAYOUT.margin * 2;
    const longestWord = Math.max(...this.puzzle.words.map((placed) => placed.word.length));
    const minPillW = Math.ceil(longestWord * fontSize * 0.64 + 20);
    let columns = Math.min(3, this.puzzle.words.length);
    while (columns > 1 && (availableW - gap * (columns - 1)) / columns < minPillW) columns--;
    const columnW = Math.floor((availableW - gap * (columns - 1)) / columns);
    const rowH = fontSize + 14;
    const rows = Math.ceil(this.puzzle.words.length / columns);
    return { columns, columnW, gap, fontSize, areaH: 57 + rows * rowH + Math.max(0, rows - 1) * gap + 10 };
  }

  private markPillFound(word: string): void {
    const pill = this.pillsByWord.get(word);
    if (!pill) return;
    const color = this.wordColors.get(word) ?? WORD_FOUND_COLORS[0];
    pill.rect.clear();
    pill.rect.fillStyle(color.fill, 0.88);
    pill.rect.fillRoundedRect(-pill.w / 2, -pill.h / 2, pill.w, pill.h, 14);
    pill.rect.lineStyle(2, color.stroke, 1);
    pill.rect.strokeRoundedRect(-pill.w / 2, -pill.h / 2, pill.w, pill.h, 14);
    pill.label.setColor(INK.dark);
    const line = this.add
      .rectangle(pill.label.x, pill.label.y + 3, pill.label.width + 10, 3, color.stroke, 1)
      .setDepth(5);
    const check = this.add
      .text(pill.label.x - pill.label.width / 2 - 14, pill.label.y, '✓', {
        fontFamily: FONT,
        fontSize: '24px',
        color: `#${color.stroke.toString(16).padStart(6, '0')}`,
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
    this.wordAreaH = this.wordListLayout().areaH;
    const availH = this.scale.height - this.wordAreaH - LAYOUT.bottomH;
    const boardPx = this.cell * this.puzzle.size;
    this.boardX = Math.floor((this.scale.width - boardPx) / 2);
    this.boardY = Math.floor(this.wordAreaH - 8 + (availH - boardPx) / 2);

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

  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isComplete) return;
    this.hasInteracted = true;
    this.gestureHintTween?.stop();
    this.gestureHintTween = null;
    this.gestureHint?.destroy();
    this.gestureHint = null;

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

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerDown || !this.selection.isActive() || this.isComplete) return;

    this.selection.moveTo(pointer.worldX, pointer.worldY);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    this.pointerDown = false;
    if (!this.selection.isActive() || this.isComplete) return;

    // En arrastres rápidos algunos navegadores no emiten un pointermove final.
    // El punto del levantamiento es la fuente de verdad para cerrar el gesto.
    this.selection.moveTo(pointer.worldX, pointer.worldY);

    const cells = this.selection.tiles.map((tile) => ({ row: tile.row, col: tile.col }));
    const remaining = this.puzzle.words.filter((word) => !this.foundWords.has(word.word));
    const placed = matchSelection(cells, remaining);

    if (placed) {
      this.onWordFound(placed);
    } else {
      // Un toque breve no es un error: solo cuenta una selección de dos o más letras.
      if (this.selection.length > 1) this.session.registerError();
      for (const tile of this.selection.tiles) tile.shake();
    }
    this.selection.clear();
  }

  private onWordFound(placed: PlacedWord): void {
    const color = this.wordColors.get(placed.word) ?? WORD_FOUND_COLORS[0];
    for (const tile of this.selection.tiles) {
      tile.setFoundColor(color.fill, color.stroke);
      tile.pop();
    }

    this.foundWords.add(placed.word);
    this.session.wordFound(placed.word);
    this.wordCounter?.setText(`${this.foundWords.size} / ${this.puzzle.words.length} palabras`);
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
    this.gestureHintTween = this.tweens.add({
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
    const result = this.session.complete();
    const totalScore = runProgress.add(result.score);
    this.scene.start('Result', { result, totalScore });
  }

  private showFirstGestureHint(): void {
    if (this.hasInteracted || this.isComplete || this.gestureHint || this.puzzle.words.length === 0) return;
    const example = this.puzzle.words[0];
    const start = this.tiles[example.start.row]?.[example.start.col];
    const end = this.tiles[example.end.row]?.[example.end.col];
    if (!start || !end) return;

    const hint = this.add.graphics().setDepth(80);
    this.gestureHint = hint;
    const progress = { value: 0 };
    this.tweens.add({
      targets: progress,
      value: 1,
      duration: 1100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        const x = Phaser.Math.Linear(start.x, end.x, progress.value);
        const y = Phaser.Math.Linear(start.y, end.y, progress.value);
        hint.clear();
        hint.lineStyle(7, 0xfb8c00, 0.75);
        hint.lineBetween(start.x, start.y, x, y);
        hint.fillStyle(0xfb8c00, 0.95);
        hint.fillCircle(x, y, 11);
      },
    });
  }
}
