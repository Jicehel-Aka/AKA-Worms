import React, { useState } from 'react';
import { sounds } from '../utils/audio';
import { Wifi, Cpu } from 'lucide-react';

interface GamebuinoChassisProps {
  children: React.ReactNode;
  onDpadPress: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onDpadRelease: () => void;
  onButtonAPress: () => void;
  onButtonARelease: () => void;
  onButtonBPress: () => void;
  onButtonCPress: () => void; // Fast Zoom toggle
  onMenuPress: () => void;
  teamColor?: string;
  isExploding?: boolean;
}

export const GamebuinoChassis: React.FC<GamebuinoChassisProps> = ({
  children,
  onDpadPress,
  onDpadRelease,
  onButtonAPress,
  onButtonARelease,
  onButtonBPress,
  onButtonCPress,
  onMenuPress,
  teamColor = '#10B981',
  isExploding = false,
}) => {
  const [activeDpad, setActiveDpad] = useState<string | null>(null);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  const handleDpadDown = (dir: 'up' | 'down' | 'left' | 'right') => {
    setActiveDpad(dir);
    sounds.playMenuClick();
    onDpadPress(dir);
  };

  const handleDpadUp = () => {
    setActiveDpad(null);
    onDpadRelease();
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-2 sm:p-4 max-w-5xl mx-auto select-none w-full">
      {/* ================= GAMEBUINO AKA (ESP32-S3, 320x240) CHASSIS ================= */}
      <div className="relative w-full max-w-4xl rounded-[2.5rem] bg-gradient-to-b from-[#1b1f24] via-[#12161b] to-[#0c0f13] border-4 border-slate-700/80 p-4 md:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]">
        {/* Top Bar with ESP32-S3 badge, Wi-Fi antenna & Status LED */}
        <div className="flex items-center justify-between w-full px-6 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-retro text-xs tracking-wider text-emerald-400 font-extrabold">
              GAMEBUINO <span className="text-white">AKA</span>
            </span>
            <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
              <Cpu className="w-3 h-3" /> ESP32-S3 · 320×240 (4:3)
            </span>
          </div>

          {/* Cross-Play Wi-Fi Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400" title="Cross-Play Wi-Fi PC & Android">
              <Wifi className="w-3.5 h-3.5" />
              <span>Wi-Fi P2P</span>
            </div>
            {/* Battery / Status LED */}
            <div
              className="w-2.5 h-2.5 rounded-full shadow transition-colors duration-150"
              style={{
                backgroundColor: isExploding ? '#EF4444' : '#10B981',
                boxShadow: `0 0 10px ${isExploding ? '#EF4444' : '#10B981'}`,
              }}
            />
          </div>
        </div>

        {/* 320x240 Native 4:3 Ratio Screen Frame */}
        <div className="relative mx-auto w-full max-w-3xl rounded-2xl bg-black p-2 border-4 border-slate-800 shadow-2xl overflow-hidden aspect-[4/3] max-h-[58vh]">
          {/* Screen Resolution Overlay Tag */}
          <div className="absolute top-2 right-3 z-30 pointer-events-none text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/60 text-emerald-400/80 border border-emerald-500/30">
            320 × 240 QVGA
          </div>
          {children}
        </div>

        {/* AKA Handheld Controls */}
        <div className="flex items-center justify-between w-full px-6 pt-4 pb-1">
          {/* D-Pad */}
          <div className="relative w-30 h-30 flex items-center justify-center">
            <div className="absolute w-9 h-9 bg-slate-900 rounded-md shadow-inner z-10" />
            <button
              onPointerDown={() => handleDpadDown('up')}
              onPointerUp={handleDpadUp}
              className={`absolute top-0 w-9 h-10 rounded-t-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 shadow border border-slate-700 flex items-center justify-center transition-transform ${
                activeDpad === 'up' ? 'scale-95 bg-slate-600' : ''
              }`}
            >
              <span className="text-slate-200 text-xs">▲</span>
            </button>
            <button
              onPointerDown={() => handleDpadDown('down')}
              onPointerUp={handleDpadUp}
              className={`absolute bottom-0 w-9 h-10 rounded-b-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 shadow border border-slate-700 flex items-center justify-center transition-transform ${
                activeDpad === 'down' ? 'scale-95 bg-slate-600' : ''
              }`}
            >
              <span className="text-slate-200 text-xs">▼</span>
            </button>
            <button
              onPointerDown={() => handleDpadDown('left')}
              onPointerUp={handleDpadUp}
              className={`absolute left-0 w-10 h-9 rounded-l-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 shadow border border-slate-700 flex items-center justify-center transition-transform ${
                activeDpad === 'left' ? 'scale-95 bg-slate-600' : ''
              }`}
            >
              <span className="text-slate-200 text-xs">◀</span>
            </button>
            <button
              onPointerDown={() => handleDpadDown('right')}
              onPointerUp={handleDpadUp}
              className={`absolute right-0 w-10 h-9 rounded-r-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 shadow border border-slate-700 flex items-center justify-center transition-transform ${
                activeDpad === 'right' ? 'scale-95 bg-slate-600' : ''
              }`}
            >
              <span className="text-slate-200 text-xs">▶</span>
            </button>
          </div>

          {/* Central Controls: ZOOM RAPIDE & MENU */}
          <div className="flex flex-col items-center gap-2.5">
            {/* Quick Zoom Button */}
            <button
              onClick={() => {
                sounds.playMenuClick();
                onButtonCPress();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs shadow-lg ring-1 ring-emerald-400/50 flex items-center gap-1.5 transition-all"
              title="Zoom Rapide entre Vue Cible (1.6x) et Vue Tactique (0.45x)"
            >
              <span>ZOOM RAPIDE [Z]</span>
            </button>

            {/* Menu Button */}
            <button
              onClick={() => {
                sounds.playMenuClick();
                onMenuPress();
              }}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-slate-300 active:scale-95 shadow"
            >
              MENU [E]
            </button>
          </div>

          {/* Action Buttons: A (Tirer) & B (Sauter) */}
          <div className="flex items-center gap-4">
            {/* Button B (Sauter) */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => {
                  sounds.playMenuClick();
                  onButtonBPress();
                }}
                className="w-13 h-13 rounded-full bg-amber-500 hover:bg-amber-400 active:bg-amber-300 shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-1 flex items-center justify-center font-bold text-slate-950 text-base transition-all"
              >
                B
              </button>
              <span className="text-[9px] font-retro text-stone-400">SAUT</span>
            </div>

            {/* Button A (Tirer) */}
            <div className="flex flex-col items-center gap-1">
              <button
                onPointerDown={() => {
                  setActiveBtn('A');
                  onButtonAPress();
                }}
                onPointerUp={() => {
                  setActiveBtn(null);
                  onButtonARelease();
                }}
                className={`w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-400 shadow-[0_4px_0_#9f1239] active:shadow-none active:translate-y-1 flex items-center justify-center font-bold text-white text-base transition-all ${
                  activeBtn === 'A' ? 'translate-y-1 shadow-none bg-rose-400' : ''
                }`}
              >
                A
              </button>
              <span className="text-[9px] font-retro text-stone-400">TIRER</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
