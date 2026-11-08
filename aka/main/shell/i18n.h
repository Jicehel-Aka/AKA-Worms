/*
  i18n.h — GENERE par tools/gen_i18n.py, ne pas editer.
  5 langues latines. Les REGLES de chaque jeu sont ici aussi : ce sont
  des chaines comme les autres, et elles doivent tenir en 38 colonnes.
*/
#pragma once
#include <cstdint>

namespace i18n {

enum Lang : uint8_t {
    LANG_FR = 0,
    LANG_EN = 1,
    LANG_DE = 2,
    LANG_ES = 3,
    LANG_IT = 4,
    LANG_COUNT
};

enum StrId : uint16_t {
    STR_TITLE,
    STR_SUBTITLE,
    STR_PRESS_A,
    STR_MODE_HOTSEAT,
    STR_MODE_VS_AI,
    STR_RULES,
    STR_CONTROLS,
    STR_OPTIONS,
    STR_QUIT,
    STR_BACK,
    STR_RESUME,
    STR_QUIT_MATCH,
    STR_LEVEL,
    STR_LVL_1,
    STR_LVL_2,
    STR_LVL_3,
    STR_LANG,
    STR_MUSIC,
    STR_SFX,
    STR_ZOOM,
    STR_FULLSCREEN,
    STR_CALIB,
    STR_YES,
    STR_NO,
    STR_QUIT_CONFIRM,
    STR_QUIT_MATCH_CONFIRM,
    STR_THINKING,
    STR_MORE,
    STR_SHOT_OK,
    STR_HELP_GAME,
    STR_HELP_MENU,
    STR_HELP_SETUP,
    STR_HELP_ARSENAL,
    STR_SETUP,
    STR_MAP,
    STR_WORMS,
    STR_HEALTH,
    STR_WIND,
    STR_TURN_TIME,
    STR_REMATCH,
    STR_PLAY,
    STR_MAP_ISLANDS,
    STR_MAP_CANYON,
    STR_MAP_FORTRESS,
    STR_MAP_VOLCANO,
    STR_MAP_RANDOM,
    STR_WIND_NONE,
    STR_WIND_LOW,
    STR_WIND_NORMAL,
    STR_WIND_STRONG,
    STR_TEAM_1,
    STR_TEAM_2,
    STR_TEAM_AI,
    STR_ARSENAL,
    STR_TIMER,
    STR_SUDDEN,
    STR_TEAM_WINS,
    STR_DRAW,
    STR_YOU_WIN,
    STR_YOU_LOSE,
    STR_WIND_LABEL,
    STR_POWER,
    STR_FUEL,
    STR_CURSOR_HINT,
    STR_W_BAZOOKA,
    STR_W_GRENADE,
    STR_W_CLUSTER,
    STR_W_BANANA,
    STR_W_DYNAMITE,
    STR_W_HOLY,
    STR_W_SHOTGUN,
    STR_W_AIRSTRIKE,
    STR_W_TELEPORT,
    STR_W_JETPACK,
    STR_W_SKIP,
    STR_COUNT
};

enum GameId : uint8_t {
    GAME_WORMS,
    GAME_COUNT
};

void  set_lang(Lang l);
Lang  lang();
const char* T(StrId id);
const char* lang_name(Lang l);

// Regles d'un jeu : `n` lignes, recuperees une par une.
int         rules_lines(GameId g);
const char* rules_line(GameId g, int i);

// Commandes (identiques pour tous les jeux).
int         controls_lines();
const char* controls_line(int i);

// Touches du clavier (version PC), a la suite des commandes.
int         keys_lines();
const char* keys_line(int i);

} // namespace i18n
