/*
===============================================================================
  worms_module.cpp — Colle entre la coquille et le moteur Worms
-------------------------------------------------------------------------------
  - traduit les boutons de la console en `worms::Input`
  - pilote l'IA quand c'est son tour (memes entrees qu'un joueur)
  - joue les bruitages d'apres les evenements du moteur
  - gere le menu d'armes (arsenal) et la camera

  Le terrain (360 Ko) va en PSRAM sur la console.
===============================================================================
*/
#include "../../shell/game_module.h"
#include "worms.h"
#include "worms_view.h"
#include "../../core/input.h"
#include "../../core/audio.h"
#include "../../shell/ui.h"
#include <cstdlib>
#include <cstring>
#ifdef ESP_PLATFORM
#include "esp_heap_caps.h"
#endif

namespace shell {
namespace {

using namespace core;

worms::Game  g_game;
worms::AiState g_ai[2];
worms_view::State g_view;
uint8_t* g_terrain = nullptr;
bool g_inited = false;
bool g_a_armed = false;          // A doit etre relache une fois avant de pouvoir charger un tir
bool g_vs_ai = false;

constexpr uint16_t kTurnSec[5] = { 20, 30, 45, 60, 90 };
constexpr uint16_t kHp[3] = { 50, 100, 150 };

bool ensure_memory() {
    if (g_terrain) return true;
#ifdef ESP_PLATFORM
    g_terrain = (uint8_t*)heap_caps_malloc((size_t)worms::W * worms::H, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!g_terrain) g_terrain = (uint8_t*)heap_caps_malloc((size_t)worms::W * worms::H, MALLOC_CAP_8BIT);
#else
    g_terrain = (uint8_t*)std::malloc((size_t)worms::W * worms::H);
#endif
    return g_terrain != nullptr;
}

void start(const MatchSetup& s) {
    if (!ensure_memory()) return;
    if (!g_inited) { worms::init(g_game, g_terrain); worms_view::init_palette(); g_inited = true; }
    worms::MatchOptions o;
    o.map = (worms::MapId)(s.map % worms::MAP_COUNT);
    o.worms_per_team = s.worms;
    o.hp = kHp[s.hp_idx % 3];
    o.wind_mode = s.wind;
    o.turn_sec = kTurnSec[s.time_idx % 5];
    o.ai_mask = s.vs_ai ? 2 : 0;
    o.ai_level = s.level;
    o.seed = s.seed ? s.seed : 1;
    worms::start(g_game, o);
    worms::ai_reset(g_ai[0]);
    worms::ai_reset(g_ai[1]);
    g_vs_ai = s.vs_ai;
    g_view = worms_view::State{};
    g_view.vs_ai = s.vs_ai;
    g_view.far = s.far;
    g_view.timer_pref = 3;
    g_view.banner_team = g_game.turn_team;
    g_a_armed = false;
    worms_view::snap_camera(g_game, g_view);
    g_view.banner_until = 0xFFFFFFFFu;     // fixe a la premiere image (voir update)
}

// Un seul bruitage par image : le plus important gagne (la AKA n'a qu'une piste d'effets).
void play_events(uint32_t ev) {
    using namespace worms;
    if (ev & EV_SUDDEN)    sfx_sudden();
    else if (ev & EV_BOOM_L)   sfx_boom_big();
    else if (ev & EV_BOOM_S)   sfx_boom_small();
    else if (ev & EV_DEATH)    sfx_death();
    else if (ev & EV_SHOT)     sfx_shot();
    else if (ev & EV_FIRE)     sfx_fire();
    else if (ev & EV_SPLASH)   sfx_splash();
    else if (ev & EV_HURT)     sfx_hurt();
    else if (ev & EV_TELEPORT) sfx_teleport();
    else if (ev & EV_JUMP)     sfx_jump();
    else if (ev & EV_TURN)     sfx_turn();
    else if (ev & EV_TICK)     sfx_tick();
}

bool weapon_has_timer(int w) { return worms::weapon_def((worms::Weapon)w).timed && w != worms::WP_DYNAMITE; }

void update_arsenal(uint32_t) {
    worms::Game& g = g_game;
    worms_view::State& v = g_view;
    if (input_repeat(Button::Up)) {
        do { v.arsenal_sel = (v.arsenal_sel + worms::WP_COUNT - 1) % worms::WP_COUNT; } while (false);
        sfx_cursor();
    }
    if (input_repeat(Button::Down)) { v.arsenal_sel = (v.arsenal_sel + 1) % worms::WP_COUNT; sfx_cursor(); }
    const int dir = (input_repeat(Button::Right) ? 1 : 0) - (input_repeat(Button::Left) ? 1 : 0);
    if (dir && weapon_has_timer(v.arsenal_sel)) {
        int t = (int)v.timer_pref + dir;
        v.timer_pref = (uint8_t)(t < 1 ? 1 : (t > 5 ? 5 : t));
        sfx_cursor();
    }
    if (input_was_pressed(Button::A)) {
        if (worms::weapon_usable(g, (worms::Weapon)v.arsenal_sel)) {
            worms::Input in;
            in.weapon_set = (int8_t)v.arsenal_sel;
            worms::step(g, in);
            if (g.weapon == (worms::Weapon)v.arsenal_sel && weapon_has_timer(v.arsenal_sel)) g.timer_sec = v.timer_pref;
            v.arsenal = false;
            g_a_armed = false;      // A est encore enfonce : pas de charge immediate
            sfx_menu_ok();
        } else sfx_illegal();
    }
    if (input_was_pressed(Button::B) || input_was_pressed(Button::C)) { v.arsenal = false; sfx_menu_back(); }
}

void update(uint32_t now) {
    worms::Game& g = g_game;
    worms_view::State& v = g_view;
    if (v.banner_until == 0xFFFFFFFFu) v.banner_until = now + 1400;

    if (input_was_pressed(Button::D)) { v.far = !v.far; sfx_cursor(); }

    if (v.arsenal) { update_arsenal(now); worms_view::update_camera(g, v); return; }

    worms::Input in;
    const bool human = g.phase == worms::PH_PLAY && !worms::is_ai_turn(g);
    if (worms::is_ai_turn(g)) {
        worms::ai_input(g, g_ai[g.turn_team], in);
    } else if (human) {
        in.dx = (int8_t)((input_is_held(Button::Right) ? 1 : 0) - (input_is_held(Button::Left) ? 1 : 0));
        in.dy = (int8_t)((input_is_held(Button::Down) ? 1 : 0) - (input_is_held(Button::Up) ? 1 : 0));
        if (!input_is_held(Button::A)) g_a_armed = true;
        in.a_held = g_a_armed && input_is_held(Button::A);
        in.a_pressed = g_a_armed && input_was_pressed(Button::A);
        in.b_pressed = input_was_pressed(Button::B);
        in.timer_d = (int8_t)((input_was_pressed(Button::R1) ? 1 : 0) - (input_was_pressed(Button::L1) ? 1 : 0));
        if (input_was_pressed(Button::C) && !g.charging && !g.jet_active) {
            v.arsenal = true;
            v.arsenal_sel = (int)g.weapon;
            v.timer_pref = g.timer_sec;
            sfx_menu_ok();
            return;
        }
    }
    const int turn_before = g.turn_no;
    worms::step(g, in);
    if (g.turn_no != turn_before) {
        v.banner_team = g.turn_team; v.banner_until = now + 1400; v.banner_sudden = false;
        g_a_armed = false;               // le A du tour precedent ne doit pas declencher un tir
        worms_view::snap_camera(g, v);
    }
    if (g.events & worms::EV_SUDDEN) { v.banner_sudden = true; v.banner_until = now + 1800; }
    play_events(g.events);
    g.events = 0;
    worms_view::update_camera(g, v);
}

void draw(uint32_t now) { worms_view::draw(g_game, g_view, now); }
int  winner() { return g_game.terrain ? g_game.winner : 0; }
bool far_view() { return g_view.far; }

} // namespace

const GameModule& module_worms() {
    static const GameModule m { i18n::GAME_WORMS, start, update, draw, winner, far_view };
    return m;
}

} // namespace shell
