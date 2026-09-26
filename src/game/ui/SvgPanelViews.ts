import { levelSystem } from '../../core/progression/levelProgression';
import type { GameSessionResult } from '../session/GameSession';

const NS = 'http://www.w3.org/2000/svg';
const svg = <Tag extends keyof SVGElementTagNameMap>(tag: Tag, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[Tag] => {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
};
const text = (parent: SVGElement, x: number, y: number, value: string, size: number, fill: string, weight = 700): void => {
  const node = svg('text', { x, y, fill, 'font-family': 'Arial, sans-serif', 'font-size': size, 'font-weight': weight, 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
  node.textContent = value;
  parent.append(node);
};

abstract class SvgPanel {
  protected readonly root = document.createElement('div');
  protected readonly canvas = svg('svg');

  constructor() {
    this.root.className = 'word-garden-svg-panel';
    this.root.append(this.canvas);
    document.body.append(this.root);
    this.canvas.style.touchAction = 'none';
  }

  destroy(): void { this.root.remove(); }

  protected dimensions(): { width: number; height: number; compact: boolean } {
    const width = Math.max(1, Math.round(window.visualViewport?.width ?? window.innerWidth));
    const height = Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight));
    this.canvas.setAttribute('viewBox', `0 0 ${width} ${height}`);
    return { width, height, compact: width < 500 };
  }

  protected panel(width: number, height: number, panelH: number): { group: SVGGElement; cx: number; top: number; panelW: number } {
    const cx = width / 2;
    const panelW = Math.min(width - 28, 500);
    const top = (height - panelH) / 2;
    const group = svg('g');
    group.append(svg('rect', { x: cx - panelW / 2, y: top, width: panelW, height: panelH, rx: 28, fill: '#ffffff', 'fill-opacity': '.97', stroke: '#ffca28', 'stroke-width': 4 }));
    this.canvas.append(group);
    return { group, cx, top, panelW };
  }

  protected button(parent: SVGElement, x: number, y: number, width: number, height: number, label: string, fill: string): SVGGElement {
    const group = svg('g');
    const button = svg('rect', { x: x - width / 2, y: y - height / 2, width, height, rx: 20, fill });
    group.append(button); text(group, x, y + 1, label, 22, '#ffffff'); parent.append(group);
    return group;
  }
}

type TutorialType = 'horizontal' | 'vertical' | 'horizontal-vertical' | 'intersection' | 'diagonal' | 'all-directions' | 'final-challenge';

export class SvgTutorialView extends SvgPanel {
  constructor(private readonly levelId: number, private readonly title: string, private readonly message: string, private readonly type: TutorialType, private readonly onPlay: () => void, private readonly onMap: () => void) {
    super();
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.refresh();
  }

  refresh(): void {
    const { width, height, compact } = this.dimensions();
    this.canvas.replaceChildren();
    const panelH = Math.min(height - 36, 480);
    const { group, cx, top, panelW } = this.panel(width, height, panelH);
    text(group, cx, top + 49, this.title, compact ? 26 : 30, '#1b4f72');
    this.message.split('\n').forEach((line, index, all) => text(group, cx, top + 104 + (index - (all.length - 1) / 2) * (compact ? 23 : 26), line, compact ? 20 : 22, '#5d4037', 500));
    this.drawGrid(group, cx, top + panelH * .54, this.type === 'final-challenge');
    const back = svg('g', { 'data-action': 'map' });
    back.append(svg('rect', { x: cx - panelW / 2 + 13, y: top + 13, width: 34, height: 34, rx: 11, fill: '#ffca28' })); text(back, cx - panelW / 2 + 30, top + 29, '←', 24, '#ffffff'); group.append(back);
    this.button(group, cx, top + panelH - 52, Math.min(panelW - 54, 320), 70, this.levelId === 1 ? 'JUGAR' : this.levelId === 10 ? '¡VAMOS!' : 'ENTENDIDO', '#fb8c00').setAttribute('data-action', 'play');
  }

  destroy(): void { this.canvas.removeEventListener('pointerup', this.onPointerUp); super.destroy(); }

  private onPointerUp = (event: PointerEvent): void => {
    const action = (event.target as Element).closest('[data-action]')?.getAttribute('data-action');
    if (action === 'map') this.onMap(); else if (action === 'play') this.onPlay();
  };

  private drawGrid(parent: SVGElement, cx: number, cy: number, compact: boolean): void {
    const cell = compact ? 26 : 30; const gap = compact ? 3 : 4; const total = 5 * cell + 4 * gap; const left = cx - total / 2; const top = cy - total / 2;
    const letters = Array.from({ length: 5 }, () => Array<string>(5).fill('')); const colors = Array.from({ length: 5 }, () => Array<number>(5).fill(-1));
    const word = (value: string, row: number, col: number, dr: number, dc: number, color: number): void => value.split('').forEach((letter, i) => { const r = row + dr * i; const c = col + dc * i; if (r >= 0 && r < 5 && c >= 0 && c < 5) { letters[r][c] = letter; colors[r][c] = color; } });
    if (this.type === 'horizontal') word('CASA', 2, 0, 0, 1, 0);
    if (this.type === 'vertical') word('PATO', 0, 2, 1, 0, 1);
    if (this.type === 'horizontal-vertical') { word('CASA', 1, 0, 0, 1, 0); word('PASA', 0, 1, 1, 0, 1); }
    if (this.type === 'intersection') { word('GATO', 1, 0, 0, 1, 0); word('PATO', 0, 1, 1, 0, 1); }
    if (this.type === 'diagonal') word('GATO', 0, 0, 1, 1, 2);
    if (this.type === 'all-directions' || this.type === 'final-challenge') { word('SOL', 0, 0, 0, 1, 0); word('PATO', 0, 4, 1, 0, 1); word('GATO', 1, 0, 1, 1, 2); }
    const palette = [['#a5d6a7', '#2e7d32'], ['#ffcc80', '#ef6c00'], ['#90caf9', '#1565c0']];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) { const color = colors[row][col] >= 0 ? palette[colors[row][col] % palette.length] : ['#ffffff', '#29b6f6']; const x = left + col * (cell + gap); const y = top + row * (cell + gap); parent.append(svg('rect', { x, y, width: cell, height: cell, rx: 7, fill: color[0], stroke: color[1], 'stroke-width': 2 })); if (letters[row][col]) text(parent, x + cell / 2, y + cell / 2, letters[row][col], compact ? 15 : 17, '#5d4037'); }
  }
}

export class SvgResultView extends SvgPanel {
  constructor(private readonly result: GameSessionResult, private readonly totalScore: number, private readonly onNext: () => void, private readonly onMap: () => void) { super(); this.canvas.addEventListener('pointerup', this.onPointerUp); this.refresh(); }
  refresh(): void {
    const { width, height, compact } = this.dimensions(); this.canvas.replaceChildren(); const final = !levelSystem.next(this.result.levelId); const panelH = Math.min(height - 36, final ? 450 : 510); const { group, cx, top, panelW } = this.panel(width, height, panelH);
    text(group, cx, top + 43, final ? '¡INCREÍBLE!' : '¡MUY BIEN!', compact ? 31 : 36, '#1b4f72');
    text(group, cx, top + 78, final ? 'Completaste todos los niveles' : `NIVEL ${this.result.levelId}`, compact ? 21 : 25, '#5d4037');
    text(group, cx, top + (final ? 145 : 128), `${this.result.stars >= 1 ? '★' : '☆'}  ${this.result.stars >= 2 ? '★' : '☆'}  ${this.result.stars >= 3 ? '★' : '☆'}`, compact ? 37 : 42, '#f9a825');
    const scoreY = top + (final ? 205 : 185); text(group, cx, scoreY, `🏆 ${this.result.score.toLocaleString('es-MX')} puntos`, compact ? 24 : 28, '#1b4f72');
    if (!final) { const stats = [['Palabras', `${this.result.foundWords.length}/${levelSystem.get(this.result.levelId)?.words.length ?? 0}`], ['Tiempo', `${Math.round(this.result.elapsedSeconds)} s`], ['Errores', String(this.result.errors)]]; stats.forEach(([label, value], index) => { text(group, cx - panelW / 2 + 42, scoreY + 48 + index * 30, label, compact ? 18 : 20, '#5d4037', 500); text(group, cx + panelW / 2 - 42, scoreY + 48 + index * 30, value, compact ? 18 : 20, '#1b4f72'); }); }
    const totalY = scoreY + (final ? 62 : 150); text(group, cx, totalY - 9, 'TOTAL DE LA PARTIDA', compact ? 16 : 18, '#1b4f72'); text(group, cx, totalY + 14, `${this.totalScore.toLocaleString('es-MX')} PTS`, compact ? 16 : 18, '#1b4f72');
    if (!final) this.button(group, cx, totalY + 58, Math.min(panelW - 36, 330), compact ? 60 : 66, 'SIGUIENTE NIVEL  ▶', '#fb8c00').setAttribute('data-action', 'next');
    this.button(group, cx, totalY + (final ? 110 : 128), Math.min(panelW - 36, 330), compact ? 60 : 66, 'MAPA', '#ffca28').setAttribute('data-action', 'map');
  }
  destroy(): void { this.canvas.removeEventListener('pointerup', this.onPointerUp); super.destroy(); }
  private onPointerUp = (event: PointerEvent): void => { const action = (event.target as Element).closest('[data-action]')?.getAttribute('data-action'); if (action === 'next') this.onNext(); if (action === 'map') this.onMap(); };
}
