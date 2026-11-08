import React, { useState } from 'react';
import { GameMode, MapPreset, Team, GameOptions } from '../types/game';
import {
  Users,
  Bot,
  Wifi,
  Play,
  Copy,
  Check,
  Gamepad2,
  Sparkles,
  Eye,
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface LobbyModalProps {
  isOpen: boolean;
  gameMode: GameMode;
  onSelectGameMode: (mode: GameMode) => void;
  teams: Team[];
  onUpdateTeams: (teams: Team[]) => void;
  options: GameOptions;
  onUpdateOptions: (options: GameOptions) => void;
  roomId: string;
  onJoinRoom: (code: string) => void;
  onStartGame: () => void;
  isConnectedPeer: boolean;
  onOpenGallery?: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  isOpen,
  gameMode,
  onSelectGameMode,
  teams,
  onUpdateTeams,
  options,
  onUpdateOptions,
  roomId,
  onJoinRoom,
  onStartGame,
  isConnectedPeer,
  onOpenGallery,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    sounds.playMenuClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateTeamName = (teamIndex: number, newName: string) => {
    const updated = [...teams];
    updated[teamIndex] = { ...updated[teamIndex], name: newName };
    onUpdateTeams(updated);
  };

  const handleUpdateTeamColor = (teamIndex: number, newColor: string) => {
    const updated = [...teams];
    updated[teamIndex] = {
      ...updated[teamIndex],
      color: newColor,
      worms: updated[teamIndex].worms.map((w) => ({ ...w, color: newColor })),
    };
    onUpdateTeams(updated);
  };

  const mapPresets: { id: MapPreset; name: string; desc: string }[] = [
    {
      id: 'islands',
      name: 'Îles Flottantes Gamebuino',
      desc: '4 îles célestes reliées par des ponts suspendus.',
    },
    {
      id: 'canyon',
      name: 'Canyon & Caverne',
      desc: 'Hautes falaises rocheuses et tunnels souterrains.',
    },
    {
      id: 'fortress',
      name: 'Château Fort AKA',
      desc: 'Tours de guet, créneaux en pierre et donjon.',
    },
    {
      id: 'volcano',
      name: 'Volcan & Lave',
      desc: 'Pentes de basalte noir et magma en fusion.',
    },
    {
      id: 'procedural',
      name: 'Générateur Aléatoire',
      desc: 'Terrain procédural inédit avec collines et cavités.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 text-white my-4">
        {/* Banner Artwork Header */}
        <div className="relative w-full h-36 md:h-44 rounded-2xl overflow-hidden mb-6 border border-slate-800 shadow-inner">
          <img
            src="/src/assets/images/worms_aka_banner_1794062277702.jpg"
            alt="Worms AKA Battle"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end p-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-retro text-xs text-emerald-400">GAMEBUINO AKA (ESP32-S3 · 320×240)</span>
                <span className="text-slate-400 text-xs">·</span>
                <span className="text-xs text-slate-300">PC & Android Cross-Play</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                WORMS AKA BATTLE
              </h1>
            </div>
          </div>
        </div>

        {/* 1. Game Mode Selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            1. Mode de Jeu 2 Joueurs
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Mode 1: Pass & Play */}
            <button
              onClick={() => {
                sounds.playMenuClick();
                onSelectGameMode('PASS_AND_PLAY');
              }}
              className={`flex flex-col items-center p-3.5 rounded-2xl border text-center transition-all ${
                gameMode === 'PASS_AND_PLAY'
                  ? 'border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-400/30'
                  : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800'
              }`}
            >
              <Users className="w-6 h-6 text-emerald-400 mb-1.5" />
              <span className="text-sm font-bold text-white">Passe & Joue</span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                2 joueurs sur le même écran (PC ou Mobile)
              </span>
            </button>

            {/* Mode 2: VS AI */}
            <button
              onClick={() => {
                sounds.playMenuClick();
                onSelectGameMode('VS_AI');
              }}
              className={`flex flex-col items-center p-3.5 rounded-2xl border text-center transition-all ${
                gameMode === 'VS_AI'
                  ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/30'
                  : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800'
              }`}
            >
              <Bot className="w-6 h-6 text-amber-400 mb-1.5" />
              <span className="text-sm font-bold text-white">Solo contre IA</span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Entraînement contre le robot Gamebuino
              </span>
            </button>

            {/* Mode 3: Online Cross-Play */}
            <button
              onClick={() => {
                sounds.playMenuClick();
                onSelectGameMode('ONLINE_HOST');
              }}
              className={`flex flex-col items-center p-3.5 rounded-2xl border text-center transition-all ${
                gameMode === 'ONLINE_HOST' || gameMode === 'ONLINE_JOIN'
                  ? 'border-sky-400 bg-sky-500/15 ring-2 ring-sky-400/30'
                  : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800'
              }`}
            >
              <Wifi className="w-6 h-6 text-sky-400 mb-1.5" />
              <span className="text-sm font-bold text-white">En Ligne P2P</span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Cross-Play PC &harr; Android &harr; Gamebuino
              </span>
            </button>
          </div>

          {/* Online Room Code Box */}
          {(gameMode === 'ONLINE_HOST' || gameMode === 'ONLINE_JOIN') && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-sky-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-slate-400 block">
                  Code de Salon Partagé :
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xl font-extrabold text-sky-400 tracking-wider">
                    {roomId || 'CHARGEMENT...'}
                  </span>
                  <button
                    onClick={copyRoomCode}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1"
                    title="Copier le code"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié!' : 'Copier'}</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-500">
                  {isConnectedPeer
                    ? '✓ 2ème appareil connecté et synchronisé!'
                    : 'En attente de connexion de l\'autre appareil (PC ou téléphone)...'}
                </span>
              </div>

              {/* Join input for player 2 */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="CODE (EX: AKA-42)"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 uppercase w-36"
                />
                <button
                  onClick={() => {
                    sounds.playMenuClick();
                    onJoinRoom(joinCodeInput);
                  }}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow transition-colors"
                >
                  Rejoindre
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Teams Configuration */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            2. Équipes & Joueurs
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team, idx) => (
              <div
                key={team.id}
                className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/80 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-retro text-slate-400">
                    ÉQUIPE #{team.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6'].map((col) => (
                      <button
                        key={col}
                        onClick={() => handleUpdateTeamColor(idx, col)}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          team.color === col ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  value={team.name}
                  onChange={(e) => handleUpdateTeamName(idx, e.target.value)}
                  className="px-3 py-1.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                />

                <div className="text-[11px] text-slate-400 font-mono">
                  Membres: {team.worms.map((w) => w.name).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Map Preset Selection */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            3. Choix de la Carte & Relief
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {mapPresets.map((mp) => {
              const isSelected = options.mapPreset === mp.id;
              return (
                <button
                  key={mp.id}
                  onClick={() => {
                    sounds.playMenuClick();
                    onUpdateOptions({ ...options, mapPreset: mp.id });
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/30'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-xs font-bold text-white truncate">
                    {mp.name}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1 line-clamp-2">
                    {mp.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Game Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            {onOpenGallery && (
              <button
                onClick={() => {
                  sounds.playMenuClick();
                  onOpenGallery();
                }}
                className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-2xl text-xs font-bold transition-all shadow hover:border-emerald-500/50"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Explorateur des Cartes & Vers</span>
              </button>
            )}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>Zoom Rapide [Z]</span>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playMenuClick();
              onStartGame();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>LANCER LA PARTIE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
