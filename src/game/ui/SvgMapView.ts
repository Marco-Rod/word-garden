import { levelSystem } from '../../core/progression/levelProgression';
import { progressSystem } from '../../core/progression/playerProgression';
import type { LevelProgress } from '../../core/progression/ProgressRepository';

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
    this.mapHeight = spacing * 9 + 300;
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
    this.drawTerrain(map, width);

    this.nodes = levelSystem.all().map((level, index) => ({
      id: level.id,
      x: this.pathX(index, width),
      y: this.mapHeight - 150 - index * spacing,
      radius: (level.id === 10 ? 53 : 40) * (mobile ? 1.25 : 1),
      unlocked: progressSystem.isUnlocked(level.id),
      record: progress.levels[level.id],
    }));
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

  private drawTerrain(parent: SVGElement, width: number): void {
    const mapBackground = element('rect', { width, height: this.mapHeight, fill: '#8fd3ff' });
    parent.append(mapBackground);
    const grass = ['#dcedc8', '#c5e1a5', '#d4eeb5'];
    for (let y = 90, index = 0; y < this.mapHeight + 120; y += 155, index++) {
      parent.append(element('ellipse', { cx: width * 0.18, cy: y, rx: width * 0.49, ry: 63, fill: grass[index % grass.length], opacity: '.94' }));
      parent.append(element('ellipse', { cx: width * 0.8, cy: y + 18, rx: width * 0.44, ry: 58, fill: grass[index % grass.length], opacity: '.94' }));
      parent.append(element('ellipse', { cx: width * (index % 2 ? 0.16 : 0.84), cy: y - 20, rx: width * 0.22, ry: 24, fill: '#9ccc65', opacity: '.2' }));
    }
    // Pocos detalles grandes mantienen la lectura del camino y evitan ruido.
    for (let index = 0; index < 17; index++) {
      const x = 26 + ((index * 79) % Math.max(40, width - 52));
      const y = 120 + ((index * 211) % Math.max(120, this.mapHeight - 220));
      const group = element('g', { opacity: '.86' });
      group.append(element('ellipse', { cx: x - 6, cy: y + 4, rx: 7, ry: 13, fill: '#4f8f43' }));
      group.append(element('ellipse', { cx: x + 7, cy: y + 2, rx: 10, ry: 14, fill: '#4f8f43' }));
      group.append(element('circle', { cx: x, cy: y - 7, r: 9, fill: '#7fbd57' }));
      if (index % 3 === 0) {
        for (const [dx, dy] of [[5, 0], [-5, 0], [0, 5], [0, -5]]) group.append(element('circle', { cx: x + dx, cy: y - 11 + dy, r: 3.6, fill: index % 2 ? '#ff8a9a' : '#b39ddb' }));
        group.append(element('circle', { cx: x, cy: y - 11, r: 2.6, fill: '#fff3a3' }));
      }
      parent.append(group);
    }
  }

  private drawPath(parent: SVGElement): void {
    const d = this.nodes.map((node, index) => `${index === 0 ? 'M' : 'L'} ${node.x} ${node.y}`).join(' ');
    parent.append(element('path', { d, fill: 'none', stroke: '#b8834c', 'stroke-width': 30, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '.72' }));
    parent.append(element('path', { d, fill: 'none', stroke: '#f3d18a', 'stroke-width': 21, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    parent.append(element('path', { d, fill: 'none', stroke: '#ffedc2', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '.9' }));
  }

  private drawNode(parent: SVGElement, node: NodePosition): void {
    const group = element('g', { transform: `translate(${node.x} ${node.y})` });
    const completed = !!node.record?.completed;
    const challenge = node.id === 10;
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
    return width / 2 + width * amplitudes[index];
  }

  private offsetNearLevel(levelId: number, height: number, spacing: number): number {
    const nodeY = this.mapHeight - 150 - Math.max(0, levelId - 1) * spacing;
    return Math.min(0, Math.max(height - this.mapHeight + 20, height * .54 - nodeY));
  }
}
