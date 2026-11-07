import React, { useEffect, useRef, useState, useCallback } from 'react';
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

  // Projectiles & Particles
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
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

  // Track active worm
  const activeWorm = teams[activeTeamIndex]?.worms[activeWormIndex];

  // Initialize terrain
  useEffect(() => {
    const terrain = new TerrainEngine();
    terrain.generate(options.mapPreset);
    terrainRef.current = terrain;

    // Place worms safely on ground
    let placedTeams = teams.map((team, tIdx) => {
      const wormsCount = team.worms.length;
      return {
        ...team,
        worms: team.worms.map((worm, wIdx) => {
          // Spread worms across islands
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

    // Initial camera center on active worm
    const firstWorm = placedTeams[0]?.worms[0];
    if (firstWorm) {
      cameraRef.current.x = firstWorm.x;
      cameraRef.current.y = firstWorm.y;
      cameraRef.current.targetX = firstWorm.x;
      cameraRef.current.targetY = firstWorm.y;
      cameraRef.current.zoom = isQuickZoomActive ? 0.45 : 1.4;
      cameraRef.current.targetZoom = cameraRef.current.zoom;
    }
  }, [options.mapPreset]);

  // Handle Quick Zoom toggle updates
  useEffect(() => {
    if (isQuickZoomActive) {
      // Tactical Zoom Out: wide overview of the entire battlefield
      cameraRef.current.targetZoom = 0.45;
      cameraRef.current.targetX = MAP_WIDTH / 2;
      cameraRef.current.targetY = MAP_HEIGHT / 2 - 40;
    } else {
      // Precision Aim Zoom In: close-up on active worm
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

  // Game Loop with accurate console FPS limiter (25 FPS / 50 FPS for META, 60 FPS for AKA/PC)
  useEffect(() => {
    let animId: number;
    let lastRenderTime = 0;
    const targetFps = options.fpsLimit || (options.displayMode === 'gamebuino_meta' ? 25 : 60);
    const targetInterval = 1000 / targetFps;

    const render = (currentTime: number) => {
      animId = requestAnimationFrame(render);

      // Framerate throttling
      const delta = currentTime - lastRenderTime;
      if (delta < targetInterval - 1) {
        return;
      }
      lastRenderTime = currentTime - (delta % targetInterval);

      const canvas = canvasRef.current;
      const terrain = terrainRef.current;
      if (!canvas || !terrain) {
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const cam = cameraRef.current;

      // 1. Camera lerp for buttery smooth panning & zooming
      cam.x += (cam.targetX - cam.x) * 0.08;
      cam.y += (cam.targetY - cam.y) * 0.08;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.1;

      // Bound camera
      const halfW = (width / cam.zoom) / 2;
      const halfH = (height / cam.zoom) / 2;
      cam.x = Math.max(halfW - 100, Math.min(MAP_WIDTH - halfW + 100, cam.x));
      cam.y = Math.max(halfH - 100, Math.min(MAP_HEIGHT - halfH + 60, cam.y));

      // 2. Clear & Draw Sky Backdrop
      ctx.save();
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
      if (options.mapPreset === 'volcano') {
        skyGradient.addColorStop(0, '#1c1018');
        skyGradient.addColorStop(0.5, '#3d1624');
        skyGradient.addColorStop(1, '#802424');
      } else if (options.mapPreset === 'canyon') {
        skyGradient.addColorStop(0, '#1a237e');
        skyGradient.addColorStop(0.5, '#795548');
        skyGradient.addColorStop(1, '#ffab91');
      } else {
        // Classic Worms bright blue sky & fluffy clouds
        skyGradient.addColorStop(0, '#1e88e5');
        skyGradient.addColorStop(0.6, '#64b5f6');
        skyGradient.addColorStop(1, '#bbdefb');
      }
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      // Transform world coordinates
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // Draw distant parallax clouds / background hills
      drawParallaxBackground(ctx, cam.x, cam.y, options.mapPreset);

      // 3. Draw Destructible Terrain
      ctx.drawImage(terrain.canvas, 0, 0);

      // 4. Update & Draw Worms
      updateAndDrawWorms(ctx, terrain);

      // 5. Update & Draw Projectiles
      updateAndDrawProjectiles(ctx, terrain);

      // 6. Update & Draw Particles & Damage Numbers
      updateAndDrawParticles(ctx);

      // 7. Draw Water Waves at the bottom
      drawWater(ctx, width, height);

      // 8. Draw Reticle, Trajectory Guideline, and Power for Active Worm
      if (activeWorm && activeWorm.isAlive && !activeWorm.tombstone) {
        drawAimingReticle(ctx, activeWorm);
      }

      ctx.restore(); // restore world transform

      // 9. Draw Minimap Radar
      drawMinimap(terrain);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeWorm, currentWeapon, grenadeTimer, isFiring, power, wind, options]);

  // Parallax backdrop
  const drawParallaxBackground = (
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    preset: string
  ) => {
    ctx.save();
    const pX = camX * 0.2;
    // Distant clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 6; i++) {
      const cx = (i * 320 - pX) % (MAP_WIDTH + 400);
      const cy = 120 + Math.sin(i) * 40;
      ctx.beginPath();
      ctx.arc(cx, cy, 45, 0, Math.PI * 2);
      ctx.arc(cx + 35, cy - 15, 55, 0, Math.PI * 2);
      ctx.arc(cx + 70, cy, 40, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Water animation
  const drawWater = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    waterTimeRef.current += 0.04;
    const t = waterTimeRef.current;

    ctx.save();
    // Front animated water
    ctx.fillStyle = 'rgba(21, 101, 192, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, MAP_HEIGHT);
    ctx.lineTo(0, WATER_LEVEL);

    for (let x = 0; x <= MAP_WIDTH; x += 15) {
      const wave = Math.sin(x * 0.015 + t) * 6 + Math.cos(x * 0.03 - t * 0.8) * 4;
      ctx.lineTo(x, WATER_LEVEL + wave);
    }
    ctx.lineTo(MAP_WIDTH, MAP_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Secondary lighter crest
    ctx.fillStyle = 'rgba(100, 181, 246, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, WATER_LEVEL);
    for (let x = 0; x <= MAP_WIDTH; x += 15) {
      const wave2 = Math.sin(x * 0.02 - t * 1.2) * 5 + 3;
      ctx.lineTo(x, WATER_LEVEL + wave2);
    }
    ctx.lineTo(MAP_WIDTH, WATER_LEVEL + 25);
    ctx.lineTo(0, WATER_LEVEL + 25);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Worm physics & rendering
  const updateAndDrawWorms = (ctx: CanvasRenderingContext2D, terrain: TerrainEngine) => {
    const currentTeams = teamsRef.current;

    currentTeams.forEach((team, tIdx) => {
      team.worms.forEach((worm, wIdx) => {
        if (!worm.isAlive && !worm.tombstone) return;

        // Gravity & terrain collision for worms
        if (!worm.tombstone) {
          // Check ground below feet
          const groundY = terrain.findSurfaceY(worm.x, worm.y);
          if (worm.y < groundY - 2) {
            worm.vy += 0.35; // gravity
            worm.y += worm.vy;
            worm.isGrounded = false;
          } else {
            worm.y = groundY;
            worm.vy = 0;
            worm.isGrounded = true;
          }

          // Check if drowned in water
          if (worm.y >= WATER_LEVEL) {
            worm.hp = 0;
            worm.isAlive = false;
            worm.tombstone = true;
            sounds.playSplash();
            spawnWaterSplash(worm.x, WATER_LEVEL);
          }
        }

        // Draw Tombstone if dead
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

  // Draw individual animated cartoon worm
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

    // Active Worm Pulsing Arrow / Indicator
    if (isActive) {
      const bob = Math.sin(Date.now() * 0.008) * 5;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(0, -38 + bob);
      ctx.lineTo(-8, -48 + bob);
      ctx.lineTo(8, -48 + bob);
      ctx.closePath();
      ctx.fill();

      // Team / active marker
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Health Bar & Name Tag
    ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${worm.name} (${worm.hp})`, 0, -24);
    ctx.shadowBlur = 0;

    // Mini HP Bar
    const barWidth = 26;
    const hpRatio = Math.max(0, worm.hp / worm.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barWidth / 2, -21, barWidth, 3);
    ctx.fillStyle = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FF9800' : '#F44336';
    ctx.fillRect(-barWidth / 2, -21, barWidth * hpRatio, 3);

    // Worm Body (Segmented pink cute worm)
    ctx.scale(flip, 1);

    // Tail segment
    ctx.fillStyle = '#FF8A80';
    ctx.beginPath();
    ctx.ellipse(-7, -4, 6, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Middle body
    ctx.fillStyle = '#FF6E6E';
    ctx.beginPath();
    ctx.ellipse(0, -7, 8, 7, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#FF5252';
    ctx.beginPath();
    ctx.arc(4, -13, 8, 0, Math.PI * 2);
    ctx.fill();

    // Team colored Bandana / Helmet
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.arc(4, -15, 8.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(7, -14, 2.5, 0, Math.PI * 2);
    ctx.arc(4, -14, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Pupils looking in facing direction
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(8, -14, 1.2, 0, Math.PI * 2);
    ctx.arc(5, -14, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Weapon held in hand if active
    if (isActive) {
      drawEquippedWeapon(ctx, worm.aimAngle, currentWeapon);
    }

    ctx.restore();
  };

  // Draw equipped weapon held by active worm
  const drawEquippedWeapon = (
    ctx: CanvasRenderingContext2D,
    angleDeg: number,
    weapon: WeaponId
  ) => {
    ctx.save();
    ctx.translate(6, -9);
    const rad = (-angleDeg * Math.PI) / 180;
    ctx.rotate(rad);

    if (weapon === 'bazooka') {
      // Metallic green rocket launcher tube
      ctx.fillStyle = '#4B5320';
      ctx.fillRect(-4, -4, 20, 7);
      ctx.fillStyle = '#2E3213';
      ctx.fillRect(-6, -5, 3, 9);
      ctx.fillRect(14, -5, 3, 9);
      // Red rocket nose tip peaking out
      ctx.fillStyle = '#D32F2F';
      ctx.beginPath();
      ctx.arc(17, 0, 3, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    } else if (weapon === 'grenade' || weapon === 'cluster' || weapon === 'banana') {
      // Grenade in hand
      ctx.fillStyle = weapon === 'banana' ? '#FBC02D' : '#33691E';
      ctx.beginPath();
      ctx.arc(8, -2, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (weapon === 'dynamite') {
      // Red stick of dynamite with fuse spark
      ctx.fillStyle = '#D32F2F';
      ctx.fillRect(4, -3, 10, 6);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(18, -3);
      ctx.stroke();
      // Spark
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.arc(18, -3, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (weapon === 'shotgun') {
      // Double barrel shotgun
      ctx.fillStyle = '#424242';
      ctx.fillRect(-2, -3, 18, 4);
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(-6, -1, 6, 4);
    } else if (weapon === 'holy') {
      // Golden Holy Hand Grenade
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(8, -2, 6, 0, Math.PI * 2);
      ctx.fill();
      // Little cross on top
      ctx.fillStyle = '#FFF';
      ctx.fillRect(7, -10, 2, 5);
      ctx.fillRect(5, -8, 6, 2);
    }

    ctx.restore();
  };

  // Draw Aiming Reticle, Guideline, and Power Bar
  const drawAimingReticle = (ctx: CanvasRenderingContext2D, worm: Worm) => {
    ctx.save();
    ctx.translate(worm.x, worm.y - 10);

    const isLeft = worm.facing === 'left';
    const mult = isLeft ? -1 : 1;
    const rad = (-worm.aimAngle * Math.PI) / 180;

    const dirX = Math.cos(rad) * mult;
    const dirY = Math.sin(rad);

    // Draw Aiming Angle Crosshair
    const crosshairDist = 55;
    const cx = dirX * crosshairDist;
    const cy = dirY * crosshairDist;

    ctx.strokeStyle = '#FF3D00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 14, cy);
    ctx.lineTo(cx + 14, cy);
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx, cy + 14);
    ctx.stroke();

    // Trajectory dots (simulated arc preview)
    ctx.fillStyle = 'rgba(255, 235, 59, 0.7)';
    const previewPower = Math.max(25, power || 35);
    const speed = (previewPower / 100) * 16;
    let simX = dirX * 12;
    let simY = dirY * 12;
    let simVx = dirX * speed;
    let simVy = dirY * speed;

    for (let step = 0; step < 16; step++) {
      simX += simVx;
      simY += simVy;
      simVy += 0.28; // gravity
      if (currentWeapon === 'bazooka') {
        simVx += (wind * 0.015);
      }
      ctx.beginPath();
      ctx.arc(simX, simY, 2.5 - (step * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }

    // Power Charging Meter Bar
    if (isFiring || power > 0) {
      const pWidth = 60;
      const pHeight = 8;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-pWidth / 2, 20, pWidth, pHeight);

      // Power gradient (green to yellow to red)
      const grad = ctx.createLinearGradient(-pWidth / 2, 0, pWidth / 2, 0);
      grad.addColorStop(0, '#4CAF50');
      grad.addColorStop(0.5, '#FFEB3B');
      grad.addColorStop(1, '#F44336');

      ctx.fillStyle = grad;
      ctx.fillRect(-pWidth / 2 + 1, 21, (pWidth - 2) * (power / 100), pHeight - 2);

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(-pWidth / 2, 20, pWidth, pHeight);

      // Power text
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(power)}%`, 0, 38);
    }

    ctx.restore();
  };

  // Tombstone for defeated worms
  const drawTombstone = (ctx: CanvasRenderingContext2D, worm: Worm) => {
    ctx.save();
    ctx.translate(worm.x, worm.y);

    ctx.fillStyle = '#9E9E9E';
    ctx.beginPath();
    ctx.roundRect(-8, -18, 16, 18, [6, 6, 0, 0]);
    ctx.fill();

    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#424242';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('R.I.P.', 0, -8);
    ctx.fillText(worm.name.substring(0, 4), 0, -1);

    ctx.restore();
  };

  // Update & Draw Projectiles in Flight
  const updateAndDrawProjectiles = (ctx: CanvasRenderingContext2D, terrain: TerrainEngine) => {
    const projectiles = projectilesRef.current;
    if (projectiles.length === 0) return;

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];

      // Store trail
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 18) p.trail.shift();

      // Camera auto-tracks flying projectile
      cameraRef.current.targetX = p.x;
      cameraRef.current.targetY = p.y;
      if (!isQuickZoomActive) {
        cameraRef.current.targetZoom = 1.25;
      }

      // Physics
      p.vy += 0.28; // gravity
      if (p.weaponId === 'bazooka') {
        p.vx += wind * 0.015 * p.windFactor;
        // Bazooka smoke particle
        particlesRef.current.push({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          color: 'rgba(230, 230, 230, 0.7)',
          life: 0,
          maxLife: 20,
          size: 3 + Math.random() * 3,
          type: 'smoke',
        });
      }

      p.x += p.vx;
      p.y += p.vy;

      // Draw Trail
      ctx.strokeStyle = p.weaponId === 'bazooka' ? 'rgba(255, 152, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      p.trail.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Draw Projectile Graphic
      ctx.save();
      ctx.translate(p.x, p.y);
      const angle = Math.atan2(p.vy, p.vx);
      ctx.rotate(angle);

      if (p.weaponId === 'bazooka') {
        ctx.fillStyle = '#4B5320';
        ctx.fillRect(-6, -3, 12, 6);
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath();
        ctx.arc(6, 0, 3, -Math.PI / 2, Math.PI / 2);
        ctx.fill();
      } else if (p.weaponId === 'banana') {
        ctx.fillStyle = '#FBC02D';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.weaponId === 'holy') {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Standard Grenade / Cluster
        ctx.fillStyle = '#33691E';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Draw countdown timer for grenades
      if (p.timer !== undefined) {
        p.timer -= 1 / 60;
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#FFEB3B';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(p.timer)}`, p.x, p.y - 12);
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
          // Instant impact detonation
          detonateProjectile(p, terrain);
          projectiles.splice(i, 1);
        } else {
          // Grenade / Banana bounce physics
          p.bounces = (p.bounces || 0) + 1;
          p.vx *= -0.55;
          p.vy *= -0.45;
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

  // Detonation & explosion effect
  const detonateProjectile = (p: Projectile, terrain: TerrainEngine) => {
    const weaponInfo = WEAPONS[p.weaponId];
    const blastRadius = weaponInfo.blastRadius || 45;
    const baseDamage = weaponInfo.damage || 50;

    if (p.weaponId === 'holy') {
      sounds.playHallelujah();
    }
    sounds.playExplosion(blastRadius / 45);

    // Carve crater in terrain
    const dirtParticles = terrain.carveExplosion(p.x, p.y, blastRadius);
    particlesRef.current.push(...dirtParticles);

    // Fire explosion shockwave particles
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      particlesRef.current.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.5 ? '#FF5722' : '#FFC107',
        life: 0,
        maxLife: 20 + Math.random() * 20,
        size: 5 + Math.random() * 8,
        type: 'fire',
      });
    }

    // Cluster sub-munition split
    if (p.weaponId === 'cluster' && !p.isSubMunition) {
      for (let s = 0; s < 4; s++) {
        const spreadAngle = -Math.PI / 2 + (s - 1.5) * 0.45;
        const speed = 4 + Math.random() * 3;
        projectilesRef.current.push({
          id: Math.random().toString(),
          weaponId: 'grenade',
          x: p.x,
          y: p.y - 10,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          radius: 3,
          timer: 1.5 + Math.random() * 0.8,
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
          timer: 1.8 + Math.random() * 0.5,
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

    // Apply Area-of-Effect Damage & Knockback to all Worms
    let damaged = false;
    const currentTeams = [...teamsRef.current];

    currentTeams.forEach((team) => {
      team.worms.forEach((worm) => {
        if (!worm.isAlive || worm.tombstone) return;

        const dist = Math.hypot(worm.x - p.x, worm.y - p.y);
        if (dist < blastRadius + 15) {
          // Falloff damage calculation
          const ratio = Math.max(0, 1 - dist / (blastRadius + 15));
          const dmg = Math.round(baseDamage * ratio);

          if (dmg > 0) {
            worm.hp = Math.max(0, worm.hp - dmg);
            damaged = true;
            sounds.playWormHurt();

            // Knockback impulse away from explosion
            const angle = Math.atan2(worm.y - p.y, worm.x - p.x);
            const impulse = (ratio * 12) + 2;
            worm.vx = Math.cos(angle) * impulse;
            worm.vy = Math.sin(angle) * impulse - 4; // pop worm into air
            worm.x += worm.vx * 2;
            worm.y += worm.vy * 2;

            // Damage floating text
            damageTextsRef.current.push({
              id: Math.random().toString(),
              x: worm.x,
              y: worm.y - 25,
              text: `-${dmg}`,
              color: '#FF3D00',
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
    // If no more projectiles are in flight, finish turn after a brief delay
    setTimeout(() => {
      if (projectilesRef.current.length === 0) {
        onFireComplete(true);
      }
    }, 700);
  };

  const spawnWaterSplash = (x: number, y: number) => {
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 5,
        color: 'rgba(144, 202, 249, 0.8)',
        life: 0,
        maxLife: 30,
        size: 3 + Math.random() * 3,
        type: 'water',
      });
    }
  };

  // Particles & Floating Damage Text
  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
    // Particles
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.life++;
      pt.x += pt.vx;
      pt.y += pt.vy;

      if (pt.type === 'dirt') {
        pt.vy += 0.25; // gravity on dirt
      }

      const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (1 - pt.life / pt.maxLife * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (pt.life >= pt.maxLife) {
        particles.splice(i, 1);
      }
    }

    // Damage floating text
    const texts = damageTextsRef.current;
    for (let i = texts.length - 1; i >= 0; i--) {
      const dt = texts[i];
      dt.life++;
      dt.y -= 0.8; // float upwards

      const alpha = Math.max(0, 1 - dt.life / dt.maxLife);
      ctx.save();
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = dt.color;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.globalAlpha = alpha;
      ctx.fillText(dt.text, dt.x, dt.y);
      ctx.restore();

      if (dt.life >= dt.maxLife) {
        texts.splice(i, 1);
      }
    }
  };

  // Minimap Radar Rendering
  const drawMinimap = (terrain: TerrainEngine) => {
    const mini = minimapRef.current;
    if (!mini) return;
    const mCtx = mini.getContext('2d');
    if (!mCtx) return;

    mCtx.clearRect(0, 0, mini.width, mini.height);

    // Draw background
    mCtx.fillStyle = 'rgba(10, 25, 47, 0.9)';
    mCtx.fillRect(0, 0, mini.width, mini.height);

    // Draw terrain scaled
    mCtx.drawImage(terrain.canvas, 0, 0, mini.width, mini.height);

    // Draw water
    const waterY = (WATER_LEVEL / MAP_HEIGHT) * mini.height;
    mCtx.fillStyle = 'rgba(30, 136, 229, 0.6)';
    mCtx.fillRect(0, waterY, mini.width, mini.height - waterY);

    // Draw worms on minimap
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

    // Draw Camera Viewport bounding rectangle
    const canvas = canvasRef.current;
    if (canvas) {
      const cam = cameraRef.current;
      const vWidth = (canvas.width / cam.zoom / MAP_WIDTH) * mini.width;
      const vHeight = (canvas.height / cam.zoom / MAP_HEIGHT) * mini.height;
      const vx = ((cam.x - (canvas.width / cam.zoom) / 2) / MAP_WIDTH) * mini.width;
      const vy = ((cam.y - (canvas.height / cam.zoom) / 2) / MAP_HEIGHT) * mini.height;

      mCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      mCtx.lineWidth = 1;
      mCtx.strokeRect(vx, vy, vWidth, vHeight);
    }
  };

  // Mouse & Touch Pan / Click to Aim / Minimap Tap
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert to world coordinates
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

    // Start camera dragging
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

  // Minimap click to pan directly
  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const mini = minimapRef.current;
    if (!mini) return;
    const rect = mini.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const targetX = (clickX / mini.width) * MAP_WIDTH;
    const targetY = (clickY / mini.height) * MAP_HEIGHT;

    cameraRef.current.targetX = targetX;
    cameraRef.current.targetY = targetY;
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    const newZoom = Math.max(0.35, Math.min(2.4, cameraRef.current.targetZoom + zoomDelta));
    cameraRef.current.targetZoom = newZoom;
  };

  // Fire Weapon Handler (called by Game / parent when Space or Fire button is released)
  useEffect(() => {
    // When isFiring transitions to false and power > 0, we launch the weapon
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
      // Shotgun double speed straight slug
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
      projectilesRef.current.push({
        id: Math.random().toString(),
        weaponId: currentWeapon,
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        radius: 4,
        timer: WEAPONS[currentWeapon].hasTimer ? grenadeTimer : undefined,
        isDetonated: false,
        ownerId: activeWorm.id,
        windFactor: currentWeapon === 'bazooka' ? 1.0 : 0.4,
        trail: [],
      });
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none touch-none bg-slate-950 flex items-center justify-center">
      {/* Primary 60FPS Game Viewport */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full object-cover cursor-crosshair touch-no-zoom ${
          options.rgb565Mode ? 'rgb565-filter' : ''
        }`}
      />

      {/* Retro LCD Scanlines Shader overlay when enabled */}
      {options.retroFilter && (
        <div className="absolute inset-0 lcd-scanlines lcd-pixel-grid pointer-events-none" />
      )}

      {/* Floating Tactical Minimap Radar */}
      <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 shadow-2xl backdrop-blur-md z-20 flex flex-col items-center">
        <canvas
          ref={minimapRef}
          width={160}
          height={90}
          onClick={handleMinimapClick}
          className="rounded-lg cursor-pointer border border-slate-800 shadow-inner"
        />
        <div className="flex items-center justify-between w-full px-1 pt-1.5 text-[10px] text-slate-400 font-mono">
          <span>RADAR AKA</span>
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
