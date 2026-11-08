import React, { useState, useEffect, useRef } from 'react';
import { MapPreset, WeaponId } from '../types/game';
import { TerrainEngine, MAP_WIDTH, MAP_HEIGHT, WATER_LEVEL } from '../utils/terrain';
import { WEAPONS } from '../utils/weapons';
import { sounds } from '../utils/audio';
import {
  X,
  Map as MapIcon,
  Smile,
  Volume2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Play,
  Pause,
  Bomb,
  Crosshair,
} from 'lucide-react';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AnimationState = 'idle' | 'walk' | 'jump' | 'aim' | 'shoot' | 'hurt' | 'celebrate' | 'tombstone';
type HatType = 'bandana' | 'helmet' | 'crown' | 'beret' | 'none';

interface MapParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  type?: 'debris' | 'smoke' | 'spark' | 'star';
}

export const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'maps' | 'worms'>('maps');

  // ================= MAP EXPLORER STATE =================
  const [selectedMap, setSelectedMap] = useState<MapPreset>('islands');
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeTestWeapon, setActiveTestWeapon] = useState<WeaponId>('bazooka');
  const [terrainSeed, setTerrainSeed] = useState<number>(12345);

  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapTerrainRef = useRef<TerrainEngine | null>(null);
  const mapParticlesRef = useRef<MapParticle[]>([]);
  const isDraggingMapRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

  // ================= WORM ANIMATION STUDIO STATE =================
  const [animState, setAnimState] = useState<AnimationState>('idle');
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponId>('bazooka');
  const [selectedHat, setSelectedHat] = useState<HatType>('bandana');
  const [selectedColor, setSelectedColor] = useState<string>('#10B981');
  const [aimAngle, setAimAngle] = useState<number>(35);
  const [wormFacing, setWormFacing] = useState<'left' | 'right'>('right');
  const [wormScale, setWormScale] = useState<number>(4); // 2x, 4x, 6x, 8x
  const [animSpeed, setAnimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const wormCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animTimeRef = useRef<number>(0);

  // Initialize Map Terrain
  useEffect(() => {
    if (!isOpen) return;
    const terrain = new TerrainEngine();
    terrain.generate(selectedMap, terrainSeed);
    mapTerrainRef.current = terrain;
  }, [selectedMap, terrainSeed, isOpen]);

  // Map Animation Loop (water & weapon-specific particles)
  useEffect(() => {
    if (!isOpen || activeTab !== 'maps') return;

    let animId: number;
    let waterTime = 0;

    const renderMap = () => {
      animId = requestAnimationFrame(renderMap);
      const canvas = mapCanvasRef.current;
      const terrain = mapTerrainRef.current;
      if (!canvas || !terrain) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      waterTime += 0.04;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply zoom & pan around center
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(mapZoom, mapZoom);
      ctx.translate(-MAP_WIDTH / 2 + mapPan.x, -MAP_HEIGHT / 2 + mapPan.y);

      // 1. Sky backdrop
      const sky = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
      if (selectedMap === 'volcano') {
        sky.addColorStop(0, '#12070D');
        sky.addColorStop(0.5, '#4E1111');
        sky.addColorStop(1, '#D32F2F');
      } else if (selectedMap === 'canyon') {
        sky.addColorStop(0, '#1A237E');
        sky.addColorStop(0.6, '#D35400');
        sky.addColorStop(1, '#F39C12');
      } else if (selectedMap === 'fortress') {
        sky.addColorStop(0, '#263238');
        sky.addColorStop(0.5, '#455A64');
        sky.addColorStop(1, '#90A4AE');
      } else {
        sky.addColorStop(0, '#0D47A1');
        sky.addColorStop(0.5, '#42A5F5');
        sky.addColorStop(1, '#BBDEFB');
      }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

      // 2. Terrain Canvas
      ctx.drawImage(terrain.canvas, 0, 0);

      // 3. Water / Magma waves
      ctx.save();
      const isVolcano = selectedMap === 'volcano';
      ctx.fillStyle = isVolcano ? 'rgba(255, 87, 34, 0.85)' : 'rgba(3, 169, 244, 0.8)';
      ctx.beginPath();
      ctx.moveTo(0, MAP_HEIGHT);
      ctx.lineTo(0, WATER_LEVEL);
      for (let x = 0; x <= MAP_WIDTH; x += 15) {
        const wave = Math.sin(x * 0.015 + waterTime) * 6 + Math.cos(x * 0.03 - waterTime * 0.8) * 4;
        ctx.lineTo(x, WATER_LEVEL + wave);
      }
      ctx.lineTo(MAP_WIDTH, MAP_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Foam / Crust crest
      ctx.fillStyle = isVolcano ? '#FFEE58' : 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, WATER_LEVEL);
      for (let x = 0; x <= MAP_WIDTH; x += 15) {
        const wave = Math.sin(x * 0.015 + waterTime) * 6 + Math.cos(x * 0.03 - waterTime * 0.8) * 4;
        ctx.lineTo(x, WATER_LEVEL + wave);
      }
      for (let x = MAP_WIDTH; x >= 0; x -= 15) {
        const wave = Math.sin(x * 0.015 + waterTime) * 6 + Math.cos(x * 0.03 - waterTime * 0.8) * 4;
        ctx.lineTo(x, WATER_LEVEL + wave + 3.5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 4. Update & Draw weapon-specific explosion particles
      const particles = mapParticlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        if (p.type !== 'smoke') {
          p.vy += 0.28; // gravity on debris/sparks
        } else {
          p.size += 0.15; // expanding smoke
        }

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;

        if (p.type === 'star') {
          // 4-point banana sparkle
          const r = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - r);
          ctx.lineTo(p.x + r * 0.3, p.y - r * 0.3);
          ctx.lineTo(p.x + r, p.y);
          ctx.lineTo(p.x + r * 0.3, p.y + r * 0.3);
          ctx.lineTo(p.x, p.y + r);
          ctx.lineTo(p.x - r * 0.3, p.y + r * 0.3);
          ctx.lineTo(p.x - r, p.y);
          ctx.lineTo(p.x - r * 0.3, p.y - r * 0.3);
          ctx.closePath();
          ctx.fill();
        } else if (p.type === 'debris') {
          // Tumbling rectangular chunk
          ctx.translate(p.x, p.y);
          ctx.rotate(p.life * 0.2);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        } else {
          // Smooth circle for smoke & sparks
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(renderMap);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, activeTab, selectedMap, mapZoom, mapPan]);

  // Click on map to test blasting a crater with PIXEL-PERFECT coordinates
  const handleMapCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingMapRef.current) return;
    const canvas = mapCanvasRef.current;
    const terrain = mapTerrainRef.current;
    if (!canvas || !terrain) return;

    // Exact letterbox-aware projection from screen coordinate to canvas coordinate
    const rect = canvas.getBoundingClientRect();
    const canvasRatio = canvas.width / canvas.height;
    const elementRatio = rect.width / rect.height;

    let renderWidth = rect.width;
    let renderHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (elementRatio > canvasRatio) {
      renderWidth = rect.height * canvasRatio;
      offsetX = (rect.width - renderWidth) / 2;
    } else {
      renderHeight = rect.width / canvasRatio;
      offsetY = (rect.height - renderHeight) / 2;
    }

    const clientX = e.clientX - rect.left - offsetX;
    const clientY = e.clientY - rect.top - offsetY;

    if (clientX < 0 || clientX > renderWidth || clientY < 0 || clientY > renderHeight) {
      return;
    }

    const bufferX = (clientX / renderWidth) * canvas.width;
    const bufferY = (clientY / renderHeight) * canvas.height;

    // Invert the exact forward matrix:
    // bufferX = (worldX - MAP_WIDTH / 2 + mapPan.x) * mapZoom + canvas.width / 2
    const worldX = (bufferX - canvas.width / 2) / mapZoom + MAP_WIDTH / 2 - mapPan.x;
    const worldY = (bufferY - canvas.height / 2) / mapZoom + MAP_HEIGHT / 2 - mapPan.y;

    if (worldX < 0 || worldX > MAP_WIDTH || worldY < 0 || worldY > MAP_HEIGHT) return;

    const weaponInfo = WEAPONS[activeTestWeapon];
    const blastRadius = weaponInfo.blastRadius || 45;

    if (activeTestWeapon === 'holy') {
      sounds.playHallelujah();
    }
    sounds.playExplosion(blastRadius / 45);

    // Carve crater in terrain
    const dirtDebris = terrain.carveExplosion(worldX, worldY, blastRadius);

    // Weapon-Specific Particle Effects
    if (activeTestWeapon === 'banana') {
      // BANANA BOMB: Flying yellow banana slices, star sparkles, and golden confetti
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 8.5;
        mapParticlesRef.current.push({
          x: worldX,
          y: worldY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          color: Math.random() > 0.4 ? '#FFD600' : Math.random() > 0.2 ? '#FFEE58' : '#F57F17',
          life: 0,
          maxLife: 35 + Math.random() * 25,
          size: 4 + Math.random() * 6,
          type: Math.random() > 0.5 ? 'star' : 'debris',
        });
      }
    } else if (activeTestWeapon === 'holy') {
      // HOLY HAND GRENADE: Celestial golden beams, sacred stardust sparks, expanding halo
      for (let i = 0; i < 42; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.8 + Math.random() * 7;
        mapParticlesRef.current.push({
          x: worldX,
          y: worldY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5,
          color: Math.random() > 0.5 ? '#FFF9C4' : Math.random() > 0.25 ? '#FFD700' : '#FFFFFF',
          life: 0,
          maxLife: 45 + Math.random() * 30,
          size: 3 + Math.random() * 5,
          type: 'spark',
        });
      }
    } else if (activeTestWeapon === 'dynamite') {
      // DYNAMITE: Red TNT stick casing shards, fiery sparks, concussive orange shockwave
      for (let i = 0; i < 32; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 9;
        mapParticlesRef.current.push({
          x: worldX,
          y: worldY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3.5,
          color: Math.random() > 0.5 ? '#D32F2F' : Math.random() > 0.3 ? '#FF5722' : '#FFD54F',
          life: 0,
          maxLife: 30 + Math.random() * 22,
          size: 4 + Math.random() * 5,
          type: 'debris',
        });
      }
    } else {
      // BAZOOKA: Heavy military soot smoke clouds, fiery core flash, and dirt chunks
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 7.5;
        mapParticlesRef.current.push({
          x: worldX,
          y: worldY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.8,
          color: Math.random() > 0.6 ? '#212121' : Math.random() > 0.3 ? '#FF6D00' : '#FFFDE7',
          life: 0,
          maxLife: 32 + Math.random() * 22,
          size: 5 + Math.random() * 7,
          type: 'smoke',
        });
      }
    }

    mapParticlesRef.current.push(...dirtDebris.map((d) => ({ ...d, type: 'debris' as const })));
  };

  // Dragging map
  const handleMapPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingMapRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: mapPan.x,
      panY: mapPan.y,
    };
  };

  const handleMapPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return;
    const dx = (e.clientX - dragStartRef.current.x) / mapZoom;
    const dy = (e.clientY - dragStartRef.current.y) / mapZoom;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDraggingMapRef.current = true;
    }
    setMapPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  // ================= WORM ANIMATION STUDIO LOOP =================
  useEffect(() => {
    if (!isOpen || activeTab !== 'worms') return;

    let animId: number;

    const renderWormStudio = () => {
      animId = requestAnimationFrame(renderWormStudio);
      if (!isPaused) {
        animTimeRef.current += 0.05 * animSpeed;
      }
      const t = animTimeRef.current;

      const canvas = wormCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 30;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid background
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Ground pedestal
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 75 * (wormScale / 4), 16 * (wormScale / 4), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Shadow beneath worm
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 2, 26 * (wormScale / 4), 8 * (wormScale / 4), 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Worm with Scale & Transforms
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(wormScale, wormScale);

      const flip = wormFacing === 'left' ? -1 : 1;
      ctx.scale(flip, 1);

      // Compute animation offsets
      let breath = Math.sin(t * 1.5) * 1.2;
      let walkOffset = 0;
      let jumpY = 0;
      let squishX = 1;
      let squishY = 1;
      let recoilX = 0;

      if (animState === 'walk') {
        walkOffset = Math.sin(t * 4) * 3;
        breath = Math.cos(t * 4) * 1.5;
      } else if (animState === 'jump') {
        const jumpPhase = Math.sin(t * 3);
        jumpY = Math.max(0, jumpPhase) * -22;
        squishY = jumpPhase > 0 ? 1.25 : 0.85;
        squishX = jumpPhase > 0 ? 0.85 : 1.2;
      } else if (animState === 'shoot') {
        recoilX = -Math.sin(t * 6) * 4;
      } else if (animState === 'celebrate') {
        jumpY = Math.abs(Math.sin(t * 4)) * -14;
        breath = Math.sin(t * 8) * 2;
      } else if (animState === 'hurt') {
        breath = Math.sin(t * 5) * 1.8;
      }

      ctx.translate(recoilX, jumpY);

      if (animState === 'tombstone') {
        drawStudioTombstone(ctx);
      } else {
        // Pass squish factors so ONLY the organic fleshy body squishes, NOT the metal weapon or hat!
        drawStudioWorm(ctx, breath, walkOffset, squishX, squishY);
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(renderWormStudio);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, activeTab, animState, selectedWeapon, selectedHat, selectedColor, aimAngle, wormFacing, wormScale, animSpeed, isPaused]);

  /**
   * Refined Worm Drawing with Comical Adorable Hurt Face
   */
  const drawStudioWorm = (
    ctx: CanvasRenderingContext2D,
    breath: number,
    walkOffset: number,
    squishX: number = 1,
    squishY: number = 1
  ) => {
    // 1. Organic Fleshy Body (affected by jump squish & stretch)
    ctx.save();
    ctx.scale(squishX, squishY);

    // Tail segment
    ctx.fillStyle = '#FF8A80';
    ctx.strokeStyle = '#B71C1C';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-8 + walkOffset * 0.5, -4, 6, 5 + breath * 0.3, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Middle body
    ctx.fillStyle = '#FF6E6E';
    ctx.beginPath();
    ctx.ellipse(-1 + walkOffset, -7 + breath * 0.5, 8.5, 7.5, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head with 3D gradient
    const headGrad = ctx.createRadialGradient(2, -13 + breath, 2, 4, -13 + breath, 9);
    headGrad.addColorStop(0, '#FF8A80');
    headGrad.addColorStop(0.7, '#FF5252');
    headGrad.addColorStop(1, '#D32F2F');
    ctx.fillStyle = headGrad;

    ctx.beginPath();
    ctx.arc(4, -13 + breath, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Specular body glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(2, -16 + breath, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Team Hat (follows head motion)
    drawStudioHat(ctx, selectedHat, selectedColor, breath);

    // 5. Expressive Worm Eyes, Eyebrows & Mouth (based on authentic official Worms sprites)
    if (animState === 'hurt') {
      // ADORABLE, COMICAL WOUNDED FACE
      // 1. Droopy sad cartoon eyelids
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(7.5, -14 + breath, 3.2, 2.6, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(3.8, -14 + breath, 2.8, 2.4, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2. Cute cartoon spiral pupils (@_@ style)
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(7.5, -14 + breath, 1.4, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3.8, -14 + breath, 1.2, 0, Math.PI * 1.5);
      ctx.stroke();

      // Sad slanted black eyebrows floating above eyes (classic Worms signature)
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.ellipse(8, -18.5 + breath, 2, 0.9, 0.35, 0, Math.PI * 2);
      ctx.ellipse(3.5, -18.5 + breath, 1.8, 0.9, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // 3. Rosy blush on cheeks
      ctx.fillStyle = 'rgba(255, 64, 129, 0.45)';
      ctx.beginPath();
      ctx.ellipse(9, -10 + breath, 2.2, 1.3, 0, 0, Math.PI * 2);
      ctx.ellipse(1, -10 + breath, 2.2, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Comical trembling sad mouth / pout
      ctx.strokeStyle = '#B71C1C';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(5.5, -8.5 + breath, 2.2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // 5. Charming medical bandaid with red cross
      ctx.fillStyle = '#FFF8E1';
      ctx.fillRect(1, -17.5 + breath, 6.5, 3.2);
      ctx.strokeStyle = '#D7CCC8';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(1, -17.5 + breath, 6.5, 3.2);
      ctx.fillStyle = '#E53935';
      ctx.fillRect(3.5, -17 + breath, 1.5, 2.2);
      ctx.fillRect(2.7, -16.5 + breath, 3.1, 1.2);

      // 6. Cute tear / sweat droplet
      ctx.fillStyle = '#4FC3F7';
      ctx.beginPath();
      ctx.moveTo(10.5, -11 + breath);
      ctx.quadraticCurveTo(11.5, -9 + breath, 10.5, -8 + breath);
      ctx.quadraticCurveTo(9.5, -9 + breath, 10.5, -11 + breath);
      ctx.fill();
    } else {
      // Signature Worms big expressive eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.8;

      // Front eye (large oval)
      ctx.beginPath();
      ctx.ellipse(7.5, -14.5 + breath, 3.2, 4.2, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Back eye
      ctx.beginPath();
      ctx.ellipse(3.6, -14.5 + breath, 2.8, 3.8, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Iconic black floating eyebrows (hallmark of Team17 Worms design!)
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.ellipse(7.8, -20 + breath, 2.2, 1, 0.1, 0, Math.PI * 2);
      ctx.ellipse(3.6, -19.5 + breath, 2, 0.9, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Pupils tracking angle
      const rad = (-aimAngle * Math.PI) / 180;
      const pShiftX = Math.cos(rad) * 1.5;
      const pShiftY = Math.sin(rad) * 1.2;

      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(7.8 + pShiftX, -14.5 + breath + pShiftY, 1.5, 0, Math.PI * 2);
      ctx.arc(4.0 + pShiftX, -14.5 + breath + pShiftY, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // White shine dot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(8.5, -15.5 + breath, 0.7, 0, Math.PI * 2);
      ctx.arc(4.7, -15.5 + breath, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Expressive mouth (smirk or slight determination fold)
      ctx.strokeStyle = '#900C3F';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (animState === 'celebrate') {
        // Big open smiling mouth
        ctx.arc(5.8, -8.5 + breath, 2.5, 0.1, Math.PI - 0.1);
        ctx.fillStyle = '#C2185B';
        ctx.fill();
      } else {
        // Wry Worms smirk
        ctx.moveTo(3.5, -9 + breath);
        ctx.quadraticCurveTo(6, -8.5 + breath, 8, -9.5 + breath);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 2. Weapon & Floating Cartoon Hands (authentic Worms hands holding weapon!)
    if (selectedWeapon !== 'skip') {
      const handY = (-13 + breath) * squishY + 4;
      const handX = 4 * squishX + 2;
      drawStudioWeapon(ctx, aimAngle, selectedWeapon, handX, handY);

      // Render fleshy floating hands holding the weapon
      ctx.save();
      ctx.translate(handX, handY);
      const rad = (-aimAngle * Math.PI) / 180;
      ctx.rotate(rad);

      // Flesh color matching worm body
      ctx.fillStyle = '#FFA07A';
      ctx.strokeStyle = '#B71C1C';
      ctx.lineWidth = 1;

      // Front hand gripping grip/trigger
      ctx.beginPath();
      ctx.ellipse(3, 2, 2.8, 2.4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Fingers knuckles
      ctx.fillStyle = '#FF8A80';
      ctx.beginPath();
      ctx.arc(4, 2, 1, 0, Math.PI * 2);
      ctx.fill();

      // Back support hand on barrel/stock (for 2-handed weapons)
      if (selectedWeapon === 'bazooka' || selectedWeapon === 'shotgun') {
        ctx.beginPath();
        ctx.ellipse(14, 2, 2.6, 2.2, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFA07A';
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  /**
   * Refined Hats: Crown wider & higher, Beret higher & tilted
   */
  const drawStudioHat = (ctx: CanvasRenderingContext2D, hat: HatType, color: string, breath: number) => {
    if (hat === 'helmet') {
      ctx.save();
      ctx.translate(4, -18 + breath);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 4, 9.5, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#37474F';
      ctx.fillRect(-10, 3, 20, 2.5);
      ctx.restore();
    } else if (hat === 'crown') {
      // Golden Crown: PROPORTIONATE (width 14px, fits the 17px head perfectly without overhang!)
      ctx.save();
      ctx.translate(4, -20.5 + breath);
      const crownGrad = ctx.createLinearGradient(-7, -9, 7, 0);
      crownGrad.addColorStop(0, '#FFF59D');
      crownGrad.addColorStop(0.5, '#FFD700');
      crownGrad.addColorStop(1, '#FF8F00');
      ctx.fillStyle = crownGrad;

      // 5 peaks fitting the worm head width cleanly
      ctx.beginPath();
      ctx.moveTo(-7, 1);
      ctx.lineTo(-7, -6.5);
      ctx.lineTo(-3.5, -3);
      ctx.lineTo(0, -9); // Regal center peak
      ctx.lineTo(3.5, -3);
      ctx.lineTo(7, -6.5);
      ctx.lineTo(7, 1);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#B78103';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Red velvet headband base
      ctx.fillStyle = '#B71C1C';
      ctx.fillRect(-6.5, -0.5, 13, 1.8);

      // Embedded Jewels: Ruby, Sapphire, Emerald
      ctx.fillStyle = '#E91E63';
      ctx.beginPath(); ctx.arc(-4, 0.4, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2196F3';
      ctx.beginPath(); ctx.arc(0, 0.4, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath(); ctx.arc(4, 0.4, 1.1, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    } else if (hat === 'beret') {
      // General's Beret: Coherent layering with lower band/drape UNDERNEATH the main felt puff
      ctx.save();
      ctx.translate(3.5, -20.5 + breath);
      ctx.rotate(-0.14);

      // 1. Lower leather sweatband / drape underneath (sits directly on top of head)
      ctx.fillStyle = '#1A1A1A';
      ctx.beginPath();
      ctx.ellipse(0, 3, 7.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Lower drape shadow on the side (drawn underneath main puff)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(5.5, 1.8, 4.5, 3, 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.stroke();

      // 2. Main Puffed Beret Top (drawn ABOVE the band so it overlaps cleanly)
      const beretGrad = ctx.createRadialGradient(-2, -3, 2, 0, -1, 10);
      beretGrad.addColorStop(0, '#FFFFFF'); // subtle highlight on top fold
      beretGrad.addColorStop(0.2, color);
      beretGrad.addColorStop(1, '#000000'); // shadow towards bottom
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(-0.5, -1, 9.5, 4.8, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Crease fold line across beret
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-7, -0.5);
      ctx.quadraticCurveTo(0, -2.5, 7, 0);
      ctx.stroke();

      // 3. Gold Star / Eagle Military Badge pinned to the front left
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(-2.5, -1, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFA000';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.restore();
    } else if (hat === 'bandana') {
      ctx.save();
      ctx.translate(4, -18 + breath);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 5, 9, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-9, 4);
      ctx.lineTo(-15, 1);
      ctx.lineTo(-13, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };

  /**
   * Refined Weapons: Sleek Bazooka, Distinct Grenade vs Cluster, True Realistic Curved Banana, Chunky Dynamite, Sleek Shotgun
   */
  const drawStudioWeapon = (
    ctx: CanvasRenderingContext2D,
    angleDeg: number,
    weapon: WeaponId,
    handX: number = 6,
    handY: number = -9
  ) => {
    ctx.save();
    ctx.translate(handX, handY);
    const rad = (-angleDeg * Math.PI) / 180;
    ctx.rotate(rad);

    if (weapon === 'bazooka') {
      // Sleek military rocket launcher
      const bazGrad = ctx.createLinearGradient(0, -5, 0, 5);
      bazGrad.addColorStop(0, '#689F38');
      bazGrad.addColorStop(0.3, '#7CB342');
      bazGrad.addColorStop(0.7, '#33691E');
      bazGrad.addColorStop(1, '#1B5E20');
      ctx.fillStyle = bazGrad;
      ctx.fillRect(-7, -4.5, 27, 9);
      ctx.strokeStyle = '#0e3805';
      ctx.lineWidth = 1;
      ctx.strokeRect(-7, -4.5, 27, 9);

      // Flared rear exhaust vent bell
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.moveTo(-7, -5.5);
      ctx.lineTo(-11, -7.5);
      ctx.lineTo(-11, 7.5);
      ctx.lineTo(-7, 5.5);
      ctx.closePath();
      ctx.fill();

      // Front muzzle reinforced ring
      ctx.fillStyle = '#37474F';
      ctx.fillRect(18, -5.5, 3.5, 11);

      // Optical scope sight on top
      ctx.fillStyle = '#263238';
      ctx.fillRect(3, -8, 8, 3.5);
      ctx.fillStyle = '#4FC3F7';
      ctx.fillRect(9.5, -7.5, 1.5, 2.5);

      // Rocket warhead with red cone nose
      ctx.fillStyle = '#2E7D32';
      ctx.fillRect(20, -3.5, 4, 7);
      ctx.fillStyle = '#D32F2F';
      ctx.beginPath();
      ctx.moveTo(24, -3.5);
      ctx.lineTo(30, 0);
      ctx.lineTo(24, 3.5);
      ctx.closePath();
      ctx.fill();
    } else if (weapon === 'banana') {
      // VRAIE BANANE BOMBE (SUPER BANANE WORMS)
      // Courbure organique prononcée, peau jaune vif, arêtes à facettes, tige verte recourbée et pointe brune
      ctx.save();
      ctx.translate(6, 1);
      ctx.rotate(0.25);

      // 1. Face ventrale ombrée (jaune doré / orangé chaud)
      ctx.beginPath();
      ctx.moveTo(-11, 2);
      ctx.bezierCurveTo(-5, 9, 8, 9, 17, 0);
      ctx.bezierCurveTo(9, 3, -4, 4, -11, 2);
      ctx.fillStyle = '#F57F17';
      ctx.fill();

      // 2. Corps principal de la banane (jaune éclatant et courbure classique)
      ctx.beginPath();
      ctx.moveTo(-11, 2);
      ctx.bezierCurveTo(-4, -9, 8, -9, 17, 0);
      ctx.bezierCurveTo(8, 7, -4, 7, -11, 2);
      ctx.closePath();

      const banGrad = ctx.createLinearGradient(-8, -10, 10, 8);
      banGrad.addColorStop(0, '#FFF59D'); // éclat supérieur
      banGrad.addColorStop(0.35, '#FFEE58');
      banGrad.addColorStop(0.7, '#FFD600'); // jaune banane mûre
      banGrad.addColorStop(1, '#F57F17'); // dessous doré
      ctx.fillStyle = banGrad;
      ctx.fill();

      ctx.strokeStyle = '#E65100';
      ctx.lineWidth = 1.3;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 3. Arête centrale caractéristique de la banane (facette pelure)
      ctx.beginPath();
      ctx.moveTo(-9, 1);
      ctx.bezierCurveTo(-3, -4.5, 6, -4.5, 15, -0.5);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 4. Seconde arête sombre pour le volume 3D
      ctx.beginPath();
      ctx.moveTo(-9, 2.5);
      ctx.bezierCurveTo(-3, 4, 6, 4, 14, 1);
      ctx.strokeStyle = 'rgba(230, 81, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 5. Tige de la banane à la base (pédoncule vert courbé)
      ctx.save();
      ctx.fillStyle = '#689F38';
      ctx.beginPath();
      ctx.moveTo(-11, 2);
      ctx.quadraticCurveTo(-15, 3, -16, -1);
      ctx.lineTo(-14, -2.5);
      ctx.quadraticCurveTo(-12, 1, -10, 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#33691E';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Bout coupé de la tige (brun sec)
      ctx.fillStyle = '#5D4037';
      ctx.beginPath();
      ctx.arc(-15, -1.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6. Pointe noire / brune à l'autre extrémité (reste de fleur de bananier)
      ctx.fillStyle = '#3E2723';
      ctx.beginPath();
      ctx.moveTo(16, -0.8);
      ctx.lineTo(20, -0.2);
      ctx.lineTo(16.5, 1.5);
      ctx.closePath();
      ctx.fill();

      // 7. Petites taches de maturité (points de rousseur marron typiques des bananes mûres savoureuses)
      ctx.fillStyle = '#5D4037';
      ctx.beginPath(); ctx.arc(-2, -3.5, 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -2, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(9, 0.5, 0.6, 0, Math.PI * 2); ctx.fill();

      // 8. Éclat scintillant cartoon (reflet magique « Super Weapon »)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(1, -6);
      ctx.lineTo(3, -5);
      ctx.lineTo(1, -4);
      ctx.lineTo(0, -2);
      ctx.lineTo(-1, -4);
      ctx.lineTo(-3, -5);
      ctx.lineTo(-1, -6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    } else if (weapon === 'grenade') {
      // GRENADE: Cast-iron olive pineapple grenade
      const grenGrad = ctx.createRadialGradient(9, -2, 1, 10, 0, 7);
      grenGrad.addColorStop(0, '#558B2F');
      grenGrad.addColorStop(0.7, '#33691E');
      grenGrad.addColorStop(1, '#1B5E20');
      ctx.fillStyle = grenGrad;
      ctx.beginPath();
      ctx.ellipse(10, 0, 6, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0e3805';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pineapple grid ribs
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(6, -2); ctx.lineTo(14, -2);
      ctx.moveTo(6, 2); ctx.lineTo(14, 2);
      ctx.moveTo(10, -7); ctx.lineTo(10, 7);
      ctx.stroke();

      // Metal neck & Silver Lever spoon
      ctx.fillStyle = '#9E9E9E';
      ctx.fillRect(8.5, -10, 3, 3);
      ctx.strokeStyle = '#B0BEC5';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(10, -10);
      ctx.lineTo(13.5, -9);
      ctx.lineTo(14.5, 3);
      ctx.stroke();

      // Pull ring
      ctx.strokeStyle = '#CFD8DC';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(7, -9, 2.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (weapon === 'cluster') {
      // CLUSTER BOMB: Navy Blue with Yellow Hazard Stripes & Sub-munitions
      const clustGrad = ctx.createLinearGradient(6, -8, 16, 8);
      clustGrad.addColorStop(0, '#283593');
      clustGrad.addColorStop(0.6, '#1A237E');
      clustGrad.addColorStop(1, '#0D47A1');
      ctx.fillStyle = clustGrad;
      ctx.beginPath();
      ctx.roundRect(6, -7, 13, 14, [4, 4, 4, 4]);
      ctx.fill();
      ctx.strokeStyle = '#000051';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Bright Hazard Stripes
      ctx.fillStyle = '#FFD600';
      ctx.fillRect(6, -3, 13, 2.5);
      ctx.fillRect(6, 2, 13, 2.5);

      // Mini sub-munitions strapped on sides
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.arc(6, -5, 2, 0, Math.PI * 2);
      ctx.arc(6, 5, 2, 0, Math.PI * 2);
      ctx.arc(19, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // Top detonator cap with blinking LED
      ctx.fillStyle = '#424242';
      ctx.fillRect(10.5, -11, 4, 4);
      ctx.fillStyle = '#FF1744';
      ctx.beginPath();
      ctx.arc(12.5, -12, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (weapon === 'dynamite') {
      // DYNAMITE: Chunky bundle of 3 red sticks with long fuse & sizzling sparks
      // Stick 1 (back top)
      ctx.fillStyle = '#B71C1C';
      ctx.fillRect(8, -11, 20, 6.5);
      // Stick 2 (back bottom)
      ctx.fillRect(8, 2, 20, 6.5);
      // Stick 3 (front middle)
      const dynGrad = ctx.createLinearGradient(0, -6, 0, 4);
      dynGrad.addColorStop(0, '#EF5350');
      dynGrad.addColorStop(0.5, '#D32F2F');
      dynGrad.addColorStop(1, '#B71C1C');
      ctx.fillStyle = dynGrad;
      ctx.fillRect(7, -5.5, 22, 8.5);
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1;
      ctx.strokeRect(7, -5.5, 22, 8.5);

      // Yellow caution tape band
      ctx.fillStyle = '#FFD54F';
      ctx.fillRect(14, -11, 6, 20);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(14, -11, 6, 20);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 5px monospace';
      ctx.fillText('TNT', 15, -1);

      // Long sizzling fuse wire
      ctx.strokeStyle = '#EEEEEE';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(27, -2);
      ctx.bezierCurveTo(32, -8, 26, -14, 33, -18);
      ctx.stroke();

      // Bright sparks at fuse tip
      ctx.fillStyle = '#FFEE58';
      ctx.beginPath();
      ctx.arc(33, -18, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(33, -18, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(33, -22); ctx.lineTo(33, -14);
      ctx.moveTo(29, -18); ctx.lineTo(37, -18);
      ctx.stroke();
    } else if (weapon === 'shotgun') {
      // SHOTGUN: Slender twin blued-steel barrels, wooden mahogany stock
      const barrelGrad = ctx.createLinearGradient(0, -3.5, 0, 2);
      barrelGrad.addColorStop(0, '#90A4AE');
      barrelGrad.addColorStop(0.5, '#455A64');
      barrelGrad.addColorStop(1, '#263238');
      ctx.fillStyle = barrelGrad;
      ctx.fillRect(2, -3.5, 24, 5);
      ctx.strokeStyle = '#1a2327';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(2, -3.5, 24, 5);

      // Vent rib along the top
      ctx.fillStyle = '#B0BEC5';
      ctx.fillRect(2, -4.5, 24, 1);

      // Warm mahogany wooden stock and pump fore-end
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(8, 1, 9, 3.5);
      ctx.beginPath();
      ctx.moveTo(2, -2);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-12, 5);
      ctx.lineTo(-11, 9);
      ctx.lineTo(-5, 4);
      ctx.lineTo(2, 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3E2723';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Brass trigger guard
      ctx.strokeStyle = '#FFD54F';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-2, 3, 2, 0, Math.PI);
      ctx.stroke();
    } else if (weapon === 'holy') {
      // Golden Holy Hand Grenade with halo
      const goldGrad = ctx.createRadialGradient(9, -2, 1, 9, -2, 7);
      goldGrad.addColorStop(0, '#FFF59D');
      goldGrad.addColorStop(0.6, '#FFD700');
      goldGrad.addColorStop(1, '#FFA000');
      ctx.fillStyle = goldGrad;
      ctx.beginPath();
      ctx.arc(9, -2, 7, 0, Math.PI * 2);
      ctx.fill();

      // Sparkling cross on top
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(8, -12, 2.5, 6);
      ctx.fillRect(6, -10, 6.5, 2.5);

      // Divine glow rays
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(9, -2, 11, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  /**
   * Refined Tombstone: WIDE (30px) with carved cross, R.I.P. centered with ample margins
   */
  const drawStudioTombstone = (ctx: CanvasRenderingContext2D) => {
    // Stone base plinth
    ctx.fillStyle = '#37474F';
    ctx.fillRect(-17, -1, 34, 4);
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 1;
    ctx.strokeRect(-17, -1, 34, 4);

    // Main headstone
    const stoneGrad = ctx.createLinearGradient(-15, -26, 15, 0);
    stoneGrad.addColorStop(0, '#CFD8DC');
    stoneGrad.addColorStop(0.4, '#90A4AE');
    stoneGrad.addColorStop(1, '#546E7A');
    ctx.fillStyle = stoneGrad;

    ctx.beginPath();
    ctx.roundRect(-15, -26, 30, 26, [10, 10, 2, 2]);
    ctx.fill();

    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Carved cross on top
    ctx.fillStyle = '#37474F';
    ctx.fillRect(-1.2, -22, 2.4, 5.5);
    ctx.fillRect(-3, -20, 6, 1.8);

    // R.I.P. inscription cleanly centered with ample space
    ctx.fillStyle = '#263238';
    ctx.font = 'bold 7.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('R.I.P.', 0, -11);

    // Name below
    ctx.font = 'bold 6.5px monospace';
    ctx.fillText('AKA', 0, -3);

    // Small grass clump at base
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(-12, -3, 3, 3);
    ctx.fillRect(9, -3, 3, 3);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white">
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="font-retro text-sm text-emerald-400 font-extrabold">
              STUDIO & GALERIE AKA
            </span>
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => {
                  sounds.playMenuClick();
                  setActiveTab('maps');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'maps'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Explorateur des Cartes</span>
              </button>
              <button
                onClick={() => {
                  sounds.playMenuClick();
                  setActiveTab('worms');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'worms'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smile className="w-3.5 h-3.5" />
                <span>Animations des Vers</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'maps' ? (
            /* ================= TAB 1: MAP EXPLORER ================= */
            <div className="space-y-4">
              {/* Map Presets Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'islands', name: 'Îles Flottantes AKA', desc: 'Îles célestes, ponts suspendus & runes' },
                    { id: 'canyon', name: 'Canyon & Caverne', desc: 'Grès rouge, arches & fossiles' },
                    { id: 'fortress', name: 'Château Fort AKA', desc: 'Créneaux, briques & bannières' },
                    { id: 'volcano', name: 'Volcan & Lave', desc: 'Basalte, failles & lave ardente' },
                    { id: 'procedural', name: 'Générateur Aléatoire', desc: 'Courbes sinusoïdales organiques' },
                  ].map((map) => (
                    <button
                      key={map.id}
                      onClick={() => {
                        sounds.playMenuClick();
                        setSelectedMap(map.id as MapPreset);
                        setTerrainSeed(Date.now());
                        setMapPan({ x: 0, y: 0 });
                      }}
                      className={`px-3 py-2 rounded-xl border text-left transition-all ${
                        selectedMap === map.id
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400'
                          : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="block text-xs font-bold">{map.name}</span>
                      <span className="block text-[10px] text-slate-400 font-normal">{map.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Regenerate seed */}
                <button
                  onClick={() => {
                    sounds.playMenuClick();
                    setTerrainSeed(Date.now());
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Régénérer</span>
                </button>
              </div>

              {/* Map Interactive Canvas Viewport */}
              <div className="relative w-full aspect-[16/9] bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl cursor-crosshair">
                <canvas
                  ref={mapCanvasRef}
                  width={1280}
                  height={720}
                  onClick={handleMapCanvasClick}
                  onPointerDown={handleMapPointerDown}
                  onPointerMove={handleMapPointerMove}
                  className="w-full h-full object-contain"
                />

                {/* Floating Map Help Overlay */}
                <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] font-mono text-slate-300 pointer-events-none">
                  <span className="text-emerald-400 font-bold">Impact précis : </span>
                  Cliquez n'importe où pour tester l'impact direct de l'arme sélectionnée !
                </div>

                {/* Floating Map Controls Toolbar */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] font-mono text-slate-400 px-1">Arme de test :</span>
                  {[
                    { id: 'bazooka', name: 'Bazooka' },
                    { id: 'banana', name: 'Banane' },
                    { id: 'holy', name: 'Sainte' },
                    { id: 'dynamite', name: 'Dynamite' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        sounds.playMenuClick();
                        setActiveTestWeapon(w.id as WeaponId);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeTestWeapon === w.id
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}

                  <div className="h-4 w-px bg-slate-700 mx-1" />

                  {/* Zoom In / Out */}
                  <button
                    onClick={() => setMapZoom((z) => Math.min(2.5, z + 0.25))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                    title="Zoom avant"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setMapZoom((z) => Math.max(0.6, z - 0.25))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                    title="Zoom arrière"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setMapZoom(1);
                      setMapPan({ x: 0, y: 0 });
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                    title="Réinitialiser vue"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Map Description & Technical Specs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="font-bold text-emerald-400 block mb-1">Particules par Arme</span>
                  <p className="text-[11px] text-slate-400">
                    Chaque arme projette ses propres particules : quartiers de banane dorés, étincelles divines célestes, éclats de dynamite rouge ou fumée militaire noire.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">Affichage sur Gamebuino AKA</span>
                  <p className="text-[11px] text-slate-400">
                    Écran 320 × 240 (ratio 4:3) avec double mise à l'échelle entière sans aucun rognage ni flou horizontal.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="font-bold text-sky-400 block mb-1">Impact au Clic Précis</span>
                  <p className="text-[11px] text-slate-400">
                    Calcul géométrique inversé avec compensation du ratio d'affichage pour une frappe exactement sous le pointeur.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ================= TAB 2: WORM ANIMATION STUDIO ================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Interactive Worm Stage Canvas */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="relative w-full aspect-square max-h-[460px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                  <canvas
                    ref={wormCanvasRef}
                    width={480}
                    height={480}
                    className="w-full h-full object-contain cursor-grab"
                  />

                  {/* Top Zoom & Speed Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-1 bg-slate-900/80 border border-slate-700 rounded-lg text-[10px] font-mono text-emerald-400 font-bold">
                      Zoom {wormScale}x
                    </span>
                    <span className="px-2 py-1 bg-slate-900/80 border border-slate-700 rounded-lg text-[10px] font-mono text-amber-400 font-bold">
                      {animSpeed}x Vitesse
                    </span>
                  </div>

                  {/* Stage Bottom Controls */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700">
                    {/* Play / Pause */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200"
                        title={isPaused ? 'Reprendre' : 'Pause'}
                      >
                        {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                      </button>

                      {/* Direction flip */}
                      <button
                        onClick={() => {
                          sounds.playMenuClick();
                          setWormFacing((f) => (f === 'left' ? 'right' : 'left'));
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-bold text-slate-300"
                      >
                        Regard : {wormFacing === 'right' ? 'Droite ➔' : 'Gauche ⬅'}
                      </button>
                    </div>

                    {/* Sound triggers */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => sounds.playWormHurt()}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-rose-400 flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" /> Couinement
                      </button>
                      <button
                        onClick={() => sounds.playShoot()}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-amber-400 flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" /> Tir
                      </button>
                      <button
                        onClick={() => sounds.playVictory()}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-emerald-400 flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" /> Fanfare
                      </button>
                    </div>
                  </div>
                </div>

                {/* Aiming Angle Slider */}
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-slate-300">Angle de Visée :</span>
                    <span className="font-mono text-xs font-bold text-emerald-400">{aimAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="-85"
                    max="85"
                    value={aimAngle}
                    onChange={(e) => setAimAngle(Number(e.target.value))}
                    className="flex-1 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Right Column: Customization Controls */}
              <div className="lg:col-span-5 space-y-4">
                {/* 1. Animation State */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Animation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'idle', label: 'Au Repos (Respiration)' },
                      { id: 'walk', label: 'Marche (Rampement)' },
                      { id: 'jump', label: 'Saut (Squish & Stretch)' },
                      { id: 'shoot', label: 'Tir & Recul' },
                      { id: 'hurt', label: 'Dégâts (Blessé / K.O.)' },
                      { id: 'celebrate', label: 'Victoire & Joie' },
                      { id: 'tombstone', label: 'Tombe R.I.P.' },
                    ].map((anim) => (
                      <button
                        key={anim.id}
                        onClick={() => {
                          sounds.playMenuClick();
                          setAnimState(anim.id as AnimationState);
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                          animState === anim.id
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400'
                            : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {anim.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Weapon Held */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Arme Équipée
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'bazooka', name: 'Bazooka' },
                      { id: 'grenade', name: 'Grenade' },
                      { id: 'cluster', name: 'Cluster Bomb' },
                      { id: 'banana', name: 'Bombe Banane' },
                      { id: 'dynamite', name: 'Dynamite' },
                      { id: 'holy', name: 'Sainte Grenade' },
                      { id: 'shotgun', name: 'Fusil à Pompe' },
                      { id: 'skip', name: 'Mains Libres' },
                    ].map((wpn) => (
                      <button
                        key={wpn.id}
                        onClick={() => {
                          sounds.playMenuClick();
                          setSelectedWeapon(wpn.id as WeaponId);
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all truncate text-left ${
                          selectedWeapon === wpn.id
                            ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                            : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {wpn.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Hat / Headgear */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Couvre-Chef / Accessoire
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'bandana', name: 'Bandana AKA' },
                      { id: 'helmet', name: 'Casque Armée' },
                      { id: 'crown', name: 'Couronne d\'Or' },
                      { id: 'beret', name: 'Béret Général' },
                      { id: 'none', name: 'Sans Casque' },
                    ].map((hat) => (
                      <button
                        key={hat.id}
                        onClick={() => {
                          sounds.playMenuClick();
                          setSelectedHat(hat.id as HatType);
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all truncate text-left ${
                          selectedHat === hat.id
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                            : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {hat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Team Colors */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Couleur de Clan
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { color: '#10B981', name: 'Vert AKA' },
                      { color: '#EF4444', name: 'Rouge Titan' },
                      { color: '#06B6D4', name: 'Bleu Cyan' },
                      { color: '#F59E0B', name: 'Or Ambre' },
                      { color: '#8B5CF6', name: 'Violet Néon' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        onClick={() => {
                          sounds.playMenuClick();
                          setSelectedColor(c.color);
                        }}
                        style={{ backgroundColor: c.color }}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          selectedColor === c.color ? 'scale-115 border-white shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* 5. Magnification Scale */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Grossissement du Ver
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 4, 6, 8].map((s) => (
                      <button
                        key={s}
                        onClick={() => setWormScale(s)}
                        className={`py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                          wormScale === s
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                            : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
