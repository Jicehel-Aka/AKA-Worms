# 🪱 Worms AKA Battle — Artillerie tactique à 2 joueurs

Jeu d'artillerie au tour par tour style **Worms** pour 2 joueurs, avec terrain destructible en temps réel. Développé pour la communauté **Gamebuino**.

Le jeu est actuellement une application web (React 19 + Canvas 2D + Vite). Les versions **PC Windows / Linux** sont obtenues en l'emballant dans Electron. Les versions natives **Gamebuino AKA** et **Gamebuino META** sont les cibles du projet mais **ne sont pas encore écrites** : le jeu simule pour l'instant leurs écrans (châssis, 320×240 et 160×128, 25/50/60 FPS) dans le navigateur.

---

## 📦 État des plateformes

| Plateforme | État | Détail |
| :--- | :---: | :--- |
| **PC Windows** | ✅ | `.exe` portable + `.zip` (Electron), voir [Releases](https://github.com/Jicehel-Aka/AKA-Worms/releases) |
| **PC Linux** | ✅ | `.AppImage` + `.tar.gz` (Electron) |
| **Navigateur (PC / mobile)** | ✅ | `npm run dev` ou `npm run build`, commandes tactiles intégrées. Pas d'APK Android. |
| **Gamebuino AKA** | 🚧 | Portage natif ESP-IDF à écrire (dossier `aka/`). Le workflow le construit dès qu'il existe. |
| **Gamebuino META** | 🚧 | Portage natif Arduino à écrire (dossier `meta/`). Le workflow le construit dès qu'il existe. |

### Modes de jeu

| Mode | PC / Web | AKA (cible) | META (cible) |
| :--- | :---: | :---: | :---: |
| **Passe & Joue** (2 joueurs, même écran, tour à tour) | ✅ | prévu | prévu (terrain réduit) |
| **Solo contre IA** (calcul balistique + vent) | ✅ | prévu | prévu (IA simplifiée) |
| **En ligne P2P** (code de salon) | ⚠️ expérimental | possible via Wi-Fi | ❌ pas de Wi-Fi |

> **Mode en ligne** : l'écran de salon et la connexion PeerJS existent, mais la partie n'est pas jouable de bout en bout. Seuls la visée, le saut et le choix d'arme sont envoyés ; le tir, la marche, la fin de tour ne le sont pas, et l'invité ignore la configuration envoyée par l'hôte (cartes, positions des vers et vent tirés au hasard de chaque côté). `BroadcastChannel` ne sert qu'à tester entre deux onglets du même navigateur. À terminer avant de l'annoncer.

### Contraintes du portage natif

- **AKA (ESP32-S3, 320×240, PSRAM)** : la carte 1600×900 tient en mémoire (1 octet/pixel ≈ 1,4 Mo, ou 180 Ko en masque 1 bit). Le firmware doit rester **sous 0x330000 octets (3 342 336)**.
- **META (SAMD21, 32 Ko de RAM, 256 Ko de flash, 160×128)** : carte à réduire fortement (masque 1 bit basse résolution), pas de réseau, nombre d'armes et de particules à limiter.

---

## 🌟 Fonctionnalités

- **Terrain destructible** : cratères irréguliers creusés dans un canvas 1600 × 900 (`globalCompositeOperation = 'destination-out'`), projection de particules, eau mortelle en bas de carte. Boucle de rendu plafonnée à 25 / 50 / 60 FPS (option).
- **5 cartes** : Îles, Canyon, Forteresse, Volcan, Procédurale.
- **Zoom rapide** : bascule entre la **vue cible (×1.45)** centrée sur votre ver et la **vue tactique (×0.45)** sur toute la carte. Molette ou pincement tactile de ×0.35 à ×2.4. Minimap radar cliquable pour déplacer la caméra.
- **Arsenal de 11 armes** : Bazooka, Grenade (minuterie 1 à 5 s), Bombe à fragmentation, Super Banane AKA, Bâton de dynamite, Sainte Grenade, Fusil à pompe, Frappe aérienne, Téléporteur, Jetpack, Passer le tour.
- **Moteur chiptune 8 bits (Web Audio)** : 3 pistes (*Marche Militaire des Vers AKA*, *Suspense & Stratégie Gamebuino*, *Adrénaline & Détonation*) et bruitages synthétisés.
- **Hors ligne** : polices et assets embarqués, aucune requête externe (hors mode en ligne).
- **Réglages** : durée du tour (20 à 90 s), 1 à 4 vers par équipe, PV (50/100/150), vent, filtre rétro LCD / RGB565.

---

## 🎮 Commandes

Les touches de déplacement/visée utilisent les **positions physiques** des touches : `W A S D` sur clavier QWERTY correspondent à `Z Q S D` sur clavier AZERTY.

| Action | Clavier | Écran tactile | Console AKA / META (cible) |
| :--- | :--- | :--- | :--- |
| **Marcher** | `◄ ►` ou `A / D` (QWERTY) = `Q / D` (AZERTY) | boutons `◀ ▶` | D-Pad `◀ ▶` |
| **Viser** | `▲ ▼` ou `W / S` (QWERTY) = `Z / S` (AZERTY) | boutons `▲ ▼` | D-Pad `▲ ▼` |
| **Tirer (puissance)** | maintenir `Espace` | maintenir `TIRER` | maintenir `A` |
| **Sauter** | `Entrée` | `SAUT` | `B` |
| **Zoom rapide** | touche `Z` du clavier QWERTY (= touche `W` d'un AZERTY) | bouton `Zoom In / Zoom Out` | bouton `C` (comme sur le châssis simulé) |
| **Arsenal** | `E` ou clic sur l'arme | icône d'arme | `MENU` |

> Sur un clavier AZERTY, la touche étiquetée `Z` sert à viser vers le haut ; le zoom est sur la touche étiquetée `W`.

---

## 🛠️ Développement

### Prérequis
- [Node.js](https://nodejs.org/) **20.19+ ou 22.12+** (exigé par Vite 8)
- [Bun](https://bun.sh/) (un `bun.lock` est fourni ; `npm install` fonctionne aussi mais ignore ce fichier)

### Lancer en local
```bash
git clone https://github.com/Jicehel-Aka/AKA-Worms.git
cd AKA-Worms
bun install
bun run dev        # http://localhost:3000
```

### Commandes utiles
```bash
bun run lint       # vérification TypeScript
bun run build      # build web dans dist/
bun run desktop    # build + lancement dans Electron
bun run dist:win   # paquets Windows dans release/ (à lancer sous Windows)
bun run dist:linux # paquets Linux dans release/
```

### Linux : sandbox
L'application Electron désactive le sandbox Chromium sous Linux (indispensable pour l'AppImage sur Ubuntu 24.04+). Elle ne charge que du contenu local embarqué, avec isolation du contexte et sans accès Node dans la page.

---

## 🚀 Publier une release

Dans GitHub : **Actions → Release → Run workflow**, saisir une version (`v1.0.0`, `v1.1.0-beta.1`…). Le workflow :

1. vérifie les types et le build web ;
2. construit **PC Windows** (`.exe` portable + `.zip`) et **PC Linux** (`.AppImage` + `.tar.gz`) ;
3. construit **AKA** si `aka/CMakeLists.txt` existe, **META** si `meta/` contient un sketch `.ino` ;
4. crée le tag et une seule release avec tous les fichiers.

Les portages absents sont signalés dans les notes de release.

### Attendus pour les portages natifs

- **AKA** (`aka/`) : projet ESP-IDF (cible `esp32s3`) utilisant le composant `gamebuino`, et le dossier carte SD `aka/sd/Worms/` contenant `meta.json`, `Picture.png`, `screen.bmp` et les assets du jeu. Le workflow ajoute `firmware.bin` et refuse un firmware dépassant 3 342 336 octets. Variable de dépôt optionnelle `IDF_VERSION` (défaut `v5.4`).
- **META** (`meta/`) : sketch Arduino (`meta/<nom>/<nom>.ino`) compilé avec le core et la bibliothèque *Gamebuino META*. Fichiers optionnels de la carte SD dans `meta/sd/`. Livré sous `WORMS/WORMS.BIN`.

---

## 📁 Architecture du code

```
├── index.html                   # Point d'entrée
├── electron/main.cjs            # Fenêtre Electron (versions PC)
├── electron-builder.yml         # Paquets Windows / Linux
├── .github/workflows/release.yml# Release à la demande (PC, AKA, META)
├── metadata.json                # Métadonnées AI Studio (origine du prototype)
├── package.json                 # React 19, Tailwind v4, PeerJS, Electron
├── src/
│   ├── App.tsx                  # États, tours de jeu, entrées clavier, réseau
│   ├── index.css                # Styles globaux, scanlines LCD, filtre RGB565
│   ├── main.tsx                 # Montage React + polices embarquées
│   ├── assets/images/           # Bannière
│   ├── types/game.ts            # Types (Worm, Team, armes, options)
│   ├── components/
│   │   ├── GameCanvas.tsx       # Rendu, physique, caméra, radar
│   │   ├── GamebuinoChassis.tsx # Châssis simulés AKA et META
│   │   ├── HUD.tsx              # Interface de jeu, zoom, vent, chrono
│   │   ├── WeaponSelector.tsx   # Choix d'arme et minuterie
│   │   ├── LobbyModal.tsx       # Configuration du match
│   │   ├── OptionsModal.tsx     # Affichage, FPS, son, musique
│   │   ├── HelpModal.tsx        # Aide des commandes
│   │   └── VictoryModal.tsx     # Fin de partie
│   └── utils/
│       ├── audio.ts             # Synthé Web Audio 8 bits
│       ├── terrain.ts           # Terrain destructible 1600×900
│       ├── weapons.ts           # Définition des armes
│       ├── ai.ts                # IA balistique
│       └── network.ts           # PeerJS / BroadcastChannel
```

---

## 📜 Licence

Apache-2.0 (déclarée dans `package.json`). Le fichier `LICENSE` reste à ajouter au dépôt.
