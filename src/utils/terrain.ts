import { MapPreset, Particle } from '../types/game';

export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 900;
export const WATER_LEVEL = 820;

export class TerrainEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private pixelData: Uint8ClampedArray | null = null;
  private isDirty: boolean = true;
  public preset: MapPreset = 'islands';

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = MAP_WIDTH;
    this.canvas.height = MAP_HEIGHT;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  public generate(preset: MapPreset, seed: number = Date.now()) {
    this.preset = preset;
    const { ctx } = this;
    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    switch (preset) {
      case 'islands':
        this.generateIslands();
        break;
      case 'canyon':
        this.generateCanyon();
        break;
      case 'fortress':
        this.generateFortress();
        break;
      case 'volcano':
        this.generateVolcano();
        break;
      case 'procedural':
      default:
        this.generateProcedural(seed);
        break;
    }

    this.updatePixelBuffer();
  }

  private generateIslands() {
    const { ctx } = this;

    // 4 major floating pixel islands
    const islands = [
      { x: 180, y: 520, w: 260, h: 180, r: 80 },
      { x: 540, y: 440, w: 320, h: 220, r: 100 },
      { x: 960, y: 480, w: 280, h: 200, r: 90 },
      { x: 1320, y: 540, w: 220, h: 170, r: 70 },
    ];

    // Earth base
    ctx.fillStyle = '#6E4823'; // Dark earth
    ctx.beginPath();
    islands.forEach((isl) => {
      ctx.moveTo(isl.x - isl.w / 2, isl.y);
      ctx.bezierCurveTo(
        isl.x - isl.w / 2 + 30, isl.y + isl.h,
        isl.x + isl.w / 2 - 30, isl.y + isl.h,
        isl.x + isl.w / 2, isl.y
      );
      ctx.lineTo(isl.x - isl.w / 2, isl.y);
    });
    ctx.fill();

    // Rocky texture / layered dirt
    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    islands.forEach((isl) => {
      ctx.moveTo(isl.x - isl.w / 2 + 15, isl.y);
      ctx.bezierCurveTo(
        isl.x - isl.w / 4, isl.y + isl.h * 0.7,
        isl.x + isl.w / 4, isl.y + isl.h * 0.7,
        isl.x + isl.w / 2 - 15, isl.y
      );
      ctx.lineTo(isl.x - isl.w / 2 + 15, isl.y);
    });
    ctx.fill();

    // Grassy top cap
    ctx.fillStyle = '#388E3C'; // Rich Worms green grass
    ctx.beginPath();
    islands.forEach((isl) => {
      ctx.ellipse(isl.x, isl.y, isl.w / 2, 28, 0, 0, Math.PI * 2);
    });
    ctx.fill();

    // Grass highlights
    ctx.fillStyle = '#4CAF50';
    islands.forEach((isl) => {
      for (let i = 0; i < isl.w; i += 8) {
        const h = 4 + Math.sin(i * 0.5) * 4;
        ctx.fillRect(isl.x - isl.w / 2 + i, isl.y - 12 - h, 5, h + 14);
      }
    });

    // Connecting rope / stone suspension bridges
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(300, 500, 100, 10);
    ctx.fillRect(690, 450, 130, 10);
    ctx.fillRect(1090, 490, 120, 10);

    // Some decorative rock spires
    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.arc(760, 410, 24, 0, Math.PI * 2);
    ctx.arc(360, 470, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  private generateCanyon() {
    const { ctx } = this;
    ctx.fillStyle = '#A04000'; // Canyon red sandstone

    // Left towering cliff
    ctx.beginPath();
    ctx.moveTo(0, 250);
    ctx.lineTo(340, 280);
    ctx.lineTo(280, 500);
    ctx.lineTo(400, 680);
    ctx.lineTo(0, 780);
    ctx.closePath();
    ctx.fill();

    // Right towering cliff
    ctx.beginPath();
    ctx.moveTo(1600, 260);
    ctx.lineTo(1240, 310);
    ctx.lineTo(1300, 540);
    ctx.lineTo(1200, 700);
    ctx.lineTo(1600, 780);
    ctx.closePath();
    ctx.fill();

    // Center stone arches and bridges
    ctx.fillStyle = '#BA4A00';
    ctx.beginPath();
    ctx.ellipse(800, 560, 260, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lower platform
    ctx.fillStyle = '#873600';
    ctx.beginPath();
    ctx.ellipse(800, 700, 320, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    // Carve cavern holes
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(800, 620, 140, 45, 0, 0, Math.PI * 2);
    ctx.ellipse(200, 420, 90, 60, 0, 0, Math.PI * 2);
    ctx.ellipse(1400, 460, 100, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sand / dust crust
    ctx.fillStyle = '#EDBB99';
    ctx.fillRect(0, 240, 340, 14);
    ctx.fillRect(1240, 300, 360, 14);
    ctx.fillRect(560, 520, 480, 14);
  }

  private generateFortress() {
    const { ctx } = this;

    // Stone castle grey
    ctx.fillStyle = '#4A4A4A';

    // Left battle tower
    ctx.fillRect(150, 320, 240, 420);
    // Left ramparts
    for (let i = 0; i < 240; i += 40) {
      ctx.fillRect(150 + i, 280, 25, 40);
    }

    // Right battle tower
    ctx.fillRect(1210, 320, 240, 420);
    for (let i = 0; i < 240; i += 40) {
      ctx.fillRect(1210 + i, 280, 25, 40);
    }

    // Central rampart & courtyard bridge
    ctx.fillStyle = '#5A5A5A';
    ctx.fillRect(380, 520, 840, 120);

    // Tower mid-platform
    ctx.fillStyle = '#6E6E6E';
    ctx.fillRect(650, 420, 300, 30);

    // Archway tunnel
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(800, 640, 90, Math.PI, 0, false);
    ctx.fill();
    ctx.fillRect(710, 630, 180, 80);

    // Windows
    ctx.fillRect(230, 420, 40, 70);
    ctx.fillRect(1330, 420, 40, 70);
    ctx.restore();

    // Moss and grass on tops
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(150, 275, 240, 8);
    ctx.fillRect(1210, 275, 240, 8);
    ctx.fillRect(380, 515, 840, 8);
  }

  private generateVolcano() {
    const { ctx } = this;

    // Dark obsidian basalt
    ctx.fillStyle = '#212121';

    // Volcano slope left
    ctx.beginPath();
    ctx.moveTo(0, 760);
    ctx.lineTo(550, 420);
    ctx.lineTo(680, 480);
    ctx.lineTo(650, 760);
    ctx.closePath();
    ctx.fill();

    // Volcano slope right
    ctx.beginPath();
    ctx.moveTo(1600, 760);
    ctx.lineTo(1050, 420);
    ctx.lineTo(920, 480);
    ctx.lineTo(950, 760);
    ctx.closePath();
    ctx.fill();

    // Central lava crust floating crag
    ctx.fillStyle = '#37474F';
    ctx.beginPath();
    ctx.ellipse(800, 540, 180, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Magma chamber glow veins
    ctx.fillStyle = '#FF5722';
    ctx.fillRect(520, 415, 560, 10);
    ctx.fillStyle = '#FF9800';
    ctx.fillRect(700, 535, 200, 8);

    // Ash layer
    ctx.fillStyle = '#78909C';
    ctx.fillRect(0, 750, 550, 12);
    ctx.fillRect(1050, 750, 550, 12);
  }

  private generateProcedural(seed: number) {
    const { ctx } = this;
    ctx.fillStyle = '#5D4037'; // Earth brown

    ctx.beginPath();
    ctx.moveTo(0, MAP_HEIGHT);

    // Composite sinusoidal landscape
    for (let x = 0; x <= MAP_WIDTH; x += 10) {
      const angle1 = (x / 300) + seed;
      const angle2 = (x / 140) + seed * 1.5;
      const angle3 = (x / 60) + seed * 2;
      const baseHeight = 580;
      const y = baseHeight 
        + Math.sin(angle1) * 110 
        + Math.cos(angle2) * 60 
        + Math.sin(angle3) * 25;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(MAP_WIDTH, MAP_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Carve some caves
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 4; i++) {
      const cx = 250 + i * 360 + Math.sin(seed + i) * 80;
      const cy = 620 + Math.cos(seed * 2 + i) * 60;
      ctx.beginPath();
      ctx.arc(cx, cy, 60 + (i % 2) * 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Grass topper
    ctx.fillStyle = '#388E3C';
    for (let x = 0; x < MAP_WIDTH; x += 6) {
      const sy = this.findSurfaceY(x, 200);
      if (sy < WATER_LEVEL) {
        ctx.fillRect(x, sy, 6, 12);
      }
    }
  }

  public carveExplosion(cx: number, cy: number, radius: number): Particle[] {
    const particles: Particle[] = [];
    const { ctx } = this;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    // Slightly ragged explosion circle
    ctx.beginPath();
    const points = 24;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      // Slight jitter for realistic ragged dirt crater
      const r = radius * (0.85 + Math.random() * 0.25);
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    this.isDirty = true;

    // Spawn flying dirt particles
    const particleCount = Math.min(40, Math.floor(radius * 0.8));
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      particles.push({
        x: cx + Math.cos(angle) * (radius * 0.5),
        y: cy + Math.sin(angle) * (radius * 0.5),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        color: Math.random() > 0.4 ? '#8B5A2B' : '#4CAF50',
        life: 0,
        maxLife: 25 + Math.random() * 25,
        size: 3 + Math.random() * 4,
        type: 'dirt',
      });
    }

    return particles;
  }

  private updatePixelBuffer() {
    this.pixelData = this.ctx.getImageData(0, 0, MAP_WIDTH, MAP_HEIGHT).data;
    this.isDirty = false;
  }

  public isSolid(x: number, y: number): boolean {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= MAP_WIDTH || iy < 0 || iy >= MAP_HEIGHT) {
      return false;
    }
    if (this.isDirty || !this.pixelData) {
      this.updatePixelBuffer();
    }
    const index = (iy * MAP_WIDTH + ix) * 4;
    // Alpha channel > 20 means solid pixel
    return (this.pixelData![index + 3] || 0) > 25;
  }

  public findSurfaceY(x: number, startY: number = 0): number {
    for (let y = Math.max(0, Math.floor(startY)); y < MAP_HEIGHT; y += 4) {
      if (this.isSolid(x, y)) {
        // Fine check
        for (let fy = y - 4; fy <= y; fy++) {
          if (this.isSolid(x, fy)) return fy;
        }
        return y;
      }
    }
    return WATER_LEVEL + 50; // In water
  }
}
