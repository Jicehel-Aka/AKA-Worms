import React from 'react';
import { GameOptions } from '../types/game';
import { X, Volume2, VolumeX, Eye, Shield, Sliders, Music } from 'lucide-react';
import { sounds } from '../utils/audio';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: GameOptions;
  onChangeOptions: (newOpts: GameOptions) => void;
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
  isOpen,
  onClose,
  options,
  onChangeOptions,
}) => {
  if (!isOpen) return null;

  const update = <K extends keyof GameOptions>(key: K, val: GameOptions[K]) => {
    sounds.playMenuClick();
    const updated = { ...options, [key]: val };
    onChangeOptions(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 text-white max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Options de Combat & Affichage</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 my-5">
          {/* 1. Display Mode: Gamebuino AKA vs PC/Android */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              1. Mode d'Affichage & Console
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Gamebuino AKA (ESP32-S3 320x240) */}
              <button
                onClick={() => update('displayMode', 'gamebuino_aka')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  options.displayMode === 'gamebuino_aka'
                    ? 'border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-400/30'
                    : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold text-white">Console Gamebuino AKA</span>
                  <span className="text-[9px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40">ESP32-S3</span>
                </div>
                <span className="block text-[11px] text-slate-300 mt-1">
                  Écran natif 320 × 240 pixels (4:3)
                </span>
                <span className="block text-[9px] text-emerald-400/80 mt-0.5">
                  Châssis rétro avec D-pad & Zoom Rapide [Z]
                </span>
              </button>

              {/* PC / Android HD */}
              <button
                onClick={() => update('displayMode', 'pc_android')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  options.displayMode === 'pc_android'
                    ? 'border-sky-400 bg-sky-500/15 ring-2 ring-sky-400/30'
                    : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold text-white">Plein Écran HD</span>
                  <span className="text-[9px] font-mono font-bold text-sky-400 px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-500/40">PC/Android</span>
                </div>
                <span className="block text-[11px] text-slate-300 mt-1">
                  Panoramique Widescreen 16:9
                </span>
                <span className="block text-[9px] text-sky-400/80 mt-0.5">
                  Commandes tactiles & clavier complet
                </span>
              </button>
            </div>
          </div>

          {/* 2. Technical Settings */}
          <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-3">
            <span className="block text-xs font-bold text-white">
              Options Techniques & Rendu
            </span>

            {/* Framerate selector */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-300 block font-medium">
                  Taux de rafraîchissement (FPS) :
                </span>
                <span className="text-[10px] text-slate-400 block">
                  60 FPS pour fluidité maximale sur ESP32-S3 / PC
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[30, 60].map((fps) => (
                  <button
                    key={fps}
                    onClick={() => update('fpsLimit', fps as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      options.fpsLimit === fps
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>

            {/* RGB565 16-bit Color Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs text-slate-300 block font-medium">
                  Rendu Couleur RGB565 16-bit
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Simule le rendu 16-bit plein RGB565 des écrans Gamebuino
                </span>
              </div>
              <button
                onClick={() => update('rgb565Mode', !options.rgb565Mode)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  options.rgb565Mode ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Scanlines Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs text-slate-300 block font-medium">
                  Grille de Pixels & Scanlines
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Effet de balayage écran console
                </span>
              </div>
              <button
                onClick={() => update('retroFilter', !options.retroFilter)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  options.retroFilter ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Enhanced Graphics Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs text-slate-300 block font-medium">
                  Effets Visuels Avancés
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Particules d'ambiance (pollen, braises), ondes de choc & reflets
                </span>
              </div>
              <button
                onClick={() => update('enhancedGraphics', !options.enhancedGraphics)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  options.enhancedGraphics ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          {/* Style Graphique */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Style Graphique
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => update('graphicStyle', 'hd_cartoon')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-left ${
                  options.graphicStyle === 'hd_cartoon'
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="block text-xs font-bold">HD Cartoon Moderne</span>
                <span className="block text-[9px] text-slate-400 font-normal">Textures riches & dégradés haute définition</span>
              </button>
              <button
                onClick={() => update('graphicStyle', 'retro_aka')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-left ${
                  options.graphicStyle === 'retro_aka'
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="block text-xs font-bold">Pixel-Art AKA (320×240)</span>
                <span className="block text-[9px] text-slate-400 font-normal">Rendu rétro net & contrasté pour écran AKA</span>
              </button>
            </div>
          </div>

          {/* 3. Turn Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Durée du tour (Secondes)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[20, 30, 45, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => update('turnDuration', sec)}
                  className={`py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                    options.turnDuration === sec
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* 4. Worms HP */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Points de Vie Initiaux des Vers
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[50, 100, 150].map((hp) => (
                <button
                  key={hp}
                  onClick={() => update('wormHp', hp)}
                  className={`py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                    options.wormHp === hp
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {hp} HP
                </button>
              ))}
            </div>
          </div>

          {/* 5. Wind Intensity */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Force et influence du vent
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['none', 'low', 'normal', 'high'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => update('windEffect', w)}
                  className={`py-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
                    options.windEffect === w
                      ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {w === 'none' ? 'Sans vent' : w === 'low' ? 'Léger' : w === 'normal' ? 'Normal' : 'Tempête'}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Sound Effects Volume */}
          <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {options.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                <span>Bruitages Sonores Rétro (SFX)</span>
              </span>
              <button
                onClick={() => {
                  const n = !options.soundEnabled;
                  sounds.setMuted(!n);
                  update('soundEnabled', n);
                }}
                className="text-xs text-amber-400 underline font-semibold"
              >
                {options.soundEnabled ? 'Désactiver' : 'Activer'}
              </button>
            </div>
            {options.soundEnabled && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={options.volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  sounds.setVolume(v);
                  update('volume', v);
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            )}
          </div>

          {/* 7. Background Chiptune Music (BGM) */}
          <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Music className="w-4 h-4 text-amber-400" />
                <span>Musique Chiptune 8-Bit (BGM)</span>
              </span>
              <button
                onClick={() => {
                  const n = !options.musicEnabled;
                  sounds.setMusicMuted(!n);
                  update('musicEnabled', n);
                }}
                className="text-xs text-amber-400 underline font-semibold"
              >
                {options.musicEnabled ? 'Couper' : 'Activer'}
              </button>
            </div>

            {/* Track Selector */}
            <div className="space-y-1.5 mt-2.5">
              <span className="text-[11px] font-medium text-slate-400 block">
                Piste musicale :
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 0, name: 'Marche Militaire des Vers AKA', bpm: '125 BPM', desc: 'Thème héroïque & espiègle Worms' },
                  { id: 1, name: 'Suspense & Stratégie Gamebuino', bpm: '110 BPM', desc: 'Arpèges de visée tactique' },
                  { id: 2, name: 'Adrénaline & Détonation', bpm: '140 BPM', desc: 'Rythme d\'action chiptune rapide' },
                ].map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      sounds.setTrack(track.id);
                      if (options.musicEnabled) {
                        sounds.startMusic(track.id);
                      }
                      update('musicTrack', track.id);
                    }}
                    className={`p-2 rounded-xl border text-left text-xs flex items-center justify-between transition-all ${
                      options.musicTrack === track.id
                        ? 'border-amber-400 bg-amber-500/20 text-white font-semibold'
                        : 'border-slate-800/80 bg-slate-900/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <span className="block">{track.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{track.desc}</span>
                    </div>
                    <span className="font-mono text-[10px] text-amber-400/80 shrink-0">{track.bpm}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Music Volume slider */}
            {options.musicEnabled && (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Volume Musique</span>
                  <span className="font-mono">{Math.round(options.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={options.musicVolume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    sounds.setMusicVolume(v);
                    update('musicVolume', v);
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Fermer et Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};
