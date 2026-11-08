import React from 'react';
import { X, Keyboard, Smartphone, Gamepad2, ZoomIn, ZoomOut, Target } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 text-white max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Guide & Commandes de Jeu</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 my-5">
          {/* Zoom System Highlight */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
              <ZoomIn className="w-4 h-4" />
              <span>Système de Zooms Rapides (Touche [Z] ou Bouton Radar)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pour jouer de manière optimale sur un petit écran de console Gamebuino AKA ou sur smartphone Android :
            </p>
            <ul className="text-xs text-slate-400 mt-2 space-y-1 list-disc list-inside">
              <li>
                <strong className="text-white">Vue Cible (1.45x) :</strong> Gros plan centré sur votre ver pour ajuster l'angle de tir précis au degré près et jauger les obstacles.
              </li>
              <li>
                <strong className="text-white">Vue Tactique Globale (0.45x) :</strong> Recul panoramique pour visualiser toute la carte, repérer tous les vers ennemis, observer la force du vent et anticiper les tirs paraboliques.
              </li>
              <li>
                <strong className="text-white">Molette souris / Pincement :</strong> Ajustez le niveau de zoom librement entre 0.35x et 2.4x.
              </li>
            </ul>
          </div>

          {/* PC Windows Controls */}
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-2">
              <Keyboard className="w-4 h-4 text-sky-400" />
              <span>Contrôles Clavier PC (Windows / Web)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
                <span className="font-mono text-emerald-400 font-bold">Flèches ◄ / ►</span> ou <span className="font-mono text-emerald-400 font-bold">Q / D</span>
                <span className="block text-slate-400 mt-0.5">Déplacer le ver actif</span>
              </div>
              <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
                <span className="font-mono text-amber-400 font-bold">Flèches ▲ / ▼</span> ou <span className="font-mono text-amber-400 font-bold">Z / S</span>
                <span className="block text-slate-400 mt-0.5">Régler l'angle de visée</span>
              </div>
              <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
                <span className="font-mono text-rose-400 font-bold">Barre d'Espace (Maintenir)</span>
                <span className="block text-slate-400 mt-0.5">Charger la puissance et tirer</span>
              </div>
              <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
                <span className="font-mono text-emerald-400 font-bold">Entrée</span>
                <span className="block text-slate-400 mt-0.5">Sauter par-dessus un obstacle</span>
              </div>
              <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
                <span className="font-mono text-cyan-400 font-bold">Touche [Z]</span>
                <span className="block text-slate-400 mt-0.5">Bascule Zoom Rapide In/Out</span>
              </div>
              <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
                <span className="font-mono text-purple-400 font-bold">Touche [E] / Clic Arme</span>
                <span className="block text-slate-400 mt-0.5">Ouvrir le panneau d'armes</span>
              </div>
            </div>
          </div>

          {/* Android Mobile & Touch */}
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Contrôles Tactiles (Téléphone Android & Tablette)</span>
            </div>
            <p className="text-xs text-slate-400">
              Des boutons tactiles virtuels sont affichés en bas de l'écran : le D-Pad à gauche pour marcher et viser, et les boutons d'action au centre pour sauter, ouvrir l'arsenal et charger le tir en restant appuyé sur le bouton <strong>TIRER</strong>.
            </p>
          </div>

          {/* Gamebuino AKA Mode */}
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-1">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>Console Gamebuino AKA (ESP32-S3 · 320 × 240)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Console animée par un microcontrôleur <strong>ESP32-S3</strong> avec écran couleur <strong>320 × 240 pixels (4:3)</strong>. Le bouton <strong>Zoom Rapide [Z]</strong> est indispensable pour jauger à la fois la trajectoire globale du terrain (zoom arrière 0.45x) et la visée chirurgicale (zoom avant 1.6x). Supporte le jeu en direct avec PC et Android via Wi-Fi P2P.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors"
          >
            Compris, retour au jeu
          </button>
        </div>
      </div>
    </div>
  );
};
