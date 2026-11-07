import React, { useEffect } from 'react';
import { Team } from '../types/game';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Skull } from 'lucide-react';
import { sounds } from '../utils/audio';

interface VictoryModalProps {
  isOpen: boolean;
  winningTeam: Team | null;
  onRematch: () => void;
  onReturnToMenu: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  winningTeam,
  onRematch,
  onReturnToMenu,
}) => {
  useEffect(() => {
    if (isOpen && winningTeam) {
      sounds.playVictory();
      // Blast confetti
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Fallback
      }
    }
  }, [isOpen, winningTeam]);

  if (!isOpen || !winningTeam) return null;

  const livingWorms = winningTeam.worms.filter((w) => w.isAlive && !w.tombstone);
  const totalHpRemaining = livingWorms.reduce((acc, w) => acc + w.hp, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-400/80 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden p-6 md:p-8 text-center text-white">
        {/* Trophy icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center shadow-lg">
          <Trophy className="w-9 h-9 text-amber-400 animate-bounce" />
        </div>

        <span className="font-retro text-xs text-amber-400 tracking-widest block mb-1">
          VICTOIRE TOTALE
        </span>

        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
          {winningTeam.name}
        </h2>

        <p className="text-xs text-slate-300 max-w-sm mx-auto mb-6">
          Tous les vers adverses ont été neutralisés ou sont tombés dans l'océan !
        </p>

        {/* Stats card */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl text-left mb-6 font-mono text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">VERS SURVIVANTS</span>
            <span className="text-base font-bold text-emerald-400">
              {livingWorms.length} / {winningTeam.worms.length}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">SANTÉ TOTALE RESTANTE</span>
            <span className="text-base font-bold text-white">
              {totalHpRemaining} HP
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              sounds.playMenuClick();
              onReturnToMenu();
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Menu</span>
          </button>

          <button
            onClick={() => {
              sounds.playMenuClick();
              onRematch();
            }}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-xl transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Revanche Immédiate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
