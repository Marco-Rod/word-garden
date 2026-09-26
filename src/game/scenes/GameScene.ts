import Phaser from 'phaser';
import { generatePuzzle } from '../../core/puzzle/generator';
import { matchSelection } from '../../core/puzzle/selection';
import { levelSystem } from '../../core/progression/levelProgression';
import { progressSystem } from '../../core/progression/playerProgression';
import type { LevelDefinition, PlacedWord, Puzzle } from '../../core/puzzle/types';
import { FILLS, FONT, INK, LAYOUT, WORD_FOUND_COLORS } from '../config';
import { getLayoutMetrics } from '../layout/ResponsiveLayout';
import { LetterTile } from '../objects/LetterTile';
import { TouchDebugOverlay } from '../objects/TouchDebugOverlay';
import { isLayoutDebugEnabled, LayoutDebugOverlay } from '../objects/LayoutDebugOverlay';
import { createSafeText } from '../objects/SafeText';
import { WordSelection } from '../objects/WordSelection';
import { getWordListLayout, SvgBoardView } from '../ui/SvgBoardView';
import { GameSession } from '../session/GameSession';
import { runProgress } from '../session/RunProgress';
import { gameFeedback } from '../feedback/GameFeedback';

interface Pill {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  rect: Phaser.GameObjects.Graphics;
  w: number;
  h: number;
}

interface NavigationButton {
  bounds: Phaser.Geom.Rectangle;
  visual: Phaser.GameObjects.Container;
  action: () => void;
}

export interface GameSceneData {
  levelId: number;
  tutorialAcknowledged?: boolean;
}

const DPR = window.devicePixelRatio || 1;

export class GameScene extends Phaser.Scene {
  private svgBoard: SvgBoardView | null = null;
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
  private layoutDebugOverlay: LayoutDebugOverlay | null = null;
  private menuButton: NavigationButton | null = null;
  private pauseButtons: NavigationButton[] = [];
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private paused = false;

  private headerText: Phaser.GameObjects.Text | null = null;
  private readonly refreshInputBounds = (): void => this.scale.updateBounds();
  private readonly preventBrowserGesture = (event: TouchEvent): void => {
    if (event.touches.length === 1) event.preventDefault();
  };

  constructor() {
    super('Game');
  }

  create(data: GameSceneData): void {
    const requestedLevel = levelSystem.get(data.levelId);
    if (!requestedLevel) throw new Error(`Unknown level ${data.levelId}`);
    if (!progressSystem.isUnlocked(data.levelId)) {
      this.scene.start('LevelMap');
      return;
    }
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
    this.svgBoard = new SvgBoardView(this.puzzle.grid, this.puzzle.words.map((word) => word.word), this.level.id, () => ({ width: this.scale.width, height: this.scale.height, x: this.boardX, y: this.boardY, cell: this.cell }), {
      start: (row, col) => this.startSvgSelection(row, col),
      move: (row, col) => this.moveSvgSelection(row, col),
      end: (row, col) => this.endSvgSelection(row, col),
    }, { menu: () => this.openPauseMenu(), sound: () => gameFeedback.toggleMuted(), muted: () => gameFeedback.isMuted(), pause: (action) => this.handleSvgPause(action) });
    this.menuButton?.visual.setVisible(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.svgBoard?.destroy());
    // Safari conserva gestos de historial incluso con touch-action en algunos
    // bordes. Durante juego bloqueamos el scroll/arrastre del documento.
    document.addEventListener('touchmove', this.preventBrowserGesture, { passive: false });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener('touchmove', this.preventBrowserGesture));
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
    const responsive = getLayoutMetrics(this.scale);
    const availW = responsive.contentWidth;
    this.wordAreaH = this.wordListLayout().areaH;
    const availH = this.scale.height - this.wordAreaH - LAYOUT.bottomH;
    const cell = Phaser.Math.Clamp(Math.floor(Math.min(availW / this.puzzle.size, availH / this.puzzle.size)), 40, 112);
    const boardPx = cell * this.puzzle.size;
    return {
      cell,
      boardX: Math.floor((this.scale.width - boardPx) / 2),
      boardY: Math.floor(this.wordAreaH + Math.max(12, (availH - boardPx) * 0.08)),
    };
  }

  private buildBoard(): void {
    this.layoutDebugOverlay?.destroy();
    this.layoutDebugOverlay = null;
    this.children.removeAll(true);
    this.menuButton = null;
    this.pauseButtons = [];
    this.pauseOverlay = null;
    this.paused = false;
    this.pillsByWord.clear();
    this.pillsOrder = [];
    this.wordColors = new Map(
      this.puzzle.words.map((placed, index) => [placed.word, WORD_FOUND_COLORS[index % WORD_FOUND_COLORS.length]]),
    );

    const layout = this.computeLayout();
    this.cell = layout.cell;
    this.boardX = layout.boardX;
    this.boardY = layout.boardY;

    this.headerText = createSafeText(this, this.scale.width / 2, getLayoutMetrics(this.scale).isCompact ? 18 : 24, `NIVEL ${this.level.id} 🌱`, {
        fontFamily: FONT,
        fontSize: getLayoutMetrics(this.scale).isCompact ? '22px' : '30px',
        color: INK.dark,
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(0.5);

    this.buildPills();
    this.buildMenuButton();

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
    // El tablero visible lo dibuja SVG; estos objetos conservan el modelo y la
    // lógica de selección ya probada sin renderizar un segundo tablero.
    for (const row of this.tiles) for (const tile of row) tile.setVisible(false);
    this.headerText?.setVisible(false);
    this.wordCounter?.setVisible(false);
    this.pillsOrder.forEach((pill) => pill.container.setVisible(false));

    if (isLayoutDebugEnabled() && this.headerText && this.wordCounter) {
      this.layoutDebugOverlay = new LayoutDebugOverlay(this);
      this.layoutDebugOverlay.track('Game.levelTitle', this.headerText);
      this.layoutDebugOverlay.track('Game.wordProgress', this.wordCounter);
    }
  }

  private buildPills(): void {
    const layout = this.wordListLayout();
    const padY = this.scale.width < 500 ? 10 : 9;

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

    this.wordCounter = createSafeText(this, this.scale.width / 2, getLayoutMetrics(this.scale).isCompact ? 47 : 47, `0 / ${this.puzzle.words.length} palabras`, {
        fontFamily: FONT,
        fontSize: getLayoutMetrics(this.scale).isCompact ? '16px' : '18px',
        color: INK.body,
        fontStyle: 'bold',
        resolution: DPR,
      })
      .setOrigin(0.5);

    this.recenterPills();
    this.svgBoard?.refresh();
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
        58 + row * (pill.h + layout.gap) + pill.h / 2,
      );
    }
    this.wordCounter?.setPosition(this.scale.width / 2, getLayoutMetrics(this.scale).isCompact ? 47 : 47);
  }

  private buildMenuButton(): void {
    const size = getLayoutMetrics(this.scale).isCompact ? 38 : 42;
    const x = this.scale.width - size / 2 - 8;
    const y = getLayoutMetrics(this.scale).isCompact ? 22 : 26;
    const visual = this.add.container(x, y).setDepth(60);
    const background = this.add.graphics();
    background.fillStyle(FILLS.panel, 0.96);
    background.fillRoundedRect(-size / 2, -size / 2, size, size, 13);
    background.lineStyle(2, FILLS.panelBorder, 1);
    background.strokeRoundedRect(-size / 2, -size / 2, size, size, 13);
    const icon = createSafeText(this, 0, -2, '☰', { fontFamily: FONT, fontSize: `${Math.round(size * 0.56)}px`, color: INK.dark, fontStyle: 'bold', resolution: DPR }).setOrigin(0.5);
    visual.add([background, icon]);
    this.menuButton = {
      bounds: new Phaser.Geom.Rectangle(x - size / 2, y - size / 2, size, size),
      visual,
      action: () => this.openPauseMenu(),
    };
  }

  private openPauseMenu(): void {
    if (this.paused || this.isComplete) return;
    this.paused = true;
    this.pointerDown = false;
    this.selection.clear();
    this.gestureHintTween?.stop();
    this.gestureHint?.destroy();
    this.gestureHint = null;
    if (this.svgBoard) {
      this.svgBoard.showPause();
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const compact = getLayoutMetrics(this.scale).isCompact;
    const cx = width / 2;
    const cy = height / 2;
    const panelW = Math.min(width - (compact ? 34 : 72), 390);
    const panelH = compact ? 300 : 322;
    const overlay = this.add.container(cx, cy).setDepth(200);
    const shade = this.add.graphics();
    shade.fillStyle(0x12354b, 0.56);
    shade.fillRect(-cx, -cy, width, height);
    const panel = this.add.graphics();
    panel.fillStyle(FILLS.panel, 0.98);
    panel.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 28);
    panel.lineStyle(4, FILLS.panelBorder, 1);
    panel.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 28);
    overlay.add([shade, panel]);
    overlay.add(createSafeText(this, 0, -panelH / 2 + 45, 'PAUSA', { fontFamily: FONT, fontSize: compact ? '28px' : '32px', color: INK.dark, fontStyle: 'bold', resolution: DPR }).setOrigin(0.5));
    overlay.add(createSafeText(this, 0, -panelH / 2 + 77, `Nivel ${this.level.id}`, { fontFamily: FONT, fontSize: compact ? '17px' : '19px', color: INK.body, resolution: DPR }).setOrigin(0.5));
    this.pauseOverlay = overlay;
    this.pauseButtons = [];
    this.addPauseButton(overlay, 0, -25, 'CONTINUAR', false, () => this.closePauseMenu());
    this.addPauseButton(overlay, 0, 48, 'REINICIAR NIVEL', true, () => this.scene.restart({ levelId: this.level.id, tutorialAcknowledged: true }));
    this.addPauseButton(overlay, 0, 121, 'VOLVER AL MAPA', true, () => this.scene.start('LevelMap'));
  }

  private addPauseButton(overlay: Phaser.GameObjects.Container, x: number, y: number, label: string, secondary: boolean, action: () => void): void {
    const compact = getLayoutMetrics(this.scale).isCompact;
    const width = Math.min(this.scale.width - 82, 300);
    const height = compact ? 54 : 58;
    const visual = this.add.container(x, y);
    const background = this.add.graphics();
    background.fillStyle(secondary ? FILLS.panelBorder : FILLS.button, 1);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 17);
    visual.add([background, createSafeText(this, 0, 0, label, { fontFamily: FONT, fontSize: compact ? '18px' : '20px', color: '#ffffff', fontStyle: 'bold', resolution: DPR }).setOrigin(0.5)]);
    overlay.add(visual);
    this.pauseButtons.push({
      bounds: new Phaser.Geom.Rectangle(this.scale.width / 2 + x - width / 2, this.scale.height / 2 + y - height / 2, width, height),
      visual,
      action,
    });
  }

  private closePauseMenu(): void {
    if (this.svgBoard) this.svgBoard.hidePause();
    this.pauseOverlay?.destroy(true);
    this.pauseOverlay = null;
    this.pauseButtons = [];
    this.paused = false;
  }

  private handleSvgPause(action: 'continue' | 'restart' | 'map'): void {
    if (action === 'continue') this.closePauseMenu();
    if (action === 'restart') this.scene.restart({ levelId: this.level.id, tutorialAcknowledged: true });
    if (action === 'map') this.scene.start('LevelMap');
  }

  private wordListLayout(): { columns: number; columnW: number; gap: number; fontSize: number; areaH: number } {
    const layout = getWordListLayout(this.scale.width, this.puzzle.words.map((placed) => placed.word));
    return { columns: layout.columns, columnW: layout.pillW, gap: layout.gap, fontSize: layout.fontSize, areaH: layout.areaH };
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
    const reopenPause = this.paused;
    if (reopenPause) this.closePauseMenu();
    this.wordAreaH = this.wordListLayout().areaH;
    const availH = this.scale.height - this.wordAreaH - LAYOUT.bottomH;
    const boardPx = this.cell * this.puzzle.size;
    this.boardX = Math.floor((this.scale.width - boardPx) / 2);
    this.boardY = Math.floor(this.wordAreaH + Math.max(12, (availH - boardPx) * 0.08));

    for (let row = 0; row < this.tiles.length; row++) {
      for (let col = 0; col < this.tiles[row].length; col++) {
        this.tiles[row][col].setPosition(
          this.boardX + col * this.cell + this.cell / 2,
          this.boardY + row * this.cell + this.cell / 2,
        );
      }
    }

    this.recenterPills();
    this.headerText?.setPosition(this.scale.width / 2, getLayoutMetrics(this.scale).isCompact ? 18 : 24);
    if (this.menuButton) {
      const size = getLayoutMetrics(this.scale).isCompact ? 38 : 42;
      const x = this.scale.width - size / 2 - 8;
      const y = getLayoutMetrics(this.scale).isCompact ? 22 : 26;
      this.menuButton.visual.setPosition(x, y);
      this.menuButton.bounds.setTo(x - size / 2, y - size / 2, size, size);
    }

    if (reopenPause) this.openPauseMenu();

  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const navigation = this.paused
      ? this.pauseButtons.find(({ bounds }) => Phaser.Geom.Rectangle.Contains(bounds, pointer.worldX, pointer.worldY))
      : this.menuButton && Phaser.Geom.Rectangle.Contains(this.menuButton.bounds, pointer.worldX, pointer.worldY)
        ? this.menuButton
        : undefined;
    if (navigation) {
      navigation.visual.setScale(0.96);
      return;
    }
    if (this.paused) return;
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
    gameFeedback.tick();
  }

  private startSvgSelection(row: number, col: number): void {
    if (this.paused || this.isComplete) return;
    const tile = this.tiles[row]?.[col];
    if (!tile) return;
    this.pointerDown = true;
    this.selection.startAt(tile);
    this.svgBoard?.setSelection(this.selection.tiles);
  }

  private moveSvgSelection(row: number, col: number): void {
    if (!this.pointerDown || !this.selection.isActive() || this.isComplete) return;
    const tile = this.tiles[row]?.[col];
    if (!tile) return;
    this.selection.moveTo(tile.x, tile.y);
    this.svgBoard?.setSelection(this.selection.tiles);
  }

  private endSvgSelection(row: number, col: number): void {
    if (!this.pointerDown) return;
    if (row >= 0 && col >= 0) this.moveSvgSelection(row, col);
    this.pointerDown = false;
    if (!this.selection.isActive() || this.isComplete) return;
    const cells = this.selection.tiles.map((tile) => ({ row: tile.row, col: tile.col }));
    const remaining = this.puzzle.words.filter((word) => !this.foundWords.has(word.word));
    const placed = matchSelection(cells, remaining);
    if (placed) this.onWordFound(placed);
    else {
      if (this.selection.length > 1) this.session.registerError();
      if (this.selection.length > 1) gameFeedback.error();
      this.svgBoard?.clearSelection();
    }
    this.selection.clear();
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
    if (this.paused) {
      for (const button of this.pauseButtons) button.visual.setScale(1);
      this.pauseButtons.find(({ bounds }) => Phaser.Geom.Rectangle.Contains(bounds, pointer.worldX, pointer.worldY))?.action();
      return;
    }
    if (this.menuButton && Phaser.Geom.Rectangle.Contains(this.menuButton.bounds, pointer.worldX, pointer.worldY)) {
      this.menuButton.visual.setScale(1);
      this.menuButton.action();
      return;
    }
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
    this.svgBoard?.setWordFound(placed.word);
    this.svgBoard?.setFound(this.selection.tiles, color.fill, color.stroke);
    this.svgBoard?.showFeedback(`${placed.word} ✓`);
    gameFeedback.found();
    for (const tile of this.selection.tiles) {
      tile.setFoundColor(color.fill, color.stroke);
      tile.pop();
    }

    this.foundWords.add(placed.word);
    this.session.wordFound(placed.word);
    this.wordCounter?.setText(`${this.foundWords.size} / ${this.puzzle.words.length} palabras`);
    this.markPillFound(placed.word);

    if (this.foundWords.size === this.puzzle.words.length) {
      this.time.delayedCall(400, () => this.completeLevel());
    }
  }

  private completeLevel(): void {
    this.isComplete = true;
    this.selection.clear();
    const result = this.session.complete();
    gameFeedback.complete();
    progressSystem.completeLevel({
      levelId: result.levelId,
      stars: result.stars as 0 | 1 | 2 | 3,
      score: result.score,
      elapsedSeconds: result.elapsedSeconds,
    });
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
