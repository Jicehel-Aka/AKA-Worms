import React, { useState } from 'react';
import { sounds } from '../utils/audio';
import { Wifi, Cpu, Sparkles, RefreshCw } from 'lucide-react';

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
  model: 'gamebuino_aka' | 'gamebuino_meta';
  onSwitchModel: (model: 'gamebuino_aka' | 'gamebuino_meta') => void;
  fpsLimit?: number;
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
  model = 'gamebuino_aka',
  onSwitchModel,
  fpsLimit = 60,
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

  const isAKA = model === 'gamebuino_aka';

  return (
    <div className="relative flex flex-col items-center justify-center p-2 sm:p-4 max-w-5xl mx-auto select-none w-full">
      {/* Quick Console Model Switcher Bar */}
      <div className="flex items-center justify-between w-full max-w-3xl mb-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">CONSOLE ACTIVE:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                sounds.playMenuClick();
                onSwitchModel('gamebuino_aka');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                isAKA
                  ? 'bg-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Gamebuino AKA (ESP32-S3 · 320x240)
            </button>

            <button
              onClick={() => {
                sounds.playMenuClick();
                onSwitchModel('gamebuino_meta');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                !isAKA
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Gamebuino META (ATSAMD21 · 160x128)
            </button>
          </div>
        </div>

        {/* Technical Specs Pill */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-400">
          {isAKA ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Cpu className="w-3.5 h-3.5" /> ESP32-S3 · 320×240 RGB · 60 FPS
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400">
              <Cpu className="w-3.5 h-3.5" /> ATSAMD21 ARM M0+ · 160×128 RGB565 · {fpsLimit} FPS
            </span>
          )}
        </div>
      </div>

      {/* Main Console Handheld Chassis */}
      {isAKA ? (
        /* ================= GAMEBUINO AKA (ESP32-S3, 320x240) CHASSIS ================= */
        <div className="relative w-full max-w-4xl rounded-[2.5rem] bg-gradient-to-b from-[#1b1f24] via-[#12161b] to-[#0c0f13] border-4 border-slate-700/80 p-4 md:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]">
          {/* Top Bar with ESP32-S3 badge, Wi-Fi antenna & Status LED */}
          <div className="flex items-center justify-between w-full px-6 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-retro text-xs tracking-wider text-emerald-400 font-extrabold">
                GAMEBUINO <span className="text-white">AKA</span>
              </span>
              <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono px-2 py-0.5 rounded-full">
                ESP32-S3
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

            {/* Center Fast Zoom [Z] button & Menu */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  setActiveBtn('ZOOM');
                  sounds.playMenuClick();
                  onButtonCPress();
                  setTimeout(() => setActiveBtn(null), 150);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-400 text-white font-bold text-xs shadow-md transition-all ${
                  activeBtn === 'ZOOM' ? 'scale-95' : ''
                }`}
                title="Zoom Rapide indispensable sur écran 320x240"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ZOOM RAPIDE [Z]</span>
              </button>

              <button
                onClick={() => {
                  sounds.playMenuClick();
                  onMenuPress();
                }}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-slate-300"
              >
                MENU / OPT
              </button>
            </div>

            {/* Action Buttons A & B */}
            <div className="flex items-center gap-4">
              {/* Button B: Jump */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => {
                    setActiveBtn('B');
                    sounds.playMenuClick();
                    onButtonBPress();
                    setTimeout(() => setActiveBtn(null), 150);
                  }}
                  className={`w-13 h-13 rounded-full bg-amber-600 hover:bg-amber-500 active:bg-amber-400 shadow-[0_4px_0_#92400e] active:shadow-none active:translate-y-1 flex items-center justify-center font-bold text-white text-base transition-all ${
                    activeBtn === 'B' ? 'translate-y-1 shadow-none bg-amber-400' : ''
                  }`}
                >
                  B
                </button>
                <span className="text-[9px] font-retro text-stone-400">SAUT</span>
              </div>

              {/* Button A: Fire / Charge */}
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
      ) : (
        /* ================= GAMEBUINO META (ATSAMD21, 160x128 RGB565) CHASSIS ================= */
        <div className="relative w-full max-w-4xl rounded-[2.5rem] bg-stone-900 border-4 border-stone-800 p-4 md:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]">
          {/* Top META Specifications Badge */}
          <div className="flex items-center justify-between w-full px-6 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-retro text-xs tracking-wider text-amber-400 font-extrabold">
                GAMEBUINO <span className="text-white">META</span>
              </span>
              <span className="text-[10px] bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono px-2 py-0.5 rounded-full">
                ATSAMD21 · ARM Cortex M0+
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400">
              <span>1.8" RGB565 · 160×128</span>
              <span className="text-amber-400">{fpsLimit} FPS</span>
            </div>
          </div>

          {/* Screen Frame with Signature NeoPixel RGB Side LEDs */}
          <div className="relative flex items-center w-full my-2">
            {/* Left 4 NeoPixel LEDs */}
            <div
              className="w-2.5 h-60 rounded-full mr-2 transition-all duration-200"
              style={{
                backgroundColor: isExploding ? '#FF3D00' : teamColor,
                boxShadow: `0 0 16px ${isExploding ? '#FF3D00' : teamColor}`,
                opacity: 0.9,
              }}
            />

            {/* 160x128 Aspect Screen */}
            <div className="relative flex-1 aspect-[16/10] bg-black rounded-2xl overflow-hidden border-8 border-stone-950 shadow-inner max-h-[56vh]">
              <div className="absolute top-2 right-3 z-30 pointer-events-none text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/60 text-amber-400/80 border border-amber-500/30">
                160 × 128 RGB565
              </div>
              {children}
            </div>

            {/* Right 4 NeoPixel LEDs */}
            <div
              className="w-2.5 h-60 rounded-full ml-2 transition-all duration-200"
              style={{
                backgroundColor: isExploding ? '#FF3D00' : teamColor,
                boxShadow: `0 0 16px ${isExploding ? '#FF3D00' : teamColor}`,
                opacity: 0.9,
              }}
            />
          </div>

          {/* META Controls */}
          <div className="flex items-center justify-between w-full px-6 pt-3 pb-1">
            {/* D-Pad */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute w-9 h-9 bg-stone-800 rounded-md shadow-inner z-10" />
              <button
                onPointerDown={() => handleDpadDown('up')}
                onPointerUp={handleDpadUp}
                className="absolute top-0 w-9 h-10 rounded-t-lg bg-stone-700 hover:bg-stone-600 flex items-center justify-center"
              >
                <span className="text-stone-300 text-xs">▲</span>
              </button>
              <button
                onPointerDown={() => handleDpadDown('down')}
                onPointerUp={handleDpadUp}
                className="absolute bottom-0 w-9 h-10 rounded-b-lg bg-stone-700 hover:bg-stone-600 flex items-center justify-center"
              >
                <span className="text-stone-300 text-xs">▼</span>
              </button>
              <button
                onPointerDown={() => handleDpadDown('left')}
                onPointerUp={handleDpadUp}
                className="absolute left-0 w-10 h-9 rounded-l-lg bg-stone-700 hover:bg-stone-600 flex items-center justify-center"
              >
                <span className="text-stone-300 text-xs">◀</span>
              </button>
              <button
                onPointerDown={() => handleDpadDown('right')}
                onPointerUp={handleDpadUp}
                className="absolute right-0 w-10 h-9 rounded-r-lg bg-stone-700 hover:bg-stone-600 flex items-center justify-center"
              >
                <span className="text-stone-300 text-xs">▶</span>
              </button>
            </div>

            {/* Home / Zoom Button & Menu */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  sounds.playMenuClick();
                  onButtonCPress();
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow"
                title="Bouton Home : Zoom Rapide"
              >
                ZOOM HOME [Z]
              </button>

              <button
                onClick={() => {
                  sounds.playMenuClick();
                  onMenuPress();
                }}
                className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[10px] font-mono text-stone-300"
              >
                MENU
              </button>
            </div>

            {/* Buttons A & B */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => {
                    sounds.playMenuClick();
                    onButtonBPress();
                  }}
                  className="w-13 h-13 rounded-full bg-amber-600 hover:bg-amber-500 active:bg-amber-400 flex items-center justify-center font-bold text-white text-base shadow-[0_4px_0_#92400e]"
                >
                  B
                </button>
                <span className="text-[9px] font-retro text-stone-400">SAUT</span>
              </div>

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
                  className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-400 flex items-center justify-center font-bold text-white text-base shadow-[0_4px_0_#9f1239]"
                >
                  A
                </button>
                <span className="text-[9px] font-retro text-stone-400">TIRER</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
