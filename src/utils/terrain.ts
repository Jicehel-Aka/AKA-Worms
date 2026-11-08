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

  /**
   * 1. Îles Flottantes Gamebuino — Lush fairytale floating islands
   * Rich geological strata, hanging vines/roots, stone bridges, wild daisies & mushrooms
   */
  private generateIslands() {
    const { ctx } = this;

    const islands = [
      { x: 190, y: 520, w: 280, h: 220, seed: 1 },
      { x: 560, y: 440, w: 340, h: 260, seed: 2 },
      { x: 980, y: 470, w: 310, h: 240, seed: 3 },
      { x: 1350, y: 530, w: 260, h: 200, seed: 4 },
    ];

    islands.forEach((isl) => {
      ctx.save();

      // Earth body path
      ctx.beginPath();
      ctx.moveTo(isl.x - isl.w / 2, isl.y);
      ctx.bezierCurveTo(
        isl.x - isl.w / 2 + 25, isl.y + isl.h * 0.9,
        isl.x - 30, isl.y + isl.h + 20,
        isl.x, isl.y + isl.h
      );
      ctx.bezierCurveTo(
        isl.x + 30, isl.y + isl.h + 20,
        isl.x + isl.w / 2 - 25, isl.y + isl.h * 0.9,
        isl.x + isl.w / 2, isl.y
      );
      ctx.closePath();

      // Multi-layer rich soil gradient
      const earthGrad = ctx.createLinearGradient(isl.x, isl.y, isl.x, isl.y + isl.h);
      earthGrad.addColorStop(0, '#5C3818'); // Dark rich loam
      earthGrad.addColorStop(0.35, '#854D27'); // Warm terracotta clay
      earthGrad.addColorStop(0.7, '#4E2F13'); // Deep subterranean rock
      earthGrad.addColorStop(1, '#2D1B0A'); // Basalt crust tip
      ctx.fillStyle = earthGrad;
      ctx.fill();

      // Crisp comic outline
      ctx.strokeStyle = '#271708';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Clip inside the island for rich mineral textures & pebbles
      ctx.save();
      ctx.clip();

      // Subterranean sediment bands
      for (let s = 0; s < 4; s++) {
        const sy = isl.y + 40 + s * 45;
        ctx.fillStyle = s % 2 === 0 ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.12)';
        ctx.beginPath();
        ctx.moveTo(isl.x - isl.w / 2, sy);
        ctx.bezierCurveTo(isl.x - isl.w / 4, sy - 15, isl.x + isl.w / 4, sy + 15, isl.x + isl.w / 2, sy);
        ctx.lineTo(isl.x + isl.w / 2, sy + 25);
        ctx.lineTo(isl.x - isl.w / 2, sy + 25);
        ctx.closePath();
        ctx.fill();
      }

      // Embedded stone boulders & gemstones
      const stoneColors = ['#9E9E9E', '#757575', '#616161', '#FFD54F', '#4FC3F7'];
      for (let p = 0; p < 24; p++) {
        const px = isl.x + (Math.sin(p * 2.3 + isl.seed) * (isl.w * 0.38));
        const py = isl.y + 35 + ((p * 17) % (isl.h - 50));
        const pr = 4 + (p % 5) * 2.5;
        const color = p % 8 === 0 ? '#FFD700' : p % 11 === 0 ? '#E91E63' : stoneColors[p % stoneColors.length];

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(px, py, pr, pr * 0.7, p * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(px - pr * 0.3, py - pr * 0.3, pr * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore(); // restore clip

      // Hanging roots trailing into the abyss
      ctx.strokeStyle = '#4A2810';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let r = 0; r < 7; r++) {
        const rx = isl.x - isl.w * 0.3 + r * (isl.w * 0.1);
        const ry = isl.y + isl.h - 15 - Math.abs(r - 3) * 8;
        const rLen = 25 + Math.sin(r * 4.7) * 20;

        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.quadraticCurveTo(rx + (r % 2 === 0 ? 8 : -8), ry + rLen * 0.5, rx + (r % 2 === 0 ? 4 : -4), ry + rLen);
        ctx.stroke();
      }

      // Lush Topsoil & 3D Grass Cap
      const grassGrad = ctx.createLinearGradient(isl.x, isl.y - 25, isl.x, isl.y + 15);
      grassGrad.addColorStop(0, '#66BB6A'); // Sunlight emerald green
      grassGrad.addColorStop(0.5, '#43A047'); // Vibrant Worms grass
      grassGrad.addColorStop(1, '#2E7D32'); // Deep forest edge
      ctx.fillStyle = grassGrad;

      ctx.beginPath();
      ctx.ellipse(isl.x, isl.y, isl.w / 2 + 6, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1B5E20';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Stylized grass blades fringe
      ctx.fillStyle = '#81C784';
      for (let g = 0; g < isl.w; g += 7) {
        const gx = isl.x - isl.w / 2 + g;
        const gy = isl.y - 12 + Math.sin(g * 0.1) * 3;
        const bladeH = 7 + Math.sin(g * 0.8) * 5;

        ctx.beginPath();
        ctx.moveTo(gx - 2, gy + 4);
        ctx.lineTo(gx, gy - bladeH);
        ctx.lineTo(gx + 2, gy + 4);
        ctx.fill();
      }

      // Wild daisies & red polka-dot mushrooms
      for (let f = 0; f < 8; f++) {
        const fx = isl.x - isl.w * 0.4 + f * (isl.w * 0.11);
        const fy = isl.y - 14 + Math.sin(f * 2.1) * 2;

        if (f % 2 === 0) {
          // White Daisy
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(fx, fy - 3, 3, 0, Math.PI * 2);
          ctx.arc(fx - 2, fy - 1, 2.5, 0, Math.PI * 2);
          ctx.arc(fx + 2, fy - 1, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFEB3B';
          ctx.beginPath();
          ctx.arc(fx, fy - 2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Red Amanita Mushroom
          ctx.fillStyle = '#E53935';
          ctx.beginPath();
          ctx.arc(fx, fy - 4, 4, Math.PI, 0);
          ctx.fill();
          // White dots
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(fx - 2, fy - 6, 1.5, 1.5);
          ctx.fillRect(fx + 1, fy - 5, 1.5, 1.5);
          // Stem
          ctx.fillStyle = '#EEEEEE';
          ctx.fillRect(fx - 1, fy - 4, 2, 4);
        }
      }

      ctx.restore();
    });

    // Hanging Wooden Rope Bridges connecting islands
    this.drawRopeBridge(ctx, 310, 500, 410, 450);
    this.drawRopeBridge(ctx, 710, 440, 840, 465);
    this.drawRopeBridge(ctx, 1110, 470, 1240, 515);

    // Stone Guardian Monoliths
    this.drawStoneMonolith(ctx, 370, 490, 24, 48);
    this.drawStoneMonolith(ctx, 770, 420, 28, 56);
  }

  /**
   * Helper: Hanging Wooden Rope Bridge with individual wood planks
   */
  private drawRopeBridge(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    ctx.save();
    const sag = 28;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2 + sag;

    // Ropes
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.stroke();

    // Wood planks
    const plankCount = 14;
    for (let i = 0; i <= plankCount; i++) {
      const t = i / plankCount;
      const px = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * midX + t * t * x2;
      const py = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * midY + t * t * y2;

      ctx.fillStyle = i % 2 === 0 ? '#8D6E63' : '#6D4C41';
      ctx.fillRect(px - 5, py - 4, 10, 6);
      ctx.strokeStyle = '#3E2723';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 5, py - 4, 10, 6);
    }
    ctx.restore();
  }

  /**
   * Helper: Ancient carved stone monolith
   */
  private drawStoneMonolith(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.save();
    ctx.fillStyle = '#78909C';
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x - w / 3, y - h);
    ctx.lineTo(x + w / 3, y - h);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#37474F';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Mystic glowing AKA rune
    ctx.strokeStyle = '#64FFDA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - h * 0.6);
    ctx.lineTo(x, y - h * 0.7);
    ctx.lineTo(x + 4, y - h * 0.6);
    ctx.moveTo(x, y - h * 0.7);
    ctx.lineTo(x, y - h * 0.35);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 2. Canyon & Caverne — Grand Sandstone Canyon
   * Terracotta strata, carved natural stone arches, desert rock shelves & prehistoric fossil
   */
  private generateCanyon() {
    const { ctx } = this;

    // Rich stratified sandstone gradient
    const sandstoneGrad = ctx.createLinearGradient(0, 200, 0, MAP_HEIGHT);
    sandstoneGrad.addColorStop(0, '#D35400'); // Burnt orange
    sandstoneGrad.addColorStop(0.25, '#BA4A00'); // Terracotta
    sandstoneGrad.addColorStop(0.5, '#E59866'); // Golden sand layer
    sandstoneGrad.addColorStop(0.75, '#A04000'); // Deep iron sandstone
    sandstoneGrad.addColorStop(1, '#6E2C00'); // Dark bedrock

    ctx.fillStyle = sandstoneGrad;

    // Left towering cliff
    ctx.beginPath();
    ctx.moveTo(0, 220);
    ctx.lineTo(380, 260);
    ctx.bezierCurveTo(420, 360, 310, 480, 360, 580);
    ctx.bezierCurveTo(420, 680, 260, 720, 300, 780);
    ctx.lineTo(0, 780);
    ctx.closePath();
    ctx.fill();

    // Right towering cliff
    ctx.beginPath();
    ctx.moveTo(1600, 240);
    ctx.lineTo(1220, 290);
    ctx.bezierCurveTo(1170, 390, 1310, 510, 1240, 620);
    ctx.bezierCurveTo(1190, 700, 1340, 740, 1300, 780);
    ctx.lineTo(1600, 780);
    ctx.closePath();
    ctx.fill();

    // Central Grand Canyon Arch & Multi-tier Natural Bridges
    ctx.beginPath();
    ctx.ellipse(800, 540, 320, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(800, 710, 380, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Carve cavern tunnels
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(800, 625, 170, 55, 0, 0, Math.PI * 2);
    ctx.ellipse(220, 430, 110, 70, 0, 0, Math.PI * 2);
    ctx.ellipse(1380, 470, 120, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Geological horizontal wave strata
    ctx.save();
    for (let s = 250; s <= 760; s += 30) {
      ctx.strokeStyle = s % 60 === 0 ? 'rgba(255, 230, 200, 0.25)' : 'rgba(70, 25, 10, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < MAP_WIDTH; x += 30) {
        const y = s + Math.sin(x * 0.015 + s) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Golden sand crust on flat tops
    ctx.fillStyle = '#F5CBA7';
    ctx.fillRect(0, 215, 385, 12);
    ctx.fillRect(1215, 285, 385, 12);
    ctx.fillRect(520, 495, 560, 12);

    // Desert Saguaro Cacti on cliffs
    this.drawCactus(ctx, 160, 215, 28);
    this.drawCactus(ctx, 1420, 285, 32);
    this.drawCactus(ctx, 720, 495, 24);

    // Embedded prehistoric dinosaur fossil
    this.drawDinoFossil(ctx, 780, 710);
  }

  /**
   * Helper: Stylized desert cactus
   */
  private drawCactus(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
    ctx.save();
    ctx.fillStyle = '#2E7D32';
    ctx.strokeStyle = '#1B5E20';
    ctx.lineWidth = 2;

    // Main trunk
    ctx.beginPath();
    ctx.roundRect(x - 5, y - h, 10, h, 5);
    ctx.fill();
    ctx.stroke();

    // Left arm
    ctx.beginPath();
    ctx.moveTo(x - 4, y - h * 0.5);
    ctx.lineTo(x - 14, y - h * 0.5);
    ctx.lineTo(x - 14, y - h * 0.75);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(x + 4, y - h * 0.35);
    ctx.lineTo(x + 14, y - h * 0.35);
    ctx.lineTo(x + 14, y - h * 0.6);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Helper: Prehistoric Dinosaur Fossil embedded in stone
   */
  private drawDinoFossil(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.strokeStyle = '#FFFDE7';
    ctx.fillStyle = '#FFFDE7';
    ctx.lineWidth = 2.5;

    // Skull
    ctx.beginPath();
    ctx.arc(x - 12, y - 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6E2C00';
    ctx.fillRect(x - 14, y - 6, 3, 3); // eye hole

    // Spine & Ribs
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 4);
    ctx.lineTo(x + 24, y - 4);
    ctx.stroke();

    for (let r = 0; r < 5; r++) {
      ctx.beginPath();
      ctx.moveTo(x + r * 6, y - 4);
      ctx.lineTo(x + r * 6 + 2, y + 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 3. Château Fort AKA — Majestic Medieval Fortress
   * Weathered stone masonry, ramparts with crenellations, archways, AKA Clan flags & torchlight
   */
  private generateFortress() {
    const { ctx } = this;

    // Left Tower
    this.drawCastleTower(ctx, 130, 300, 260, 480);
    // Right Tower
    this.drawCastleTower(ctx, 1210, 300, 260, 480);

    // Courtyard Central Rampart Wall
    this.drawStoneMasonry(ctx, 360, 510, 880, 150);

    // Crenellations along central bridge
    ctx.fillStyle = '#546E7A';
    for (let b = 390; b <= 1180; b += 45) {
      ctx.fillRect(b, 485, 24, 25);
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 2;
      ctx.strokeRect(b, 485, 24, 25);
    }

    // High Watchtower Platform
    this.drawStoneMasonry(ctx, 660, 400, 280, 40);

    // Grand Archway Tunnel
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(800, 640, 95, Math.PI, 0, false);
    ctx.lineTo(895, 660);
    ctx.lineTo(705, 660);
    ctx.closePath();
    ctx.fill();

    // Tower arrow slit windows
    ctx.fillRect(210, 420, 35, 75);
    ctx.fillRect(290, 420, 35, 75);
    ctx.fillRect(1270, 420, 35, 75);
    ctx.fillRect(1350, 420, 35, 75);
    ctx.restore();

    // Medieval AKA Clan Banners flying from towers
    this.drawBanner(ctx, 230, 245, '#10B981', 'AKA');
    this.drawBanner(ctx, 1370, 245, '#EF4444', 'TITAN');

    // Moss and ivy growing on ancient stones
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(130, 292, 260, 10);
    ctx.fillRect(1210, 292, 260, 10);
    ctx.fillRect(360, 502, 880, 10);
  }

  /**
   * Helper: Castle Tower with battlements
   */
  private drawCastleTower(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    this.drawStoneMasonry(ctx, x, y, w, h);

    // Battlements on top
    const crenW = 30;
    const count = Math.floor(w / (crenW * 1.6));
    ctx.fillStyle = '#546E7A';
    for (let i = 0; i < count; i++) {
      const cx = x + i * (crenW * 1.6) + 6;
      ctx.fillRect(cx, y - 35, crenW, 35);
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, y - 35, crenW, 35);
    }
  }

  /**
   * Helper: Weathered Stone Brick Masonry pattern
   */
  private drawStoneMasonry(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const stoneGrad = ctx.createLinearGradient(x, y, x, y + h);
    stoneGrad.addColorStop(0, '#78909C');
    stoneGrad.addColorStop(0.5, '#546E7A');
    stoneGrad.addColorStop(1, '#37474F');

    ctx.fillStyle = stoneGrad;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Individual brick seams
    const brickH = 24;
    const brickW = 48;
    ctx.strokeStyle = 'rgba(38, 50, 56, 0.7)';
    ctx.lineWidth = 1.5;

    for (let by = y; by < y + h; by += brickH) {
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + w, by);
      ctx.stroke();

      const offset = ((by - y) / brickH) % 2 === 0 ? 0 : brickW / 2;
      for (let bx = x + offset; bx < x + w; bx += brickW) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, Math.min(y + h, by + brickH));
        ctx.stroke();
      }
    }
  }

  /**
   * Helper: Royal medieval pennant banner
   */
  private drawBanner(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, text: string) {
    ctx.save();
    // Flag pole
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(x, y - 40, 4, 75);

    // Cloth
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 38);
    ctx.lineTo(x + 65, y - 38);
    ctx.lineTo(x + 50, y - 10);
    ctx.lineTo(x + 65, y + 18);
    ctx.lineTo(x + 4, y + 18);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, x + 8, y - 8);
    ctx.restore();
  }

  /**
   * 4. Volcan & Lave — Dramatic Volcanic Caldera
   * Black obsidian basalt, molten magma fissures glowing in cracks, charred crust
   */
  private generateVolcano() {
    const { ctx } = this;

    // Obsidian basalt rock slopes
    const basaltGrad = ctx.createLinearGradient(0, 380, 0, MAP_HEIGHT);
    basaltGrad.addColorStop(0, '#263238');
    basaltGrad.addColorStop(0.3, '#1A2024');
    basaltGrad.addColorStop(0.7, '#211717');
    basaltGrad.addColorStop(1, '#3E1010');

    ctx.fillStyle = basaltGrad;

    // Left caldera slope
    ctx.beginPath();
    ctx.moveTo(0, 780);
    ctx.lineTo(560, 410);
    ctx.bezierCurveTo(620, 430, 660, 470, 680, 520);
    ctx.lineTo(650, 780);
    ctx.closePath();
    ctx.fill();

    // Right caldera slope
    ctx.beginPath();
    ctx.moveTo(1600, 780);
    ctx.lineTo(1040, 410);
    ctx.bezierCurveTo(980, 430, 940, 470, 920, 520);
    ctx.lineTo(950, 780);
    ctx.closePath();
    ctx.fill();

    // Floating central obsidian crag
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.ellipse(800, 540, 210, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Glowing Magma Fissures coursing through rock cracks
    this.drawMagmaFissure(ctx, 180, 580, 520, 420);
    this.drawMagmaFissure(ctx, 1420, 580, 1080, 420);
    this.drawMagmaFissure(ctx, 700, 535, 900, 535);

    // Glowing crater rim
    const rimGrad = ctx.createLinearGradient(540, 410, 1060, 410);
    rimGrad.addColorStop(0, '#FF3D00');
    rimGrad.addColorStop(0.5, '#FFD600');
    rimGrad.addColorStop(1, '#FF3D00');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(540, 405, 520, 10);

    // Volcanic ash & pumice layer on outer edges
    ctx.fillStyle = '#546E7A';
    ctx.fillRect(0, 770, 560, 15);
    ctx.fillRect(1040, 770, 560, 15);
  }

  /**
   * Helper: Molten glowing magma fissure running through rock
   */
  private drawMagmaFissure(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    ctx.save();
    // Orange-yellow glowing core
    ctx.strokeStyle = '#FF3D00';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 20;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;
    ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.stroke();

    // Hot yellow core line
    ctx.strokeStyle = '#FFEE58';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 5. Générateur Aléatoire (Procedural) — Multi-frequency Perlin-style organic terrain
   */
  private generateProcedural(seed: number) {
    const { ctx } = this;

    const earthGrad = ctx.createLinearGradient(0, 400, 0, MAP_HEIGHT);
    earthGrad.addColorStop(0, '#6D4C41');
    earthGrad.addColorStop(0.4, '#4E342E');
    earthGrad.addColorStop(1, '#271915');

    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.moveTo(0, MAP_HEIGHT);

    // 4-octave smooth sinusoidal contour
    for (let x = 0; x <= MAP_WIDTH; x += 8) {
      const o1 = Math.sin((x / 320) + seed) * 120;
      const o2 = Math.cos((x / 140) + seed * 1.7) * 60;
      const o3 = Math.sin((x / 65) + seed * 3.1) * 25;
      const o4 = Math.cos((x / 25) + seed * 4.9) * 10;
      const y = 570 + o1 + o2 + o3 + o4;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(MAP_WIDTH, MAP_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Carve organic cave network
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let c = 0; c < 5; c++) {
      const cx = 220 + c * 290 + Math.sin(seed + c * 2) * 60;
      const cy = 630 + Math.cos(seed * 1.5 + c) * 50;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 75 + (c % 2) * 25, 50 + (c % 3) * 15, c * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Lush 3D Grass topper
    ctx.fillStyle = '#4CAF50';
    for (let x = 0; x < MAP_WIDTH; x += 5) {
      const sy = this.findSurfaceY(x, 200);
      if (sy < WATER_LEVEL) {
        ctx.fillRect(x, sy - 4, 6, 12);
        // Grass tip
        ctx.fillStyle = '#81C784';
        ctx.fillRect(x, sy - 8, 3, 5);
        ctx.fillStyle = '#4CAF50';
      }
    }
  }

  /**
   * Carve clean circular crater with scorched rim & high-fidelity dirt particles
   */
  public carveExplosion(cx: number, cy: number, radius: number): Particle[] {
    const particles: Particle[] = [];
    const { ctx } = this;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    // Organic ragged crater with jagged rim
    ctx.beginPath();
    const points = 32;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const jitter = 0.9 + Math.sin(i * 3.5) * 0.12 + Math.random() * 0.08;
      const r = radius * jitter;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Mark as dirty so pixel buffer recomputes on next physics query
    this.isDirty = true;

    // Spawn high-detail debris particles (dirt chunks, burnt soot, and grass specks)
    const particleCount = Math.min(50, Math.floor(radius * 0.9));
    const colors = ['#5D4037', '#8D6E63', '#3E2723', '#2E7D32', '#FFD54F', '#212121'];

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 9;
      particles.push({
        x: cx + Math.cos(angle) * (radius * 0.4),
        y: cy + Math.sin(angle) * (radius * 0.4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5, // initial pop upwards
        color: colors[i % colors.length],
        life: 0,
        maxLife: 30 + Math.random() * 30,
        size: 3 + Math.random() * 5,
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
    return (this.pixelData![index + 3] || 0) > 25;
  }

  public findSurfaceY(x: number, startY: number = 0): number {
    for (let y = Math.max(0, Math.floor(startY)); y < MAP_HEIGHT; y += 4) {
      if (this.isSolid(x, y)) {
        for (let fy = y - 4; fy <= y; fy++) {
          if (this.isSolid(x, fy)) return fy;
        }
        return y;
      }
    }
    return WATER_LEVEL + 50;
  }
}
