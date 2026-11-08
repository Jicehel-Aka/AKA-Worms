# 🪱 Worms AKA Battle — 2 Players Artillery Game

> Jeu d'artillerie tactique multijoueur 2 joueurs style **Worms**, spécialement optimisé pour la console **Gamebuino AKA (ESP32-S3 · 320×240)**, ainsi que **PC Windows** et **smartphones Android** avec zooms rapides, studio d'animations des vers, explorateur de cartes et terrain destructible en temps réel.

---

## 🌟 Points Clés & Caractéristiques

- **Studio & Galerie Interactive des Cartes et Animations des Vers** :
  - **Explorateur des Cartes** : Visualisez et inspectez en plein écran les 5 cartes du jeu (*Îles Flottantes AKA*, *Canyon & Caverne*, *Château Fort AKA*, *Volcan & Lave*, *Générateur Aléatoire*). Vous pouvez zoomer, déplacer la caméra et même **tester des cratères d'explosion en direct** d'un simple clic !
  - **Studio d'Animations des Vers** : Inspectez en haute résolution (zoom 2x à 8x) toutes les animations du ver (*repos, marche, saut, visée dynamique à 360°, tir avec recul, dégâts/blessé, victoire, tombe R.I.P.*). Vous pouvez changer son arme tenue en main parmi les 11 disponibles, changer de chapeau (bandana AKA, casque, couronne, béret) et tester les bruitages audio en temps réel.
- **Graphismes Haute-Fidélité & Résolution Native Intelligente** :
  - **Gamebuino AKA (ESP32-S3)** : Rendu interne à résolution 4:3 native nette en **640 × 480** (mise à l'échelle entière 2x exacte de 320 × 240) avec `image-rendering: pixelated`, évitant tout flou d'interpolation ou étirement anormal.
  - **Vers de Terre Animés & Expressifs** : Corps segmenté 3D avec dégradé ombré, yeux grands ouverts dont les pupilles suivent la visée au degré près, respiration animée, bandanas et casques d'équipe, et arme visible tenue en main (Bazooka, Grenade, Banane dorée, Sainte Grenade étincelante, etc.).
  - **Stratigraphie Géologique & Végétation Riche** : Terre stratifiée en multiples couches (humus, argile, roche basaltique, filons d'or et cristaux), herbe 3D avec brins d'herbe détaillés, marguerites sauvages et amanites tue-mouches, racines et lianes suspendues, ponts de cordes et dalles de bois.
  - **Atmosphère & Particules Dynamiques** : Vent soufflant des graines de pissenlits et feuilles flottantes, braises ardentes et fumée sur le volcan, poussières de canyon.
  - **Eau Tropicale & Lave Magmatique Animées** : Vagues à double couche avec crêtes d'écume blanche scintillante ou cratère de lave bouillonnante.
  - **Pêche Visuelle & Impacts** : Secousse d'écran (*screen shake*) à chaque détonation, ondes de choc circulaires expansives lumineuses, et éjection de mottes de terre et débris.
- **Système de Zoom Rapide Optimisé (`Z` / Bouton Dédié)** :
  - **Vue Cible (1.6x)** : Gros plan centré sur votre ver pour ajuster l'angle de visée au degré près et observer les obstacles.
  - **Vue Tactique Globale (0.45x)** : Recul panoramique pour contempler la carte entière (1600 × 900), visualiser les positions de tous les vers ennemis et jauger la force du vent.
  - **Zoom fluide** à la molette ou par pincement tactile sur mobile (de 0.35x à 2.4x).
  - **Minimap Radar interactive** : Cliquez ou appuyez n'importe où sur le radar pour déplacer la caméra instantanément.
- **Sélecteur de Style Graphique dans les Options** :
  - **HD Cartoon Moderne** : Rendu moderne riche avec dégradés, reflets et textures fluides.
  - **Pixel-Art Spécial AKA (320×240)** : Rendu rétro contrasté aux contours nets taillé pour l'écran de l'AKA.
- **3 Modes de Jeu à 2 Joueurs** :
  - **Passe & Joue** : Affrontement à tour de rôle sur un même écran.
  - **En Ligne P2P (Code de Salon)** : Connexion directe sans serveur lourd via WebRTC (PeerJS) et BroadcastChannel entre un PC et un téléphone ou une console.
  - **Solo contre IA** : Entraînement contre le robot Gamebuino avec calcul balistique et compensation du vent.
- **Arsenal Complet** : Bazooka, Grenade (minuterie 1 à 5s), Bombe à Fragmentation, Super Banane AKA, Bâton de Dynamite, Sainte Grenade (*"HALLELUJAH!"*), Fusil à Pompe (tir direct perçant), Frappe Aérienne, Téléporteur, Jetpack et Passe-Tour.
- **Moteur Chiptune 8-bit Intégré (Web Audio API)** :
  - 3 pistes musicales chiptune composées en temps réel (*Marche Militaire des Vers AKA*, *Suspense & Stratégie*, *Adrénaline & Détonation*).
  - Bruitages 8-bit rétro : explosions, sifflements, rebonds, couinements de vers et fanfare triomphale de victoire.

---

## 🎮 Commandes de Jeu

| Action | Clavier PC Windows | Écran Tactile Android | Console Gamebuino AKA | Constante Librairie Gamebuino |
| :--- | :--- | :--- | :--- | :--- |
| **Marcher** | `◄ / ►` ou `Q / D` | Boutons `◀ / ▶` virtuels | D-Pad `◀ / ▶` | `BUTTON_LEFT` / `BUTTON_RIGHT` |
| **Viser (Angle)** | `▲ / ▼` ou `Z / S` | Boutons `▲ / ▼` virtuels | D-Pad `▲ / ▼` | `BUTTON_UP` / `BUTTON_DOWN` |
| **Tirer (Puissance)** | Maintenir `Espace` | Maintenir `TIRER` | Maintenir Bouton `A` | `BUTTON_A` |
| **Sauter** | Touche `Entrée` | Bouton `SAUT` | Bouton `B` | `BUTTON_B` |
| **Zoom Rapide** | Touche `Z` | Bouton `Vue Cible / Tactique` | Bouton Dédié `Zoom Rapide` | Touche Fonction / `Z` |
| **Ouvrir l'Arsenal**| Touche `E` ou clic arme | Clic sur l'icône arme | Bouton `Menu` | `BUTTON_MENU` |

---

## 🛠️ Installation & Lancement Local

### Prérequis
- [Node.js](https://nodejs.org/) version 18 ou supérieure
- `npm` ou `yarn` / `bun`

### Installation
```bash
git clone https://github.com/Jicehel-Aka/Iron-Turnament.git
cd Iron-Turnament
npm install
```

### Lancement en Développement
```bash
npm run dev
```
Ouvrez ensuite votre navigateur sur `http://localhost:3000`.

### Compilation Production
```bash
npm run build
npm run preview
```

---

## 📁 Architecture du Code

```
├── index.html                   # Point d'entrée avec polices et métadonnées
├── metadata.json                # Configuration et permissions AI Studio
├── package.json                 # Dépendances (React 19, Tailwind v4, PeerJS, canvas-confetti)
├── src/
│   ├── App.tsx                  # Orchestrateur d'états, boucles de tours, entrées
│   ├── index.css                # Styles globaux, scanlines LCD, filtres RGB565
│   ├── main.tsx                 # Montage React DOM
│   ├── types/
│   │   └── game.ts              # Modèles TypeScript (Worm, Team, Weapons, GameOptions)
│   ├── components/
│   │   ├── GameCanvas.tsx       # Moteur de rendu 60fps, physique, caméra et radar
│   │   ├── GamebuinoChassis.tsx # Châssis des 2 consoles (AKA ESP32-S3 & META ATSAMD21)
│   │   ├── HUD.tsx              # Interface de jeu tactique, boutons de zoom, vent, chrono
│   │   ├── WeaponSelector.tsx   # Modal de sélection d'armes et minuteur de grenade
│   │   ├── LobbyModal.tsx       # Configuration du match, 2 joueurs, cartes, équipes
│   │   ├── OptionsModal.tsx     # Réglages d'affichage, FPS (25/50/60), son, musique
│   │   ├── HelpModal.tsx        # Guide complet des commandes matérielles
│   │   └── VictoryModal.tsx     # Écran de fin de partie avec confettis et fanfare
│   └── utils/
│       ├── audio.ts             # Synthétiseur Web Audio 8-bit (SFX + 3 pistes BGM)
│       ├── terrain.ts           # Moteur de relief destructible (1600x900) & cratères
│       ├── weapons.ts           # Définitions des armes, dégâts et rayons de déflagration
│       ├── ai.ts                # Intelligence artificielle (balistique & compensation vent)
│       └── network.ts           # Synchronisation multijoueur P2P WebRTC / BroadcastChannel
```

---

## 📜 Licence

Projet open-source sous licence **Apache-2.0**. Développé pour la communauté **Gamebuino**.
