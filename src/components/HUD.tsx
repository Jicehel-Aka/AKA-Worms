import React, { useState } from 'react';
import { Team, WeaponId, Worm, GameOptions } from '../types/game';
import { WEAPONS } from '../utils/weapons';
import { WeaponSelector } from './WeaponSelector';
import {
  ZoomIn,
  ZoomOut,
  Wind,
  Clock,
  Shield,
  Settings,
  HelpCircle,
  Gamepad2,
  Monitor,
  Flame,
  Bomb,
  Sparkles,
  Zap,
  Cpu,
  Cross,
  Crosshair,
  Plane,
  Navigation,
  Rocket,
  FastForward,
  Music,
  Eye,
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface HUDProps {
  teams: Team[];
  activeTeamIndex: number;
  activeWormIndex: number;
  currentWeapon: WeaponId;
  onSelectWeapon: (weaponId: WeaponId) => void;
  grenadeTimer: number;
  onChangeGrenadeTimer: (seconds: number) => void;
  turnTimeLeft: number;
  wind: number; // -10 to +10
  options: GameOptions;
  isQuickZoomActive: boolean;
  onToggleQuickZoom: () => void;
  onOpenOptions: () => void;
  onOpenHelp: () => void;
  onOpenGallery?: () => void;
  onToggleDisplayMode: () => void;
  onToggleMusic: () => void;
  isMusicPlaying: boolean;
  currentTrackName: string;
  // Touch / Mobile Controls
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onMoveStop: () => void;
  onAimUp: () => void;
  onAimDown: () => void;
  onJump: () => void;
  onChargeStart: () => void;
  onChargeRelease: () => void;
  isCharging: boolean;
  power: number;
}

export const HUD: React.FC<HUDProps> = ({
  teams,
  activeTeamIndex,
  activeWormIndex,
  currentWeapon,
  onSelectWeapon,
  grenadeTimer,
  onChangeGrenadeTimer,
  turnTimeLeft,
  wind,
  options,
  isQuickZoomActive,
  onToggleQuickZoom,
  onOpenOptions,
  onOpenHelp,
  onOpenGallery,
  onToggleDisplayMode,
  onToggleMusic,
  isMusicPlaying,
  currentTrackName,
  onMoveLeft,
  onMoveRight,
  onMoveStop,
  onAimUp,
  onAimDown,
  onJump,
  onChargeStart,
  onChargeRelease,
  isCharging,
  power,
}) => {
  const [isWeaponSelectorOpen, setIsWeaponSelectorOpen] = useState(false);

  const activeTeam = teams[activeTeamIndex];
  const activeWorm = activeTeam?.worms[activeWormIndex];
  const weaponInfo = WEAPONS[currentWeapon];

  // Helper icon for current weapon
  const renderWeaponIcon = (id: WeaponId) => {
    switch (id) {
      case 'bazooka':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'grenade':
        return <Bomb className="w-5 h-5 text-emerald-400" />;
      case 'cluster':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'banana':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'dynamite':
        return <Cpu className="w-5 h-5 text-red-500" />;
      case 'holy':
        return <Cross className="w-5 h-5 text-amber-300" />;
      case 'shotgun':
        return <Crosshair className="w-5 h-5 text-slate-300" />;
      case 'airstrike':
        return <Plane className="w-5 h-5 text-sky-400" />;
      case 'teleport':
        return <Navigation className="w-5 h-5 text-purple-400" />;
      case 'jetpack':
        return <Rocket className="w-5 h-5 text-cyan-400" />;
      case 'skip':
      default:
        return <FastForward className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <>
      {/* Top Floating Match Header */}
      <div className="absolute top-3 inset-x-3 flex items-start justify-between pointer-events-none z-30">
        {/* Teams Overview & Active Worm Health */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            {teams.map((team, idx) => {
              const isActive = idx === activeTeamIndex;
              const livingWorms = team.worms.filter((w) => w.isAlive && !w.tombstone);
              const totalHp = livingWorms.reduce((acc, w) => acc + w.hp, 0);

              return (
                <div
                  key={team.id}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all ${
                    isActive
                      ? 'bg-slate-900/90 border-amber-400/80 shadow-lg ring-2 ring-amber-400/20'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white tracking-tight">
                        {team.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-retro text-amber-400">
                          TOUR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-300">
                      {totalHp} HP · {livingWorms.length} vers
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Worm Focus Card */}
          {activeWorm && activeWorm.isAlive && (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-700/60 rounded-lg text-xs text-slate-200 backdrop-blur-sm self-start">
              <span className="font-semibold text-white">Ver actif:</span>
              <span className="font-mono text-amber-300">{activeWorm.name}</span>
              <span className="text-slate-500">|</span>
              <span className="font-mono">
                Angle: {Math.round(activeWorm.aimAngle)}°
              </span>
            </div>
          )}
        </div>

        {/* Center: Turn Timer & Dynamic Wind Gauge */}
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
          {/* Turn Countdown */}
          <div
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border backdrop-blur-md font-mono font-bold text-base shadow-xl ${
              turnTimeLeft <= 5
                ? 'bg-red-950/90 border-red-500 text-red-300 animate-pulse'
                : 'bg-slate-900/90 border-slate-700/80 text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-lg tabular-nums">{turnTimeLeft}s</span>
          </div>

          {/* Wind Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono backdrop-blur-sm">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 text-[11px]">VENT:</span>
            <div className="flex items-center gap-0.5">
              {/* Left wind arrows */}
              {wind < 0 && (
                <span className="text-cyan-400 font-bold">
                  {'◄'.repeat(Math.min(5, Math.abs(Math.round(wind / 2))))}
                </span>
              )}
              <span className="text-white font-bold mx-1">
                {Math.abs(wind).toFixed(1)}
              </span>
              {/* Right wind arrows */}
              {wind > 0 && (
                <span className="text-cyan-400 font-bold">
                  {'►'.repeat(Math.min(5, Math.round(wind / 2)))}
                </span>
              )}
              {wind === 0 && <span className="text-slate-500 font-bold">CALME</span>}
            </div>
          </div>
        </div>

        {/* Top Right: Mode Switcher & Game Control Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Gallery & Worms Showcase Button */}
          {onOpenGallery && (
            <button
              onClick={() => {
                sounds.playMenuClick();
                onOpenGallery();
              }}
              title="Explorateur des Cartes & Studio d'Animations des Vers"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/80 rounded-xl text-xs font-bold text-emerald-300 transition-colors shadow-lg backdrop-blur-sm"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Cartes & Vers</span>
            </button>
          )}

          {/* Display Mode Toggle (Gamebuino AKA vs Plein Écran HD) */}
          <button
            onClick={() => {
              sounds.playMenuClick();
              onToggleDisplayMode();
            }}
            title="Changer de vue: Gamebuino AKA (ESP32-S3 · 320x240) / Plein Écran HD"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 transition-colors shadow-lg backdrop-blur-sm"
          >
            {options.displayMode === 'gamebuino_aka' ? (
              <>
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">AKA 320x240</span>
              </>
            ) : (
              <>
                <Monitor className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">Plein Écran HD</span>
              </>
            )}
          </button>

          {/* Music BGM Toggle Button */}
          <button
            onClick={() => {
              sounds.playMenuClick();
              onToggleMusic();
            }}
            title={isMusicPlaying ? `Musique Chiptune active: ${currentTrackName} (Cliquer pour couper)` : "Activer la musique Chiptune 8-bit"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-xl text-xs font-medium transition-all shadow-lg backdrop-blur-sm ${
              isMusicPlaying
                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/80 text-slate-400'
            }`}
          >
            <Music className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline font-mono text-[11px] truncate max-w-24">
              {isMusicPlaying ? 'Musique ON' : 'Musique'}
            </span>
          </button>

          {/* Options & Help */}
          <button
            onClick={() => {
              sounds.playMenuClick();
              onOpenOptions();
            }}
            title="Options du jeu"
            className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 transition-colors shadow-lg backdrop-blur-sm"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sounds.playMenuClick();
              onOpenHelp();
            }}
            title="Aide & Contrôles"
            className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 transition-colors shadow-lg backdrop-blur-sm"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Tactical Action Bar & Mobile Virtual Controls */}
      <div className="absolute bottom-3 inset-x-3 flex items-end justify-between pointer-events-none z-30">
        {/* Left Side: Mobile Touch D-Pad for Walking & Aiming */}
        <div className="pointer-events-auto flex flex-col gap-2">
          {/* Virtual On-screen D-Pad (crucial for Phone & Tablet play) */}
          <div className="grid grid-cols-3 gap-1 w-32 p-1.5 bg-slate-900/85 border border-slate-700/70 rounded-2xl shadow-2xl backdrop-blur-md">
            {/* Empty top left */}
            <div />
            {/* Aim Up */}
            <button
              onPointerDown={onAimUp}
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow transition-colors"
              title="Viser vers le haut"
            >
              ▲
            </button>
            <div />

            {/* Move Left */}
            <button
              onPointerDown={onMoveLeft}
              onPointerUp={onMoveStop}
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow transition-colors"
              title="Marcher à gauche"
            >
              ◀
            </button>
            {/* Center Jump */}
            <button
              onClick={onJump}
              className="w-9 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-white flex items-center justify-center font-bold text-[10px] shadow transition-colors"
              title="Sauter"
            >
              SAUT
            </button>
            {/* Move Right */}
            <button
              onPointerDown={onMoveRight}
              onPointerUp={onMoveStop}
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow transition-colors"
              title="Marcher à droite"
            >
              ▶
            </button>

            <div />
            {/* Aim Down */}
            <button
              onPointerDown={onAimDown}
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow transition-colors"
              title="Viser vers le bas"
            >
              ▼
            </button>
            <div />
          </div>
        </div>

        {/* Center: Selected Weapon & Fast Zoom Button */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 p-2 rounded-2xl shadow-2xl backdrop-blur-md">
          {/* Quick Zoom Switch Button (Highlighting the User's core request!) */}
          <button
            onClick={() => {
              sounds.playMenuClick();
              onToggleQuickZoom();
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
              isQuickZoomActive
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
            title="Touche [Z] pour basculer rapidement entre vue globale et vue rapprochée"
          >
            {isQuickZoomActive ? (
              <>
                <ZoomIn className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Zoom Cible [Z]</span>
              </>
            ) : (
              <>
                <ZoomOut className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Vue Tactique [Z]</span>
              </>
            )}
          </button>

          {/* Weapon Selector Open Button */}
          <button
            onClick={() => {
              sounds.playMenuClick();
              setIsWeaponSelectorOpen(true);
            }}
            className="flex items-center gap-2.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-white shadow-md transition-all group"
          >
            <div className="p-1 rounded bg-slate-950/60">
              {renderWeaponIcon(currentWeapon)}
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                {weaponInfo.name}
              </span>
              <span className="block text-[10px] text-slate-400">
                Changer d'arme [Espace/Clic]
              </span>
            </div>
          </button>

          {/* Quick Fuse Timer button if applicable */}
          {weaponInfo.hasTimer && (
            <button
              onClick={() => {
                const next = (grenadeTimer % 5) + 1;
                onChangeGrenadeTimer(next);
                sounds.playMenuClick();
              }}
              title="Changer le délai de détonation"
              className="flex flex-col items-center justify-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-amber-400 font-mono font-bold text-xs"
            >
              <span className="text-[9px] text-slate-400">FUSE</span>
              <span>{grenadeTimer}s</span>
            </button>
          )}

          {/* Mobile Big Fire / Charge Button */}
          <button
            onPointerDown={onChargeStart}
            onPointerUp={onChargeRelease}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg transition-all ${
              isCharging
                ? 'bg-rose-500 scale-95 ring-4 ring-rose-400/50'
                : 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 shadow-[0_4px_0_#9f1239]'
            }`}
          >
            {isCharging ? `TIR (${Math.round(power)}%)` : 'TIRER [ESPACE]'}
          </button>
        </div>

        {/* Right side spacer to avoid overlapping radar */}
        <div className="w-40 pointer-events-none" />
      </div>

      {/* Weapon Selector Modal */}
      <WeaponSelector
        isOpen={isWeaponSelectorOpen}
        onClose={() => setIsWeaponSelectorOpen(false)}
        selectedWeapon={currentWeapon}
        onSelectWeapon={onSelectWeapon}
        ammo={activeTeam?.weapons || {}}
        grenadeTimer={grenadeTimer}
        onChangeGrenadeTimer={onChangeGrenadeTimer}
      />
    </>
  );
};
