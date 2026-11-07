import { Worm, Team, WeaponId } from '../types/game';
import { TerrainEngine, WATER_LEVEL } from './terrain';

export interface AIAction {
  type: 'WALK' | 'AIM' | 'CHARGE' | 'FIRE' | 'SELECT_WEAPON' | 'JUMP';
  payload?: any;
}

export class AIEngine {
  public static calculateTurn(
    activeWorm: Worm,
    teams: Team[],
    terrain: TerrainEngine,
    wind: number // -10 to +10
  ): {
    weapon: WeaponId;
    angle: number; // degrees
    power: number; // 0 - 100
    walkDirection?: 'left' | 'right';
    walkSteps?: number;
    timer?: number;
  } {
    // 1. Identify enemy worms
    const enemies: Worm[] = [];
    teams.forEach((t) => {
      if (t.id !== activeWorm.teamId) {
        t.worms.forEach((w) => {
          if (w.isAlive && !w.tombstone && w.y < WATER_LEVEL) {
            enemies.push(w);
          }
        });
      }
    });

    if (enemies.length === 0) {
      return { weapon: 'bazooka', angle: 45, power: 50 };
    }

    // 2. Select best target (closest or lowest HP)
    let bestTarget = enemies[0];
    let minDistance = Infinity;

    enemies.forEach((target) => {
      const dist = Math.hypot(target.x - activeWorm.x, target.y - activeWorm.y);
      if (dist < minDistance) {
        minDistance = dist;
        bestTarget = target;
      }
    });

    const dx = bestTarget.x - activeWorm.x;
    const dy = bestTarget.y - activeWorm.y;
    const distance = Math.hypot(dx, dy);

    // 3. Choose weapon
    let weapon: WeaponId = 'bazooka';
    let timer = 3;

    if (distance < 70) {
      // Very close: drop dynamite and run!
      weapon = 'dynamite';
      return {
        weapon,
        angle: 45,
        power: 10,
        walkDirection: dx > 0 ? 'left' : 'right',
        walkSteps: 20,
      };
    } else if (distance < 200 && Math.abs(dy) < 50) {
      // Close horizontal line: Shotgun
      weapon = 'shotgun';
    } else if (distance < 450 && Math.random() > 0.4) {
      // Mid-range: Grenade
      weapon = 'grenade';
      timer = distance < 250 ? 2 : 3;
    } else {
      // Long-range: Bazooka
      weapon = 'bazooka';
    }

    // 4. Ballistics calculation
    // Gravity is ~0.25 px/frame^2
    const g = 0.28;
    const baseAngleRad = Math.atan2(dy, dx);
    let targetAngleDeg = (baseAngleRad * 180) / Math.PI;

    // Normalizing facing angle: Worms aim up/down from horizontal
    // When aiming left or right, elevation angle is between 15° and 75°
    let elevation = 45; // default 45°
    if (dy < -60) {
      elevation = 60; // target is high above
    } else if (dy > 80) {
      elevation = 30; // target is below
    }

    // Wind compensation for bazooka
    let windOffset = 0;
    if (weapon === 'bazooka') {
      windOffset = -wind * 2.2;
    }

    // Compute required power based on range
    // range approx ~ (v^2 * sin(2*theta)) / g
    const theta = (elevation * Math.PI) / 180;
    const sin2theta = Math.sin(2 * theta) || 0.7;
    let idealV = Math.sqrt((distance * g) / sin2theta);
    
    // Convert velocity to power percentage (v max is approx 18 px/f at 100 power)
    let power = Math.min(100, Math.max(25, (idealV / 16) * 100));

    // Add small human-like imperfection (±6%)
    power += (Math.random() - 0.5) * 10;
    elevation += (Math.random() - 0.5) * 8 + windOffset * 0.4;

    // Clamp
    power = Math.max(20, Math.min(100, Math.round(power)));
    elevation = Math.max(10, Math.min(85, Math.round(elevation)));

    // Walk a few steps towards target if safe
    const walkDirection: 'left' | 'right' = dx > 0 ? 'right' : 'left';
    const walkSteps = Math.min(15, Math.floor(Math.random() * 12));

    return {
      weapon,
      angle: elevation,
      power,
      walkDirection,
      walkSteps,
      timer,
    };
  }
}
