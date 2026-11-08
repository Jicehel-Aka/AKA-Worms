/*
===============================================================================
  worms.cpp — Moteur de Worms AKA Battle (voir worms.h)
===============================================================================
*/
#include "worms.h"
#include <cmath>
#include <cstring>
#include <algorithm>

namespace worms {

static constexpr float PI_F   = 3.14159265f;
static constexpr float GRAV   = 0.14f;      // projectiles (0.28 / 2)
static constexpr float WGRAV  = 0.175f;     // vers (0.35 / 2)
static constexpr float WIND_K = 0.0075f;    // acceleration du vent par unite de vent
static constexpr float SPEED_MAX = 8.0f;    // vitesse de tir a 100 % (16 / 2)
static constexpr float POWER_RATE = 1.5f;   // % par pas de 60 Hz
static constexpr float AIM_RATE = 0.75f;    // degres par pas
static constexpr float WALK_SPEED = 0.8f;   // pixels par pas

// ---------------------------------------------------------------------------------------------------
// Donnees des armes (degats et rayons du prototype, rayons divises par deux)
// ---------------------------------------------------------------------------------------------------
static const WeaponDef kWeapons[WP_COUNT] = {
    /* BAZOOKA   */ { 48, 23, -1, false, 0, K_CHARGE },
    /* GRENADE   */ { 50, 24, -1, true,  3, K_CHARGE },
    /* CLUSTER   */ { 65, 26,  4, true,  3, K_CHARGE },
    /* BANANA    */ { 90, 32,  2, true,  4, K_CHARGE },
    /* DYNAMITE  */ { 75, 30,  3, true,  5, K_DROP },
    /* HOLY      */ {100, 37,  1, true,  3, K_CHARGE },
    /* SHOTGUN   */ { 28, 11,  5, false, 0, K_SHOT },
    /* AIRSTRIKE */ { 75, 20,  2, false, 0, K_TARGET },
    /* TELEPORT  */ {  0,  0,  3, false, 0, K_TARGET },
    /* JETPACK   */ {  0,  0,  3, false, 0, K_JET },
    /* SKIP      */ {  0,  0, -1, false, 0, K_SKIP },
};
const WeaponDef& weapon_def(Weapon w) { return kWeapons[w]; }

uint32_t rnd(Game& g) {
    uint32_t x = g.rng;
    x ^= x << 13; x ^= x >> 17; x ^= x << 5;
    g.rng = x ? x : 1u;
    return g.rng;
}
static int rnd_range(Game& g, int lo, int hi) { return lo + (int)(rnd(g) % (uint32_t)(hi - lo + 1)); }

// ---------------------------------------------------------------------------------------------------
// Aides
// ---------------------------------------------------------------------------------------------------
Worm& active_worm(Game& g) { return g.worms[g.turn_team][g.teams[g.turn_team].cur]; }
const Worm& active_worm(const Game& g) { return g.worms[g.turn_team][g.teams[g.turn_team].cur]; }
bool is_ai_turn(const Game& g) { return (g.opt.ai_mask >> g.turn_team) & 1; }
bool weapon_usable(const Game& g, Weapon w) { return g.teams[g.turn_team].ammo[w] != 0; }
bool wants_cursor(const Game& g) { return kWeapons[g.weapon].kind == K_TARGET; }

int team_hp(const Game& g, int t) {
    int s = 0;
    for (int i = 0; i < g.opt.worms_per_team; ++i) if (g.worms[t][i].alive) s += g.worms[t][i].hp;
    return s;
}
int team_alive(const Game& g, int t) {
    int n = 0;
    for (int i = 0; i < g.opt.worms_per_team; ++i) if (g.worms[t][i].alive) ++n;
    return n;
}

// Le corps occupe x-2..x+2 et y-WORM_H+1..y (y = pieds).
bool body_free(const Game& g, int x, int y) {
    if (x < 3 || x >= W - 3 || y < WORM_H) return false;
    for (int yy = y - WORM_H + 1; yy <= y; ++yy)
        for (int xx = x - 2; xx <= x + 2; ++xx)
            if (g.terrain[yy * W + xx]) return false;
    return true;
}
static bool on_ground(const Game& g, const Worm& w) {
    int x = (int)floorf(w.x), y = (int)floorf(w.y);
    for (int xx = x - 2; xx <= x + 2; ++xx) if (solid(g, xx, y + 1)) return true;
    return false;
}

// ---------------------------------------------------------------------------------------------------
// Effets
// ---------------------------------------------------------------------------------------------------
static void add_fx(Game& g, uint8_t kind, float x, float y, float vx, float vy, uint8_t life) {
    for (auto& f : g.fx) if (!f.life) { f = Fx{life, kind, x, y, vx, vy}; return; }
}
static void burst(Game& g, uint8_t kind, float x, float y, int n, float spd, uint8_t life) {
    for (int i = 0; i < n; ++i) {
        float a = (float)(rnd(g) % 628) / 100.f, s = spd * (0.3f + (float)(rnd(g) % 100) / 100.f);
        add_fx(g, kind, x, y, cosf(a) * s, sinf(a) * s - spd * 0.4f, (uint8_t)(life / 2 + rnd(g) % (life / 2 + 1)));
    }
}
static void add_text(Game& g, float x, float y, int val, uint8_t team) {
    DmgText* slot = &g.txt[0];
    for (auto& t : g.txt) if (!t.life) { slot = &t; break; }
    *slot = DmgText{(int16_t)x, (int16_t)y, (int16_t)val, 60, team};
}

static void kill_worm(Game& g, int t, int i, bool drowned) {
    Worm& w = g.worms[t][i];
    if (!w.alive) return;
    w.alive = false; w.hp = 0; w.grave = !drowned;
    g.events |= drowned ? EV_SPLASH : EV_DEATH;
    if (drowned) burst(g, 3, w.x, (float)WATER_Y, 14, 2.5f, 40);
    else burst(g, 2, w.x, w.y - 5, 12, 2.f, 30);
}
static void damage_worm(Game& g, int t, int i, int dmg) {
    Worm& w = g.worms[t][i];
    if (!w.alive || dmg <= 0) return;
    w.hp -= (int16_t)dmg; w.flash = 24;
    g.events |= EV_HURT;
    add_text(g, w.x, w.y - WORM_H - 4, dmg, (uint8_t)t);
    if (w.hp <= 0) kill_worm(g, t, i, false);
}

static void carve(Game& g, int cx, int cy, int r) {
    for (int dy = -r; dy <= r; ++dy) {
        int y = cy + dy;
        if (y < 0 || y >= H) continue;
        for (int dx = -r; dx <= r; ++dx) {
            int x = cx + dx;
            if (x < 0 || x >= W) continue;
            // bord legerement irregulier
            int rr = r * r - (int)(((x * 7 + y * 13) & 7) == 0 ? r : 0);
            if (dx * dx + dy * dy <= rr) g.terrain[y * W + x] = 0;
        }
    }
}

static void explode(Game& g, float ex, float ey, int damage, int radius, int owner) {
    carve(g, (int)ex, (int)ey, radius);
    g.events |= radius >= 28 ? EV_BOOM_L : EV_BOOM_S;
    burst(g, 0, ex, ey, 10 + radius / 2, 3.f, 40);
    burst(g, 2, ex, ey, 6 + radius / 4, 2.f, 24);
    burst(g, 1, ex, ey, 4, 1.f, 40);
    (void)owner;
    float reach = (float)radius + 6.f;
    for (int t = 0; t < TEAMS; ++t)
        for (int i = 0; i < g.opt.worms_per_team; ++i) {
            Worm& w = g.worms[t][i];
            if (!w.alive) continue;
            float cx = w.x, cy = w.y - WORM_H * 0.5f;
            float dx = cx - ex, dy = cy - ey, d = sqrtf(dx * dx + dy * dy);
            if (d >= reach) continue;
            float k = 1.f - d / reach;
            int dmg = std::max(1, (int)(damage * k));
            float inv = d > 0.5f ? 1.f / d : 0.f;
            float force = k * 5.f;
            w.vx += dx * inv * force;
            w.vy += dy * inv * force - (force > 0.5f ? 1.2f : 0.f);
            if (force > 0.8f) w.grounded = false;
            damage_worm(g, t, i, dmg);
        }
}

// ---------------------------------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------------------------------
static Projectile* new_proj(Game& g) {
    for (auto& p : g.proj) if (!p.live) { p = Projectile{}; p.live = true; return &p; }
    return nullptr;
}

// Un pas de 60 Hz. gone : 0 rien, 1 tombe a l'eau, 2 hors carte. Retourne true si doit exploser.
static bool proj_advance(const Game& g, Projectile& p, int& gone) {
    gone = 0;
    bool boom = false;
    p.age++;
    if (p.rest) {
        if (solid(g, (int)p.x, (int)p.y + 1) || p.y >= H - 1) {
            if (p.timer > 0 && --p.timer == 0) return true;
            return false;
        }
        p.rest = false;
    }
    p.vy += GRAV;
    p.vx += (float)g.wind * WIND_K * p.wind_factor;
    float mx = fabsf(p.vx), my = fabsf(p.vy);
    int n = (int)ceilf(std::max(mx, my));
    if (n < 1) n = 1;
    float sx = p.vx / n, sy = p.vy / n;
    for (int i = 0; i < n; ++i) {
        float nx = p.x + sx, ny = p.y + sy;
        if (solid(g, (int)floorf(nx), (int)floorf(ny))) {
            if (p.timer < 0) { p.x = nx; p.y = ny; return true; }   // explose au contact
            if (p.bounce > 0.f) {
                bool bx = solid(g, (int)floorf(nx), (int)floorf(p.y));
                bool by = solid(g, (int)floorf(p.x), (int)floorf(ny));
                if (bx) p.vx = -p.vx * p.bounce;
                if (by) { p.vy = -p.vy * p.bounce; p.vx *= 0.9f; }
                if (!bx && !by) { p.vx = -p.vx * p.bounce; p.vy = -p.vy * p.bounce; }
                if (by && fabsf(p.vy) < 0.6f && fabsf(p.vx) < 0.35f) { p.vx = p.vy = 0; p.rest = true; }
            } else { p.vx = p.vy = 0; p.rest = true; }
            break;
        }
        p.x = nx; p.y = ny;
    }
    if (p.timer > 0 && --p.timer == 0) boom = true;
    if (p.y >= WATER_Y) gone = 1;
    else if (p.x < -40 || p.x > W + 40 || p.y > H + 20) gone = 2;
    return boom;
}

static void setup_proj(Projectile& p, Weapon w, int timer_ticks) {
    p.weapon = w;
    const WeaponDef& d = kWeapons[w];
    p.damage = d.damage; p.radius = d.radius; p.timer = -1; p.bounce = 0.f; p.wind_factor = 1.f;
    switch (w) {
        case WP_BAZOOKA: break;
        case WP_GRENADE: p.bounce = 0.5f;  p.wind_factor = 0.4f; p.timer = (int16_t)timer_ticks; break;
        case WP_CLUSTER: p.bounce = 0.4f;  p.wind_factor = 0.4f; p.timer = (int16_t)timer_ticks; break;
        case WP_BANANA:  p.bounce = 0.8f;  p.wind_factor = 0.4f; p.timer = (int16_t)timer_ticks; break;
        case WP_HOLY:    p.bounce = 0.f;   p.wind_factor = 0.4f; p.timer = (int16_t)timer_ticks; break;
        case WP_DYNAMITE:p.bounce = 0.f;   p.wind_factor = 0.f;  p.timer = (int16_t)timer_ticks; break;
        default: break;
    }
}

void simulate_shot(const Game& g, Weapon w, float x, float y, float vx, float vy, int timer_ticks,
                   float* out_x, float* out_y) {
    Projectile p{};
    setup_proj(p, w, timer_ticks);
    p.live = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    for (int i = 0; i < 900; ++i) {
        int gone;
        bool boom = proj_advance(g, p, gone);
        if (boom || gone) break;
    }
    *out_x = p.x; *out_y = p.y;
}

static void spawn_subs(Game& g, const Projectile& p) {
    int n = p.weapon == WP_CLUSTER ? 4 : (p.weapon == WP_BANANA ? 5 : 0);
    for (int i = 0; i < n; ++i) {
        Projectile* q = new_proj(g);
        if (!q) return;
        q->weapon = p.weapon; q->sub = 1; q->x = p.x; q->y = p.y - 2;
        float a = -PI_F * (0.2f + 0.6f * (float)(rnd(g) % 100) / 100.f);
        float s = 1.8f + (float)(rnd(g) % 100) / 60.f;
        q->vx = cosf(a) * s; q->vy = sinf(a) * s;
        q->wind_factor = 0.3f; q->timer = -1; q->bounce = 0.f; q->age = 0;
        q->damage = p.weapon == WP_CLUSTER ? 25 : 35;
        q->radius = p.weapon == WP_CLUSTER ? 14 : 18;
        q->owner_team = p.owner_team;
    }
}

static void detonate(Game& g, Projectile& p) {
    p.live = false;
    explode(g, p.x, p.y, p.damage, p.radius, p.owner_team);
    if (p.sub == 0) spawn_subs(g, p);
}

static void update_projectiles(Game& g) {
    for (auto& p : g.proj) {
        if (!p.live) continue;
        int gone = 0;
        bool boom = proj_advance(g, p, gone);
        if (gone == 1) {
            g.events |= EV_SPLASH;
            burst(g, 3, p.x, (float)WATER_Y, 8, 2.f, 30);
            p.live = false; continue;
        }
        if (gone == 2) { p.live = false; continue; }
        if (!boom && p.timer < 0) {     // contact direct avec un ver
            for (int t = 0; t < TEAMS && !boom; ++t)
                for (int i = 0; i < g.opt.worms_per_team; ++i) {
                    const Worm& w = g.worms[t][i];
                    if (!w.alive) continue;
                    if (p.age < 15 && t == p.owner_team && &w == &active_worm(g)) continue;
                    if (fabsf(p.x - w.x) <= 3.5f && p.y >= w.y - WORM_H && p.y <= w.y + 1) { boom = true; break; }
                }
        }
        if (boom) detonate(g, p);
        else if (p.age % 3 == 0 && p.weapon == WP_BAZOOKA) add_fx(g, 1, p.x, p.y, 0, 0, 14);
    }
}

static void fire_weapon(Game& g) {
    Worm& me = active_worm(g);
    Team& tm = g.teams[g.turn_team];
    const WeaponDef& d = kWeapons[g.weapon];
    float a = me.aim * PI_F / 180.f;
    float dirx = me.facing * cosf(a), diry = -sinf(a);
    Projectile* p = new_proj(g);
    if (!p) return;
    float spd = std::max(1.0f, g.power / 100.f * SPEED_MAX);
    setup_proj(*p, g.weapon, g.timer_sec * 60);
    p->owner_team = g.turn_team;
    p->x = me.x + dirx * 6.f; p->y = me.y - 6.f + diry * 6.f;
    p->vx = dirx * spd; p->vy = diry * spd;
    if (d.ammo > 0 && tm.ammo[g.weapon] > 0) tm.ammo[g.weapon]--;
    g.events |= EV_FIRE;
    g.fired = true; g.charging = false; g.power = 0;
    g.turn_ticks = std::min(g.turn_ticks, RETREAT_TICKS);
}

static void drop_dynamite(Game& g) {
    Worm& me = active_worm(g);
    Projectile* p = new_proj(g);
    if (!p) return;
    setup_proj(*p, WP_DYNAMITE, g.timer_sec * 60);
    p->timer = 300;                       // toujours 5 s
    p->owner_team = g.turn_team;
    p->x = me.x + me.facing * 4.f; p->y = me.y - 2.f; p->vx = me.facing * 0.4f; p->vy = -0.5f;
    if (g.teams[g.turn_team].ammo[WP_DYNAMITE] > 0) g.teams[g.turn_team].ammo[WP_DYNAMITE]--;
    g.events |= EV_FIRE;
    g.fired = true;
    g.turn_ticks = std::min(g.turn_ticks, RETREAT_TICKS);
}

static void shoot_shotgun(Game& g) {
    Worm& me = active_worm(g);
    float a = me.aim * PI_F / 180.f;
    float dx = me.facing * cosf(a), dy = -sinf(a);
    float x = me.x + dx * 4.f, y = me.y - 6.f + dy * 4.f;
    bool hit = false;
    for (int i = 0; i < 420 && !hit; ++i) {
        x += dx; y += dy;
        if (x < 0 || x >= W || y >= H) break;
        if (solid(g, (int)x, (int)y)) { hit = true; break; }
        for (int t = 0; t < TEAMS && !hit; ++t)
            for (int k = 0; k < g.opt.worms_per_team; ++k) {
                const Worm& w = g.worms[t][k];
                if (!w.alive || &w == &me) continue;
                if (fabsf(x - w.x) <= 3.f && y >= w.y - WORM_H && y <= w.y) { hit = true; break; }
            }
        if ((i & 7) == 0) add_fx(g, 4, x, y, 0, 0, 6);
    }
    g.events |= EV_SHOT;
    if (hit) explode(g, x, y, kWeapons[WP_SHOTGUN].damage, kWeapons[WP_SHOTGUN].radius, g.turn_team);
    if (g.shots_left == 2 && g.teams[g.turn_team].ammo[WP_SHOTGUN] > 0) g.teams[g.turn_team].ammo[WP_SHOTGUN]--;
    if (g.shots_left) g.shots_left--;
    g.fired = true;
    g.turn_ticks = std::min(g.turn_ticks, RETREAT_TICKS);
}

static void airstrike(Game& g) {
    for (int i = 0; i < 4; ++i) {
        Projectile* p = new_proj(g);
        if (!p) return;
        const WeaponDef& d = kWeapons[WP_AIRSTRIKE];
        p->weapon = WP_AIRSTRIKE; p->sub = 2; p->damage = d.damage; p->radius = d.radius;
        p->x = g.cursor_x + (i - 1.5f) * 22.f; p->y = -10.f - i * 14.f;
        p->vx = 0; p->vy = 2.5f; p->wind_factor = 0; p->timer = -1; p->bounce = 0;
        p->owner_team = g.turn_team;
    }
    if (g.teams[g.turn_team].ammo[WP_AIRSTRIKE] > 0) g.teams[g.turn_team].ammo[WP_AIRSTRIKE]--;
    g.events |= EV_FIRE;
    g.fired = true;
    g.turn_ticks = std::min(g.turn_ticks, RETREAT_TICKS);
}

// ---------------------------------------------------------------------------------------------------
// Vers : deplacement, chute, jetpack
// ---------------------------------------------------------------------------------------------------
static void worm_walk(Game& g, Worm& w, int dir) {
    w.facing = (int8_t)dir;
    int ix = (int)floorf(w.x), iy = (int)floorf(w.y);
    int nx = ix + dir;
    int dyc = 0;
    bool ok = false;
    for (dyc = 0; dyc <= 3; ++dyc)
        if (body_free(g, nx, iy - dyc)) { ok = true; break; }
    if (!ok) return;
    w.x += dir * WALK_SPEED;
    if ((int)floorf(w.x) != ix) w.y -= dyc;       // franchit une marche
    // suit la pente descendante (3 px max), sinon tombe
    int snap = 0;
    while (snap < 3 && body_free(g, (int)floorf(w.x), (int)floorf(w.y) + 1) && !on_ground(g, w)) { w.y += 1; ++snap; }
}

static void update_worm_physics(Game& g, int t, int i) {
    Worm& w = g.worms[t][i];
    if (!w.alive) return;
    if (w.flash) w.flash--;
    bool is_active = (t == g.turn_team && i == g.teams[t].cur);
    bool jet = is_active && g.jet_active;
    w.grounded = on_ground(g, w);
    if (w.grounded && !jet && w.vy >= 0) {
        // impact eventuel
        if (w.vy > 4.2f) { int d = (int)((w.vy - 4.2f) * 10.f); w.vy = 0; w.vx = 0; damage_worm(g, t, i, d); }
        w.vy = 0;
        if (fabsf(w.vx) > 0.05f) {          // glisse apres un souffle
            int dir = w.vx > 0 ? 1 : -1;
            float keep = w.facing; worm_walk(g, w, dir); w.facing = (int8_t)keep;
            w.vx *= 0.8f;
        } else w.vx = 0;
        if (!w.alive) return;
    } else {
        if (!jet) w.vy = std::min(w.vy + WGRAV, 8.f);
        // horizontal
        int n = (int)ceilf(fabsf(w.vx));
        for (int k = 0; k < n; ++k) {
            float step = w.vx / n;
            int nx = (int)floorf(w.x + step), iy = (int)floorf(w.y);
            if (body_free(g, nx, iy)) w.x += step; else { w.vx = -w.vx * 0.3f; break; }
        }
        // vertical
        int m = (int)ceilf(fabsf(w.vy));
        for (int k = 0; k < m; ++k) {
            int ix = (int)floorf(w.x), iy = (int)floorf(w.y);
            if (w.vy > 0) {
                if (body_free(g, ix, iy + 1)) w.y += 1.f;
                else { w.grounded = true; break; }
            } else {
                if (body_free(g, ix, iy - 1)) w.y -= 1.f;
                else { w.vy = 0; break; }
            }
        }
        if (jet) { w.vx *= 0.97f; }
        else w.vx *= 0.99f;
    }
    if (w.y > WATER_Y && w.alive) kill_worm(g, t, i, true);
    if (w.x < 0 || w.x > W) { if (w.alive) kill_worm(g, t, i, true); }
}

// ---------------------------------------------------------------------------------------------------
// Generation des cartes — portage fidele de terrain.ts
// Les coordonnees sont celles du prototype (carte 1600x900) ; K les ramene a 800x450.
// Chaque forme est dessinee avec sa matiere (couleur du prototype) ; MAT_AIR creuse.
// ---------------------------------------------------------------------------------------------------
static constexpr float K = 0.5f;

static inline int px(float v) { return (int)lroundf(v * K); }

static void put(Game& g, int x, int y, uint8_t m) {
    if (x >= 0 && x < W && y >= 0 && y < H) g.terrain[y * W + x] = m;
}
// Rectangle (x, y, largeur, hauteur) en coordonnees du prototype
static void rect_f(Game& g, float x, float y, float w, float h, uint8_t m) {
    const int x0 = px(x), x1 = px(x + w), y0 = px(y), y1 = px(y + h);
    for (int yy = y0; yy < y1; ++yy) for (int xx = x0; xx < x1; ++xx) put(g, xx, yy, m);
}
// Ellipse pleine
static void ellipse_f(Game& g, float cx, float cy, float rx, float ry, uint8_t m) {
    const float fx = cx * K, fy = cy * K, frx = rx * K, fry = ry * K;
    for (int y = (int)floorf(fy - fry); y <= (int)ceilf(fy + fry); ++y)
        for (int x = (int)floorf(fx - frx); x <= (int)ceilf(fx + frx); ++x) {
            const float ux = ((float)x + 0.5f - fx) / frx, uy = ((float)y + 0.5f - fy) / fry;
            if (ux * ux + uy * uy <= 1.f) put(g, x, y, m);
        }
}
// Demi-disque superieur (arche) : arc de PI a 0 dans le sens horaire du canvas = moitie haute
static void half_disc_top_f(Game& g, float cx, float cy, float r, uint8_t m) {
    const float fx = cx * K, fy = cy * K, fr = r * K;
    for (int y = (int)floorf(fy - fr); y < (int)ceilf(fy); ++y)
        for (int x = (int)floorf(fx - fr); x <= (int)ceilf(fx + fr); ++x) {
            const float dx = (float)x + 0.5f - fx, dy = (float)y + 0.5f - fy;
            if (dx * dx + dy * dy <= fr * fr) put(g, x, y, m);
        }
}
// Polygone quelconque (remplissage par lignes, regle pair/impair)
static void poly_f(Game& g, const float* pts, int n, uint8_t m) {
    float xs[96];
    float ymin = 1e9f, ymax = -1e9f;
    for (int i = 0; i < n; ++i) { ymin = std::min(ymin, pts[2 * i + 1] * K); ymax = std::max(ymax, pts[2 * i + 1] * K); }
    for (int y = std::max(0, (int)floorf(ymin)); y <= std::min(H - 1, (int)ceilf(ymax)); ++y) {
        const float sy = (float)y + 0.5f;
        int c = 0;
        for (int i = 0; i < n; ++i) {
            const int j = (i + 1) % n;
            const float x0 = pts[2 * i] * K, y0 = pts[2 * i + 1] * K, x1 = pts[2 * j] * K, y1 = pts[2 * j + 1] * K;
            if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) {
                if (c < 96) xs[c++] = x0 + (sy - y0) / (y1 - y0) * (x1 - x0);
            }
        }
        std::sort(xs, xs + c);
        for (int k = 0; k + 1 < c; k += 2)
            for (int x = (int)lroundf(xs[k]); x < (int)lroundf(xs[k + 1]); ++x) put(g, x, y, m);
    }
}
// Courbe de Bezier cubique fermee par sa corde (comme moveTo/bezierCurveTo/lineTo du prototype)
static void bezier_f(Game& g, float x0, float y0, float c1x, float c1y, float c2x, float c2y, float x1, float y1, uint8_t m) {
    float pts[2 * 33];
    const int N = 32;
    for (int i = 0; i <= N; ++i) {
        const float t = (float)i / N, u = 1.f - t;
        pts[2 * i]     = u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x1;
        pts[2 * i + 1] = u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y1;
    }
    poly_f(g, pts, N + 1, m);
}

static void gen_islands(Game& g) {
    struct Isl { float x, y, w, h; };
    static const Isl isl[4] = {
        { 180, 520, 260, 180 }, { 540, 440, 320, 220 }, { 960, 480, 280, 200 }, { 1320, 540, 220, 170 } };
    for (const Isl& i : isl)                                   // base de terre sombre
        bezier_f(g, i.x - i.w / 2, i.y, i.x - i.w / 2 + 30, i.y + i.h, i.x + i.w / 2 - 30, i.y + i.h, i.x + i.w / 2, i.y, MAT_DIRT_DARK);
    for (const Isl& i : isl)                                   // couche de terre plus claire
        bezier_f(g, i.x - i.w / 2 + 15, i.y, i.x - i.w / 4, i.y + i.h * 0.7f, i.x + i.w / 4, i.y + i.h * 0.7f, i.x + i.w / 2 - 15, i.y, MAT_DIRT);
    for (const Isl& i : isl) ellipse_f(g, i.x, i.y, i.w / 2, 28, MAT_GRASS);          // calotte d'herbe
    for (const Isl& i : isl)                                                           // brins d'herbe
        for (int k = 0; k < (int)i.w; k += 8) {
            const float h = 4 + sinf((float)k * 0.5f) * 4;
            rect_f(g, i.x - i.w / 2 + k, i.y - 12 - h, 5, h + 14, MAT_GRASS_HI);
        }
    rect_f(g, 300, 500, 100, 10, MAT_WOOD);                    // ponts
    rect_f(g, 690, 450, 130, 10, MAT_WOOD);
    rect_f(g, 1090, 490, 120, 10, MAT_WOOD);
    ellipse_f(g, 760, 410, 24, 24, MAT_ROCK);                  // pitons rocheux
    ellipse_f(g, 360, 470, 18, 18, MAT_ROCK);
}

static void gen_canyon(Game& g) {
    static const float left[]  = { 0,250, 340,280, 280,500, 400,680, 0,780 };
    static const float right[] = { 1600,260, 1240,310, 1300,540, 1200,700, 1600,780 };
    poly_f(g, left, 5, MAT_SANDSTONE);
    poly_f(g, right, 5, MAT_SANDSTONE);
    ellipse_f(g, 800, 560, 260, 60, MAT_ARCH);
    ellipse_f(g, 800, 700, 320, 50, MAT_LOWER);
    ellipse_f(g, 800, 620, 140, 45, MAT_AIR);                  // cavernes
    ellipse_f(g, 200, 420, 90, 60, MAT_AIR);
    ellipse_f(g, 1400, 460, 100, 70, MAT_AIR);
    rect_f(g, 0, 240, 340, 14, MAT_SAND);                      // croute de sable
    rect_f(g, 1240, 300, 360, 14, MAT_SAND);
    rect_f(g, 560, 520, 480, 14, MAT_SAND);
}

static void gen_fortress(Game& g) {
    rect_f(g, 150, 320, 240, 420, MAT_STONE);                  // tour gauche + creneaux
    for (int i = 0; i < 240; i += 40) rect_f(g, 150.f + i, 280, 25, 40, MAT_STONE);
    rect_f(g, 1210, 320, 240, 420, MAT_STONE);                 // tour droite
    for (int i = 0; i < 240; i += 40) rect_f(g, 1210.f + i, 280, 25, 40, MAT_STONE);
    rect_f(g, 380, 520, 840, 120, MAT_STONE2);                 // rempart central
    rect_f(g, 650, 420, 300, 30, MAT_STONE3);                  // plateforme
    half_disc_top_f(g, 800, 640, 90, MAT_AIR);                 // tunnel en arche
    rect_f(g, 710, 630, 180, 80, MAT_AIR);
    rect_f(g, 230, 420, 40, 70, MAT_AIR);                      // fenetres
    rect_f(g, 1330, 420, 40, 70, MAT_AIR);
    rect_f(g, 150, 275, 240, 8, MAT_MOSS);                     // mousse
    rect_f(g, 1210, 275, 240, 8, MAT_MOSS);
    rect_f(g, 380, 515, 840, 8, MAT_MOSS);
}

static void gen_volcano(Game& g) {
    static const float left[]  = { 0,760, 550,420, 680,480, 650,760 };
    static const float right[] = { 1600,760, 1050,420, 920,480, 950,760 };
    poly_f(g, left, 4, MAT_BASALT);
    poly_f(g, right, 4, MAT_BASALT);
    ellipse_f(g, 800, 540, 180, 60, MAT_CRAG);                 // pic flottant central
    rect_f(g, 520, 415, 560, 10, MAT_LAVA);                    // veines de magma
    rect_f(g, 700, 535, 200, 8, MAT_LAVA2);
    rect_f(g, 0, 750, 550, 12, MAT_ASH);                       // cendres
    rect_f(g, 1050, 750, 550, 12, MAT_ASH);
}

static void gen_procedural(Game& g, float seed) {
    // Paysage sinusoidal : polyligne tous les 10 px (monde du prototype), interpolee
    static float hy[161];
    for (int i = 0; i <= 160; ++i) {
        const float x = (float)(i * 10);
        hy[i] = 580.f + sinf(x / 300.f + seed) * 110.f + cosf(x / 140.f + seed * 1.5f) * 60.f + sinf(x / 60.f + seed * 2.f) * 25.f;
    }
    for (int xs = 0; xs < W; ++xs) {
        const float ox = (float)xs / K;
        const int i = std::min(159, (int)(ox / 10.f));
        const float t = ox / 10.f - (float)i;
        const float y = hy[i] + (hy[i + 1] - hy[i]) * t;
        for (int ys = std::max(0, (int)lroundf(y * K)); ys < H; ++ys) put(g, xs, ys, MAT_ROCK);
    }
    for (int i = 0; i < 4; ++i) {                              // grottes
        const float cx = 250.f + i * 360.f + sinf(seed + (float)i) * 80.f;
        const float cy = 620.f + cosf(seed * 2.f + (float)i) * 60.f;
        const float r = 60.f + (float)(i % 2) * 20.f;
        ellipse_f(g, cx, cy, r, r, MAT_AIR);
    }
    for (int x = 0; x < 1600; x += 6) {                        // herbe en surface
        const int xs = px((float)x);
        int sy = -1;
        for (int ys = 100; ys < H; ++ys) if (g.terrain[ys * W + std::min(W - 1, xs)]) { sy = ys; break; }
        if (sy >= 0 && sy < WATER_Y) rect_f(g, (float)x, (float)sy / K, 6, 12, MAT_GRASS);
    }
}

static bool find_spot(Game& g, int team, int idx, int n) {
    int lo = team == 0 ? 36 : W / 2 + 20, hi = team == 0 ? W / 2 - 20 : W - 36;
    for (int attempt = 0; attempt < 400; ++attempt) {
        int x;
        if (attempt < 3) {
            int slot = (hi - lo) / n;
            x = lo + slot * idx + slot / 2 + rnd_range(g, -slot / 4, slot / 4);
        } else x = rnd_range(g, lo, hi);
        // premier sol a partir du haut
        int y = 0;
        for (; y < WATER_Y - 14; ++y)
            if (solid(g, x, y) && body_free(g, x, y - 1)) break;
        if (y >= WATER_Y - 14) continue;
        // pas trop pres d'un autre ver
        bool close = false;
        for (int t = 0; t < TEAMS && !close; ++t)
            for (int k = 0; k < n; ++k) {
                if (t == team && k >= idx) continue;
                if (t != team && k >= n) continue;
                const Worm& o = g.worms[t][k];
                if (o.alive && fabsf(o.x - x) < 24.f && fabsf(o.y - y) < 30.f) { close = true; break; }
            }
        if (close) continue;
        Worm& w = g.worms[team][idx];
        w = Worm{};
        w.x = (float)x; w.y = (float)(y - 1); w.hp = (int16_t)g.opt.hp;
        w.facing = team == 0 ? 1 : -1; w.aim = 35.f; w.alive = true; w.grounded = true;
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------------------------------
// Tours
// ---------------------------------------------------------------------------------------------------
static void begin_turn(Game& g) {
    // equipe suivante (celle qui n'a pas joue), ver suivant vivant
    g.turn_team = (uint8_t)(1 - g.turn_team);
    if (!team_alive(g, g.turn_team)) g.turn_team = (uint8_t)(1 - g.turn_team);
    Team& tm = g.teams[g.turn_team];
    for (int k = 1; k <= g.opt.worms_per_team; ++k) {
        int idx = (tm.cur + k) % g.opt.worms_per_team;
        if (g.worms[g.turn_team][idx].alive) { tm.cur = (uint8_t)idx; break; }
    }
    g.turn_no++;
    g.turn_ticks = g.opt.turn_sec * 60;
    g.fired = false; g.charging = false; g.power = 0; g.shots_left = 2;
    g.weapon = WP_BAZOOKA; g.timer_sec = 3; g.jet_active = false; g.jet_fuel = 0;
    const Worm& w = active_worm(g);
    g.cursor_x = w.x; g.cursor_y = w.y - 40.f;
    static const float scale[4] = {0.f, 0.4f, 1.f, 1.8f};
    g.wind_scale = scale[g.opt.wind_mode & 3];
    int wv = (int)lroundf((float)rnd_range(g, -10, 10) * g.wind_scale);
    g.wind = std::max(-10, std::min(10, wv));
    if (g.turn_no == 41) {                       // mort subite
        g.sudden = true;
        for (int t = 0; t < TEAMS; ++t)
            for (int i = 0; i < g.opt.worms_per_team; ++i) if (g.worms[t][i].alive) g.worms[t][i].hp = 1;
        g.events |= EV_SUDDEN;
    }
    g.phase = PH_PLAY;
    g.events |= EV_TURN;
}

static void end_turn_now(Game& g) {
    g.charging = false; g.power = 0; g.jet_active = false;
    g.phase = PH_SETTLE; g.settle_ticks = 0; g.quiet_ticks = 0;
}

void init(Game& g, uint8_t* terrain_mem) {
    std::memset((void*)&g, 0, sizeof(g));
    g.terrain = terrain_mem;
    g.rng = 1;
}

void start(Game& g, const MatchOptions& o) {
    uint8_t* mem = g.terrain;
    std::memset((void*)&g, 0, sizeof(g));
    g.terrain = mem;
    g.opt = o;
    g.opt.worms_per_team = std::max<uint8_t>(1, std::min<uint8_t>(MAX_WORMS, o.worms_per_team));
    g.rng = o.seed ? o.seed : 1u;
    for (int i = 0; i < 4; ++i) rnd(g);
    std::memset(g.terrain, 0, (size_t)W * H);
    switch (o.map) {
        case MAP_ISLANDS:   gen_islands(g); break;
        case MAP_CANYON:    gen_canyon(g); break;
        case MAP_FORTRESS:  gen_fortress(g); break;
        case MAP_VOLCANO:   gen_volcano(g); break;
        default:            gen_procedural(g, (float)(rnd(g) % 100000u) / 1000.f); break;
    }
    const int n = g.opt.worms_per_team;
    for (int t = 0; t < TEAMS; ++t) {
        for (int w = 0; w < WP_COUNT; ++w) g.teams[t].ammo[w] = kWeapons[w].ammo;
        g.teams[t].cur = (uint8_t)(n - 1);
        for (int i = 0; i < n; ++i) {
            if (!find_spot(g, t, i, n)) {
                // dernier recours : plateforme sous les pieds
                int x = t == 0 ? 60 + i * 35 : W - 60 - i * 35;
                for (int yy = 250; yy < 262; ++yy) for (int xx = x - 15; xx <= x + 15; ++xx) put(g, xx, yy, MAT_STONE);
                Worm& w = g.worms[t][i];
                w = Worm{}; w.x = (float)x; w.y = 249.f; w.hp = (int16_t)g.opt.hp;
                w.facing = t == 0 ? 1 : -1; w.aim = 35.f; w.alive = true;
            }
        }
    }
    g.turn_team = (uint8_t)(rnd(g) & 1);   // begin_turn inverse : l'equipe tiree commence 2e, donc on inverse
    g.turn_team ^= 1;
    begin_turn(g);
    g.events = 0;
}

// ---------------------------------------------------------------------------------------------------
// Boucle
// ---------------------------------------------------------------------------------------------------
static void handle_input(Game& g, const Input& in, bool first) {
    if (g.phase != PH_PLAY) return;
    Worm& me = active_worm(g);
    if (!me.alive) { end_turn_now(g); return; }
    const WeaponDef& d = kWeapons[g.weapon];

    if (first && in.weapon_set >= 0 && in.weapon_set < WP_COUNT && !g.charging && !g.jet_active) {
        Weapon w = (Weapon)in.weapon_set;
        bool allowed = weapon_usable(g, w) && (!g.fired || (w == WP_SHOTGUN && g.shots_left > 0 && g.weapon == WP_SHOTGUN));
        if (allowed) {
            g.weapon = w; g.power = 0;
            g.timer_sec = kWeapons[w].default_timer ? kWeapons[w].default_timer : 3;
            g.cursor_x = me.x; g.cursor_y = me.y - 40.f;
        }
    }
    if (first && in.timer_d && d.timed && g.weapon != WP_DYNAMITE)
        g.timer_sec = (uint8_t)std::max(1, std::min(5, g.timer_sec + in.timer_d));

    // Jetpack actif : commandes de vol
    if (g.jet_active) {
        if (in.dx) me.facing = in.dx;
        if (in.dy < 0 && g.jet_fuel > 0) {
            me.vy = std::max(me.vy - 0.28f, -2.4f);
            g.jet_fuel -= 1.f;
            if ((g.tick & 3) == 0) add_fx(g, 2, me.x, me.y, 0, 1.2f, 14);
        }
        if (in.dx) me.vx = std::max(-1.6f, std::min(1.6f, me.vx + in.dx * 0.12f));
        if (first && (in.b_pressed || (g.jet_fuel <= 0 && me.grounded))) g.jet_active = false;
        return;
    }

    const bool charge_weapon = d.kind == K_CHARGE && !g.fired;

    // Curseur (teleport / frappe aerienne)
    if (d.kind == K_TARGET && !g.fired) {
        g.cursor_x = std::max(4.f, std::min((float)W - 4.f, g.cursor_x + in.dx * 3.f));
        g.cursor_y = std::max(4.f, std::min((float)H - 4.f, g.cursor_y + in.dy * 3.f));
        if (first && in.a_pressed) {
            if (g.weapon == WP_AIRSTRIKE) airstrike(g);
            else if (body_free(g, (int)g.cursor_x, (int)g.cursor_y)) {
                me.x = g.cursor_x; me.y = g.cursor_y; me.vx = me.vy = 0;
                if (g.teams[g.turn_team].ammo[WP_TELEPORT] > 0) g.teams[g.turn_team].ammo[WP_TELEPORT]--;
                g.events |= EV_TELEPORT;
                burst(g, 4, me.x, me.y - 5, 10, 2.f, 20);
                g.fired = true;
                g.turn_ticks = std::min(g.turn_ticks, RETREAT_TICKS);
            }
        }
        return;
    }

    // Marche / visee (pas pendant la charge)
    if (!g.charging) {
        if (in.face) me.facing = in.face;
        if (in.dx && me.grounded) worm_walk(g, me, in.dx);
        else if (in.dx) me.facing = in.dx;
        if (first && in.b_pressed && me.grounded) {
            me.vy = -3.3f; me.vx = me.facing * 1.2f; me.grounded = false; g.events |= EV_JUMP;
        }
    }
    if (in.dy) me.aim = std::max(-20.f, std::min(85.f, me.aim - in.dy * AIM_RATE));

    switch (d.kind) {
        case K_CHARGE:
            if (!charge_weapon) break;
            if (in.a_held) {
                g.charging = true;
                g.power = std::min(100.f, g.power + POWER_RATE);
                if (g.power >= 100.f) fire_weapon(g);
            } else if (g.charging) {
                fire_weapon(g);
            }
            break;
        case K_DROP:
            if (first && in.a_pressed && !g.fired) drop_dynamite(g);
            break;
        case K_SHOT:
            if (first && in.a_pressed && g.shots_left > 0) shoot_shotgun(g);
            break;
        case K_JET:
            if (first && in.a_pressed && !g.fired) {
                g.jet_active = true; g.jet_fuel = 180.f;
                if (g.teams[g.turn_team].ammo[WP_JETPACK] > 0) g.teams[g.turn_team].ammo[WP_JETPACK]--;
                me.grounded = false; me.vy = -1.f;
            }
            break;
        case K_SKIP:
            if (first && in.a_pressed) { g.fired = true; end_turn_now(g); }
            break;
        default: break;
    }
}

static void sim_tick(Game& g, const Input& in, bool first) {
    g.tick++;
    handle_input(g, in, first);
    update_projectiles(g);
    for (int t = 0; t < TEAMS; ++t)
        for (int i = 0; i < g.opt.worms_per_team; ++i) update_worm_physics(g, t, i);

    for (auto& f : g.fx) {
        if (!f.life) continue;
        f.x += f.vx; f.y += f.vy;
        if (f.kind == 0 || f.kind == 3) f.vy += 0.08f;
        if (f.kind == 1) f.vy -= 0.01f;
        --f.life;
    }
    for (auto& t : g.txt) if (t.life) { --t.life; if (!(g.tick & 1)) t.y--; }

    switch (g.phase) {
        case PH_PLAY:
            if (!active_worm(g).alive) { end_turn_now(g); break; }
            if (g.jet_active) break;                       // le chrono s'arrete pendant le vol
            if (g.turn_ticks > 0) {
                --g.turn_ticks;
                if (!g.fired && g.turn_ticks <= 300 && g.turn_ticks % 60 == 0 && g.turn_ticks > 0) g.events |= EV_TICK;
            }
            if (g.turn_ticks <= 0 && !g.charging) end_turn_now(g);
            else if (g.turn_ticks <= 0 && g.charging) { fire_weapon(g); end_turn_now(g); }
            break;
        case PH_SETTLE: {
            bool busy = false;
            for (auto& p : g.proj) if (p.live) { busy = true; break; }
            for (int t = 0; t < TEAMS && !busy; ++t)
                for (int i = 0; i < g.opt.worms_per_team; ++i) {
                    const Worm& w = g.worms[t][i];
                    if (w.alive && (!w.grounded || fabsf(w.vx) > 0.1f)) { busy = true; break; }
                }
            ++g.settle_ticks;
            g.quiet_ticks = busy ? 0 : g.quiet_ticks + 1;
            if (g.quiet_ticks >= 45 || g.settle_ticks > 1500) { g.phase = PH_NEXT; g.next_ticks = 30; }
            break;
        }
        case PH_NEXT:
            if (--g.next_ticks <= 0) {
                int a0 = team_alive(g, 0), a1 = team_alive(g, 1);
                if (!a0 && !a1) { g.winner = 3; g.phase = PH_OVER; }
                else if (!a0) { g.winner = 2; g.phase = PH_OVER; }
                else if (!a1) { g.winner = 1; g.phase = PH_OVER; }
                else begin_turn(g);
            }
            break;
        case PH_OVER: break;
    }
}

void step(Game& g, const Input& in) {
    sim_tick(g, in, true);
    sim_tick(g, in, false);
}

} // namespace worms
