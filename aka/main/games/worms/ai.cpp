/*
===============================================================================
  ai.cpp — IA balistique de Worms AKA Battle (portage de ai.ts)
  Elle ne triche pas : elle produit les memes Input qu'un joueur (D-Pad, A, B).
  Elle cherche (elevation, puissance) en simulant la trajectoire avec le vent reel.
===============================================================================
*/
#include "worms.h"
#include <cmath>
#include <cstring>

namespace worms {

static constexpr float PI_F = 3.14159265f;

void ai_reset(AiState& s) {
    std::memset((void*)&s, 0, sizeof(s));
    s.rng = 0x9E3779B9u;
}

static uint32_t ai_rnd(AiState& s) {
    s.rng ^= s.rng << 13; s.rng ^= s.rng >> 17; s.rng ^= s.rng << 5;
    return s.rng;
}
static float ai_noise(AiState& s, float amp) {
    return ((float)(ai_rnd(s) % 2001) / 1000.f - 1.f) * amp;
}

static void plan(const Game& g, AiState& s) {
    const Worm& me = active_worm(g);
    const int enemy_team = 1 - g.turn_team;
    // cible : l'ennemi le plus proche (le Maitre prefere un ver affaibli a distance comparable)
    const Worm* tgt = nullptr; float best = 1e9f;
    for (int i = 0; i < g.opt.worms_per_team; ++i) {
        const Worm& e = g.worms[enemy_team][i];
        if (!e.alive) continue;
        float d = fabsf(e.x - me.x) + fabsf(e.y - me.y) * 0.5f;
        if (g.opt.ai_level >= 2) d += e.hp * 0.6f;
        if (d < best) { best = d; tgt = &e; }
    }
    s.planned = true; s.turn_key = (uint32_t)g.turn_no; s.phase = 1; s.wait = 0; s.flee_ticks = 0;
    if (!tgt) { s.weapon = WP_SKIP; return; }
    const float tx = tgt->x, ty = tgt->y - 5.f;
    s.face = tx >= me.x ? 1 : -1;

    static const Weapon cand_all[] = { WP_BAZOOKA, WP_GRENADE, WP_CLUSTER, WP_HOLY, WP_BANANA };
    const int ncand = g.opt.ai_level == 0 ? 2 : 5;

    float best_score = -1.f, best_dist = 1e9f;
    Weapon bw = WP_BAZOOKA; float be = 45.f, bp = 60.f;
    for (int ci = 0; ci < ncand; ++ci) {
        Weapon w = cand_all[ci];
        if (!weapon_usable(g, w)) continue;
        const WeaponDef& def = weapon_def(w);
        int timer = def.timed ? def.default_timer * 60 : -1;
        for (int elev = 12; elev <= 80; elev += 4) {
            float a = (float)elev * PI_F / 180.f;
            float dx = s.face * cosf(a), dy = -sinf(a);
            for (int pw = 20; pw <= 100; pw += 4) {
                float spd = (float)pw / 100.f * 8.f;
                float lx, ly;
                simulate_shot(g, w, me.x + dx * 6.f, me.y - 6.f + dy * 6.f, dx * spd, dy * spd, timer, &lx, &ly);
                float d = hypotf(lx - tx, ly - ty);
                float dself = hypotf(lx - me.x, ly - (me.y - 5.f));
                if (dself < def.radius + 14.f) continue;      // ne pas se tirer dessus
                float reach = def.radius + 6.f;
                float score = d < reach ? def.damage * (1.f - d / reach) : 0.f;
                if (score > best_score + 0.5f || (score <= 0.5f && best_score <= 0.5f && d < best_dist)) {
                    if (score > best_score) best_score = score;
                    best_dist = d; bw = w; be = (float)elev; bp = (float)pw;
                }
            }
        }
    }
    // Pas de solution correcte : on avance un peu (3 fois max), sinon on tire au plus pres
    if (best_score <= 3.f && s.walks < 3 && best_dist > 20.f) {
        s.walks++; s.phase = 0; s.walk_dir = s.face; s.walk_ticks = 20 + (int)(ai_rnd(s) % 20);
        return;
    }
    float eerr = 0, perr = 0;
    if (g.opt.ai_level == 0) { eerr = 8; perr = 12; } else if (g.opt.ai_level == 1) { eerr = 3; perr = 5; }
    s.weapon = bw;
    s.elev = be + ai_noise(s, eerr);
    s.power = bp + ai_noise(s, perr);
    if (s.power > 100.f) s.power = 100.f;
    if (s.power < 15.f) s.power = 15.f;
    s.timer_sec = weapon_def(bw).default_timer;
}

void ai_input(const Game& g, AiState& s, Input& in) {
    in = Input{};
    if (g.phase != PH_PLAY) { s.planned = false; s.walks = 0; return; }
    if (!s.planned || s.turn_key != (uint32_t)g.turn_no) { s.walks = 0; plan(g, s); }
    const Worm& me = active_worm(g);

    switch (s.phase) {
        case 0:                                           // marche vers la cible
            in.dx = s.walk_dir;
            if (--s.walk_ticks <= 0) { s.planned = false; s.turn_key = (uint32_t)g.turn_no; plan(g, s); }
            break;
        case 1:                                           // arme + minuterie + regard
            in.face = s.face;
            if (s.weapon == WP_SKIP) { if (g.weapon != WP_SKIP) in.weapon_set = WP_SKIP; else in.a_pressed = true; break; }
            if (g.weapon != s.weapon) { in.weapon_set = (int8_t)s.weapon; break; }
            if (g.timer_sec != s.timer_sec) { in.timer_d = g.timer_sec < s.timer_sec ? 1 : -1; break; }
            s.phase = 2;
            break;
        case 2: {                                         // visee
            in.face = s.face;
            float diff = s.elev - me.aim;
            if (diff > 1.0f) in.dy = -1;
            else if (diff < -1.0f) in.dy = 1;
            else s.phase = 3;
            break;
        }
        case 3:                                           // charge puis relache
            if (!g.fired) {
                if (g.power < s.power - 1.f) in.a_held = true;
                else if (g.charging) in.a_held = false;   // relache -> tir
                else in.a_held = true;
            }
            if (g.fired) { s.phase = 4; s.flee_ticks = 45; s.flee_dir = (int8_t)-s.face; }
            break;
        case 4:                                           // fuite apres le tir
            if (s.flee_ticks > 0) { in.dx = s.flee_dir; --s.flee_ticks; }
            break;
    }
}

} // namespace worms
