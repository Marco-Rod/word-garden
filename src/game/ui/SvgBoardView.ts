import type { Cell } from '../../core/puzzle/types';
import { visualForLevel } from '../../data/themes';

interface BoardLayout { width: number; height: number; x: number; y: number; cell: number; }
interface BoardCallbacks { start: (row: number, col: number) => void; move: (row: number, col: number) => void; end: (row: number, col: number) => void; }
interface HudCallbacks { menu: () => void; sound: () => void; muted: () => boolean; pause: (action: 'continue' | 'restart' | 'map') => void; }

export interface WordListLayout {
  columns: number;
  pillW: number;
  pillH: number;
  gap: number;
  fontSize: number;
  areaH: number;
}

const WORD_LIST_TOP = 58;
const WORD_LIST_SIDE_PADDING = 30;

/**
 * One source of truth for the word chips and the space reserved above the
 * board. Keeping these together prevents a long list from growing into the
 * first row of tiles.
 */
export function getWordListLayout(width: number, words: readonly string[]): WordListLayout {
  const gap = 10;
  const available = Math.max(1, width - WORD_LIST_SIDE_PADDING * 2);
  const longest = Math.max(1, ...words.map((word) => word.length));
  let fontSize = 22;
  let columns = 1;
  let pillW = available;

  // Prefer compact rows, but only when every label still fits inside its chip.
  while (fontSize >= 17) {
    let candidateColumns = Math.min(3, words.length);
    const minimumWidth = Math.ceil(longest * fontSize * .62 + 30);
    while (candidateColumns > 1 && (available - gap * (candidateColumns - 1)) / candidateColumns < minimumWidth) candidateColumns--;
    const candidateWidth = Math.floor((available - gap * (candidateColumns - 1)) / candidateColumns);
    columns = candidateColumns;
    pillW = candidateWidth;
    if (candidateWidth >= minimumWidth) break;
    fontSize--;
  }

  const pillH = Math.max(42, fontSize + 18);
  const rows = Math.ceil(words.length / columns);
  return {
    columns,
    pillW,
    pillH,
    gap,
    fontSize,
    // Includes the last chip plus a safety gutter before the board starts.
    areaH: WORD_LIST_TOP + rows * pillH + Math.max(0, rows - 1) * gap + 16,
  };
}

const NS = 'http://www.w3.org/2000/svg';
const create = <Tag extends keyof SVGElementTagNameMap>(tag: Tag, attrs: Record<string, string | number>): SVGElementTagNameMap[Tag] => {
  const item = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => item.setAttribute(key, String(value)));
  return item;
};

/** SVG render-only board. Selection and validation remain in GameScene. */
export class SvgBoardView {
  private readonly root = document.createElement('div');
  private readonly svg = create('svg', {});
  private readonly cells = new Map<string, SVGRectElement>();
  private readonly foundStyles = new Map<string, { fill: string; stroke: string }>();
  private active = false;
  private feedbackTimer: number | null = null;
  private foundWords = new Set<string>();

  constructor(private readonly grid: string[][], private readonly words: string[], private readonly levelId: number, private readonly layout: () => BoardLayout, private readonly callbacks: BoardCallbacks, private readonly hudCallbacks: HudCallbacks) {
    this.root.className = 'word-garden-svg-board';
    this.root.append(this.svg);
    document.body.append(this.root);
    this.svg.addEventListener('pointerdown', this.onDown);
    this.svg.addEventListener('pointermove', this.onMove);
    this.svg.addEventListener('pointerup', this.onUp);
    this.svg.addEventListener('pointercancel', this.cancel);
    this.refresh();
  }

  refresh(): void {
    const { width, height, x, y, cell } = this.layout();
    this.svg.replaceChildren(); this.cells.clear();
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.drawWorldBackdrop(width, height);
    for (let row = 0; row < this.grid.length; row++) for (let col = 0; col < this.grid[row].length; col++) {
      const key = `${row}:${col}`; const px = x + col * cell; const py = y + row * cell;
      const tile = create('rect', { x: px + 1, y: py + 1, width: cell - 2, height: cell - 2, rx: Math.round(cell * .18), fill: '#ffffff', stroke: '#29b6f6', 'stroke-width': Math.max(2, Math.round(cell * .05)), 'pointer-events': 'all', 'data-cell': key });
      this.svg.append(tile); this.cells.set(key, tile);
      const letter = create('text', { x: px + cell / 2, y: py + cell / 2 + 1, fill: '#5d4037', 'font-family': 'Arial, sans-serif', 'font-size': Math.round(cell * .52), 'font-weight': 700, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'pointer-events': 'none' });
      letter.textContent = this.grid[row][col]; this.svg.append(letter);
    }
    this.drawHud(width);
    this.foundStyles.forEach((style, key) => {
      const [row, col] = key.split(':').map(Number);
      this.paint(row, col, style.fill, style.stroke);
      const tile = this.cells.get(key); if (tile) tile.dataset.found = 'true';
    });
  }

  setSelection(cells: readonly Cell[]): void {
    this.resetIdle();
    for (const cell of cells) this.paint(cell.row, cell.col, '#ffe082', '#fb8c00');
  }

  setFound(cells: readonly Cell[], fill: number, stroke: number): void {
    for (const cell of cells) {
      const tile = this.cells.get(`${cell.row}:${cell.col}`);
      const style = { fill: `#${fill.toString(16).padStart(6, '0')}`, stroke: `#${stroke.toString(16).padStart(6, '0')}` };
      this.foundStyles.set(`${cell.row}:${cell.col}`, style);
      if (tile) tile.dataset.found = 'true';
      this.paint(cell.row, cell.col, style.fill, style.stroke);
    }
  }

  clearSelection(): void { this.resetIdle(); }
  setWordFound(word: string): void { this.foundWords.add(word); this.refresh(); }
  showPause(): void {
    this.svg.querySelector('[data-pause]')?.remove(); const { width, height } = this.layout(); const group = create('g', { 'data-pause': 'true' });
    group.append(create('rect', { width, height, fill: '#12354b', opacity: '.56', 'pointer-events': 'all' }));
    const panelW = Math.min(width - 34, 390); const panelH = 330; const x = width / 2 - panelW / 2; const y = height / 2 - panelH / 2;
    group.append(create('rect', { x, y, width: panelW, height: panelH, rx: 28, fill: '#ffffff', stroke: '#ffca28', 'stroke-width': 4, 'pointer-events': 'all' }));
    this.addText(group, width / 2, y + 46, 'PAUSA', 28, '#1b4f72'); this.addText(group, width / 2, y + 78, `Nivel ${this.levelId}`, 17, '#5d4037', 500);
    [['continue', 'CONTINUAR', '#fb8c00', y + 126], ['restart', 'REINICIAR NIVEL', '#ffca28', y + 199], ['map', 'VOLVER AL MAPA', '#ffca28', y + 272]].forEach(([action, label, fill, by]) => this.addButton(group, width / 2, Number(by), String(label), String(fill), String(action))); this.svg.append(group);
  }
  hidePause(): void { this.svg.querySelector('[data-pause]')?.remove(); }
  showFeedback(value: string): void {
    this.svg.querySelector('[data-feedback]')?.remove();
    if (this.feedbackTimer !== null) window.clearTimeout(this.feedbackTimer);
    const { width, height } = this.layout();
    const group = create('g', { 'data-feedback': 'true', 'pointer-events': 'none' });
    const labelWidth = Math.max(150, value.length * 30);
    group.append(create('rect', { x: width / 2 - labelWidth / 2, y: height / 2 - 42, width: labelWidth, height: 84, rx: 24, fill: '#ffffff', stroke: '#ffca28', 'stroke-width': 4 }));
    const label = create('text', { x: width / 2, y: height / 2 + 2, fill: '#5d4037', 'font-family': 'Arial, sans-serif', 'font-size': 32, 'font-weight': 700, 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
    label.textContent = value; group.append(label); this.svg.append(group);
    this.feedbackTimer = window.setTimeout(() => group.remove(), 1100);
  }
  destroy(): void { if (this.feedbackTimer !== null) window.clearTimeout(this.feedbackTimer); this.svg.removeEventListener('pointerdown', this.onDown); this.svg.removeEventListener('pointermove', this.onMove); this.svg.removeEventListener('pointerup', this.onUp); this.svg.removeEventListener('pointercancel', this.cancel); this.root.remove(); }

  private resetIdle(): void { this.cells.forEach((tile) => { if (tile.dataset.found !== 'true') { tile.setAttribute('fill', '#ffffff'); tile.setAttribute('stroke', '#29b6f6'); } }); }
  private paint(row: number, col: number, fill: string, stroke: string): void { const tile = this.cells.get(`${row}:${col}`); if (!tile) return; tile.setAttribute('fill', fill); tile.setAttribute('stroke', stroke); }
  private point(event: PointerEvent): { row: number; col: number } | null { const rect = this.svg.getBoundingClientRect(); const view = this.svg.viewBox.baseVal; const x = (event.clientX - rect.left) * view.width / rect.width; const y = (event.clientY - rect.top) * view.height / rect.height; const layout = this.layout(); const col = Math.floor((x - layout.x) / layout.cell); const row = Math.floor((y - layout.y) / layout.cell); return this.grid[row]?.[col] ? { row, col } : null; }
  private onDown = (event: PointerEvent): void => { event.preventDefault(); const action = (event.target as Element).closest('[data-action]')?.getAttribute('data-action'); if (action === 'menu') { this.hudCallbacks.menu(); return; } if (action === 'sound') { this.hudCallbacks.sound(); this.refresh(); return; } if (action === 'continue' || action === 'restart' || action === 'map') { this.hudCallbacks.pause(action); return; } const point = this.point(event); if (!point) return; this.active = true; this.svg.setPointerCapture(event.pointerId); this.callbacks.start(point.row, point.col); };
  private onMove = (event: PointerEvent): void => { if (!this.active) return; const point = this.point(event); if (point) this.callbacks.move(point.row, point.col); };
  private onUp = (event: PointerEvent): void => { if (!this.active) return; this.active = false; const point = this.point(event); if (point) this.callbacks.end(point.row, point.col); else this.callbacks.end(-1, -1); };
  private cancel = (): void => { this.active = false; this.callbacks.end(-1, -1); };

  private drawHud(width: number): void {
    const header = create('g', { 'pointer-events': 'none' }); this.addText(header, width / 2, 18, `NIVEL ${this.levelId}`, 22, '#1b4f72'); this.addText(header, width / 2, 47, `${this.foundWords.size} / ${this.words.length} palabras`, 16, '#5d4037'); this.svg.append(header);
    const sound = create('g', { 'data-action': 'sound', 'pointer-events': 'all' }); sound.append(create('rect', { x: 8, y: 3, width: 38, height: 38, rx: 13, fill: '#ffffff', stroke: '#ffca28', 'stroke-width': 2 })); this.addText(sound, 27, 21, this.hudCallbacks.muted() ? '🔇' : '🔊', 18, '#1b4f72'); this.svg.append(sound);
    const menu = create('g', { 'data-action': 'menu', 'pointer-events': 'all' }); menu.append(create('rect', { x: width - 46, y: 3, width: 38, height: 38, rx: 13, fill: '#ffffff', stroke: '#ffca28', 'stroke-width': 2 })); this.addText(menu, width - 27, 21, '☰', 24, '#1b4f72'); this.svg.append(menu);
    const layout = getWordListLayout(width, this.words);
    this.words.forEach((word, index) => {
      const row = Math.floor(index / layout.columns); const col = index % layout.columns;
      const x = (width - (layout.columns * layout.pillW + (layout.columns - 1) * layout.gap)) / 2 + col * (layout.pillW + layout.gap);
      const y = WORD_LIST_TOP + row * (layout.pillH + layout.gap);
      const found = this.foundWords.has(word);
      const label = found ? `✓ ${word}` : word;
      // The label may be slightly narrower than an average glyph estimate.
      // Scaling it per chip guarantees that no word escapes over the board.
      const labelSize = Math.max(16, Math.min(layout.fontSize, (layout.pillW - 26) / Math.max(1, label.length * .62)));
      const group = create('g', { 'pointer-events': 'none' });
      group.append(create('rect', { x, y, width: layout.pillW, height: layout.pillH, rx: 14, fill: found ? '#a5d6a7' : '#ffffff', 'fill-opacity': '.92', stroke: found ? '#2e7d32' : '#ffca28', 'stroke-width': 2 }));
      this.addText(group, x + layout.pillW / 2, y + layout.pillH / 2, label, labelSize, '#5d4037');
      this.svg.append(group);
    });
  }
  private drawWorldBackdrop(width: number, height: number): void {
    const visual = visualForLevel(this.levelId);
    this.svg.append(create('rect', { width, height, fill: visual.boardBackground, 'pointer-events': 'none' }));
    const decorations = create('g', { opacity: '.28', 'pointer-events': 'none' });
    const points = [[34, 310], [width - 34, 370], [42, height - 78], [width - 45, height - 112]];
    for (const [x, y] of points) {
      if (visual.kind === 'water') {
        decorations.append(create('path', { d: `M ${x - 22} ${y} Q ${x - 11} ${y - 9} ${x} ${y} T ${x + 22} ${y}`, fill: 'none', stroke: visual.detail, 'stroke-width': 4 }));
      } else if (visual.kind === 'forest' || visual.kind === 'garden') {
        decorations.append(create('circle', { cx: x, cy: y, r: 18, fill: visual.detail }));
        decorations.append(create('circle', { cx: x + 14, cy: y + 7, r: 13, fill: visual.wave }));
      } else if (visual.kind === 'space' || visual.kind === 'magic') {
        decorations.append(create('circle', { cx: x, cy: y, r: 5, fill: visual.detail }));
        decorations.append(create('circle', { cx: x + 14, cy: y - 16, r: 2.5, fill: '#ffffff' }));
      } else if (visual.kind === 'cloud' || visual.kind === 'ice') {
        decorations.append(create('circle', { cx: x - 9, cy: y + 3, r: 11, fill: '#ffffff' }));
        decorations.append(create('circle', { cx: x + 4, cy: y - 3, r: 15, fill: '#ffffff' }));
      } else if (visual.kind === 'fire') {
        decorations.append(create('path', { d: `M ${x} ${y + 20} C ${x - 18} ${y + 4} ${x - 3} ${y - 22} ${x + 9} ${y - 4} C ${x + 23} ${y + 7} ${x + 9} ${y + 24} ${x} ${y + 20} Z`, fill: visual.detail }));
      } else {
        decorations.append(create('ellipse', { cx: x, cy: y, rx: 22, ry: 12, fill: visual.detail }));
      }
    }
    this.svg.append(decorations);
  }
  private addText(parent: SVGElement, x: number, y: number, value: string, size: number, color: string, weight = 700): void { const text = create('text', { x, y, fill: color, 'font-family': 'Arial, sans-serif', 'font-size': size, 'font-weight': weight, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'pointer-events': 'none' }); text.textContent = value; parent.append(text); }
  private addButton(parent: SVGElement, x: number, y: number, label: string, fill: string, action: string): void { const group = create('g', { 'data-action': action, 'pointer-events': 'all' }); group.append(create('rect', { x: x - 145, y: y - 27, width: 290, height: 54, rx: 17, fill })); this.addText(group, x, y, label, 18, '#ffffff'); parent.append(group); }
}
