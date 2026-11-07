import React from 'react';
import { WeaponId, WeaponInfo } from '../types/game';
import { WEAPONS } from '../utils/weapons';
import {
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
  X,
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface WeaponSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWeapon: WeaponId;
  onSelectWeapon: (weaponId: WeaponId) => void;
  ammo: Record<WeaponId, number>;
  grenadeTimer: number;
  onChangeGrenadeTimer: (seconds: number) => void;
}

export const WeaponSelector: React.FC<WeaponSelectorProps> = ({
  isOpen,
  onClose,
  selectedWeapon,
  onSelectWeapon,
  ammo,
  grenadeTimer,
  onChangeGrenadeTimer,
}) => {
  if (!isOpen) return null;

  const getWeaponIcon = (id: WeaponId) => {
    switch (id) {
      case 'bazooka':
        return <Flame className="w-6 h-6 text-orange-400" />;
      case 'grenade':
        return <Bomb className="w-6 h-6 text-emerald-400" />;
      case 'cluster':
        return <Sparkles className="w-6 h-6 text-amber-400" />;
      case 'banana':
        return <Zap className="w-6 h-6 text-yellow-400" />;
      case 'dynamite':
        return <Cpu className="w-6 h-6 text-red-500" />;
      case 'holy':
        return <Cross className="w-6 h-6 text-amber-300" />;
      case 'shotgun':
        return <Crosshair className="w-6 h-6 text-slate-300" />;
      case 'airstrike':
        return <Plane className="w-6 h-6 text-sky-400" />;
      case 'teleport':
        return <Navigation className="w-6 h-6 text-purple-400" />;
      case 'jetpack':
        return <Rocket className="w-6 h-6 text-cyan-400" />;
      case 'skip':
      default:
        return <FastForward className="w-6 h-6 text-slate-400" />;
    }
  };

  const weaponList = Object.values(WEAPONS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="font-retro text-sm text-emerald-400">ARSENAL</span>
              <span>Armes & Utilitaires</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Choisissez votre arme pour ce tour. Les munitions sont partagées par équipe.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Weapons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 my-5 max-h-[60vh] overflow-y-auto pr-1">
          {weaponList.map((w) => {
            const currentAmmo = ammo[w.id] ?? w.ammo;
            const isAvailable = currentAmmo === -1 || currentAmmo > 0;
            const isSelected = selectedWeapon === w.id;

            return (
              <button
                key={w.id}
                disabled={!isAvailable}
                onClick={() => {
                  sounds.playMenuClick();
                  onSelectWeapon(w.id);
                  onClose();
                }}
                className={`relative flex flex-col items-center justify-between p-3.5 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/30'
                    : isAvailable
                    ? 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600'
                    : 'border-slate-800/40 bg-slate-900/40 opacity-40 cursor-not-allowed'
                }`}
              >
                {/* Ammo count badge */}
                <span className="absolute top-2 right-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-300">
                  {currentAmmo === -1 ? '∞' : `x${currentAmmo}`}
                </span>

                <div className="p-2.5 rounded-lg bg-slate-950/50 mb-2">
                  {getWeaponIcon(w.id)}
                </div>

                <div className="w-full">
                  <span className="block text-xs font-semibold text-slate-100 truncate">
                    {w.name}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {w.damage > 0 ? `${w.damage} Dégâts` : 'Utilitaire'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Grenade Fuse Timer selector */}
        {WEAPONS[selectedWeapon]?.hasTimer && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">
              Minuteur de détonation:
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    sounds.playMenuClick();
                    onChangeGrenadeTimer(sec);
                  }}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                    grenadeTimer === sec
                      ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
