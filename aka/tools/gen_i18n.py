#!/usr/bin/env python3
"""
 gen_i18n.py — Textes de Worms AKA Battle (5 langues latines)

 Regles : lignes de 38 colonnes max, barres d'aide 40 max, menus < 30 colonnes.
 Genere main/shell/i18n.h et i18n.cpp :  python3 tools/gen_i18n.py main/shell
"""
import os, sys

LANGS = ['fr', 'en', 'de', 'es', 'it']
LANG_NAMES = ['Français', 'English', 'Deutsch', 'Español', 'Italiano']

S = [
 ('TITLE',        "Worms AKA Battle",      "Worms AKA Battle",     "Worms AKA Battle",    "Worms AKA Battle",    "Worms AKA Battle"),
 ('SUBTITLE',     "Artillerie tactique",   "Tactical artillery",   "Taktische Artillerie","Artillería táctica",  "Artiglieria tattica"),
 ('PRESS_A',      "Appuyez sur A",         "Press A",              "Drücke A",            "Pulsa A",             "Premi A"),
 ('MODE_HOTSEAT', "Passe & Joue (2 joueurs)", "Pass & Play (2 players)", "Hot-Seat (2 Spieler)", "Pasa y Juega (2 jug.)", "Passa e Gioca (2 giocatori)"),
 ('MODE_VS_AI',   "Solo contre l'IA",      "Solo vs the AI",       "Solo gegen die KI",   "Solo contra la IA",   "Solo contro l'IA"),
 ('RULES',        "Règles du jeu",         "Rules",                "Spielregeln",         "Reglas",              "Regole"),
 ('CONTROLS',     "Commandes",             "Controls",             "Steuerung",           "Controles",           "Comandi"),
 ('OPTIONS',      "Options",               "Options",              "Optionen",            "Opciones",            "Opzioni"),
 ('QUIT',         "Quitter",               "Quit",                 "Beenden",             "Salir",               "Esci"),
 ('BACK',         "Retour",                "Back",                 "Zurück",              "Volver",              "Indietro"),
 ('RESUME',       "Reprendre",             "Resume",               "Weiter",              "Continuar",           "Riprendi"),
 ('QUIT_MATCH',   "Abandonner le match",   "Leave the match",      "Partie verlassen",    "Abandonar partida",   "Lascia la partita"),
 ('LEVEL',        "Niveau IA",             "AI level",             "KI-Stufe",            "Nivel IA",            "Livello IA"),
 ('LVL_1',        "Novice",                "Novice",               "Anfänger",            "Novato",              "Novizio"),
 ('LVL_2',        "Arcade",                "Arcade",               "Arcade",              "Arcade",              "Arcade"),
 ('LVL_3',        "Maître",                "Master",               "Meister",             "Maestro",             "Maestro"),
 ('LANG',         "Langue",                "Language",             "Sprache",             "Idioma",              "Lingua"),
 ('MUSIC',        "Musique",               "Music",                "Musik",               "Música",              "Musica"),
 ('SFX',          "Effets",                "Effects",              "Effekte",             "Efectos",             "Effetti"),
 ('ZOOM',         "Zoom",                  "Zoom",                 "Zoom",                "Zoom",                "Zoom"),
 ('FULLSCREEN',   "Plein écran",           "Fullscreen",           "Vollbild",            "Pantalla completa",  "Schermo intero"),
 ('CALIB',        "Recalibrer joystick",   "Recalibrate joystick", "Joystick kalibrieren","Calibrar joystick",   "Calibra joystick"),
 ('YES',          "OUI",                   "YES",                  "JA",                  "SI",                  "SI"),
 ('NO',           "NON",                   "NO",                   "NEIN",                "NO",                  "NO"),
 ('QUIT_CONFIRM', "Quitter le jeu ?",      "Quit the game?",       "Spiel beenden?",      "¿Salir del juego?",   "Uscire dal gioco?"),
 ('QUIT_MATCH_CONFIRM', "Abandonner ?",    "Give up?",             "Aufgeben?",           "¿Abandonar?",         "Abbandonare?"),
 ('THINKING',     "Réflexion",             "Thinking",             "Denkt",               "Pensando",            "Pensa"),
 ('MORE',         "Suite : bas",           "More: down",           "Weiter: unten",       "Más: abajo",          "Altro: giù"),
 ('SHOT_OK',      "Capture enregistrée",   "Screenshot saved",     "Screenshot gespeich.","Captura guardada",    "Screenshot salvato"),
 # --- barres d'aide (40 caracteres MAXIMUM) ---
 ('HELP_GAME',    "A:tir B:saut C:armes D:zoom MENU:pause",
                  "A:fire B:jump C:arms D:zoom MENU:pause",
                  "A:Feuer B:Sprung C:Waffe D:Zoom MENU",
                  "A:fuego B:salto C:armas D:zoom MENU",
                  "A:fuoco B:salto C:armi D:zoom MENU"),
 ('HELP_MENU',    "A: valider     B: retour",
                  "A: confirm     B: back",
                  "A: bestätigen  B: zurück",
                  "A: aceptar     B: volver",
                  "A: conferma    B: indietro"),
 ('HELP_SETUP',   "<> régler   A: valider   B: retour",
                  "<> change   A: confirm   B: back",
                  "<> ändern   A: ok   B: zurück",
                  "<> cambiar   A: aceptar   B: volver",
                  "<> cambia   A: conferma   B: indietro"),
 ('HELP_ARSENAL', "^v arme  <> minuterie  A: ok  B: non",
                  "^v weapon  <> timer  A: ok  B: no",
                  "^v Waffe  <> Zeit  A: ok  B: nein",
                  "^v arma  <> tiempo  A: ok  B: no",
                  "^v arma  <> timer  A: ok  B: no"),
 # --- preparation du match ---
 ('SETUP',        "Préparer le match",     "Match setup",          "Spiel vorbereiten",   "Preparar partida",    "Prepara la partita"),
 ('MAP',          "Carte",                 "Map",                  "Karte",               "Mapa",                "Mappa"),
 ('WORMS',        "Vers/équipe",           "Worms/team",           "Würmer/Team",         "Gusanos/equipo",      "Vermi/squadra"),
 ('HEALTH',       "Vie",                   "Health",               "Leben",               "Vida",                "Vita"),
 ('WIND',         "Vent",                  "Wind",                 "Wind",                "Viento",              "Vento"),
 ('TURN_TIME',    "Tour",                  "Turn",                 "Zug",                 "Turno",               "Turno"),
 ('REMATCH',      "Revanche",              "Rematch",              "Revanche",            "Revancha",            "Rivincita"),
 ('PLAY',         "JOUER !",               "PLAY!",                "SPIELEN!",            "¡JUGAR!",             "GIOCA!"),
 ('MAP_ISLANDS',  "Îles",                  "Islands",              "Inseln",              "Islas",               "Isole"),
 ('MAP_CANYON',   "Canyon",                "Canyon",               "Schlucht",            "Cañón",               "Canyon"),
 ('MAP_FORTRESS', "Forteresse",            "Fortress",             "Festung",             "Fortaleza",           "Fortezza"),
 ('MAP_VOLCANO',  "Volcan",                "Volcano",              "Vulkan",              "Volcán",              "Vulcano"),
 ('MAP_RANDOM',   "Procédurale",           "Procedural",           "Zufällig",            "Procedural",          "Casuale"),
 ('WIND_NONE',    "aucun",                 "none",                 "kein",                "ninguno",             "nessuno"),
 ('WIND_LOW',     "faible",                "light",                "leicht",              "suave",               "debole"),
 ('WIND_NORMAL',  "normal",                "normal",               "normal",              "normal",              "normale"),
 ('WIND_STRONG',  "fort",                  "strong",               "stark",               "fuerte",              "forte"),
 # --- en jeu ---
 ('TEAM_1',       "Rouge",                 "Red",                  "Rot",                 "Rojo",                "Rosso"),
 ('TEAM_2',       "Bleu",                  "Blue",                 "Blau",                "Azul",                "Blu"),
 ('TEAM_AI',      "IA",                    "AI",                   "KI",                  "IA",                  "IA"),
 ('ARSENAL',      "Arsenal",               "Arsenal",              "Arsenal",             "Arsenal",             "Arsenale"),
 ('TIMER',        "Minuterie",             "Timer",                "Zünder",              "Mecha",               "Miccia"),
 ('SUDDEN',       "MORT SUBITE !",         "SUDDEN DEATH!",        "PLÖTZLICHER TOD!",    "¡MUERTE SÚBITA!",     "MORTE IMPROVVISA!"),
 ('TEAM_WINS',    "%s gagne !",            "%s wins!",             "%s gewinnt!",         "¡%s gana!",           "%s vince!"),
 ('DRAW',         "Égalité !",             "Draw!",                "Unentschieden!",      "¡Empate!",            "Pareggio!"),
 ('YOU_WIN',      "VOUS GAGNEZ !",         "YOU WIN!",             "DU GEWINNST!",        "¡GANAS!",             "HAI VINTO!"),
 ('YOU_LOSE',     "VOUS PERDEZ",           "YOU LOSE",             "DU VERLIERST",        "PIERDES",             "HAI PERSO"),
 ('WIND_LABEL',   "Vent",                  "Wind",                 "Wind",                "Viento",              "Vento"),
 ('POWER',        "Puissance",             "Power",                "Kraft",               "Potencia",            "Potenza"),
 ('FUEL',         "Carburant",             "Fuel",                 "Treibstoff",          "Combustible",         "Carburante"),
 ('CURSOR_HINT',  "A : valider la cible",  "A: confirm target",    "A: Ziel bestätigen",  "A: confirmar objetivo", "A: conferma bersaglio"),
 ('W_BAZOOKA',    "Bazooka",               "Bazooka",              "Bazooka",             "Bazuca",              "Bazooka"),
 ('W_GRENADE',    "Grenade",               "Grenade",              "Granate",             "Granada",             "Granata"),
 ('W_CLUSTER',    "Bombe à fragmentation", "Cluster bomb",         "Streubombe",          "Bomba de racimo",     "Bomba a grappolo"),
 ('W_BANANA',     "Super Banane AKA",      "AKA Super Banana",     "AKA-Superbanane",     "Súper Banana AKA",    "Super Banana AKA"),
 ('W_DYNAMITE',   "Dynamite",              "Dynamite",             "Dynamit",             "Dinamita",            "Dinamite"),
 ('W_HOLY',       "Sainte Grenade",        "Holy Grenade",         "Heilige Granate",     "Granada Santa",       "Sacra Granata"),
 ('W_SHOTGUN',    "Fusil à pompe",         "Shotgun",              "Schrotflinte",        "Escopeta",            "Fucile a pompa"),
 ('W_AIRSTRIKE',  "Frappe aérienne",       "Air strike",           "Luftangriff",         "Ataque aéreo",        "Attacco aereo"),
 ('W_TELEPORT',   "Téléporteur",           "Teleporter",           "Teleporter",          "Teletransporte",      "Teletrasporto"),
 ('W_JETPACK',    "Jetpack",               "Jetpack",              "Jetpack",             "Jetpack",             "Jetpack"),
 ('W_SKIP',       "Passer le tour",        "Skip turn",            "Zug überspringen",    "Pasar turno",         "Salta il turno"),
]

RULES = {
 'WORMS': [
  ("Deux équipes de vers s'affrontent,",   "Two teams of worms fight, taking",    "Zwei Wurm-Teams kämpfen im",          "Dos equipos de gusanos luchan",      "Due squadre di vermi si sfidano"),
  ("chacune son tour. Détruisez tous les", "turns. Wipe out every worm of the",   "Wechsel. Besiege alle Würmer des",    "por turnos. Elimina a todos los",    "a turno. Elimina tutti i vermi"),
  ("vers adverses pour gagner.",           "other team to win.",                  "Gegners, um zu gewinnen.",            "gusanos rivales para ganar.",        "avversari per vincere."),
  ("",                                     "",                                    "",                                    "",                                   ""),
  ("Votre tour : marchez, sautez, visez,", "Your turn: walk, jump, aim, then",    "Dein Zug: laufen, springen, zielen,", "Tu turno: anda, salta, apunta y",    "Il tuo turno: cammina, salta,"),
  ("puis tirez. Après le tir, vous avez",  "fire. After firing you get 3",        "dann feuern. Nach dem Schuss hast",   "dispara. Tras el tiro tienes 3",     "mira e spara. Dopo lo sparo hai"),
  ("3 s pour vous mettre à l'abri.",       "seconds to take cover.",              "du 3 s, um in Deckung zu gehen.",     "segundos para ponerte a cubierto.",  "3 s per metterti al riparo."),
  ("",                                     "",                                    "",                                    "",                                   ""),
  ("Le terrain se détruit : chaque",       "The terrain is destructible: every",  "Das Gelände ist zerstörbar: jede",    "El terreno se destruye: cada",       "Il terreno si distrugge: ogni"),
  ("explosion creuse un cratère.",         "blast digs a crater.",                "Explosion reißt einen Krater.",       "explosión abre un cráter.",          "esplosione scava un cratere."),
  ("Tomber de haut fait des dégâts ;",     "Falling from high up hurts;",         "Tiefe Stürze schaden;",               "Caer de lo alto hace daño;",         "Cadere dall'alto fa male;"),
  ("tomber à l'eau, c'est la mort.",       "falling in the water is fatal.",      "Wasser bedeutet den Tod.",            "caer al agua es la muerte.",         "cadere in acqua è fatale."),
  ("",                                     "",                                    "",                                    "",                                   ""),
  ("Le VENT dévie les tirs : le Bazooka",  "WIND bends shots: the Bazooka is",    "WIND lenkt Schüsse ab: die Bazooka",  "El VIENTO desvía los tiros: la",     "Il VENTO devia i colpi: il"),
  ("y est très sensible, les grenades",    "very sensitive to it, grenades",      "ist sehr empfindlich, Granaten",      "bazuca es muy sensible, las",        "Bazooka è molto sensibile, le"),
  ("beaucoup moins.",                      "much less so.",                       "viel weniger.",                       "granadas mucho menos.",              "granate molto meno."),
  ("",                                     "",                                    "",                                    "",                                   ""),
  ("ARSENAL (C) : Bazooka, Grenade,",      "ARSENAL (C): Bazooka, Grenade,",      "ARSENAL (C): Bazooka, Granate,",      "ARSENAL (C): Bazuca, Granada,",      "ARSENALE (C): Bazooka, Granata,"),
  ("Fragmentation, Super Banane,",         "Cluster, Super Banana,",              "Streubombe, Superbanane,",            "Racimo, Súper Banana,",              "Grappolo, Super Banana,"),
  ("Dynamite, Sainte Grenade, Fusil",      "Dynamite, Holy Grenade, Shotgun",     "Dynamit, Heilige Granate,",           "Dinamita, Granada Santa,",           "Dinamite, Sacra Granata,"),
  ("(2 coups), Frappe aérienne,",          "(2 shots), Air strike, Teleporter,",  "Schrotflinte (2 Schuss), Luftangriff,","Escopeta (2 tiros), Ataque aéreo,", "Fucile (2 colpi), Attacco aereo,"),
  ("Téléporteur, Jetpack, Passer.",        "Jetpack, Skip.",                      "Teleporter, Jetpack, Überspringen.",  "Teletransporte, Jetpack, Pasar.",    "Teletrasporto, Jetpack, Salta."),
  ("Les munitions sont limitées.",         "Ammo is limited.",                    "Munition ist begrenzt.",              "La munición es limitada.",           "Le munizioni sono limitate."),
  ("",                                     "",                                    "",                                    "",                                   ""),
  ("Grenades : réglez la minuterie de",    "Grenades: set the fuse from 1 to",    "Granaten: Zünder von 1 bis 5 s",      "Granadas: mecha de 1 a 5 s en",      "Granate: miccia da 1 a 5 s"),
  ("1 à 5 s dans l'arsenal (< >).",        "5 s in the arsenal (< >).",           "im Arsenal einstellen (< >).",        "el arsenal (< >).",                  "nell'arsenale (< >)."),
  ("",                                     "",                                    "",                                    "",                                   ""),
  ("Après 40 tours : MORT SUBITE, tous",   "After 40 turns: SUDDEN DEATH, every", "Nach 40 Zügen: PLÖTZLICHER TOD,",     "Tras 40 turnos: MUERTE SÚBITA,",     "Dopo 40 turni: MORTE IMPROVVISA,"),
  ("les vers tombent à 1 PV.",             "worm drops to 1 HP.",                 "alle Würmer haben nur 1 LP.",         "todos los gusanos quedan a 1 PV.",   "tutti i vermi scendono a 1 PV."),
 ],
}

CONTROLS = {
 'FR': ["D-Pad : < > marcher    ^ v viser",
        "A (maintenu) : charger la puissance,",
        "   relâcher pour tirer",
        "   (Dynamite, Fusil, cible : appuyer)",
        "B : sauter (Jetpack : couper)",
        "C : arsenal (^ v arme, < > minuterie)",
        "D : zoom proche / carte entière",
        "MENU : pause    MENU long : capture",
        "RUN + MENU (500 ms) : retour loader"],
 'EN': ["D-Pad: < > walk    ^ v aim",
        "A (hold): charge power,",
        "   release to fire",
        "   (Dynamite, Shotgun, target: press)",
        "B: jump (Jetpack: switch off)",
        "C: arsenal (^ v weapon, < > timer)",
        "D: zoom close / whole map",
        "MENU: pause    long MENU: screenshot",
        "RUN + MENU (500 ms): back to loader"],
 'DE': ["D-Pad: < > laufen    ^ v zielen",
        "A (halten): Kraft laden,",
        "   loslassen zum Feuern",
        "   (Dynamit, Flinte, Ziel: drücken)",
        "B: springen (Jetpack: aus)",
        "C: Arsenal (^ v Waffe, < > Zünder)",
        "D: Zoom nah / ganze Karte",
        "MENU: Pause   MENU lang: Screenshot",
        "RUN + MENU (500 ms): zum Loader"],
 'ES': ["D-Pad: < > andar    ^ v apuntar",
        "A (mantener): cargar potencia,",
        "   soltar para disparar",
        "   (Dinamita, Escopeta, mira: pulsar)",
        "B: saltar (Jetpack: apagar)",
        "C: arsenal (^ v arma, < > mecha)",
        "D: zoom cerca / mapa entero",
        "MENU: pausa   MENU largo: captura",
        "RUN + MENU (500 ms): volver al loader"],
 'IT': ["D-Pad: < > cammina    ^ v mira",
        "A (tenuto): carica la potenza,",
        "   rilascia per sparare",
        "   (Dinamite, Fucile, mira: premi)",
        "B: salta (Jetpack: spegni)",
        "C: arsenale (^ v arma, < > miccia)",
        "D: zoom vicino / mappa intera",
        "MENU: pausa   MENU lungo: screenshot",
        "RUN + MENU (500 ms): torna al loader"],
}

KEYS = {
 'FR': ["",
        "CLAVIER (version PC)",
        "Flèches ou WASD : D-Pad",
        "J : A (tir)    K : B (saut)",
        "L : C (arsenal)    U : D (zoom)",
        "Entrée : A   Retour arrière : B",
        "Échap : pause (maintenu : capture)",
        "F11 : plein écran",
        "Manette : A, B, X, Y, Start, croix"],
 'EN': ["",
        "KEYBOARD (PC version)",
        "Arrows or WASD: D-Pad",
        "J: A (fire)    K: B (jump)",
        "L: C (arsenal)    U: D (zoom)",
        "Enter: A   Backspace: B",
        "Esc: pause (hold: screenshot)",
        "F11: fullscreen",
        "Gamepad: A, B, X, Y, Start, D-pad"],
 'DE': ["",
        "TASTATUR (PC-Version)",
        "Pfeile oder WASD: D-Pad",
        "J: A (Feuer)    K: B (Sprung)",
        "L: C (Arsenal)    I: D (Zoom)",
        "Enter: A   Rückschritt: B",
        "Esc: Pause (halten: Screenshot)",
        "F11: Vollbild",
        "Gamepad: A, B, X, Y, Start, Kreuz"],
 'ES': ["",
        "TECLADO (versión PC)",
        "Flechas o WASD: D-Pad",
        "J: A (fuego)    K: B (salto)",
        "L: C (arsenal)    U: D (zoom)",
        "Enter: A   Retroceso: B",
        "Esc: pausa (mantener: captura)",
        "F11: pantalla completa",
        "Mando: A, B, X, Y, Start, cruz"],
 'IT': ["",
        "TASTIERA (versione PC)",
        "Frecce o WASD: D-Pad",
        "J: A (fuoco)    K: B (salto)",
        "L: C (arsenale)    U: D (zoom)",
        "Invio: A   Backspace: B",
        "Esc: pausa (tenuto: screenshot)",
        "F11: schermo intero",
        "Gamepad: A, B, X, Y, Start, croce"],
}


def esc(t):
    return t.replace('\\', '\\\\').replace('"', '\\"')


def main(out):
    os.makedirs(out, exist_ok=True)
    games = list(RULES.keys())

    with open(os.path.join(out, 'i18n.h'), 'w', encoding='utf-8') as f:
        f.write("/*\n  i18n.h — GENERE par tools/gen_i18n.py, ne pas editer.\n"
                "  5 langues latines. Les REGLES de chaque jeu sont ici aussi : ce sont\n"
                "  des chaines comme les autres, et elles doivent tenir en 38 colonnes.\n*/\n"
                "#pragma once\n#include <cstdint>\n\nnamespace i18n {\n\n")
        f.write("enum Lang : uint8_t {\n")
        for i, l in enumerate(LANGS):
            f.write(f"    LANG_{l.upper()} = {i},\n")
        f.write("    LANG_COUNT\n};\n\nenum StrId : uint16_t {\n")
        for k, *_ in S:
            f.write(f"    STR_{k},\n")
        f.write("    STR_COUNT\n};\n\n")
        f.write("enum GameId : uint8_t {\n")
        for g in games:
            f.write(f"    GAME_{g},\n")
        f.write("    GAME_COUNT\n};\n\n")
        f.write("void  set_lang(Lang l);\nLang  lang();\n"
                "const char* T(StrId id);\n"
                "const char* lang_name(Lang l);\n"
                "\n"
                "// Regles d'un jeu : `n` lignes, recuperees une par une.\n"
                "int         rules_lines(GameId g);\n"
                "const char* rules_line(GameId g, int i);\n\n"
                "// Commandes (identiques pour tous les jeux).\n"
                "int         controls_lines();\n"
                "const char* controls_line(int i);\n\n"
                "// Touches du clavier (version PC), a la suite des commandes.\n"
                "int         keys_lines();\n"
                "const char* keys_line(int i);\n\n"
                "} // namespace i18n\n")

    with open(os.path.join(out, 'i18n.cpp'), 'w', encoding='utf-8') as f:
        f.write('#include "i18n.h"\n\nnamespace i18n {\n\n')
        f.write("static const char* const NAMES[LANG_COUNT] = {\n")
        for n in LANG_NAMES:
            f.write(f'    "{esc(n)}",\n')
        f.write("};\n\n")

        f.write("static const char* const TABLE[LANG_COUNT][STR_COUNT] = {\n")
        for li in range(len(LANGS)):
            f.write(f"    {{ // {LANG_NAMES[li]}\n")
            for row in S:
                f.write(f'        "{esc(row[1 + li])}",\n')
            f.write("    },\n")
        f.write("};\n\n")

        for g in games:
            rows = RULES[g]
            f.write(f"static const char* const RULES_{g}[LANG_COUNT][{len(rows)}] = {{\n")
            for li in range(len(LANGS)):
                f.write("    {\n")
                for r in rows:
                    f.write(f'        "{esc(r[li])}",\n')
                f.write("    },\n")
            f.write("};\n")
            f.write(f"constexpr int RULES_{g}_N = {len(rows)};\n\n")

        f.write(f"static const char* const CONTROLS[LANG_COUNT][{len(CONTROLS['FR'])}] = {{\n")
        for l in LANGS:
            f.write("    {\n")
            for line in CONTROLS[l.upper()]:
                f.write(f'        "{esc(line)}",\n')
            f.write("    },\n")
        f.write("};\n")
        f.write(f"constexpr int CONTROLS_N = {len(CONTROLS['FR'])};\n\n")

        f.write(f"static const char* const KEYS[LANG_COUNT][{len(KEYS['FR'])}] = {{\n")
        for l in LANGS:
            f.write("    {\n")
            for line in KEYS[l.upper()]:
                f.write(f'        "{esc(line)}",\n')
            f.write("    },\n")
        f.write("};\n")
        f.write(f"constexpr int KEYS_N = {len(KEYS['FR'])};\n\n")

        f.write("""static Lang g_lang = LANG_FR;

void set_lang(Lang l) { if (l < LANG_COUNT) g_lang = l; }
Lang lang()           { return g_lang; }

const char* T(StrId id)        { return (id < STR_COUNT) ? TABLE[g_lang][id] : "?"; }
const char* lang_name(Lang l)  { return (l < LANG_COUNT) ? NAMES[l] : "?"; }

int rules_lines(GameId g) {
    switch (g) {
""")
        for g in games:
            f.write(f"        case GAME_{g}: return RULES_{g}_N;\n")
        f.write("        default: return 0;\n    }\n}\n\n")

        f.write("const char* rules_line(GameId g, int i) {\n    switch (g) {\n")
        for g in games:
            f.write(f"        case GAME_{g}: return (i < RULES_{g}_N) ? RULES_{g}[g_lang][i] : \"\";\n")
        f.write("        default: return \"\";\n    }\n}\n\n")

        f.write("int         controls_lines()      { return CONTROLS_N; }\n"
                "const char* controls_line(int i)  { return (i < CONTROLS_N) ? CONTROLS[g_lang][i] : \"\"; }\n"
                "int         keys_lines()          { return KEYS_N; }\n"
                "const char* keys_line(int i)      { return (i < KEYS_N) ? KEYS[g_lang][i] : \"\"; }\n\n"
                "} // namespace i18n\n")

    print(f"genere -> {out}/i18n.{{h,cpp}}  ({len(S)} chaines + regles de {len(games)} jeux, "
          f"x {len(LANGS)} langues)")


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'main/shell')
