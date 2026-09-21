import Phaser from 'phaser';
import { mulberry32, type RandomNumberGenerator } from '../../core/puzzle/random';

export interface EnvironmentNodeZone {
  x: number;
  y: number;
  radius: number;
}

export interface MapEnvironmentOptions {
  seed: string;
  width: number;
  height: number;
  path: Array<{ x: number; y: number }>;
  nodeZones: EnvironmentNodeZone[];
}

/** Decorative, deterministic background for the first Word Garden route. */
export class MapEnvironment {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly parent: Phaser.GameObjects.Container,
    private readonly options: MapEnvironmentOptions,
  ) {}

  draw(): void {
    const terrain = this.scene.add.graphics();
    terrain.fillStyle(0x8fd3ff, 1);
    terrain.fillRect(0, 0, this.options.width, this.options.height);
    this.drawGrasslands(terrain);
    this.drawWaterDetails(terrain, mulberry32(hashSeed(`${this.options.seed}:water`)));
    this.drawDecorations(terrain, mulberry32(hashSeed(`${this.options.seed}:garden`)));
    this.parent.add(terrain);
  }

  private drawGrasslands(graphics: Phaser.GameObjects.Graphics): void {
    const colors = [0xdcedc8, 0xc5e1a5, 0xd4eeb5];
    for (let y = 90, index = 0; y < this.options.height + 120; y += 155, index++) {
      graphics.fillStyle(colors[index % colors.length], 0.94);
      graphics.fillEllipse(this.options.width * 0.18, y, this.options.width * 0.98, 126);
      graphics.fillEllipse(this.options.width * 0.8, y + 18, this.options.width * 0.88, 116);
      graphics.fillStyle(0x9ccc65, 0.2);
      graphics.fillEllipse(this.options.width * (index % 2 ? 0.16 : 0.84), y - 20, this.options.width * 0.44, 48);
    }
  }

  private drawWaterDetails(graphics: Phaser.GameObjects.Graphics, rng: RandomNumberGenerator): void {
    graphics.lineStyle(2, 0xe1f5fe, 0.62);
    for (let index = 0; index < 50; index++) {
      const x = 12 + rng() * (this.options.width - 24);
      const y = 20 + rng() * (this.options.height - 40);
      if (this.isGrassAt(x, y) || this.isReserved(x, y, 18)) continue;
      graphics.lineStyle(rng() > 0.55 ? 3 : 2, 0xe1f5fe, 0.56);
      graphics.arc(x, y, 15 + rng() * 12, Math.PI * 0.15, Math.PI * 0.85, false);
      if (rng() > 0.75) {
        graphics.fillStyle(0x80cbc4, 0.74);
        graphics.fillEllipse(x + 16, y + 3, 11, 6);
        graphics.lineStyle(1, 0xe0f2f1, 0.8);
        graphics.lineBetween(x + 13, y + 3, x + 20, y + 3);
      }
    }
  }

  private drawDecorations(graphics: Phaser.GameObjects.Graphics, rng: RandomNumberGenerator): void {
    // Menos elementos sueltos, con mayor escala: el espacio libre mantiene
    // el camino y los niveles como protagonistas.
    for (let attempt = 0; attempt < 98; attempt++) {
      const x = 14 + rng() * (this.options.width - 28);
      const y = 70 + rng() * (this.options.height - 140);
      const progress = 1 - y / this.options.height;
      // El jardín se vuelve gradualmente más frondoso hacia los niveles altos.
      if (!this.isGrassAt(x, y) || this.isReserved(x, y, 34) || rng() > 0.16 + progress * 0.22) continue;
      const kind = rng();
      if (kind < 0.38) this.drawGrassPatch(graphics, x, y, rng);
      else if (kind < 0.67) this.drawBush(graphics, x, y, rng);
      else if (kind < 0.86) this.drawFlower(graphics, x, y, rng);
      else this.drawRock(graphics, x, y, rng);
    }
    this.drawVegetationClusters(graphics, rng);
  }

  private drawVegetationClusters(graphics: Phaser.GameObjects.Graphics, rng: RandomNumberGenerator): void {
    for (let cluster = 0; cluster < 11; cluster++) {
      const x = 36 + rng() * (this.options.width - 72);
      const y = 90 + rng() * (this.options.height - 180);
      if (!this.isGrassAt(x, y) || this.isReserved(x, y, 56)) continue;
      this.drawBush(graphics, x, y, rng);
      this.drawGrassPatch(graphics, x - 18 + rng() * 8, y + 10, rng);
      this.drawGrassPatch(graphics, x + 15 - rng() * 7, y + 12, rng);
      this.drawFlower(graphics, x + (rng() - 0.5) * 22, y - 13, rng);
      if (rng() > 0.52) this.drawRock(graphics, x + 22, y + 14, rng);
    }
  }

  private drawGrassPatch(graphics: Phaser.GameObjects.Graphics, x: number, y: number, rng: RandomNumberGenerator): void {
    const leaves = 2 + Math.floor(rng() * 3);
    graphics.fillStyle(0x66a94a, 0.72);
    for (let index = 0; index < leaves; index++) {
      const dx = (rng() - 0.5) * 18;
      const dy = (rng() - 0.5) * 9;
      graphics.fillEllipse(x + dx, y + dy, 9, 17);
    }
  }

  private drawBush(graphics: Phaser.GameObjects.Graphics, x: number, y: number, rng: RandomNumberGenerator): void {
    const radius = 10 + rng() * 5;
    graphics.fillStyle(0x4f8f43, 0.9);
    graphics.fillCircle(x - radius * 0.55, y + 2, radius * 0.75);
    graphics.fillCircle(x + radius * 0.45, y + 1, radius);
    graphics.fillStyle(0x7fbd57, 0.9);
    graphics.fillCircle(x, y - radius * 0.45, radius * 0.75);
  }

  private drawFlower(graphics: Phaser.GameObjects.Graphics, x: number, y: number, rng: RandomNumberGenerator): void {
    const colors = [0xff8a9a, 0xffd166, 0xb39ddb];
    const color = colors[Math.floor(rng() * colors.length)];
    graphics.fillStyle(0x5f9f45, 0.9);
    graphics.fillRect(x - 1, y, 2, 9);
    graphics.fillStyle(color, 0.92);
    for (let angle = 0; angle < 4; angle++) {
      const radians = (Math.PI / 2) * angle;
      graphics.fillCircle(x + Math.cos(radians) * 5, y + Math.sin(radians) * 5, 4);
    }
    graphics.fillStyle(0xfff3a3, 1);
    graphics.fillCircle(x, y, 3);
  }

  private drawRock(graphics: Phaser.GameObjects.Graphics, x: number, y: number, rng: RandomNumberGenerator): void {
    const size = 8 + rng() * 6;
    graphics.fillStyle(0x90a4ae, 0.78);
    graphics.fillEllipse(x, y, size * 1.5, size);
    graphics.fillStyle(0xcfd8dc, 0.82);
    graphics.fillEllipse(x - size * 0.15, y - size * 0.18, size * 0.7, size * 0.35);
  }

  private isGrassAt(x: number, y: number): boolean {
    const band = ((y - 90) % 155 + 155) % 155;
    const centerDistance = Math.min(Math.abs(band), Math.abs(band - 155));
    return centerDistance < 72 && x > -20 && x < this.options.width + 20;
  }

  private isReserved(x: number, y: number, padding: number): boolean {
    if (this.options.nodeZones.some((node) => Phaser.Math.Distance.Between(x, y, node.x, node.y) < node.radius + padding)) return true;
    for (let index = 0; index < this.options.path.length - 1; index++) {
      const start = this.options.path[index];
      const end = this.options.path[index + 1];
      if (distanceToSegment(x, y, start.x, start.y, end.x, end.y) < 19 + padding * 0.35) return true;
    }
    return false;
  }
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return hash >>> 0;
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Phaser.Math.Distance.Between(px, py, ax, ay);
  const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
  return Phaser.Math.Distance.Between(px, py, ax + t * dx, ay + t * dy);
}
