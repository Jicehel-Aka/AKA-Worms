/*
===============================================================================
  shell.cpp — La coquille (Worms AKA Battle)
-------------------------------------------------------------------------------
  Ecran-titre -> menu -> preparation du match -> match.

  Deux modes :
    PASSE & JOUE   2 joueurs sur la meme console, chacun son tour
    SOLO           contre l'IA (equipe Bleue), 3 niveaux

  COMMANDES
    D-Pad            curseur / mouvements
    A / B            valider / annuler  (en match : tir / saut)
    C                arsenal      D   zoom (proche / carte entiere)
    MENU (court)     menu de pause
    MENU (long)      capture d'ecran
    RUN + MENU 500ms retour au loader   (gere par la tache systeme)
===============================================================================
*/
#include "shell.h"
#include "game_module.h"
#include "ui.h"
#include "i18n.h"
#include "save.h"
#include "../core/graphics.h"
#include "../core/input.h"
#include "../core/audio.h"
#include "../tasks/task_system.h"
#include <stdio.h>
#include <string.h>

extern "C" const uint8_t title_bin_start[] asm("_binary_title_bin_start");

namespace shell {

using namespace core;

enum class State : uint8_t {
    Title, Menu, Setup, Options, Playing, InGameMenu,
    Rules, Controls, GameOver, ConfirmQuit, ConfirmAbandon
};

static const GameModule* s_game = nullptr;
static State s_state = State::Title;
static State s_text_back = State::Menu;     // ou revenir depuis Regles / Commandes
static int   s_sel   = 0;
static int   s_scroll = 0;
static bool  s_vs_ai = false;
static save::Config s_cfg;
static uint32_t s_now = 0;
static uint32_t s_seed_counter = 0;
static char s_msg[44] = "";
static uint32_t s_msg_until = 0;

// Appui LONG sur MENU = capture d'ecran. Appui court = menu. On ne peut donc pas
// agir au FRONT MONTANT : il faut attendre le relachement pour savoir lequel c'etait.
constexpr uint32_t MENU_LONG_MS = 600;
static bool     s_menu_down = false;
static uint32_t s_menu_at   = 0;
static bool     s_shot_done = false;

static void say(const char* m) { snprintf(s_msg, sizeof s_msg, "%s", m); s_msg_until = s_now + 2000; }

static void take_screenshot() {
    char path[64];
    if (graphics_save_screenshot_bmp(path, sizeof path)) { say(i18n::T(i18n::STR_SHOT_OK)); sfx_menu_ok(); }
    else                                                  { say("!"); sfx_illegal(); }
}

static bool menu_pressed_short() {
    const bool held = input_is_held(Button::Menu);
    if (held && !s_menu_down) { s_menu_down = true; s_menu_at = s_now; s_shot_done = false; }
    if (held && s_menu_down && !s_shot_done && (s_now - s_menu_at) >= MENU_LONG_MS) {
        take_screenshot();
        s_shot_done = true;
    }
    if (!held && s_menu_down) {
        s_menu_down = false;
        if (!s_shot_done) return true;
    }
    return false;
}

static bool menu_nav(int& idx, int n) {
    if (input_repeat(Button::Up))   { idx = (idx + n - 1) % n; sfx_cursor(); }
    if (input_repeat(Button::Down)) { idx = (idx + 1) % n;     sfx_cursor(); }
    if (input_was_pressed(Button::A)) { sfx_menu_ok(); return true; }
    return false;
}

static void go_menu() { audio_play_tune(Tune::Title); s_sel = 0; s_state = State::Menu; }

static void leave_match() {
    s_cfg.cam_far = s_game->far_view() ? 1 : 0;
    save::save(s_cfg);
    go_menu();
}

// -----------------------------------------------------------------------------
// Menu principal
// -----------------------------------------------------------------------------
enum MenuItem { MI_HOTSEAT = 0, MI_VS_AI, MI_RULES, MI_CONTROLS, MI_OPTIONS, MI_QUIT, MI_COUNT };

static void update_menu() {
    if (menu_nav(s_sel, MI_COUNT)) {
        switch (s_sel) {
            case MI_HOTSEAT:  s_vs_ai = false; s_sel = 0; s_state = State::Setup; break;
            case MI_VS_AI:    s_vs_ai = true;  s_sel = 0; s_state = State::Setup; break;
            case MI_RULES:    s_scroll = 0; s_text_back = State::Menu; s_state = State::Rules;    break;
            case MI_CONTROLS: s_scroll = 0; s_text_back = State::Menu; s_state = State::Controls; break;
            case MI_OPTIONS:  s_sel = 0; s_state = State::Options; break;
            case MI_QUIT:     s_sel = 1; s_state = State::ConfirmQuit; break;
        }
    }
    if (input_was_pressed(Button::B)) { sfx_menu_back(); save::save(s_cfg); s_state = State::Title; }
}

static void draw_menu_screen() {
    ui::Menu m { i18n::T(i18n::STR_TITLE),
        { i18n::T(i18n::STR_MODE_HOTSEAT), i18n::T(i18n::STR_MODE_VS_AI),
          i18n::T(i18n::STR_RULES), i18n::T(i18n::STR_CONTROLS),
          i18n::T(i18n::STR_OPTIONS), i18n::T(i18n::STR_QUIT) }, MI_COUNT };
    ui::draw_menu(m, s_sel);
}

// -----------------------------------------------------------------------------
// Preparation du match
// -----------------------------------------------------------------------------
enum SetupItem { SI_MAP = 0, SI_WORMS, SI_HEALTH, SI_WIND, SI_TIME, SI_LEVEL, SI_PLAY };

static const i18n::StrId kMaps[5]  = { i18n::STR_MAP_ISLANDS, i18n::STR_MAP_CANYON, i18n::STR_MAP_FORTRESS,
                                       i18n::STR_MAP_VOLCANO, i18n::STR_MAP_RANDOM };
static const i18n::StrId kWinds[4] = { i18n::STR_WIND_NONE, i18n::STR_WIND_LOW, i18n::STR_WIND_NORMAL, i18n::STR_WIND_STRONG };
static const i18n::StrId LVL[3]    = { i18n::STR_LVL_1, i18n::STR_LVL_2, i18n::STR_LVL_3 };
static const int kHpVals[3]   = { 50, 100, 150 };
static const int kTimeVals[5] = { 20, 30, 45, 60, 90 };

static int setup_list(int* out) {
    int n = 0;
    out[n++] = SI_MAP; out[n++] = SI_WORMS; out[n++] = SI_HEALTH; out[n++] = SI_WIND; out[n++] = SI_TIME;
    if (s_vs_ai) out[n++] = SI_LEVEL;
    out[n++] = SI_PLAY;
    return n;
}

static void start_match() {
    MatchSetup m;
    m.map = s_cfg.map; m.worms = s_cfg.worms; m.hp_idx = s_cfg.hp_idx; m.wind = s_cfg.wind;
    m.time_idx = s_cfg.time_idx; m.level = s_cfg.level; m.vs_ai = s_vs_ai; m.far = s_cfg.cam_far != 0;
    m.seed = s_now * 2654435761u + (++s_seed_counter) * 40503u + 1u;
    s_game->start(m);
    audio_play_tune(Tune::Game);
    s_state = State::Playing;
}

static void update_setup() {
    int items[8];
    const int n = setup_list(items);
    if (s_sel >= n) s_sel = n - 1;
    const int dir = (input_repeat(Button::Right) ? 1 : 0) - (input_repeat(Button::Left) ? 1 : 0);
    if (dir) {
        switch (items[s_sel]) {
            case SI_MAP:    s_cfg.map = (uint8_t)((s_cfg.map + 5 + dir) % 5); break;
            case SI_WORMS:  s_cfg.worms = (uint8_t)((s_cfg.worms - 1 + 4 + dir) % 4 + 1); break;
            case SI_HEALTH: s_cfg.hp_idx = (uint8_t)((s_cfg.hp_idx + 3 + dir) % 3); break;
            case SI_WIND:   s_cfg.wind = (uint8_t)((s_cfg.wind + 4 + dir) % 4); break;
            case SI_TIME:   s_cfg.time_idx = (uint8_t)((s_cfg.time_idx + 5 + dir) % 5); break;
            case SI_LEVEL:  s_cfg.level = (uint8_t)((s_cfg.level + 3 + dir) % 3); break;
            default: break;
        }
        sfx_cursor();
    }
    if (menu_nav(s_sel, n) && items[s_sel] == SI_PLAY) { save::save(s_cfg); start_match(); }
    if (input_was_pressed(Button::B)) { sfx_menu_back(); save::save(s_cfg); s_sel = s_vs_ai ? MI_VS_AI : MI_HOTSEAT; s_state = State::Menu; }
}

static void draw_setup_screen() {
    int items[8];
    const int n = setup_list(items);
    static char l[8][44];
    ui::Menu m { i18n::T(i18n::STR_SETUP), {}, n };
    for (int i = 0; i < n; ++i) {
        switch (items[i]) {
            case SI_MAP:    snprintf(l[i], 44, "%-11s < %s >", i18n::T(i18n::STR_MAP), i18n::T(kMaps[s_cfg.map % 5])); break;
            case SI_WORMS:  snprintf(l[i], 44, "%-11s < %d >", i18n::T(i18n::STR_WORMS), (int)s_cfg.worms); break;
            case SI_HEALTH: snprintf(l[i], 44, "%-11s < %d >", i18n::T(i18n::STR_HEALTH), kHpVals[s_cfg.hp_idx % 3]); break;
            case SI_WIND:   snprintf(l[i], 44, "%-11s < %s >", i18n::T(i18n::STR_WIND), i18n::T(kWinds[s_cfg.wind % 4])); break;
            case SI_TIME:   snprintf(l[i], 44, "%-11s < %d s >", i18n::T(i18n::STR_TURN_TIME), kTimeVals[s_cfg.time_idx % 5]); break;
            case SI_LEVEL:  snprintf(l[i], 44, "%-11s < %s >", i18n::T(i18n::STR_LEVEL), i18n::T(LVL[s_cfg.level % 3])); break;
            default:        snprintf(l[i], 44, "%s", i18n::T(i18n::STR_PLAY)); break;
        }
        m.items[i] = l[i];
    }
    ui::draw_menu(m, s_sel);
}

// -----------------------------------------------------------------------------
// Options
// -----------------------------------------------------------------------------
enum OptItem { OI_LANG = 0, OI_MUSIC, OI_SFX, OI_ZOOM, OI_CALIB, OI_BACK };

static int clamp_vol(int v) { return v < 0 ? 0 : (v > 100 ? 100 : v); }

// Les options affichees dependent de la plateforme : le zoom n'existe que sur PC (SDL),
// le recalibrage du joystick que sur la console.
static int option_list(int* out) {
    int n = 0;
    out[n++] = OI_LANG; out[n++] = OI_MUSIC; out[n++] = OI_SFX;
    if (graphics_zoom_supported()) out[n++] = OI_ZOOM; else out[n++] = OI_CALIB;
    out[n++] = OI_BACK;
    return n;
}

static void apply_zoom() { if (graphics_zoom_supported()) graphics_set_zoom(s_cfg.zoom); }

static void update_options() {
    int items[8];
    const int n = option_list(items);
    const int dir = (input_repeat(Button::Right) ? 1 : 0) - (input_repeat(Button::Left) ? 1 : 0);
    if (dir) {
        switch (items[s_sel]) {
            case OI_LANG: {
                const int l = ((int)s_cfg.language + i18n::LANG_COUNT + dir) % i18n::LANG_COUNT;
                s_cfg.language = (uint8_t)l;
                i18n::set_lang((i18n::Lang)l);
                break;
            }
            case OI_MUSIC: s_cfg.music_vol = (uint8_t)clamp_vol(s_cfg.music_vol + dir * 10);
                           audio_set_music_volume(s_cfg.music_vol / 100.0f); break;
            case OI_SFX:   s_cfg.sfx_vol = (uint8_t)clamp_vol(s_cfg.sfx_vol + dir * 10);
                           audio_set_sfx_volume(s_cfg.sfx_vol / 100.0f); break;
            case OI_ZOOM:  s_cfg.zoom = (uint8_t)(((int)s_cfg.zoom - 1 + 4 + dir) % 4 + 1);   // 1..4
                           apply_zoom(); break;
            default: break;
        }
        sfx_cursor();
    }
    if (menu_nav(s_sel, n)) {
        if (items[s_sel] == OI_CALIB) { input_request_calibration(); say(i18n::T(i18n::STR_CALIB)); }
        if (items[s_sel] == OI_BACK)  { save::save(s_cfg); s_sel = MI_OPTIONS; s_state = State::Menu; }
    }
    if (input_was_pressed(Button::B)) { sfx_menu_back(); save::save(s_cfg); s_sel = MI_OPTIONS; s_state = State::Menu; }
}

static void draw_options_screen() {
    int items[8];
    const int n = option_list(items);
    static char l[8][40];
    ui::Menu m { i18n::T(i18n::STR_OPTIONS), {}, n };
    for (int i = 0; i < n; ++i) {
        switch (items[i]) {
            case OI_LANG:  snprintf(l[i], 40, "%-11s < %s >", i18n::T(i18n::STR_LANG),  i18n::lang_name((i18n::Lang)s_cfg.language)); break;
            case OI_MUSIC: snprintf(l[i], 40, "%-11s < %d%% >", i18n::T(i18n::STR_MUSIC), s_cfg.music_vol); break;
            case OI_SFX:   snprintf(l[i], 40, "%-11s < %d%% >", i18n::T(i18n::STR_SFX),   s_cfg.sfx_vol); break;
            case OI_ZOOM:
                if (s_cfg.zoom >= 4) snprintf(l[i], 40, "%-11s < %s >", i18n::T(i18n::STR_ZOOM), i18n::T(i18n::STR_FULLSCREEN));
                else                 snprintf(l[i], 40, "%-11s < x%d >", i18n::T(i18n::STR_ZOOM), s_cfg.zoom);
                break;
            case OI_CALIB: snprintf(l[i], 40, "%s", i18n::T(i18n::STR_CALIB)); break;
            default:       snprintf(l[i], 40, "%s", i18n::T(i18n::STR_BACK)); break;
        }
        m.items[i] = l[i];
    }
    ui::draw_menu(m, s_sel);
}

// -----------------------------------------------------------------------------
// Visionneuses de texte
// -----------------------------------------------------------------------------
static const char* rules_ln(int i) { return i18n::rules_line(i18n::GAME_WORMS, i); }

// Page « Commandes » : les boutons de la console, puis (version PC) les touches du clavier.
static int controls_total() { return i18n::controls_lines() + (graphics_zoom_supported() ? i18n::keys_lines() : 0); }
static const char* controls_ln(int i) {
    const int n = i18n::controls_lines();
    return i < n ? i18n::controls_line(i) : i18n::keys_line(i - n);
}

static void update_text(int n) {
    constexpr int PER = 18;
    if (input_repeat(Button::Down) && s_scroll + PER < n) { s_scroll++; sfx_cursor(); }
    if (input_repeat(Button::Up)   && s_scroll > 0)       { s_scroll--; sfx_cursor(); }
    if (input_was_pressed(Button::B) || input_was_pressed(Button::A)) {
        sfx_menu_back();
        s_state = s_text_back;
    }
}

// -----------------------------------------------------------------------------
// En match
// -----------------------------------------------------------------------------
static void update_playing() {
    s_game->update(s_now);
    const int w = s_game->winner();
    if (w == 0) return;
    const bool human_won = !s_vs_ai || w == 1;
    audio_play_tune(w == 3 ? Tune::Victory : (human_won ? Tune::Victory : Tune::Defeat));
    sfx_gameover();
    s_sel = 0;
    s_state = State::GameOver;
}

// =============================================================================
void init() {
    ui::init_palette();
    s_game = &module_worms();

    if (!save::load(s_cfg)) { s_cfg = save::Config{}; save::save(s_cfg); }
    if (s_cfg.language >= i18n::LANG_COUNT) s_cfg.language = 0;
    if (s_cfg.level >= 3) s_cfg.level = 1;
    if (s_cfg.zoom < 1 || s_cfg.zoom > 4) s_cfg.zoom = 2;
    i18n::set_lang((i18n::Lang)s_cfg.language);
    audio_set_music_volume(s_cfg.music_vol / 100.0f);
    audio_set_sfx_volume(s_cfg.sfx_vol / 100.0f);
    apply_zoom();

    s_state = State::Title;
}

void update(uint32_t now) {
    s_now = now;
    audio_music_tick(now);
    if (now >= s_msg_until) s_msg[0] = 0;

    // Le bouton MENU est traite PARTOUT : l'appui long (capture) doit marcher
    // meme pendant un match.
    const bool menu_short = menu_pressed_short();

    switch (s_state) {
        case State::Title:
            audio_play_tune(Tune::Title);
            if (input_was_pressed(Button::A) || menu_short) { sfx_menu_ok(); s_sel = 0; s_state = State::Menu; }
            break;

        case State::Menu:     update_menu(); break;
        case State::Setup:    update_setup(); break;
        case State::Options:  update_options(); break;
        case State::Rules:    update_text(i18n::rules_lines(i18n::GAME_WORMS)); break;
        case State::Controls: update_text(controls_total()); break;

        case State::Playing:
            if (menu_short) { sfx_menu_ok(); s_sel = 0; s_state = State::InGameMenu; }
            else update_playing();
            break;

        case State::InGameMenu:
            if (menu_nav(s_sel, 4)) {
                switch (s_sel) {
                    case 0: s_state = State::Playing; break;
                    case 1: s_scroll = 0; s_text_back = State::InGameMenu; s_state = State::Rules; break;
                    case 2: s_scroll = 0; s_text_back = State::InGameMenu; s_state = State::Controls; break;
                    case 3: s_sel = 1; s_state = State::ConfirmAbandon; break;
                }
            }
            if (input_was_pressed(Button::B) || menu_short) { sfx_menu_back(); s_state = State::Playing; }
            break;

        case State::ConfirmAbandon:
            if (menu_nav(s_sel, 2)) {
                if (s_sel == 0) leave_match();
                else            { s_sel = 3; s_state = State::InGameMenu; }
            }
            if (input_was_pressed(Button::B)) { sfx_menu_back(); s_sel = 3; s_state = State::InGameMenu; }
            break;

        case State::GameOver:
            if (menu_nav(s_sel, 2)) {
                if (s_sel == 0) start_match();           // revanche, memes reglages
                else            leave_match();
            }
            if (input_was_pressed(Button::B)) { sfx_menu_back(); leave_match(); }
            break;

        case State::ConfirmQuit:
            if (menu_nav(s_sel, 2)) {
                if (s_sel == 0) { save::save(s_cfg); audio_stop_music(); tasks::return_to_loader(); }
                else            { s_sel = MI_QUIT; s_state = State::Menu; }
            }
            if (input_was_pressed(Button::B)) { sfx_menu_back(); s_sel = MI_QUIT; s_state = State::Menu; }
            break;
    }
}

void draw() {
    switch (s_state) {
        case State::Title:
            graphics_draw_fullscreen565((const uint16_t*)title_bin_start);
            graphics_draw_text_center_raw(ui::SCR_H - 13, i18n::T(i18n::STR_PRESS_A), ui::C_TEXT);
            return;
        case State::Rules:
            ui::text_page(i18n::T(i18n::STR_RULES), rules_ln, i18n::rules_lines(i18n::GAME_WORMS), s_scroll, 18);
            return;
        case State::Controls:
            ui::text_page(i18n::T(i18n::STR_CONTROLS), controls_ln, controls_total(), s_scroll, 18);
            return;
        default: break;
    }

    const bool in_game = (s_state == State::Playing || s_state == State::InGameMenu ||
                          s_state == State::GameOver || s_state == State::ConfirmAbandon);
    if (in_game) {
        s_game->draw(s_now);
        if (s_msg[0]) {                                     // « Capture enregistree »
            const int w = graphics_text_width(s_msg) + 12;
            graphics_fill_rect_raw((ui::SCR_W - w) / 2, ui::SCR_H - 22, w, 16, ui::C_MENU_BG);
            graphics_draw_text_center_raw(ui::SCR_H - 18, s_msg, ui::C_TEXT);
        }
    } else {
        graphics_fill_rect_raw(0, 0, ui::SCR_W, ui::SCR_H, ui::C_BG);
    }

    switch (s_state) {
        case State::Menu:    draw_menu_screen(); ui::bottom_bar(nullptr, true); break;
        case State::Setup:   draw_setup_screen(); ui::bottom_bar(i18n::T(i18n::STR_HELP_SETUP), true); break;
        case State::Options: draw_options_screen(); ui::bottom_bar(s_msg[0] ? s_msg : nullptr, true); break;

        case State::InGameMenu: {
            const ui::Menu m { i18n::T(i18n::STR_TITLE),
                { i18n::T(i18n::STR_RESUME), i18n::T(i18n::STR_RULES),
                  i18n::T(i18n::STR_CONTROLS), i18n::T(i18n::STR_QUIT_MATCH) }, 4 };
            ui::draw_menu(m, s_sel);
            break;
        }
        case State::ConfirmAbandon: {
            const ui::Menu m { i18n::T(i18n::STR_QUIT_MATCH_CONFIRM),
                { i18n::T(i18n::STR_YES), i18n::T(i18n::STR_NO) }, 2 };
            ui::draw_menu(m, s_sel);
            break;
        }
        case State::GameOver: {
            const int w = s_game->winner();
            static char t[48];
            if (w == 3) snprintf(t, sizeof t, "%s", i18n::T(i18n::STR_DRAW));
            else if (s_vs_ai) snprintf(t, sizeof t, "%s", i18n::T(w == 1 ? i18n::STR_YOU_WIN : i18n::STR_YOU_LOSE));
            else snprintf(t, sizeof t, i18n::T(i18n::STR_TEAM_WINS), i18n::T(w == 1 ? i18n::STR_TEAM_1 : i18n::STR_TEAM_2));
            const ui::Menu m { t, { i18n::T(i18n::STR_REMATCH), i18n::T(i18n::STR_BACK) }, 2 };
            ui::draw_menu(m, s_sel);
            break;
        }
        case State::ConfirmQuit: {
            const ui::Menu m { i18n::T(i18n::STR_QUIT_CONFIRM),
                { i18n::T(i18n::STR_YES), i18n::T(i18n::STR_NO) }, 2 };
            ui::draw_menu(m, s_sel);
            break;
        }
        default: break;
    }
}

} // namespace shell
