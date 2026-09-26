import type { Cell } from '../../core/puzzle/types';

interface BoardLayout { width: number; height: number; x: number; y: number; cell: number; }
interface BoardCallbacks { start: (row: number, col: number) => void; move: (row: number, col: number) => void; end: (row: number, col: number) => void; }
interface HudCallbacks { menu: () => void; pause: (action: 'continue' | 'restart' | 'map') => void; }

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
  private onDown = (event: PointerEvent): void => { event.preventDefault(); const action = (event.target as Element).closest('[data-action]')?.getAttribute('data-action'); if (action === 'menu') { this.hudCallbacks.menu(); return; } if (action === 'continue' || action === 'restart' || action === 'map') { this.hudCallbacks.pause(action); return; } const point = this.point(event); if (!point) return; this.active = true; this.svg.setPointerCapture(event.pointerId); this.callbacks.start(point.row, point.col); };
  private onMove = (event: PointerEvent): void => { if (!this.active) return; const point = this.point(event); if (point) this.callbacks.move(point.row, point.col); };
  private onUp = (event: PointerEvent): void => { if (!this.active) return; this.active = false; const point = this.point(event); if (point) this.callbacks.end(point.row, point.col); else this.callbacks.end(-1, -1); };
  private cancel = (): void => { this.active = false; this.callbacks.end(-1, -1); };

  private drawHud(width: number): void {
    const header = create('g', { 'pointer-events': 'none' }); this.addText(header, width / 2, 18, `NIVEL ${this.levelId}`, 22, '#1b4f72'); this.addText(header, width / 2, 47, `${this.foundWords.size} / ${this.words.length} palabras`, 16, '#5d4037'); this.svg.append(header);
    const menu = create('g', { 'data-action': 'menu', 'pointer-events': 'all' }); menu.append(create('rect', { x: width - 46, y: 3, width: 38, height: 38, rx: 13, fill: '#ffffff', stroke: '#ffca28', 'stroke-width': 2 })); this.addText(menu, width - 27, 21, '☰', 24, '#1b4f72'); this.svg.append(menu);
    const fontSize = 22; const gap = 10; const available = width - 60; const longest = Math.max(...this.words.map((word) => word.length)); const minW = longest * fontSize * .64 + 28; let columns = Math.min(3, this.words.length); while (columns > 1 && (available - gap * (columns - 1)) / columns < minW) columns--; const pillW = Math.floor((available - gap * (columns - 1)) / columns);
    this.words.forEach((word, index) => { const row = Math.floor(index / columns); const col = index % columns; const x = (width - (columns * pillW + (columns - 1) * gap)) / 2 + col * (pillW + gap); const y = 58 + row * 54; const found = this.foundWords.has(word); const group = create('g', { 'pointer-events': 'none' }); group.append(create('rect', { x, y, width: pillW, height: 42, rx: 14, fill: found ? '#a5d6a7' : '#ffffff', 'fill-opacity': '.92', stroke: found ? '#2e7d32' : '#ffca28', 'stroke-width': 2 })); this.addText(group, x + pillW / 2, y + 21, found ? `✓ ${word}` : word, fontSize, '#5d4037'); this.svg.append(group); });
  }
  private addText(parent: SVGElement, x: number, y: number, value: string, size: number, color: string, weight = 700): void { const text = create('text', { x, y, fill: color, 'font-family': 'Arial, sans-serif', 'font-size': size, 'font-weight': weight, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'pointer-events': 'none' }); text.textContent = value; parent.append(text); }
  private addButton(parent: SVGElement, x: number, y: number, label: string, fill: string, action: string): void { const group = create('g', { 'data-action': action, 'pointer-events': 'all' }); group.append(create('rect', { x: x - 145, y: y - 27, width: 290, height: 54, rx: 17, fill })); this.addText(group, x, y, label, 18, '#ffffff'); parent.append(group); }
}
