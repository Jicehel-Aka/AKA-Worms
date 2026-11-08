import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Worm,
  Team,
  Projectile,
  Particle,
  DamageText,
  WeaponId,
  CameraState,
  GameOptions,
} from '../types/game';
import { TerrainEngine, MAP_WIDTH, MAP_HEIGHT, WATER_LEVEL } from '../utils/terrain';
import { WEAPONS } from '../utils/weapons';
import { sounds } from '../utils/audio';

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface GameCanvasProps {
  teams: Team[];
  activeTeamIndex: number;
  activeWormIndex: number;
  currentWeapon: WeaponId;
  grenadeTimer: number;
  isFiring: boolean;
  power: number; // 0 to 100
  wind: number; // -10 to +10
  options: GameOptions;
  isAirstrikeMode: boolean;
  isTeleportMode: boolean;
  onFireComplete: (turnEnded: boolean) => void;
  onDamageApplied: (updatedTeams: Team[]) => void;
  onWormMove?: (x: number, y: number, facing: 'left' | 'right') => void;
  onAimChange?: (angle: number) => void;
  onSelectAirstrikeTarget?: (targetX: number) => void;
  onSelectTeleportTarget?: (x: number, y: number) => void;
  isQuickZoomActive: boolean;
  onToggleQuickZoom: () => void;
  onExplosionOccurred?: (x: number, y: number, radius: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  teams,
  activeTeamIndex,
  activeWormIndex,
  currentWeapon,
  grenadeTimer,
  isFiring,
  power,
  wind,
  options,
  isAirstrikeMode,
  isTeleportMode,
  onFireComplete,
  onDamageApplied,
  onWormMove,
  onAimChange,
  onSelectAirstrikeTarget,
  onSelectTeleportTarget,
  isQuickZoomActive,
  onToggleQuickZoom,
  onExplosionOccurred,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const terrainRef = useRef<TerrainEngine | null>(null);

  // Dynamic Camera state
  const cameraRef = useRef<CameraState>({
    x: 800,
    y: 500,
    zoom: 0.9,
    targetX: 800,
    targetY: 500,
    targetZoom: 0.9,
    isQuickZoomOut: false,
  });

  // Screen Shake impulse state for tactile explosion punch
  const screenShakeRef = useRef<{ intensity: number; duration: number }>({
    intensity: 0,
    duration: 0,
  });

  // Projectiles, Particles, Weather & Damage Popups
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const ambientParticlesRef = useRef<AmbientParticle[]>([]);
  const shockwavesRef = useRef<{ x: number; y: number; radius: number; maxRadius: number; color: string }[]>([]);
  const damageTextsRef = useRef<DamageText[]>([]);
  const waterTimeRef = useRef<number>(0);
  const teamsRef = useRef<Team[]>(teams);
  teamsRef.current = teams;

  // Dragging camera
  const isDraggingCamRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; camX: number; camY: number }>({
    x: 0,
    y: 0,
    camX: 800,
    camY: 500,
  });

  // Active worm tracking
  const activeWorm = teams[activeTeamIndex]?.worms[activeWormIndex];

  // Resolution geometry adapting strictly to hardware modes
  const canvasDimensions = useMemo(() => {
    if (options.displayMode === 'gamebuino_aka') {
      // Gamebuino AKA: Native 320x240 QVGA 4:3 ratio with 2x crisp internal resolution (640x480)
      return { width: 640, height: 480, aspect: '4/3' };
    } else {
      // PC & Android: Full HD Widescreen 16:9
      return { width: 1280, height: 720, aspect: '16/9' };
    }
  }, [options.displayMode]);

  // Initialize terrain & spawn ambient particles
  useEffect(() => {
    const terrain = new TerrainEngine();
    terrain.generate(options.mapPreset);
    terrainRef.current = terrain;

    // Spawn ambient atmosphere particles based on theme
    const count = 45;
    const ambients: AmbientParticle[] = [];
    const isVolcano = options.mapPreset === 'volcano';
    const isCanyon = options.mapPreset === 'canyon';

    for (let i = 0; i < count; i++) {
      ambients.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT * 0.9,
        vx: (Math.random() - 0.5) * 0.4 + wind * 0.04,
        vy: isVolcano ? -0.8 - Math.random() * 0.8 : (Math.random() - 0.5) * 0.3,
        size: isVolcano ? 2 + Math.random() * 3 : 1.5 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
        color: isVolcano
          ? Math.random() > 0.4 ? '#FF5722' : '#FFD54F'
          : isCanyon
          ? '#F5CBA7'
          : '#E8F5E9',
      });
    }
    ambientParticlesRef.current = ambients;

    // Place worms safely on ground with nice spacing
    let placedTeams = teams.map((team, tIdx) => {
      const wormsCount = team.worms.length;
      return {
        ...team,
        worms: team.worms.map((worm, wIdx) => {
          const slot = (tIdx * wormsCount + wIdx + 0.5) / (teams.length * wormsCount);
          const x = 120 + slot * (MAP_WIDTH - 240) + (Math.random() - 0.5) * 60;
          const y = terrain.findSurfaceY(x, 200) - 16;
          return {
            ...worm,
            x: Math.max(60, Math.min(MAP_WIDTH - 60, x)),
            y: Math.min(y, WATER_LEVEL - 30),
            facing: (x > MAP_WIDTH / 2 ? 'left' : 'right') as 'left' | 'right',
          };
        }),
      };
    });

    onDamageApplied(placedTeams);

    // Initial camera center
    const firstWorm = placedTeams[0]?.worms[0];
    if (firstWorm) {
      cameraRef.current.x = firstWorm.x;
      cameraRef.current.y = firstWorm.y;
      cameraRef.current.targetX = firstWorm.x;
      cameraRef.current.targetY = firstWorm.y;
      cameraRef.current.zoom = isQuickZoomActive ? 0.45 : 1.45;
      cameraRef.current.targetZoom = cameraRef.current.zoom;
    }
  }, [options.mapPreset]);

  // Handle Quick Zoom toggle updates
  useEffect(() => {
    if (isQuickZoomActive) {
      cameraRef.current.targetZoom = 0.45;
      cameraRef.current.targetX = MAP_WIDTH / 2;
      cameraRef.current.targetY = MAP_HEIGHT / 2 - 40;
    } else {
      cameraRef.current.targetZoom = 1.45;
      if (activeWorm) {
        cameraRef.current.targetX = activeWorm.x;
        cameraRef.current.targetY = activeWorm.y - 20;
      }
    }
    sounds.playZoom();
  }, [isQuickZoomActive]);

  // Smooth follow active worm when turn changes
  useEffect(() => {
    if (activeWorm && !isQuickZoomActive) {
      cameraRef.current.targetX = activeWorm.x;
      cameraRef.current.targetY = activeWorm.y - 30;
      cameraRef.current.targetZoom = 1.45;
    }
  }, [activeTeamIndex, activeWormIndex]);

  // Main 60FPS Game Loop with hardware throttler
  useEffect(() => {
    let animId: number;
    let lastRenderTime = 0;
    const targetFps = options.fpsLimit || 60;
    const targetInterval = 1000 / targetFps;

    const render = (currentTime: number) => {
      animId = requestAnimationFrame(render);

      const delta = currentTime - lastRenderTime;
      if (delta < targetInterval - 1) {
        return;
      }
      lastRenderTime = currentTime - (delta % targetInterval);

      const canvas = canvasRef.current;
      const terrain = terrainRef.current;
      if (!canvas || !terrain) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const cam = cameraRef.current;

      // 1. Smooth Camera Lerp
      cam.x += (cam.targetX - cam.x) * 0.08;
      cam.y += (cam.targetY - cam.y) * 0.08;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.1;

      // Bounding box
      const halfW = (width / cam.zoom) / 2;
      const halfH = (height / cam.zoom) / 2;
      cam.x = Math.max(halfW - 80, Math.min(MAP_WIDTH - halfW + 80, cam.x));
      cam.y = Math.max(halfH - 80, Math.min(MAP_HEIGHT - halfH + 50, cam.y));

      // 2. Clear Screen & Draw Rich Sky Backdrop
      ctx.save();

      // Screen Shake offset
      if (screenShakeRef.current.duration > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current.intensity;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current.intensity;
        ctx.translate(shakeX, shakeY);
        screenShakeRef.current.duration--;
        screenShakeRef.current.intensity *= 0.9;
      }

      drawAtmosphericSky(ctx, width, height, options.mapPreset);

      // World Transform
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // 3. Multi-layer Parallax Mountains & Clouds
      drawParallaxBackground(ctx, cam.x, cam.y, options.mapPreset);

      // 4. Draw Destructible Terrain
      ctx.drawImage(terrain.canvas, 0, 0);

      // 5. Update & Draw Ambient Atmosphere (sparks, wind leaves, dust)
      updateAndDrawAmbientParticles(ctx);

      // 6. Update & Draw Worms
      updateAndDrawWorms(ctx, terrain);

      // 7. Update & Draw Projectiles & Munitions
      updateAndDrawProjectiles(ctx, terrain);

      // 8. Update & Draw Shockwaves & Particles
      updateAndDrawShockwaves(ctx);
      updateAndDrawParticles(ctx);

      // 9. Draw Dynamic Animated Water or Molten Magma
      drawWater(ctx, width, height, options.mapPreset);

      // 10. Aiming Reticle & Crosshair
      if (activeWorm && activeWorm.isAlive && !activeWorm.tombstone) {
        drawAimingReticle(ctx, activeWorm);
      }

      ctx.restore(); // restore world transform

      // 11. Tactical Minimap Radar
      drawMinimap(terrain);

      ctx.restore(); // restore canvas root
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeWorm, currentWeapon, grenadeTimer, isFiring, power, wind, options]);

  /**
   * Rich Atmospheric Sky Gradient with Sun Rays / Celestial Glow
   */
  const drawAtmosphericSky = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    preset: string
  ) => {
    const sky = ctx.createLinearGradient(0, 0, 0, height);

    if (preset === 'volcano') {
      // Dramatic ash-red volcanic sunset
      sky.addColorStop(0, '#12070D');
      sky.addColorStop(0.35, '#2D0F19');
      sky.addColorStop(0.7, '#6E1D1D');
      sky.addColorStop(1, '#D32F2F');
    } else if (preset === 'canyon') {
      // Warm Arizona dusk
      sky.addColorStop(0, '#1A237E');
      sky.addColorStop(0.4, '#5C2D54');
      sky.addColorStop(0.75, '#D35400');
      sky.addColorStop(1, '#F39C12');
    } else if (preset === 'fortress') {
      // Moody medieval overcast
      sky.addColorStop(0, '#263238');
      sky.addColorStop(0.5, '#455A64');
      sky.addColorStop(1, '#90A4AE');
    } else {
      // Classic Worms Radiant Azure Sky
      sky.addColorStop(0, '#0D47A1');
      sky.addColorStop(0.3, '#1976D2');
      sky.addColorStop(0.7, '#42A5F5');
      sky.addColorStop(1, '#BBDEFB');
    }

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Warm Sun or Celestial Glow
    if (preset !== 'volcano') {
      const sunGrad = ctx.createRadialGradient(width * 0.8, height * 0.2, 5, width * 0.8, height * 0.2, 90);
      sunGrad.addColorStop(0, 'rgba(255, 253, 231, 0.9)');
      sunGrad.addColorStop(0.3, 'rgba(255, 238, 88, 0.4)');
      sunGrad.addColorStop(1, 'rgba(255, 238, 88, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.2, 90, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  /**
   * Multi-Layer Parallax Mountains, Hills & Soft Drifting Clouds
   */
  const drawParallaxBackground = (
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    preset: string
  ) => {
    ctx.save();

    // Layer 1: Distant Mountain Silhouettes (slow parallax 0.1)
    const p1 = camX * 0.1;
    ctx.fillStyle = preset === 'volcano' ? 'rgba(40, 15, 25, 0.7)' : 'rgba(30, 60, 110, 0.25)';
    ctx.beginPath();
    ctx.moveTo(-200, MAP_HEIGHT);
    for (let x = -200; x <= MAP_WIDTH + 200; x += 160) {
      const peakY = 320 + Math.sin((x + p1) * 0.003) * 120 + Math.cos((x + p1) * 0.007) * 60;
      ctx.lineTo(x, peakY);
    }
    ctx.lineTo(MAP_WIDTH + 200, MAP_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Layer 2: Rolling Foreground Hills (parallax 0.25)
    const p2 = camX * 0.25;
    ctx.fillStyle = preset === 'volcano'
      ? 'rgba(60, 20, 30, 0.5)'
      : preset === 'canyon'
      ? 'rgba(186, 74, 0, 0.25)'
      : 'rgba(56, 142, 60, 0.25)';
    ctx.beginPath();
    ctx.moveTo(-200, MAP_HEIGHT);
    for (let x = -200; x <= MAP_WIDTH + 200; x += 120) {
      const hillY = 460 + Math.sin((x + p2) * 0.005) * 80;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(MAP_WIDTH + 200, MAP_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Layer 3: Fluffy Shaded Clouds (parallax 0.35 + drift)
    const cloudOffset = camX * 0.35 + (Date.now() * 0.015);
    for (let c = 0; c < 7; c++) {
      const cx = ((c * 290 - cloudOffset) % (MAP_WIDTH + 500)) - 100;
      const cy = 130 + Math.sin(c * 1.8) * 50;

      // Cloud shadow
      ctx.fillStyle = preset === 'volcano' ? 'rgba(70, 50, 60, 0.45)' : 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.arc(cx + 30, cy - 18, 48, 0, Math.PI * 2);
      ctx.arc(cx + 70, cy - 10, 42, 0, Math.PI * 2);
      ctx.arc(cx + 105, cy, 34, 0, Math.PI * 2);
      ctx.fill();

      // Cloud bright specular top
      ctx.fillStyle = preset === 'volcano' ? 'rgba(100, 70, 80, 0.5)' : 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(cx + 32, cy - 20, 38, 0, Math.PI * 2);
      ctx.arc(cx + 68, cy - 14, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  /**
   * Ambient Particles (floating dandelion fluff, volcanic embers, dust motes)
   */
  const updateAndDrawAmbientParticles = (ctx: CanvasRenderingContext2D) => {
    const ambients = ambientParticlesRef.current;
    ctx.save();

    for (let i = 0; i < ambients.length; i++) {
      const a = ambients[i];
      a.x += a.vx + (wind * 0.02);
      a.y += a.vy;

      // Wrap around screen bounds
      if (a.x < 0) a.x = MAP_WIDTH;
      if (a.x > MAP_WIDTH) a.x = 0;
      if (a.y < 0) a.y = MAP_HEIGHT * 0.85;
      if (a.y > MAP_HEIGHT * 0.85) a.y = 50;

      ctx.fillStyle = a.color;
      ctx.globalAlpha = a.alpha;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  /**
   * Multi-Wave Translucent Ocean or Molten Magma
   */
  const drawWater = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    preset: string
  ) => {
    waterTimeRef.current += 0.045;
    const t = waterTimeRef.current;
    const isVolcano = preset === 'volcano';

    ctx.save();

    // 1. Deep Back Swell Wave
    ctx.fillStyle = isVolcano ? 'rgba(154, 0, 7, 0.9)' : 'rgba(13, 71, 161, 0.92)';
    ctx.beginPath();
    ctx.moveTo(0, MAP_HEIGHT);
    ctx.lineTo(0, WATER_LEVEL + 5);

    for (let x = 0; x <= MAP_WIDTH; x += 16) {
      const wave = Math.sin(x * 0.012 + t * 0.8) * 8 + Math.cos(x * 0.025 - t * 0.5) * 4;
      ctx.lineTo(x, WATER_LEVEL + 5 + wave);
    }
    ctx.lineTo(MAP_WIDTH, MAP_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // 2. Translucent Caribbean Blue / Fiery Lava Front Wave
    ctx.fillStyle = isVolcano ? 'rgba(255, 87, 34, 0.85)' : 'rgba(3, 169, 244, 0.78)';
    ctx.beginPath();
    ctx.moveTo(0, MAP_HEIGHT);
    ctx.lineTo(0, WATER_LEVEL);

    for (let x = 0; x <= MAP_WIDTH; x += 12) {
      const wave = Math.sin(x * 0.018 - t) * 6 + Math.cos(x * 0.035 + t * 0.7) * 4;
      ctx.lineTo(x, WATER_LEVEL + wave);
    }
    ctx.lineTo(MAP_WIDTH, MAP_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // 3. Sparkling White Foam Crest / Golden Magma Crust
    ctx.fillStyle = isVolcano ? 'rgba(255, 235, 59, 0.8)' : 'rgba(225, 245, 254, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, WATER_LEVEL);
    for (let x = 0; x <= MAP_WIDTH; x += 12) {
      const wave = Math.sin(x * 0.018 - t) * 6 + Math.cos(x * 0.035 + t * 0.7) * 4;
      ctx.lineTo(x, WATER_LEVEL + wave);
    }
    for (let x = MAP_WIDTH; x >= 0; x -= 12) {
      const wave = Math.sin(x * 0.018 - t) * 6 + Math.cos(x * 0.035 + t * 0.7) * 4;
      ctx.lineTo(x, WATER_LEVEL + wave + (isVolcano ? 5 : 3.5));
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  /**
   * Worm Physics & Rendering
   */
  const updateAndDrawWorms = (ctx: CanvasRenderingContext2D, terrain: TerrainEngine) => {
    const currentTeams = teamsRef.current;

    currentTeams.forEach((team, tIdx) => {
      team.worms.forEach((worm, wIdx) => {
        if (!worm.isAlive && !worm.tombstone) return;

        // Ground collision & gravity
        if (!worm.tombstone) {
          const groundY = terrain.findSurfaceY(worm.x, worm.y);
          if (worm.y < groundY - 2) {
            worm.vy += 0.35;
            worm.y += worm.vy;
            worm.isGrounded = false;
          } else {
            worm.y = groundY;
            worm.vy = 0;
            worm.isGrounded = true;
          }

          // Water drowning check
          if (worm.y >= WATER_LEVEL) {
            worm.hp = 0;
            worm.isAlive = false;
            worm.tombstone = true;
            sounds.playSplash();
            spawnWaterSplash(worm.x, WATER_LEVEL);
          }
        }

        // Draw Tombstone
        if (worm.tombstone) {
          drawTombstone(ctx, worm);
          return;
        }

        // Draw Live Worm
        const isActive = tIdx === activeTeamIndex && wIdx === activeWormIndex;
        drawWorm(ctx, worm, team.color, isActive);
      });
    });
  };

  /**
   * High-Fidelity Animated Cartoon Worm with Expressive Eyes & Gear
   */
  const drawWorm = (
    ctx: CanvasRenderingContext2D,
    worm: Worm,
    teamColor: string,
    isActive: boolean
  ) => {
    ctx.save();
    ctx.translate(worm.x, worm.y);

    const isLeft = worm.facing === 'left';
    const flip = isLeft ? -1 : 1;

    // 1. Active Worm Golden Floating Indicator Arrow
    if (isActive) {
      const bob = Math.sin(Date.now() * 0.009) * 6;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(0, -42 + bob);
      ctx.lineTo(-8, -52 + bob);
      ctx.lineTo(8, -52 + bob);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pulsing aura ring on ground
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14 + Math.sin(Date.now() * 0.008) * 3, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Health Bar & Name Plate
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';

    // Drop shadow text
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillText(`${worm.name} (${worm.hp})`, 1, -25);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${worm.name} (${worm.hp})`, 0, -26);

    // Mini HP Bar with border
    const barWidth = 28;
    const hpRatio = Math.max(0, worm.hp / worm.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(-barWidth / 2 - 1, -23, barWidth + 2, 4);

    const hpGrad = ctx.createLinearGradient(-barWidth / 2, 0, barWidth / 2, 0);
    if (hpRatio > 0.5) {
      hpGrad.addColorStop(0, '#66BB6A');
      hpGrad.addColorStop(1, '#43A047');
    } else if (hpRatio > 0.25) {
      hpGrad.addColorStop(0, '#FFA726');
      hpGrad.addColorStop(1, '#FB8C00');
    } else {
      hpGrad.addColorStop(0, '#EF5350');
      hpGrad.addColorStop(1, '#E53935');
    }
    ctx.fillStyle = hpGrad;
    ctx.fillRect(-barWidth / 2, -22, barWidth * hpRatio, 2.5);

    // 3. Worm Body with Breathing Animation
    ctx.scale(flip, 1);
    const breath = Math.sin(Date.now() * 0.006 + worm.x * 0.05) * 1.2;

    // Dark contour outline for crisp cartoon look
    ctx.strokeStyle = '#B71C1C';
    ctx.lineWidth = 1.5;

    // Tail segment
    ctx.fillStyle = '#FF8A80';
    ctx.beginPath();
    ctx.ellipse(-8, -4, 6, 5 + breath * 0.3, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Middle body segment
    ctx.fillStyle = '#FF6E6E';
    ctx.beginPath();
    ctx.ellipse(-1, -7 + breath * 0.5, 8.5, 7.5, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head segment with 3D spherical gradient
    const headGrad = ctx.createRadialGradient(2, -15 + breath, 2, 4, -13 + breath, 9);
    headGrad.addColorStop(0, '#FF8A80');
    headGrad.addColorStop(0.7, '#FF5252');
    headGrad.addColorStop(1, '#D32F2F');
    ctx.fillStyle = headGrad;

    ctx.beginPath();
    ctx.arc(4, -13 + breath, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Specular body highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(2, -16 + breath, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Team Hat / Headgear
    drawWormHat(ctx, worm.hat || 'bandana', teamColor, breath);

    // 5. Expressive Worm Eyes, Eyebrows & Mouth
    if (worm.hp < 35) {
      // Hurt face
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

      // Spiral pupils
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(7.5, -14 + breath, 1.4, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3.8, -14 + breath, 1.2, 0, Math.PI * 1.5);
      ctx.stroke();

      // Sad slanted black eyebrows
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.ellipse(8, -18.5 + breath, 2, 0.9, 0.35, 0, Math.PI * 2);
      ctx.ellipse(3.5, -18.5 + breath, 1.8, 0.9, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Blush
      ctx.fillStyle = 'rgba(255, 64, 129, 0.45)';
      ctx.beginPath();
      ctx.ellipse(9, -10 + breath, 2.2, 1.3, 0, 0, Math.PI * 2);
      ctx.ellipse(1, -10 + breath, 2.2, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sad mouth
      ctx.strokeStyle = '#B71C1C';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(5.5, -8.5 + breath, 2.2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Medical bandaid
      ctx.fillStyle = '#FFF8E1';
      ctx.fillRect(1, -17.5 + breath, 6.5, 3.2);
      ctx.strokeStyle = '#D7CCC8';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(1, -17.5 + breath, 6.5, 3.2);
      ctx.fillStyle = '#E53935';
      ctx.fillRect(3.5, -17 + breath, 1.5, 2.2);
      ctx.fillRect(2.7, -16.5 + breath, 3.1, 1.2);

      // Tear
      ctx.fillStyle = '#4FC3F7';
      ctx.beginPath();
      ctx.moveTo(10.5, -11 + breath);
      ctx.quadraticCurveTo(11.5, -9 + breath, 10.5, -8 + breath);
      ctx.quadraticCurveTo(9.5, -9 + breath, 10.5, -11 + breath);
      ctx.fill();
    } else {
      // Big expressive eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.8;

      ctx.beginPath();
      ctx.ellipse(7.5, -14.5 + breath, 3.2, 4.2, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(3.6, -14.5 + breath, 2.8, 3.8, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Signature black floating eyebrows
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.ellipse(7.8, -20 + breath, 2.2, 1, 0.1, 0, Math.PI * 2);
      ctx.ellipse(3.6, -19.5 + breath, 2, 0.9, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Pupils tracking angle
      const rad = (-worm.aimAngle * Math.PI) / 180;
      const pShiftX = Math.cos(rad) * 1.5;
      const pShiftY = Math.sin(rad) * 1.2;

      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(7.8 + pShiftX, -14.5 + breath + pShiftY, 1.5, 0, Math.PI * 2);
      ctx.arc(4.0 + pShiftX, -14.5 + breath + pShiftY, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Specular glint
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(8.5, -15.5 + breath, 0.7, 0, Math.PI * 2);
      ctx.arc(4.7, -15.5 + breath, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Worms smirk
      ctx.strokeStyle = '#900C3F';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(3.5, -9 + breath);
      ctx.quadraticCurveTo(6, -8.5 + breath, 8, -9.5 + breath);
      ctx.stroke();
    }

    // 6. Draw Equipped Weapon Held in Floating Cartoon Hands
    if (isActive) {
      drawEquippedWeapon(ctx, worm.aimAngle, currentWeapon, breath);

      // Floating Hands
      ctx.save();
      ctx.translate(6, -9 + breath);
      const rad = (-worm.aimAngle * Math.PI) / 180;
      ctx.rotate(rad);

      ctx.fillStyle = '#FFA07A';
      ctx.strokeStyle = '#B71C1C';
      ctx.lineWidth = 1;

      // Front hand gripping weapon
      ctx.beginPath();
      ctx.ellipse(3, 2, 2.8, 2.4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Back support hand
      if (currentWeapon === 'bazooka' || currentWeapon === 'shotgun') {
        ctx.beginPath();
        ctx.ellipse(14, 2, 2.6, 2.2, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  };

  /**
   * Team Hats & Headgear: Wide Golden Crown, Tilted Beret, Commando Helmet, Bandana
   */
  const drawWormHat = (
    ctx: CanvasRenderingContext2D,
    hat: string,
    teamColor: string,
    breath: number
  ) => {
    if (hat === 'helmet') {
      ctx.save();
      ctx.translate(4, -18 + breath);
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.arc(0, 4, 9.5, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Brim
      ctx.fillStyle = '#37474F';
      ctx.fillRect(-10, 3, 20, 2.5);
      ctx.restore();
    } else if (hat === 'crown') {
      // Golden Crown: PROPORTIONATE (width 14px, fits the 17px head cleanly without overhang)
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
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.ellipse(5.5, 1.8, 4.5, 3, 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.stroke();

      // 2. Main Puffed Beret Top (drawn ABOVE the band so it overlaps cleanly)
      const beretGrad = ctx.createRadialGradient(-2, -3, 2, 0, -1, 10);
      beretGrad.addColorStop(0, '#FFFFFF'); // subtle highlight on top fold
      beretGrad.addColorStop(0.2, teamColor);
      beretGrad.addColorStop(1, '#000000'); // shadow towards bottom
      ctx.fillStyle = teamColor;
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
    } else {
      // Pirate / Ninja Bandana with fluttering ribbon knot
      ctx.save();
      ctx.translate(4, -18 + breath);
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.arc(0, 5, 9, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();

      // Knot & trailing ribbons
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
   * Detailed Weapon Sprites Held by Worm
   */
  const drawEquippedWeapon = (
    ctx: CanvasRenderingContext2D,
    angleDeg: number,
    weapon: WeaponId,
    breath: number
  ) => {
    ctx.save();
    ctx.translate(6, -9 + breath);
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
      // DYNAMITE: Chunky bundle of 3 red sticks with yellow TNT caution tape & long sizzling fuse
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
      // Golden Holy Hand Grenade with sparkling halo
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
   * Aiming Reticle, Guideline Trajectory & Power Meter
   */
  const drawAimingReticle = (ctx: CanvasRenderingContext2D, worm: Worm) => {
    ctx.save();
    ctx.translate(worm.x, worm.y - 12);

    const isLeft = worm.facing === 'left';
    const mult = isLeft ? -1 : 1;
    const rad = (-worm.aimAngle * Math.PI) / 180;

    const dirX = Math.cos(rad) * mult;
    const dirY = Math.sin(rad);

    // Dynamic Reticle Crosshair
    const crosshairDist = 60;
    const cx = dirX * crosshairDist;
    const cy = dirY * crosshairDist;

    ctx.strokeStyle = '#FF3D00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 15, cy);
    ctx.lineTo(cx + 15, cy);
    ctx.moveTo(cx, cy - 15);
    ctx.lineTo(cx, cy + 15);
    ctx.stroke();

    // Center target dot
    ctx.fillStyle = '#FFEA00';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Simulated Parabolic Trajectory Dots
    ctx.fillStyle = 'rgba(255, 235, 59, 0.75)';
    const previewPower = Math.max(25, power || 35);
    const speed = (previewPower / 100) * 16;
    let simX = dirX * 14;
    let simY = dirY * 14;
    let simVx = dirX * speed;
    let simVy = dirY * speed;

    for (let step = 0; step < 18; step++) {
      simX += simVx;
      simY += simVy;
      simVy += 0.28;
      if (currentWeapon === 'bazooka') {
        simVx += (wind * 0.015);
      }
      ctx.beginPath();
      ctx.arc(simX, simY, Math.max(1, 3 - (step * 0.12)), 0, Math.PI * 2);
      ctx.fill();
    }

    // Power Meter Bar
    if (isFiring || power > 0) {
      const pWidth = 64;
      const pHeight = 9;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(-pWidth / 2, 22, pWidth, pHeight);

      const grad = ctx.createLinearGradient(-pWidth / 2, 0, pWidth / 2, 0);
      grad.addColorStop(0, '#4CAF50');
      grad.addColorStop(0.5, '#FFEB3B');
      grad.addColorStop(1, '#F44336');

      ctx.fillStyle = grad;
      ctx.fillRect(-pWidth / 2 + 1, 23, (pWidth - 2) * (power / 100), pHeight - 2);

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(-pWidth / 2, 22, pWidth, pHeight);

      // Percentage label
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(power)}%`, 0, 42);
    }

    ctx.restore();
  };

  /**
   * Refined 3D Stone Tombstone: WIDE (30px) with carved cross, R.I.P. cleanly centered
   */
  const drawTombstone = (ctx: CanvasRenderingContext2D, worm: Worm) => {
    ctx.save();
    ctx.translate(worm.x, worm.y);

    // Stone base plinth
    ctx.fillStyle = '#37474F';
    ctx.fillRect(-17, -1, 34, 4);
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 1;
    ctx.strokeRect(-17, -1, 34, 4);

    // Main headstone: wide 30px, tall 26px
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

    // Carved stone cross on top
    ctx.fillStyle = '#37474F';
    ctx.fillRect(-1.2, -22, 2.4, 5.5);
    ctx.fillRect(-3, -20, 6, 1.8);

    // R.I.P. inscription cleanly centered with ample space
    ctx.fillStyle = '#263238';
    ctx.font = 'bold 7.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('R.I.P.', 0, -11);

    // Worm name below
    ctx.font = 'bold 6.5px monospace';
    ctx.fillText(worm.name.substring(0, 5), 0, -3);

    ctx.restore();
  };

  /**
   * Flying Projectiles & Smoke Trails
   */
  const updateAndDrawProjectiles = (ctx: CanvasRenderingContext2D, terrain: TerrainEngine) => {
    const projectiles = projectilesRef.current;
    if (projectiles.length === 0) return;

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];

      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 20) p.trail.shift();

      // Camera auto-tracking
      cameraRef.current.targetX = p.x;
      cameraRef.current.targetY = p.y;
      if (!isQuickZoomActive) {
        cameraRef.current.targetZoom = 1.35;
      }

      // Physics
      p.vy += 0.28;
      if (p.weaponId === 'bazooka') {
        p.vx += wind * 0.015 * p.windFactor;

        // Billowing smoke particles behind bazooka
        particlesRef.current.push({
          x: p.x - p.vx * 0.5,
          y: p.y - p.vy * 0.5,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7,
          color: Math.random() > 0.3 ? 'rgba(240, 240, 240, 0.75)' : 'rgba(255, 179, 0, 0.65)',
          life: 0,
          maxLife: 22,
          size: 3 + Math.random() * 4,
          type: 'smoke',
        });
      }

      p.x += p.vx;
      p.y += p.vy;

      // Draw Glowing Smoke Trail
      ctx.save();
      ctx.strokeStyle = p.weaponId === 'bazooka' ? 'rgba(255, 179, 0, 0.7)' : 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      p.trail.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();

      // Draw Rotating Weapon Sprite
      ctx.save();
      ctx.translate(p.x, p.y);
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);

      if (p.weaponId === 'bazooka') {
        ctx.fillStyle = '#33691E';
        ctx.fillRect(-7, -3.5, 14, 7);
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath();
        ctx.moveTo(7, -3.5);
        ctx.lineTo(13, 0);
        ctx.lineTo(7, 3.5);
        ctx.closePath();
        ctx.fill();
      } else if (p.weaponId === 'banana') {
        // True rotating curved banana projectile
        ctx.beginPath();
        ctx.moveTo(-8, 1);
        ctx.bezierCurveTo(-3, -6, 5, -6, 11, 0);
        ctx.bezierCurveTo(5, 5, -3, 5, -8, 1);
        ctx.fillStyle = '#FFD600';
        ctx.fill();
        ctx.strokeStyle = '#E65100';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Stem & tip
        ctx.fillStyle = '#558B2F';
        ctx.fillRect(-10, 1, 2.5, 2);
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(11, -0.5, 2, 2);
      } else if (p.weaponId === 'cluster') {
        // Cluster navy bomb
        ctx.fillStyle = '#1A237E';
        ctx.fillRect(-6, -4, 12, 8);
        ctx.fillStyle = '#FFD600';
        ctx.fillRect(-6, -1, 12, 2);
      } else if (p.weaponId === 'dynamite') {
        // Dynamite bundle
        ctx.fillStyle = '#D32F2F';
        ctx.fillRect(-8, -4, 16, 8);
        ctx.fillStyle = '#FFD54F';
        ctx.fillRect(-2, -4, 4, 8);
      } else if (p.weaponId === 'holy') {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.fillRect(-1, -11, 2, 5);
        ctx.fillRect(-3, -9, 6, 2);
      } else {
        // Standard Grenade
        ctx.fillStyle = '#33691E';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      // Draw Fuse Timer
      if (p.timer !== undefined) {
        p.timer -= 1 / 60;
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#FFEB3B';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(p.timer)}`, p.x, p.y - 14);
        ctx.shadowBlur = 0;

        if (p.timer <= 0) {
          detonateProjectile(p, terrain);
          projectiles.splice(i, 1);
          continue;
        }
      }

      // Check collision with water
      if (p.y >= WATER_LEVEL) {
        sounds.playSplash();
        spawnWaterSplash(p.x, WATER_LEVEL);
        projectiles.splice(i, 1);
        checkProjectilesFinished();
        continue;
      }

      // Check collision with terrain
      if (terrain.isSolid(p.x, p.y)) {
        if (p.weaponId === 'bazooka' || p.weaponId === 'shotgun') {
          detonateProjectile(p, terrain);
          projectiles.splice(i, 1);
        } else {
          // Bouncy grenade physics
          p.bounces = (p.bounces || 0) + 1;
          p.vx *= -0.58;
          p.vy *= -0.48;
          p.x += p.vx * 2;
          p.y += p.vy * 2;
          sounds.playBounce();

          if (Math.hypot(p.vx, p.vy) < 0.6) {
            p.vx = 0;
            p.vy = 0;
          }
        }
      }
    }
  };

  /**
   * Detonation, Screen Shake, Carving, Shockwave & Weapon-Specific Particles
   */
  const detonateProjectile = (p: Projectile, terrain: TerrainEngine) => {
    const weaponInfo = WEAPONS[p.weaponId];
    const blastRadius = weaponInfo.blastRadius || 45;
    const baseDamage = weaponInfo.damage || 50;

    if (p.weaponId === 'holy') {
      sounds.playHallelujah();
    }
    sounds.playExplosion(blastRadius / 45);

    // Trigger Screen Shake
    screenShakeRef.current = {
      intensity: Math.min(20, blastRadius * 0.28),
      duration: 16,
    };

    // Expanding Glowing Shockwave Ring
    shockwavesRef.current.push({
      x: p.x,
      y: p.y,
      radius: 4,
      maxRadius: blastRadius * 1.5,
      color: p.weaponId === 'holy' ? '#FFD700' : p.weaponId === 'banana' ? '#FFEB3B' : '#FF5722',
    });

    // Carve terrain crater & get dirt particles
    const dirtParticles = terrain.carveExplosion(p.x, p.y, blastRadius);
    particlesRef.current.push(...dirtParticles);

    // Weapon-Specific Themed Particles
    if (p.weaponId === 'banana') {
      // Banana peel slices & bright gold sparkles
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 8;
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5,
          color: Math.random() > 0.4 ? '#FFEB3B' : Math.random() > 0.2 ? '#FFC107' : '#FFF9C4',
          life: 0,
          maxLife: 30 + Math.random() * 20,
          size: 4 + Math.random() * 6,
          type: 'spark',
        });
      }
    } else if (p.weaponId === 'holy') {
      // Divine golden stardust & rays
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 11;
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          color: Math.random() > 0.5 ? '#FFFDE7' : '#FFD700',
          life: 0,
          maxLife: 35 + Math.random() * 25,
          size: 5 + Math.random() * 7,
          type: 'spark',
        });
      }
    } else if (p.weaponId === 'dynamite') {
      // Red casing debris & crackling sparks
      for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 9;
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          color: Math.random() > 0.5 ? '#D32F2F' : Math.random() > 0.3 ? '#FF5722' : '#FFEB3B',
          life: 0,
          maxLife: 26 + Math.random() * 20,
          size: 4 + Math.random() * 7,
          type: 'fire',
        });
      }
    } else {
      // Standard / Bazooka / Shotgun fiery combustion ball particles
      for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 9;
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.6 ? '#FFFDE7' : Math.random() > 0.3 ? '#FF9800' : '#E53935',
          life: 0,
          maxLife: 24 + Math.random() * 22,
          size: 6 + Math.random() * 9,
          type: 'fire',
        });
      }
    }

    // Cluster sub-munition split
    if (p.weaponId === 'cluster' && !p.isSubMunition) {
      for (let s = 0; s < 4; s++) {
        const spreadAngle = -Math.PI / 2 + (s - 1.5) * 0.45;
        const speed = 5 + Math.random() * 3;
        projectilesRef.current.push({
          id: Math.random().toString(),
          weaponId: 'grenade',
          x: p.x,
          y: p.y - 10,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          radius: 3.5,
          timer: 1.4 + Math.random() * 0.6,
          isDetonated: false,
          ownerId: p.ownerId,
          windFactor: 0.5,
          trail: [],
          isSubMunition: true,
        });
      }
    }

    // Banana crazy cluster split
    if (p.weaponId === 'banana' && !p.isSubMunition) {
      for (let s = 0; s < 5; s++) {
        const spreadAngle = -Math.PI / 2 + (s - 2) * 0.5;
        const speed = 6 + Math.random() * 4;
        projectilesRef.current.push({
          id: Math.random().toString(),
          weaponId: 'banana',
          x: p.x,
          y: p.y - 12,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          radius: 4,
          timer: 1.6 + Math.random() * 0.5,
          isDetonated: false,
          ownerId: p.ownerId,
          windFactor: 0.8,
          trail: [],
          isSubMunition: true,
        });
      }
    }

    // Notify explosion callback
    if (onExplosionOccurred) {
      onExplosionOccurred(p.x, p.y, blastRadius);
    }

    // Apply Damage & Knockback Impulse to Worms
    let damaged = false;
    const currentTeams = [...teamsRef.current];

    currentTeams.forEach((team) => {
      team.worms.forEach((worm) => {
        if (!worm.isAlive || worm.tombstone) return;

        const dist = Math.hypot(worm.x - p.x, worm.y - p.y);
        if (dist < blastRadius + 18) {
          const ratio = Math.max(0, 1 - dist / (blastRadius + 18));
          const dmg = Math.round(baseDamage * ratio);

          if (dmg > 0) {
            worm.hp = Math.max(0, worm.hp - dmg);
            damaged = true;
            sounds.playWormHurt();

            // Knockback impulse
            const angle = Math.atan2(worm.y - p.y, worm.x - p.x);
            const impulse = (ratio * 14) + 3;
            worm.vx = Math.cos(angle) * impulse;
            worm.vy = Math.sin(angle) * impulse - 4.5;
            worm.x += worm.vx * 2;
            worm.y += worm.vy * 2;

            // Damage floating text
            damageTextsRef.current.push({
              id: Math.random().toString(),
              x: worm.x,
              y: worm.y - 25,
              text: `-${dmg}`,
              color: '#FF1744',
              life: 0,
              maxLife: 45,
            });

            if (worm.hp <= 0) {
              worm.isAlive = false;
              worm.tombstone = true;
            }
          }
        }
      });
    });

    if (damaged) {
      onDamageApplied(currentTeams);
    }

    checkProjectilesFinished();
  };

  const checkProjectilesFinished = () => {
    setTimeout(() => {
      if (projectilesRef.current.length === 0) {
        onFireComplete(true);
      }
    }, 700);
  };

  const spawnWaterSplash = (x: number, y: number) => {
    for (let i = 0; i < 24; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 35,
        y: y,
        vx: (Math.random() - 0.5) * 5,
        vy: -3 - Math.random() * 6,
        color: 'rgba(179, 229, 252, 0.85)',
        life: 0,
        maxLife: 32,
        size: 3.5 + Math.random() * 3.5,
        type: 'water',
      });
    }
  };

  /**
   * Expanding Shockwaves
   */
  const updateAndDrawShockwaves = (ctx: CanvasRenderingContext2D) => {
    const shockwaves = shockwavesRef.current;
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.22 + 2;

      const alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (sw.radius >= sw.maxRadius) {
        shockwaves.splice(i, 1);
      }
    }
  };

  /**
   * Particles & Floating Damage Numbers
   */
  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life++;
      pt.x += pt.vx;
      pt.y += pt.vy;

      if (pt.type === 'dirt') {
        pt.vy += 0.26;
      }

      const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
      ctx.save();
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (1 - pt.life / pt.maxLife * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (pt.life >= pt.maxLife) {
        particles.splice(i, 1);
      }
    }

    // Damage numbers floating up
    const dTexts = damageTextsRef.current;
    for (let i = dTexts.length - 1; i >= 0; i--) {
      const dt = dTexts[i];
      dt.life++;
      dt.y -= 0.85;

      const alpha = Math.max(0, 1 - dt.life / dt.maxLife);
      ctx.save();
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.fillStyle = dt.color;
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';

      // Drop shadow
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(dt.text, dt.x, dt.y);
      ctx.restore();

      if (dt.life >= dt.maxLife) {
        dTexts.splice(i, 1);
      }
    }
  };

  /**
   * Tactical Minimap Radar
   */
  const drawMinimap = (terrain: TerrainEngine) => {
    const mini = minimapRef.current;
    if (!mini) return;
    const mCtx = mini.getContext('2d');
    if (!mCtx) return;

    mCtx.clearRect(0, 0, mini.width, mini.height);

    // Background
    mCtx.fillStyle = '#0a1017';
    mCtx.fillRect(0, 0, mini.width, mini.height);

    // Downscaled terrain
    mCtx.drawImage(terrain.canvas, 0, 0, mini.width, mini.height);

    // Water level
    const waterY = (WATER_LEVEL / MAP_HEIGHT) * mini.height;
    mCtx.fillStyle = 'rgba(3, 169, 244, 0.6)';
    mCtx.fillRect(0, waterY, mini.width, mini.height - waterY);

    // Worms on minimap
    teamsRef.current.forEach((team, tIdx) => {
      team.worms.forEach((worm, wIdx) => {
        if (!worm.isAlive || worm.tombstone) return;
        const mx = (worm.x / MAP_WIDTH) * mini.width;
        const my = (worm.y / MAP_HEIGHT) * mini.height;
        const isActive = tIdx === activeTeamIndex && wIdx === activeWormIndex;

        mCtx.fillStyle = team.color;
        mCtx.beginPath();
        mCtx.arc(mx, my, isActive ? 4 : 2.5, 0, Math.PI * 2);
        mCtx.fill();

        if (isActive) {
          mCtx.strokeStyle = '#FFD700';
          mCtx.lineWidth = 1.5;
          mCtx.stroke();
        }
      });
    });

    // Viewport bounding rectangle
    const canvas = canvasRef.current;
    if (canvas) {
      const cam = cameraRef.current;
      const vWidth = (canvas.width / cam.zoom / MAP_WIDTH) * mini.width;
      const vHeight = (canvas.height / cam.zoom / MAP_HEIGHT) * mini.height;
      const vx = ((cam.x - (canvas.width / cam.zoom) / 2) / MAP_WIDTH) * mini.width;
      const vy = ((cam.y - (canvas.height / cam.zoom) / 2) / MAP_HEIGHT) * mini.height;

      mCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      mCtx.lineWidth = 1;
      mCtx.strokeRect(vx, vy, vWidth, vHeight);
    }
  };

  // Pointer interactions (drag, aim, pan, zoom)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const cam = cameraRef.current;
    const worldX = (clickX - canvas.width / 2) / cam.zoom + cam.x;
    const worldY = (clickY - canvas.height / 2) / cam.zoom + cam.y;

    if (isAirstrikeMode && onSelectAirstrikeTarget) {
      onSelectAirstrikeTarget(worldX);
      return;
    }

    if (isTeleportMode && onSelectTeleportTarget) {
      onSelectTeleportTarget(worldX, worldY);
      return;
    }

    isDraggingCamRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      camX: cam.x,
      camY: cam.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingCamRef.current) return;
    const cam = cameraRef.current;
    const dx = (e.clientX - dragStartRef.current.x) / cam.zoom;
    const dy = (e.clientY - dragStartRef.current.y) / cam.zoom;

    cam.targetX = dragStartRef.current.camX - dx;
    cam.targetY = dragStartRef.current.camY - dy;
  };

  const handlePointerUp = () => {
    isDraggingCamRef.current = false;
  };

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mini = minimapRef.current;
    if (!mini) return;
    const rect = mini.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    cameraRef.current.targetX = (clickX / mini.width) * MAP_WIDTH;
    cameraRef.current.targetY = (clickY / mini.height) * MAP_HEIGHT;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    const newZoom = Math.max(0.35, Math.min(2.4, cameraRef.current.targetZoom + zoomDelta));
    cameraRef.current.targetZoom = newZoom;
  };

  // Launch weapon when fire power released
  useEffect(() => {
    if (!isFiring && power > 0 && activeWorm && activeWorm.isAlive) {
      launchActiveWeapon();
    }
  }, [isFiring]);

  const launchActiveWeapon = () => {
    if (!activeWorm) return;

    sounds.playShoot();

    const isLeft = activeWorm.facing === 'left';
    const mult = isLeft ? -1 : 1;
    const rad = (-activeWorm.aimAngle * Math.PI) / 180;

    const speed = (power / 100) * 16;
    const vx = Math.cos(rad) * mult * speed;
    const vy = Math.sin(rad) * speed;

    const spawnX = activeWorm.x + Math.cos(rad) * mult * 18;
    const spawnY = activeWorm.y - 12 + Math.sin(rad) * 18;

    if (currentWeapon === 'shotgun') {
      projectilesRef.current.push({
        id: Math.random().toString(),
        weaponId: 'shotgun',
        x: spawnX,
        y: spawnY,
        vx: Math.cos(rad) * mult * 28,
        vy: Math.sin(rad) * 28,
        radius: 3,
        isDetonated: false,
        ownerId: activeWorm.id,
        windFactor: 0.1,
        trail: [],
      });
    } else {
      const weaponDef = WEAPONS[currentWeapon];
      projectilesRef.current.push({
        id: Math.random().toString(),
        weaponId: currentWeapon,
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        radius: 5,
        timer: weaponDef.hasTimer ? grenadeTimer : undefined,
        bounces: 0,
        maxBounces: 5,
        isDetonated: false,
        ownerId: activeWorm.id,
        windFactor: currentWeapon === 'bazooka' ? 1.0 : 0.4,
        trail: [],
      });
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none">
      {/* Primary Game Viewport with dynamic hardware native aspect ratio */}
      <canvas
        ref={canvasRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{
          imageRendering: options.displayMode !== 'pc_android' ? 'pixelated' : 'auto',
          aspectRatio: canvasDimensions.aspect,
        }}
        className={`w-full h-full object-contain cursor-crosshair touch-no-zoom ${
          options.rgb565Mode ? 'rgb565-filter' : ''
        }`}
      />

      {/* Retro LCD Scanlines Shader overlay when enabled */}
      {options.retroFilter && (
        <div className="absolute inset-0 lcd-scanlines lcd-pixel-grid pointer-events-none" />
      )}

      {/* Floating Tactical Minimap Radar */}
      <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 shadow-2xl backdrop-blur-md z-20 flex flex-col items-center">
        <canvas
          ref={minimapRef}
          width={150}
          height={84}
          onClick={handleMinimapClick}
          className="rounded-lg cursor-pointer border border-slate-800 shadow-inner"
        />
        <div className="flex items-center justify-between w-full px-1 pt-1 text-[10px] text-slate-400 font-mono">
          <span className="text-emerald-400 font-bold">RADAR AKA</span>
          <button
            onClick={onToggleQuickZoom}
            className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline"
          >
            {isQuickZoomActive ? 'Zoom In' : 'Zoom Out'}
          </button>
        </div>
      </div>
    </div>
  );
};
