/*
===============================================================================
  worms.h — Moteur de Worms AKA Battle (C++ pur, sans materiel)
-------------------------------------------------------------------------------
  Portage du prototype web (src/utils/ts, GameCanvas.tsx) a DEMI-ECHELLE :
  carte 800 x 450 au lieu de 1600 x 900, vitesses et gravite divisees par deux.
  Les trajectoires ont exactement la meme forme, en deux fois plus petit, ce qui
  rend les vers lisibles sur l'ecran 320 x 240 de la console.

  Le moteur ne depend ni de l'ecran, ni du son, ni de FreeRTOS : il est teste sur
  PC (test/worms_rules.cpp) et compile tel quel pour la console et pour la
  version SDL. Logique a 60 Hz ; la coquille appelle step() a 30 fps (2 pas).

  Le terrain tient dans un tampon de W*H octets fourni par l'appelant (360 Ko :
  il doit aller en PSRAM sur la console).
===============================================================================
*/
#pragma once
#include <cstdint>

namespace worms {

constexpr int W = 800, H = 450;
constexpr int WATER_Y = 410;             // le ver qui descend plus bas se noie
constexpr int TEAMS = 2;
constexpr int MAX_WORMS = 4;             // vers par equipe
constexpr int MAX_PROJ = 24;
constexpr int MAX_FX = 96;
constexpr int MAX_TXT = 8;
constexpr int WORM_H = 10;               // hauteur du corps (pixels)
constexpr int RETREAT_TICKS = 180;       // 3 s pour fuir apres un tir

// --- Armes (memes que le prototype) -----------------------------------------------------------
enum Weapon : uint8_t {
    WP_BAZOOKA, WP_GRENADE, WP_CLUSTER, WP_BANANA, WP_DYNAMITE, WP_HOLY,
    WP_SHOTGUN, WP_AIRSTRIKE, WP_TELEPORT, WP_JETPACK, WP_SKIP, WP_COUNT
};

enum WeaponKind : uint8_t { K_CHARGE, K_DROP, K_SHOT, K_TARGET, K_JET, K_SKIP };

struct WeaponDef {
    int16_t damage;
    uint8_t radius;           // rayon du cratere (demi-echelle)
    int8_t  ammo;             // -1 = illimite
    bool    timed;
    uint8_t default_timer;    // secondes
    WeaponKind kind;
};
const WeaponDef& weapon_def(Weapon w);

// --- Cartes -----------------------------------------------------------------------------------------
enum MapId : uint8_t { MAP_ISLANDS, MAP_CANYON, MAP_FORTRESS, MAP_VOLCANO, MAP_PROCEDURAL, MAP_COUNT };

struct MatchOptions {
    MapId   map{MAP_ISLANDS};
    uint8_t worms_per_team{2};   // 1..4
    uint16_t hp{100};            // 50, 100 ou 150
    uint8_t wind_mode{2};        // 0 aucun, 1 faible, 2 normal, 3 fort
    uint16_t turn_sec{45};       // 20, 30, 45, 60, 90
    uint8_t ai_mask{0};          // bit 0 : equipe 1 pilotee par l'IA, bit 1 : equipe 2
    uint8_t ai_level{1};         // 0 Novice, 1 Arcade, 2 Maitre
    uint32_t seed{1};
};

// --- Entites ------------------------------------------------------------------------------------------
struct Worm {
    float x, y;               // y = derniere ligne du corps (les pieds)
    float vx, vy;
    int16_t hp;
    int8_t  facing;           // -1 gauche, +1 droite
    float   aim;              // elevation en degres, -20..85
    bool    alive;
    bool    grounded;
    bool    grave;            // mort par degats (pierre tombale) ; faux si noye
    uint8_t flash;            // clignotement apres un coup (ticks)
};

struct Team {
    int8_t  ammo[WP_COUNT];
    uint8_t cur;              // index du ver qui joue
};

struct Projectile {
    bool    live;
    Weapon  weapon;           // arme d'origine (decide du comportement)
    uint8_t sub;              // 0 = principal, 1 = sous-munition, 2 = missile de frappe
    float   x, y, vx, vy;
    float   wind_factor;
    float   bounce;           // 0 = s'arrete au contact
    int16_t timer;            // ticks restants, -1 = explose au contact
    int16_t age;
    int16_t damage;
    uint8_t radius;
    bool    rest;
    uint8_t owner_team;
};

struct Fx {
    uint8_t life;
    uint8_t kind;             // 0 terre, 1 fumee, 2 feu, 3 eau, 4 etincelle
    float   x, y, vx, vy;
};

struct DmgText { int16_t x, y, val; uint8_t life, team; };

enum Phase : uint8_t { PH_PLAY, PH_SETTLE, PH_NEXT, PH_OVER };

// Evenements pour le son et la vue (lus et remis a zero par la coquille).
enum : uint32_t {
    EV_FIRE = 1u << 0, EV_BOOM_S = 1u << 1, EV_BOOM_L = 1u << 2, EV_SPLASH = 1u << 3,
    EV_JUMP = 1u << 4, EV_HURT = 1u << 5, EV_DEATH = 1u << 6, EV_TURN = 1u << 7,
    EV_TELEPORT = 1u << 8, EV_SUDDEN = 1u << 9, EV_TICK = 1u << 10, EV_SHOT = 1u << 11
};

struct Input {
    int8_t dx{0}, dy{0};      // D-Pad : marcher / viser (ou deplacer le curseur)
    int8_t face{0};           // regarder a gauche/droite sans marcher (IA)
    bool   a_held{false};     // A maintenu : charge la puissance
    bool   a_pressed{false};  // front montant de A (cible, dynamite, fusil)
    bool   b_pressed{false};  // saut (ou fin du jetpack)
    int8_t timer_d{0};        // -1 / +1 : minuterie de la grenade
    int8_t weapon_set{-1};    // >= 0 : choisit cette arme
};

struct Game {
    uint8_t* terrain;         // W*H octets : 0 = air, 1..4 = matiere (cf. la vue)
    MatchOptions opt;
    Worm worms[TEAMS][MAX_WORMS];
    Team teams[TEAMS];
    Projectile proj[MAX_PROJ];
    Fx fx[MAX_FX];
    DmgText txt[MAX_TXT];

    Phase   phase;
    uint8_t turn_team;
    int     turn_ticks;       // temps restant du tour (60 Hz)
    int     turn_no;
    int     wind;             // -10..+10 (affiche)
    float   wind_scale;       // 0, 0.4, 1, 1.8
    Weapon  weapon;
    uint8_t timer_sec;        // minuterie de la grenade choisie (1..5)
    float   power;            // 0..100
    bool    charging;
    bool    fired;            // une arme a deja servi ce tour (retraite en cours)
    uint8_t shots_left;       // fusil : 2 coups par tour
    float   cursor_x, cursor_y;
    bool    jet_active;
    float   jet_fuel;
    uint8_t winner;           // 0 en cours, 1 equipe 1, 2 equipe 2, 3 egalite
    int     settle_ticks, quiet_ticks, next_ticks;
    uint32_t rng;
    uint32_t tick;
    uint32_t events;
    bool    sudden;
};

// --- API -------------------------------------------------------------------------------------------------------
void init(Game& g, uint8_t* terrain_mem);          // une seule fois
void start(Game& g, const MatchOptions& o);        // genere la carte, place les vers, lance le 1er tour
void step(Game& g, const Input& in);               // UNE image a 30 fps (deux pas de 60 Hz)

inline bool solid(const Game& g, int x, int y) {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    return g.terrain[y * W + x] != 0;
}
bool is_ai_turn(const Game& g);
const Worm& active_worm(const Game& g);
Worm& active_worm(Game& g);
bool weapon_usable(const Game& g, Weapon w);       // munitions restantes et arme jouable ce tour
int  team_hp(const Game& g, int team);
int  team_alive(const Game& g, int team);
bool wants_cursor(const Game& g);                  // l'arme choisie se vise avec un curseur
uint32_t rnd(Game& g);                             // generateur du moteur
// Pose sur le sol (pour le curseur de teleportation) : vrai si un ver tient en (x, y).
bool body_free(const Game& g, int x, int y);
// Trajectoire d'essai (IA) : renvoie le point d'impact / d'explosion.
void simulate_shot(const Game& g, Weapon w, float x, float y, float vx, float vy, int timer_ticks,
                   float* out_x, float* out_y);

// --- IA -----------------------------------------------------------------------------------------------------
struct AiState {
    bool   planned;
    uint32_t turn_key;
    Weapon weapon;
    float  elev, power;
    int8_t face;
    int    walk_ticks;
    int8_t walk_dir;
    int    phase;             // 0 marche, 1 vise, 2 charge, 3 tir, 4 fuite
    int    wait, flee_ticks;
    int8_t flee_dir;
    uint8_t shots;
    uint8_t timer_sec;
    uint8_t walks;
    uint32_t rng;
};
void ai_reset(AiState& s);
void ai_input(const Game& g, AiState& s, Input& in);  // un pas d'entrees (30 fps)

} // namespace worms
