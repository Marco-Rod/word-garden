import { levelSystem } from '../../core/progression/levelProgression';
import { progressSystem } from '../../core/progression/playerProgression';
import type { LevelProgress } from '../../core/progression/ProgressRepository';
import { themeForLevel } from '../../data/themes';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MOBILE_NODE_SPACING = 180;
const DESKTOP_NODE_SPACING = 130;

interface NodePosition {
  id: number;
  x: number;
  y: number;
  radius: number;
  unlocked: boolean;
  record?: LevelProgress;
}

const element = <Tag extends keyof SVGElementTagNameMap>(tag: Tag, attributes: Record<string, string | number> = {}): SVGElementTagNameMap[Tag] => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
};

const addText = (parent: SVGElement, x: number, y: number, value: string, size: number, fill: string, weight = 700): SVGTextElement => {
  const text = element('text', {
    x,
    y,
    fill,
    'font-family': 'Arial, sans-serif',
    'font-size': size,
    'font-weight': weight,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
  });
  text.textContent = value;
  parent.append(text);
  return text;
};

/**
 * Capa SVG para el mapa: conserva el canvas de Phaser para el juego y mueve
 * sólo UI/vector a la capa que Safari rasteriza con su propia densidad.
 */
export class SvgMapView {
  private readonly root = document.createElement('div');
  private readonly svg = element('svg');
  private mapGroup: SVGGElement | null = null;
  private nodes: NodePosition[] = [];
  private mapOffset = 0;
  private mapHeight = 0;
  private dragStartY: number | null = null;
  private mapOffsetAtDragStart = 0;
  private dragged = false;

  constructor(private readonly onLevelSelected: (levelId: number) => void) {
    this.root.className = 'word-garden-svg-map';
    this.root.append(this.svg);
    this.svg.setAttribute('aria-label', 'Mapa de niveles');
    this.svg.style.touchAction = 'none';
    document.body.append(this.root);
    this.svg.addEventListener('pointerdown', this.onPointerDown);
    this.svg.addEventListener('pointermove', this.onPointerMove);
    this.svg.addEventListener('pointerup', this.onPointerUp);
    this.svg.addEventListener('pointercancel', this.cancelDrag);
    this.refresh(true);
  }

  refresh(centerOnProgress = false): void {
    const width = Math.max(1, Math.round(window.visualViewport?.width ?? window.innerWidth));
    const height = Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight));
    const mobile = width < 500;
    const spacing = mobile ? MOBILE_NODE_SPACING : DESKTOP_NODE_SPACING;
    this.mapHeight = spacing * Math.max(0, levelSystem.all().length - 1) + 300;
    const progress = progressSystem.snapshot();
    if (centerOnProgress || this.mapOffset === 0) this.mapOffset = this.offsetNearLevel(Math.min(progress.highestUnlockedLevel, levelSystem.all().length), height, spacing);

    this.svg.replaceChildren();
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.append(element('rect', { width, height, fill: '#8fd3ff' }));

    const map = element('g', { transform: `translate(0 ${this.mapOffset})` });
    this.mapGroup = map;
    this.svg.append(map);

    this.nodes = levelSystem.all().map((level, index) => ({
      id: level.id,
      x: this.pathX(index, width),
      y: this.mapHeight - 150 - index * spacing,
      radius: (level.id === levelSystem.all()[levelSystem.all().length - 1]?.id ? 53 : 40) * (mobile ? 1.25 : 1),
      unlocked: progressSystem.isUnlocked(level.id),
      record: progress.levels[level.id],
    }));
    this.drawTerrain(map, width, spacing);
    this.drawPath(map);
    for (const node of this.nodes) this.drawNode(map, node);
    this.drawHeader(width, height, progressSystem.totalStars());
  }

  destroy(): void {
    this.svg.removeEventListener('pointerdown', this.onPointerDown);
    this.svg.removeEventListener('pointermove', this.onPointerMove);
    this.svg.removeEventListener('pointerup', this.onPointerUp);
    this.svg.removeEventListener('pointercancel', this.cancelDrag);
    this.root.remove();
  }

  private drawTerrain(parent: SVGElement, width: number, spacing: number): void {
    const mapBackground = element('rect', { width, height: this.mapHeight, fill: '#8fd3ff' });
    parent.append(mapBackground);
    for (const themeStart of [1, 6, 11, 16]) {
      const members = this.nodes.filter((node) => node.id >= themeStart && node.id < themeStart + 5);
      if (members.length === 0) continue;
      const top = Math.min(...members.map((node) => node.y)) - spacing / 2;
      const bottom = Math.max(...members.map((node) => node.y)) + spacing / 2;
      this.drawBiome(parent, width, top, bottom, themeForLevel(themeStart)?.id ?? 'garden');
    }
    // Líneas muy suaves marcan el paso de un nivel al siguiente; las más
    // visibles anuncian el cambio de mundo cada cinco niveles.
    for (let index = 0; index < this.nodes.length - 1; index++) {
      const y = (this.nodes[index].y + this.nodes[index + 1].y) / 2;
      const changingTheme = themeForLevel(this.nodes[index].id)?.id !== themeForLevel(this.nodes[index + 1].id)?.id;
      parent.append(element('path', { d: `M 0 ${y} Q ${width / 2} ${y - 18} ${width} ${y}`, fill: 'none', stroke: changingTheme ? '#ffffff' : '#4f8f63', 'stroke-width': changingTheme ? 5 : 1.5, opacity: changingTheme ? '.72' : '.18', 'stroke-dasharray': changingTheme ? '11 8' : '5 12' }));
      if (changingTheme) addText(parent, width / 2, y - 22, themeForLevel(this.nodes[index + 1].id)?.name.toUpperCase() ?? '', 14, '#1b4f72');
    }
  }

  private drawBiome(parent: SVGElement, width: number, top: number, bottom: number, theme: string): void {
    const palettes: Record<string, { fill: string; wave: string; detail: string }> = {
      garden: { fill: '#dcedc8', wave: '#b9dc8f', detail: '#66a94a' },
      trail: { fill: '#f7dfab', wave: '#f3c87b', detail: '#b8834c' },
      forest: { fill: '#b9dca7', wave: '#78aa67', detail: '#356b3b' },
      space: { fill: '#b7b5e2', wave: '#8582c6', detail: '#4f4a91' },
    };
    const palette = palettes[theme];
    parent.append(element('path', { d: `M 0 ${top} Q ${width * .28} ${top - 26} ${width * .54} ${top + 10} T ${width} ${top} V ${bottom} Q ${width * .72} ${bottom + 22} ${width * .42} ${bottom - 8} T 0 ${bottom} Z`, fill: palette.fill }));
    parent.append(element('path', { d: `M 0 ${top + 42} Q ${width * .3} ${top + 10} ${width * .62} ${top + 50} T ${width} ${top + 32} V ${top + 92} Q ${width * .72} ${top + 65} ${width * .4} ${top + 98} T 0 ${top + 78} Z`, fill: palette.wave, opacity: '.38' }));
    for (let index = 0; index < 6; index++) {
      const x = index % 2 ? width - 34 - (index % 3) * 20 : 34 + (index % 3) * 24;
      const y = top + 105 + index * ((bottom - top - 170) / 5);
      const decoration = element('g', { opacity: '.9' });
      if (theme === 'garden') {
        decoration.append(element('ellipse', { cx: x, cy: y + 8, rx: 10, ry: 15, fill: palette.detail }));
        decoration.append(element('circle', { cx: x + 5, cy: y - 4, r: 7, fill: '#ff8a9a' }));
        decoration.append(element('circle', { cx: x + 5, cy: y - 4, r: 2.5, fill: '#fff3a3' }));
      } else if (theme === 'trail') {
        decoration.append(element('ellipse', { cx: x, cy: y, rx: 14, ry: 9, fill: '#a1887f' }));
        decoration.append(element('ellipse', { cx: x - 3, cy: y - 2, rx: 6, ry: 3, fill: '#d7ccc8' }));
      } else if (theme === 'forest') {
        decoration.append(element('rect', { x: x - 3, y, width: 6, height: 24, rx: 2, fill: '#6d4c41' }));
        decoration.append(element('path', { d: `M ${x} ${y - 34} L ${x - 20} ${y + 3} L ${x + 20} ${y + 3} Z`, fill: palette.detail }));
        decoration.append(element('path', { d: `M ${x} ${y - 18} L ${x - 17} ${y + 14} L ${x + 17} ${y + 14} Z`, fill: '#4f8f43' }));
      } else {
        decoration.append(element('circle', { cx: x, cy: y, r: 3, fill: '#ffffff' }));
        decoration.append(element('circle', { cx: x + 12, cy: y - 16, r: 1.8, fill: '#fff9c4' }));
        if (index % 2 === 0) decoration.append(element('circle', { cx: x - 9, cy: y + 18, r: 7, fill: '#d9d7ff', opacity: '.75' }));
      }
      parent.append(decoration);
    }
  }

  private drawPath(parent: SVGElement): void {
    for (let index = 0; index < this.nodes.length - 1; index++) {
      const start = this.nodes[index];
      const end = this.nodes[index + 1];
      const theme = themeForLevel(end.id)?.id ?? 'garden';
      const palette = routePalette(theme);
      const d = routeCurve(start, end, index);
      const common = { d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
      parent.append(element('path', { ...common, stroke: palette.edge, 'stroke-width': 27, opacity: '.55', ...(palette.dash ? { 'stroke-dasharray': palette.dash } : {}) }));
      parent.append(element('path', { ...common, stroke: palette.base, 'stroke-width': 20, ...(palette.dash ? { 'stroke-dasharray': palette.dash } : {}) }));
      parent.append(element('path', { ...common, stroke: palette.highlight, 'stroke-width': 2.5, opacity: '.72', ...(palette.dash ? { 'stroke-dasharray': palette.highlightDash ?? palette.dash } : {}) }));
    }
  }

  private drawNode(parent: SVGElement, node: NodePosition): void {
    const group = element('g', { transform: `translate(${node.x} ${node.y})` });
    const completed = !!node.record?.completed;
    const challenge = node.id === levelSystem.all()[levelSystem.all().length - 1]?.id;
    const fill = completed ? '#81c784' : node.unlocked ? '#ffcc80' : '#90a4ae';
    const stroke = completed ? '#2e7d32' : node.unlocked ? '#ef6c00' : '#607d8b';
    if (challenge && node.unlocked) group.append(element('circle', { r: node.radius + 15, fill: '#ffe082', opacity: '.48' }));
    group.append(element('circle', { r: node.radius, fill, opacity: node.unlocked ? 1 : '.7', stroke, 'stroke-width': challenge ? 6 : 4 }));
    if (completed) group.append(element('circle', { r: node.radius + 5, fill: 'none', stroke: '#66bb6a', 'stroke-width': 3, opacity: '.9' }));
    if (challenge) group.append(element('circle', { r: node.radius + 8, fill: 'none', stroke: completed ? '#1b5e20' : node.unlocked ? '#f9a825' : '#607d8b', 'stroke-width': 3, opacity: '.95' }));
    if (completed) {
      addText(group, 0, -5, String(node.id), challenge ? 29 : 25, '#1b4f72');
      addText(group, 0, node.radius + 22, `${'★'.repeat(node.record?.bestStars ?? 0)}${'☆'.repeat(3 - (node.record?.bestStars ?? 0))}`, 20, '#f9a825');
      addText(group, node.radius * .72, -node.radius * .56, (node.record?.bestStars ?? 0) === 3 ? '✿' : (node.record?.bestStars ?? 0) === 2 ? '♣' : '♧', 23, '#2e7d32');
    } else if (node.unlocked) {
      addText(group, 0, -7, challenge ? '★' : '▶', challenge ? 25 : 21, '#1b4f72');
      addText(group, 0, 20, String(node.id), challenge ? 27 : 22, '#1b4f72');
      if (challenge) addText(group, 0, node.radius + 26, 'DESAFÍO', 16, '#1b4f72');
    } else {
      addText(group, 0, -7, '🔒', 20, '#ffffff');
      addText(group, 0, 20, String(node.id), 21, '#ffffff');
    }
    parent.append(group);
  }

  private drawHeader(width: number, height: number, stars: number): void {
    const compact = width < 500;
    const headerH = compact ? 64 : 70;
    const header = element('g', { 'pointer-events': 'none' });
    header.append(element('rect', { x: 16, y: 10, width: width - 32, height: headerH, rx: compact ? 18 : 22, fill: '#ffffff', stroke: '#ffca28', 'stroke-width': 3 }));
    addText(header, width / 2, compact ? 31 : 35, 'WORD GARDEN', compact ? 24 : 27, '#1b4f72');
    addText(header, width / 2, compact ? 53 : 62, `★  ${stars} / ${levelSystem.all().length * 3}`, compact ? 17 : 18, '#5d4037');
    addText(header, width / 2, height - 20, 'DESLIZA PARA EXPLORAR', 14, '#1b4f72');
    this.svg.append(header);
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.dragStartY = this.toLocalY(event);
    this.mapOffsetAtDragStart = this.mapOffset;
    this.dragged = false;
    this.svg.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.dragStartY === null) return;
    const distance = this.toLocalY(event) - this.dragStartY;
    if (Math.abs(distance) > 6) this.dragged = true;
    this.mapOffset = this.clampOffset(this.mapOffsetAtDragStart + distance);
    this.updateMapTransform();
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.dragStartY === null) return;
    const wasDragged = this.dragged;
    this.cancelDrag();
    if (wasDragged) return;
    const point = this.toLocalPoint(event);
    const node = this.nodes.find((candidate) => {
      const dx = point.x - candidate.x;
      const dy = point.y - (candidate.y + this.mapOffset);
      return candidate.unlocked && dx * dx + dy * dy <= (candidate.radius + 16) ** 2;
    });
    if (node) this.onLevelSelected(node.id);
  };

  private cancelDrag = (): void => { this.dragStartY = null; };

  private toLocalPoint(event: PointerEvent): { x: number; y: number } {
    const rect = this.svg.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * this.svg.viewBox.baseVal.width / rect.width, y: (event.clientY - rect.top) * this.svg.viewBox.baseVal.height / rect.height };
  }

  private toLocalY(event: PointerEvent): number { return this.toLocalPoint(event).y; }

  private updateMapTransform(): void { this.mapGroup?.setAttribute('transform', `translate(0 ${this.mapOffset})`); }

  private clampOffset(value: number): number { return Math.min(0, Math.max((this.svg.viewBox.baseVal.height || window.innerHeight) - this.mapHeight + 20, value)); }

  private pathX(index: number, width: number): number {
    const amplitudes = [-.26, .18, -.12, .28, .08, -.24, .2, -.16, .25, 0];
    const amplitude = amplitudes[index % amplitudes.length];
    return width / 2 + width * amplitude;
  }

  private offsetNearLevel(levelId: number, height: number, spacing: number): number {
    const nodeY = this.mapHeight - 150 - Math.max(0, levelId - 1) * spacing;
    return Math.min(0, Math.max(height - this.mapHeight + 20, height * .54 - nodeY));
  }
}

function routePalette(theme: string): { edge: string; base: string; highlight: string; dash?: string; highlightDash?: string } {
  if (theme === 'trail') return { edge: '#b8834c', base: '#f3d18a', highlight: '#ffedc2' };
  if (theme === 'forest') return { edge: '#356b3b', base: '#75a84d', highlight: '#c9e69a' };
  if (theme === 'space') return { edge: '#394377', base: '#7674bd', highlight: '#ddd9ff', dash: '18 9', highlightDash: '3 24' };
  return { edge: '#55874a', base: '#9ccc65', highlight: '#e4f6b7' };
}

function routeCurve(start: Pick<NodePosition, 'x' | 'y'>, end: Pick<NodePosition, 'x' | 'y'>, index: number): string {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  // Desplazamiento perpendicular pequeño y alternado: sigue siendo un camino
  // predecible, pero evita el aspecto de tubería recta entre nodos.
  const bend = (index % 2 === 0 ? 1 : -1) * Math.min(42, length * .18);
  const controlX = midX + (-dy / length) * bend;
  const controlY = midY + (dx / length) * bend;
  return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
}
