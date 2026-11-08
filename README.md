# 🪱 Worms AKA Battle — Artillerie tactique à 2 joueurs

Jeu d'artillerie au tour par tour style **Worms** pour 2 joueurs, avec terrain destructible en temps réel. Développé pour la communauté **Gamebuino**.

Le dépôt contient **deux versions du jeu** :

- **le portage natif** (`aka/`) : moteur C++ partagé, qui tourne sur la console **Gamebuino AKA** (ESP-IDF) et sur **PC Windows / Linux** (SDL2). C'est la version des releases.
- **le prototype web** (`src/`, React 19 + Canvas 2D + Vite) : d'où viennent les règles, les armes et les cartes. Il simule l'écran de la console dans le navigateur et peut être emballé dans Electron.

Une version Gamebuino META a été étudiée puis abandonnée (32 Ko de RAM, ce serait un projet à part).

---

## 📦 État des plateformes

| Plateforme | État | Détail |
| :--- | :---: | :--- |
| **Gamebuino AKA** | 🧪 à tester | Firmware ESP-IDF + dossier carte SD `WORMS/`. Construit par le workflow, **pas encore testé sur une console**. |
| **PC Windows** | 🧪 à tester | Version native SDL2 (`worms.exe` + `SDL2.dll`), `.zip` |
| **PC Linux** | 🧪 à tester | Version native SDL2, `.tar.gz` (nécessite `libsdl2`) |
| **Navigateur (PC / mobile)** | ✅ | Prototype web : `bun run dev` ou `bun run build`, commandes tactiles intégrées |
| **Electron (prototype web)** | ✅ | `.exe` / `.AppImage`, uniquement si l'option « include_web_desktop » est cochée à la release |

### Modes de jeu (version native)

| Mode | AKA / PC natif | Prototype web |
| :--- | :---: | :---: |
| **Passe & Joue** (2 joueurs, même écran, tour à tour) | ✅ | ✅ |
| **Solo contre l'IA** (3 niveaux : Novice, Arcade, Maître) | ✅ | ✅ |
| **En ligne** | ❌ pas prévu | ⚠️ expérimental, non jouable |

> **Mode en ligne (prototype web)** : l'écran de salon et la connexion PeerJS existent, mais la partie n'est pas jouable de bout en bout. Seuls la visée, le saut et le choix d'arme sont envoyés ; le tir, la marche, la fin de tour ne le sont pas, et l'invité ignore la configuration envoyée par l'hôte. À terminer avant de l'annoncer.

### Version native : ce qui est porté

Monde de **800 × 450** (moitié du prototype, mêmes trajectoires), 5 cartes, 11 armes avec leurs dégâts d'origine, vent, chrono de tour, noyade, mort subite après 40 tours, 1 à 4 vers par équipe, PV 50/100/150. Interface en **5 langues** (FR, EN, DE, ES, IT), conforme au standard AKA : écran-titre, menus, règles, commandes, options, pause, capture d'écran, retour au loader.

Pas portés : le mode en ligne, la minimap radar, les 3 pistes musicales du prototype (la console joue sa propre musique synthétisée), le filtre rétro LCD.

---

---

## 🌟 Fonctionnalités (prototype web)

- **Terrain destructible** : cratères irréguliers creusés dans un canvas 1600 × 900 (`globalCompositeOperation = 'destination-out'`), projection de particules, eau mortelle en bas de carte. Boucle de rendu plafonnée à 25 / 50 / 60 FPS (option).
- **5 cartes** : Îles, Canyon, Forteresse, Volcan, Procédurale.
- **Zoom rapide** : bascule entre la **vue cible (×1.45)** centrée sur votre ver et la **vue tactique (×0.45)** sur toute la carte. Molette ou pincement tactile de ×0.35 à ×2.4. Minimap radar cliquable pour déplacer la caméra.
- **Arsenal de 11 armes** : Bazooka, Grenade (minuterie 1 à 5 s), Bombe à fragmentation, Super Banane AKA, Bâton de dynamite, Sainte Grenade, Fusil à pompe, Frappe aérienne, Téléporteur, Jetpack, Passer le tour.
- **Moteur chiptune 8 bits (Web Audio)** : 3 pistes (*Marche Militaire des Vers AKA*, *Suspense & Stratégie Gamebuino*, *Adrénaline & Détonation*) et bruitages synthétisés.
- **Hors ligne** : polices et assets embarqués, aucune requête externe (hors mode en ligne).
- **Réglages** : durée du tour (20 à 90 s), 1 à 4 vers par équipe, PV (50/100/150), vent, filtre rétro LCD / RGB565.
- **Galerie du prototype** : explorateur des 5 cartes (zoom, caméra, cratères d'essai au clic) et studio d'animations des vers (repos, marche, saut, visée, tir, blessé, victoire, tombe ; 11 armes, chapeaux, bruitages).
- **Style graphique au choix** (Options) : « HD Cartoon » ou « Pixel-Art AKA 320×240 » (rendu interne 640 × 480, mise à l'échelle entière ×2).
- **Décor riche** : strates géologiques (humus, argile, basalte, filons), herbe détaillée, fleurs et champignons, lianes, ponts de corde, vent chargé de graines et de feuilles, braises et fumée sur le volcan, secousse d'écran et ondes de choc.

---

## 🎮 Commandes

| Action | Console AKA | Clavier (PC natif) | Prototype web |
| :--- | :--- | :--- | :--- |
| **Marcher** | D-Pad `◀ ▶` | `◄ ►` ou `A / D` (QWERTY) | `◄ ►` ou `A / D` |
| **Viser** | D-Pad `▲ ▼` | `▲ ▼` ou `W / S` | `▲ ▼` ou `W / S` |
| **Tirer (puissance)** | maintenir `A`, relâcher pour tirer | maintenir `J` / `Entrée` / `Espace` | maintenir `Espace` |
| **Sauter** | `B` | `K` / `Retour arrière` | `Entrée` |
| **Arsenal** | `C` (`▲ ▼` arme, `◀ ▶` minuterie, `A` valider) | `L` | `E` |
| **Zoom** (proche / carte entière) | `D` | `U` | touche `Z` du clavier QWERTY |
| **Pause** | `MENU` (appui long : capture d'écran) | `Échap` | — |
| **Retour au loader** | `RUN` + `MENU` (500 ms) | — | — |

Dynamite, Fusil, Frappe aérienne et Téléporteur se déclenchent par un simple appui sur `A`. Les touches de déplacement du web utilisent les **positions physiques** (`W A S D` QWERTY = `Z Q S D` AZERTY). Manette : A, B, X (arsenal), Y (zoom), Start, croix.

---

## 🛠️ Développement

### Tester sur la console AKA
1. Récupérer `Worms-AKA-Battle-<version>-AKA-SD.zip` dans les [Releases](https://github.com/Jicehel-Aka/AKA-Worms/releases) (ou le fabriquer, voir plus bas).
2. Décompresser **à la racine de la carte SD** : on obtient `WORMS/` avec `firmware.bin`, `meta.json`, `Picture.png` (320×240) et `screen.bmp` (160×120, 24 bits).
3. Lancer **Worms AKA Battle** depuis le loader. Les réglages et les captures vont dans `WORMS/` (`config.dat`, `capture_NNNN.bmp`).

### Construire le portage natif
```bash
# Tests PC (moteur + coquille rejouée par script, sans SDL ni matériel) : captures .ppm dans /tmp/worms_preview
sh aka/test/run_tests.sh

# Version PC SDL2 (Linux : sudo apt install libsdl2-dev ; Windows : MSYS2 + mingw-w64-x86_64-SDL2)
cmake -S aka/pc -B build-pc -G Ninja && cmake --build build-pc
./build-pc/worms --scale 3        # options : --fullscreen, --data DOSSIER

# Firmware console (ESP-IDF 5.4, cible esp32s3)
cd aka && idf.py set-target esp32s3 && idf.py build     # produit build/worms.bin
```
Le firmware doit rester **sous 0x330000 octets (3 342 336)** ; le workflow refuse un dépassement. Les textes sont générés par `python3 aka/tools/gen_i18n.py aka/main/shell` ; l'écran-titre par `aka/tools/gen_title.py <image> aka/main/assets/title.bin`.

### Prototype web
Prérequis : [Node.js](https://nodejs.org/) **20.19+ ou 22.12+** et [Bun](https://bun.sh/) (un `bun.lock` est fourni).
```bash
bun install
bun run dev        # http://localhost:3000
bun run lint       # vérification TypeScript
bun run build      # build web dans dist/
bun run desktop    # build + lancement dans Electron
bun run dist:win   # paquets Windows dans release/ (à lancer sous Windows)
bun run dist:linux # paquets Linux dans release/
```
Sous Linux, l'application Electron désactive le sandbox Chromium (nécessaire à l'AppImage sur Ubuntu 24.04+) ; elle ne charge que du contenu local, avec isolation du contexte et sans accès Node dans la page.

---

## 🚀 Publier une release

Dans GitHub : **Actions → Release → Run workflow**, saisir une version (`v1.0.0`, `v1.1.0-beta.1`…). Le workflow :

1. vérifie les types, le build web, puis les tests du moteur et de la coquille natifs ;
2. construit **PC Windows** (`.zip`, MSYS2 + SDL2) et **PC Linux** (`.tar.gz`, SDL2) à partir du code natif ;
3. construit **AKA** : firmware ESP-IDF (taille contrôlée) + dossier carte SD `WORMS/` ;
4. crée le tag et **une seule release** avec tous les fichiers.

Options : *pré-release*, *brouillon* (conseillé pour une première fois : relire avant publication), *include_web_desktop* (ajoute les paquets Electron du prototype web). Variable de dépôt optionnelle `IDF_VERSION` (défaut `v5.4`). Sans dossier `aka/`, le workflow retombe sur les paquets Electron.

---

## 📁 Architecture du code

```
├── aka/                         # Portage natif
│   ├── CMakeLists.txt           # Projet ESP-IDF (cible esp32s3)
│   ├── components/gamebuino/    # Bibliothèque Gamebuino AKA
│   ├── main/
│   │   ├── app_main.cpp         # Tâches : SysTask (CPU 0), GameTask (CPU 1), AudioTask
│   │   ├── core/                # graphics, input, audio (version console)
│   │   ├── shell/               # Coquille : menus, options, i18n (5 langues), sauvegarde
│   │   ├── games/worms/         # Moteur (worms.cpp), IA (ai.cpp), vue, module de jeu
│   │   └── tasks/
│   ├── pc/                      # Version PC SDL2 : remplace core/ et tasks/, partage le reste
│   ├── sd/WORMS/                # Dossier carte SD : meta.json, Picture.png, screen.bmp
│   ├── test/                    # Tests du moteur, aperçu de la coquille (.ppm)
│   └── tools/                   # gen_i18n.py, gen_title.py, gen_font.py
├── electron/main.cjs            # Fenêtre Electron (prototype web)
├── electron-builder.yml
├── .github/workflows/release.yml
├── index.html, package.json     # Prototype web (React 19, Tailwind v4, PeerJS)
└── src/                         # Prototype web : App.tsx, components/, utils/ (terrain, armes, IA, audio, réseau)
```

---

## 📜 Licence

Apache-2.0 (déclarée dans `package.json`). Le fichier `LICENSE` reste à ajouter au dépôt.
