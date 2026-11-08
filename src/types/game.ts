export type WeaponId = 
  | 'bazooka' 
  | 'grenade' 
  | 'cluster' 
  | 'banana' 
  | 'dynamite' 
  | 'holy' 
  | 'shotgun' 
  | 'airstrike' 
  | 'teleport' 
  | 'jetpack' 
  | 'skip';

export interface WeaponInfo {
  id: WeaponId;
  name: string;
  category: 'projectile' | 'timed' | 'special' | 'utility';
  description: string;
  damage: number;
  blastRadius: number;
  ammo: number; // -1 for infinite
  hasTimer?: boolean;
  defaultTimer?: number;
  iconName: string;
}

export interface Worm {
  id: string;
  name: string;
  teamId: 1 | 2;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  facing: 'left' | 'right';
  aimAngle: number; // in degrees: -90 to +90 (or 0-360)
  aimPower: number; // 0 to 100
  isGrounded: boolean;
  isDrowning: boolean;
  tombstone: boolean;
  color: string;
  hat: 'helmet' | 'bandana' | 'cap' | 'crown' | 'beret' | 'none';
}

export interface Team {
  id: 1 | 2;
  name: string;
  color: string;
  secondaryColor: string;
  isAI: boolean;
  deviceType: 'gamebuino' | 'pc' | 'android';
  worms: Worm[];
  currentWormIndex: number;
  weapons: Record<WeaponId, number>; // ammo count (-1 = infinite)
}

export interface Projectile {
  id: string;
  weaponId: WeaponId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  timer?: number; // seconds remaining for timed bombs
  bounces?: number;
  maxBounces?: number;
  isDetonated: boolean;
  ownerId: string;
  windFactor: number;
  trail: { x: number; y: number }[];
  isSubMunition?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  type: 'smoke' | 'fire' | 'dirt' | 'water' | 'spark' | 'bubble';
}

export interface DamageText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export type MapPreset = 'islands' | 'canyon' | 'fortress' | 'volcano' | 'procedural';

export interface GameOptions {
  turnDuration: number; // 20, 30, 45, 60, 90
  wormsPerTeam: number; // 1, 2, 3, 4
  wormHp: number; // 50, 100, 150
  windEffect: 'none' | 'low' | 'normal' | 'high';
  mapPreset: MapPreset;
  displayMode: 'gamebuino_aka' | 'pc_android'; // Gamebuino AKA (ESP32-S3 320x240) vs PC/Android HD
  graphicStyle: 'hd_cartoon' | 'retro_aka'; // Visual aesthetic
  enhancedGraphics: boolean; // Dynamic lighting, weather particles, water caustics & shockwaves
  fpsLimit: 30 | 60; // 60 fps standard, 30 fps eco mode
  rgb565Mode: boolean; // Simulates RGB565 16-bit color depth
  retroFilter: boolean; // Scanlines & pixel matrix
  fastZoomMode: boolean; // Quick toggle between 0.45x and 1.6x
  soundEnabled: boolean;
  volume: number; // 0 to 1
  musicEnabled: boolean;
  musicVolume: number; // 0 to 1
  musicTrack: number; // index in MUSIC_TRACKS
}

export type GameState = 'MENU' | 'LOBBY' | 'PLAYING' | 'BETWEEN_TURNS' | 'GAME_OVER' | 'PAUSED';

export type GameMode = 'PASS_AND_PLAY' | 'VS_AI' | 'ONLINE_HOST' | 'ONLINE_JOIN';

export interface NetworkMessage {
  type: 
    | 'ROOM_READY' 
    | 'START_GAME' 
    | 'WORM_MOVE' 
    | 'WORM_AIM' 
    | 'WORM_CHARGE' 
    | 'WORM_FIRE' 
    | 'WEAPON_SELECT' 
    | 'GRENADE_TIMER' 
    | 'WORM_JUMP' 
    | 'AIRSTRIKE_TARGET' 
    | 'TELEPORT_TARGET' 
    | 'END_TURN' 
    | 'GAME_STATE_SYNC'
    | 'PING';
  payload: any;
  senderId: string;
  timestamp: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  isQuickZoomOut: boolean;
}
