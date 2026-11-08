/*
===============================================================================
  worms_view.cpp — voir worms_view.h
===============================================================================
*/
#include "worms_view.h"
#include <cmath>
#include <cstdio>
#include <cstring>
#include <algorithm>
#include "../../core/graphics.h"
#include "../../shell/ui.h"
#include "../../shell/i18n.h"

using namespace core;
using namespace worms;

namespace worms_view {

namespace {

constexpr int AREA_Y = ui::TOP_H;                 // 18
constexpr int AREA_H = ui::MID_H;                 // 208
constexpr int SCR_W  = ui::SCR_W;
constexpr int FAR_H  = 180;                       // 450 * 0,4
constexpr int FAR_OY = (AREA_H - FAR_H) / 2;      // marge haute en vue carte

uint16_t sky_[H], water_[H], mat_[MAT_COUNT], mat_dark_[MAT_COUNT];
uint16_t C_FOAM, C_TEAM[2], C_TEAM_D[2], C_SKIN, C_BLACK, C_WHITE, C_GRAVE, C_VOID;
uint16_t C_EARTH, C_SMOKE, C_FIRE1, C_FIRE2, C_SPARK, C_SPLASH, C_ROCKET, C_GREEN, C_GOLD, C_RED;
uint8_t  wave_lut_[32];

inline int lerp(int a, int b, int t, int n) { return a + (b - a) * t / n; }

const WeaponDef& wd(Weapon w) { return weapon_def(w); }

const i18n::StrId kWeaponName[WP_COUNT] = {
    i18n::STR_W_BAZOOKA, i18n::STR_W_GRENADE, i18n::STR_W_CLUSTER, i18n::STR_W_BANANA, i18n::STR_W_DYNAMITE,
    i18n::STR_W_HOLY, i18n::STR_W_SHOTGUN, i18n::STR_W_AIRSTRIKE, i18n::STR_W_TELEPORT, i18n::STR_W_JETPACK,
    i18n::STR_W_SKIP };

// Conversion monde -> ecran
struct Cam {
    bool far; int ox, oy;
    int sx(float wx) const { return far ? (int)(wx * 0.4f) : (int)floorf(wx) - ox; }
    int sy(float wy) const { return AREA_Y + (far ? FAR_OY + (int)(wy * 0.4f) : (int)floorf(wy) - oy); }
};
Cam make_cam(const State& s) {
    Cam c; c.far = s.far;
    c.ox = (int)s.cam_x; c.oy = (int)s.cam_y;
    return c;
}

// ---------------------------------------------------------------------------------------------------
// Decor
// ---------------------------------------------------------------------------------------------------
inline uint16_t px_color(uint8_t t, int wx, int wy, bool detail, uint32_t now) {
    if (t) {
        if (t >= MAT_COUNT) return mat_[MAT_DIRT];
        return (detail && t != MAT_LAVA && t != MAT_LAVA2 && ((wx * 7 + wy * 13) & 31) == 0) ? mat_dark_[t] : mat_[t];
    }
    // air
    const int wl = WATER_Y + wave_lut_[((wx >> 2) + (int)(now >> 7)) & 31];
    if (wy < wl) return sky_[wy];
    if (wy == wl) return C_FOAM;
    return water_[std::min(wy, H - 1)];
}

void draw_terrain(const Game& g, const State& s, uint32_t now) {
    const Cam cam = make_cam(s);
    const bool detail = !s.far;
    for (int r = 0; r < AREA_H; ++r) {
        const int sy = AREA_Y + r;
        int wy;
        if (s.far) {
            const int rr = r - FAR_OY;
            if (rr < 0 || rr >= FAR_H) { graphics_fill_rect_raw(0, sy, SCR_W, 1, C_VOID); continue; }
            wy = (rr * 5) >> 1;
        } else wy = cam.oy + r;
        if (wy < 0) wy = 0;
        if (wy >= H) wy = H - 1;
        const uint8_t* row = g.terrain + wy * W;
        int run_x = 0;
        uint16_t run_c = 0; bool first = true;
        for (int x = 0; x < SCR_W; ++x) {
            const int wx = s.far ? (x * 5) >> 1 : cam.ox + x;
            const uint16_t c = px_color(row[wx], wx, wy, detail, now);
            if (first) { run_c = c; first = false; }
            else if (c != run_c) {
                graphics_fill_rect_raw(run_x, sy, x - run_x, 1, run_c);
                run_x = x; run_c = c;
            }
        }
        graphics_fill_rect_raw(run_x, sy, SCR_W - run_x, 1, run_c);
    }
}

// ---------------------------------------------------------------------------------------------------
// Entites
// ---------------------------------------------------------------------------------------------------
void draw_text_small(int x, int y, const char* t, uint16_t c) { graphics_draw_text_raw(x, y, t, c); }

void draw_worm(const Game& g, const State& s, const Cam& cam, int t, int i, uint32_t now) {
    const Worm& w = g.worms[t][i];
    const int x = cam.sx(w.x), y = cam.sy(w.y);
    if (x < -12 || x > SCR_W + 12 || y < AREA_Y - 14 || y > AREA_Y + AREA_H + 14) return;
    const bool active = (t == g.turn_team && i == g.teams[t].cur && g.phase == PH_PLAY);

    if (!w.alive) {
        if (!w.grave) return;
        if (s.far) { graphics_fill_rect_raw(x - 1, y - 2, 3, 3, C_GRAVE); return; }
        graphics_fill_rect_raw(x - 2, y - 6, 5, 7, C_GRAVE);
        graphics_fill_rect_raw(x - 1, y - 7, 3, 1, C_GRAVE);
        graphics_fill_rect_raw(x, y - 5, 1, 4, C_WHITE);
        graphics_fill_rect_raw(x - 1, y - 4, 3, 1, C_WHITE);
        return;
    }
    const bool blink = w.flash && ((w.flash >> 1) & 1);
    const uint16_t body = blink ? C_WHITE : C_TEAM[t];
    const uint16_t dark = blink ? C_WHITE : C_TEAM_D[t];
    if (s.far) {
        graphics_fill_rect_raw(x - 1, y - 4, 3, 4, active ? C_WHITE : body);
        graphics_fill_rect_raw(x - 1, y - 4, 3, 2, body);
        return;
    }
    graphics_fill_rect_raw(x - 2, y - 9, 5, 2, body);           // casque
    graphics_fill_rect_raw(x - 2, y - 7, 5, 3, C_SKIN);          // visage
    graphics_draw_pixel_raw(x + w.facing, y - 6, C_BLACK);       // oeil
    graphics_fill_rect_raw(x - 2, y - 4, 5, 5, dark);            // corps
    graphics_fill_rect_raw(x - 1, y - 3, 3, 1, body);
    // PV au-dessus du ver
    char b[8]; snprintf(b, sizeof b, "%d", (int)w.hp);
    const int tw = graphics_text_width(b);
    draw_text_small(x - tw / 2, y - 21, b, active ? C_WHITE : C_TEAM[t]);
    if (active) {                                                // fleche qui rebondit
        const int bob = (int)((now / 150) & 3);
        graphics_fill_triangle_raw(x - 3, y - 28 + bob, x + 3, y - 28 + bob, x, y - 24 + bob, C_GOLD);
    }
}

void draw_projectile(const Game&, const State& s, const Cam& cam, const Projectile& p) {
    const int x = cam.sx(p.x), y = cam.sy(p.y);
    if (x < -8 || x > SCR_W + 8 || y < AREA_Y - 8 || y > AREA_Y + AREA_H + 8) return;
    const int k = s.far ? 1 : 2;
    uint16_t c = C_ROCKET;
    switch (p.weapon) {
        case WP_BAZOOKA: c = C_ROCKET; break;
        case WP_GRENADE: c = C_GREEN; break;
        case WP_CLUSTER: c = p.sub ? C_WHITE : C_SMOKE; break;
        case WP_BANANA:  c = C_GOLD; break;
        case WP_HOLY:    c = C_GOLD; break;
        case WP_DYNAMITE:c = C_RED; break;
        case WP_AIRSTRIKE: c = C_RED; break;
        default: break;
    }
    if (p.weapon == WP_DYNAMITE) {
        graphics_fill_rect_raw(x - 1, y - (s.far ? 2 : 5), s.far ? 2 : 3, s.far ? 3 : 6, C_RED);
        if (!s.far && ((p.age >> 2) & 1)) graphics_draw_pixel_raw(x, y - 7, C_FIRE2);
    } else if (p.weapon == WP_AIRSTRIKE) {
        graphics_fill_rect_raw(x - 1, y - (s.far ? 2 : 5), s.far ? 2 : 3, s.far ? 3 : 7, c);
    } else {
        graphics_fill_rect_raw(x - k / 2, y - k / 2, k + 1, k + 1, c);
        if (p.weapon == WP_BAZOOKA && !s.far)
            graphics_draw_line_raw(x, y, x - (int)(p.vx * 1.5f), y - (int)(p.vy * 1.5f), C_FIRE2);
    }
    if (!s.far && p.timer > 0 && p.sub == 0 && p.weapon != WP_BAZOOKA) {
        char b[12]; snprintf(b, sizeof b, "%d", (p.timer + 59) / 60);
        draw_text_small(x - 3, y - 14, b, C_WHITE);
    }
}

void draw_fx(const Game& g, const State& s, const Cam& cam) {
    for (const Fx& f : g.fx) {
        if (!f.life) continue;
        const int x = cam.sx(f.x), y = cam.sy(f.y);
        if (x < 0 || x >= SCR_W || y < AREA_Y || y >= AREA_Y + AREA_H) continue;
        uint16_t c = C_EARTH;
        switch (f.kind) {
            case 0: c = C_EARTH; break;
            case 1: c = C_SMOKE; break;
            case 2: c = (f.life & 2) ? C_FIRE1 : C_FIRE2; break;
            case 3: c = C_SPLASH; break;
            default: c = C_SPARK; break;
        }
        const int sz = s.far ? 1 : (f.kind == 1 && f.life > 8 ? 3 : 2);
        graphics_fill_rect_raw(x, y, sz, sz, c);
    }
    for (const DmgText& t : g.txt) {
        if (!t.life) continue;
        char b[8]; snprintf(b, sizeof b, "%d", (int)t.val);
        const int x = cam.sx(t.x) - graphics_text_width(b) / 2, y = cam.sy(t.y);
        if (y < AREA_Y || y > AREA_Y + AREA_H - 8) continue;
        graphics_draw_text_raw(x + 1, y + 1, b, C_BLACK);
        graphics_draw_text_raw(x, y, b, C_TEAM[t.team & 1]);
    }
}

void draw_aim(const Game& g, const State& s, const Cam& cam) {
    if (g.phase != PH_PLAY) return;
    const Worm& me = active_worm(g);
    if (!me.alive) return;
    const WeaponDef& d = wd(g.weapon);
    if (d.kind == K_TARGET) {
        if (g.fired) return;
        const int cx = cam.sx(g.cursor_x), cy = cam.sy(g.cursor_y);
        graphics_draw_rect_raw(cx - 5, cy - 5, 11, 11, C_GOLD);
        graphics_draw_line_raw(cx - 8, cy, cx + 8, cy, C_GOLD);
        graphics_draw_line_raw(cx, cy - 8, cx, cy + 8, C_GOLD);
        return;
    }
    if (d.kind != K_CHARGE && d.kind != K_SHOT && d.kind != K_DROP) return;
    if (g.fired && !(d.kind == K_SHOT && g.shots_left > 0)) return;
    if (g.jet_active) return;
    const float a = me.aim * 3.14159265f / 180.f;
    const float dx = me.facing * cosf(a), dy = -sinf(a);
    const int x0 = cam.sx(me.x), y0 = cam.sy(me.y - 6);
    const float k = s.far ? 0.4f : 1.f;
    const float reach = 26.f * k + 6.f;
    const int rx = x0 + (int)(dx * reach), ry = y0 + (int)(dy * reach);
    graphics_draw_line_raw(rx - 2, ry, rx + 2, ry, C_WHITE);
    graphics_draw_line_raw(rx, ry - 2, rx, ry + 2, C_WHITE);
    if (g.charging && d.kind == K_CHARGE) {
        const int n = (int)(g.power / 100.f * 14.f);
        for (int i = 1; i <= n; ++i) {
            const float r = (6.f + i * 3.f) * k;
            const uint16_t c = i < 6 ? C_GREEN : (i < 10 ? C_GOLD : C_RED);
            graphics_fill_rect_raw(x0 + (int)(dx * r), y0 + (int)(dy * r), 2, 2, c);
        }
    }
}

// ---------------------------------------------------------------------------------------------------
// Bandeaux
// ---------------------------------------------------------------------------------------------------
void draw_team_block(const Game& g, const State& s, int t, bool left) {
    int hp = team_hp(g, t);
    const int max_hp = std::max(1, g.opt.worms_per_team * (int)g.opt.hp);
    const int bw = 100;
    const int x = left ? 4 : SCR_W - 4 - bw;
    const bool turn = (g.turn_team == t && g.phase == PH_PLAY);
    graphics_draw_text_raw(x, 1, team_name(t, s.vs_ai), turn ? C_WHITE : C_TEAM[t]);
    graphics_fill_rect_raw(x, 11, bw, 5, ui::C_BG);
    const int fw = std::min(bw, bw * hp / max_hp);
    if (fw > 0) graphics_fill_rect_raw(x, 11, fw, 5, C_TEAM[t]);
    graphics_draw_rect_raw(x - 1, 10, bw + 2, 7, turn ? C_GOLD : ui::C_DIM);
}

void draw_top_bar(const Game& g, const State& s) {
    graphics_fill_rect_raw(0, 0, SCR_W, ui::TOP_H, ui::C_BAR);
    draw_team_block(g, s, 0, true);
    draw_team_block(g, s, 1, false);
    // chrono
    char b[8];
    const int sec = std::max(0, (g.turn_ticks + 59) / 60);
    snprintf(b, sizeof b, "%d", g.phase == PH_PLAY ? sec : 0);
    const bool urgent = g.phase == PH_PLAY && !g.fired && sec <= 5;
    graphics_draw_text_raw(SCR_W / 2 - graphics_text_width(b) / 2, 1, b, urgent ? C_RED : ui::C_TEXT);
    // vent : fleche proportionnelle
    const int cx = SCR_W / 2, cy = 13;
    graphics_fill_rect_raw(cx - 50, cy - 1, 101, 3, ui::C_BG);
    graphics_fill_rect_raw(cx, cy - 3, 1, 7, ui::C_DIM);
    if (g.wind) {
        const int len = std::abs(g.wind) * 5, dir = g.wind > 0 ? 1 : -1;
        graphics_fill_rect_raw(dir > 0 ? cx : cx - len, cy - 1, len, 3, C_FOAM);
        graphics_fill_triangle_raw(cx + dir * len, cy - 4, cx + dir * len, cy + 4, cx + dir * (len + 5), cy, C_FOAM);
    }
}

void draw_bottom_bar(const Game& g, const State&) {
    graphics_fill_rect_raw(0, ui::SCR_H - ui::BOT_H, SCR_W, ui::BOT_H, ui::C_BAR);
    const int y = ui::SCR_H - ui::BOT_H + 3;
    const WeaponDef& d = wd(g.weapon);
    char b[48];
    const int ammo = g.teams[g.turn_team].ammo[g.weapon];
    if (ammo >= 0) snprintf(b, sizeof b, "%s x%d", i18n::T(kWeaponName[g.weapon]), ammo);
    else           snprintf(b, sizeof b, "%s", i18n::T(kWeaponName[g.weapon]));
    graphics_draw_text_raw(4, y, b, ui::C_TEXT);
    if (d.timed && g.weapon != WP_DYNAMITE) {
        snprintf(b, sizeof b, "%ds", (int)g.timer_sec);
        graphics_draw_text_raw(150, y, b, ui::C_ACCENT);
    }
    // jauge de puissance / carburant
    if (g.jet_active) {
        const int fw = (int)(g.jet_fuel / 180.f * 100.f);
        graphics_fill_rect_raw(212, y, 100, 7, ui::C_BG);
        graphics_fill_rect_raw(212, y, std::max(0, fw), 7, C_FIRE1);
        graphics_draw_rect_raw(211, y - 1, 102, 9, ui::C_DIM);
    } else if (d.kind == K_CHARGE) {
        const int fw = (int)g.power;
        graphics_fill_rect_raw(212, y, 100, 7, ui::C_BG);
        for (int i = 0; i < fw; i += 2) {
            const uint16_t c = i < 50 ? C_GREEN : (i < 80 ? C_GOLD : C_RED);
            graphics_fill_rect_raw(212 + i, y, 2, 7, c);
        }
        graphics_draw_rect_raw(211, y - 1, 102, 9, ui::C_DIM);
    } else if (d.kind == K_TARGET) {
        graphics_draw_text_raw(SCR_W - 4 - graphics_text_width(i18n::T(i18n::STR_CURSOR_HINT)), y,
                               i18n::T(i18n::STR_CURSOR_HINT), ui::C_ACCENT);
    }
}

void draw_arsenal(const Game& g, const State& s) {
    const int rows = WP_COUNT, rh = 15;
    const int w = 250, h = 26 + rows * rh + 4;
    const int x = (SCR_W - w) / 2, y = (ui::SCR_H - h) / 2;
    graphics_fill_rect_raw(x, y, w, h, ui::C_MENU_BG);
    graphics_draw_rect_raw(x, y, w, h, ui::C_ACCENT);
    graphics_draw_text_center_raw(y + 6, i18n::T(i18n::STR_ARSENAL), ui::C_ACCENT);
    for (int i = 0; i < rows; ++i) {
        const int iy = y + 22 + i * rh;
        const bool ok = weapon_usable(g, (Weapon)i);
        if (i == s.arsenal_sel) graphics_fill_rect_raw(x + 4, iy - 2, w - 8, rh - 1, ui::C_MENU_SEL);
        const uint16_t col = !ok ? ui::C_DIM : (i == s.arsenal_sel ? ui::C_TEXT : ui::C_TEXT);
        graphics_draw_text_raw(x + 10, iy + 1, i18n::T(kWeaponName[i]), ok ? col : ui::C_DIM);
        char b[16];
        const int ammo = g.teams[g.turn_team].ammo[i];
        if (ammo < 0) snprintf(b, sizeof b, "--"); else snprintf(b, sizeof b, "x%d", ammo);
        graphics_draw_text_raw(x + w - 12 - graphics_text_width(b), iy + 1, b, ui::C_DIM);
        if (wd((Weapon)i).timed && i != WP_DYNAMITE) {
            snprintf(b, sizeof b, "< %ds >", i == s.arsenal_sel ? (int)s.timer_pref : (int)wd((Weapon)i).default_timer);
            graphics_draw_text_raw(x + w - 70 - graphics_text_width(b), iy + 1, b, i == s.arsenal_sel ? ui::C_ACCENT : ui::C_DIM);
        }
    }
}

void draw_banner(const Game& g, const State& s, uint32_t now) {
    if (now >= s.banner_until) return;
    char b[48];
    const char* text;
    uint16_t col = C_TEAM[s.banner_team & 1];
    if (s.banner_sudden) { text = i18n::T(i18n::STR_SUDDEN); col = C_RED; }
    else { snprintf(b, sizeof b, "%s", team_name(s.banner_team, s.vs_ai)); text = b; }
    const int w = graphics_text_width(text) + 20;
    const int x = (SCR_W - w) / 2, y = ui::TOP_H + 18;
    graphics_fill_rect_raw(x, y, w, 16, ui::C_MENU_BG);
    graphics_draw_rect_raw(x, y, w, 16, col);
    graphics_draw_text_center_raw(y + 4, text, col);
    (void)g;
}

} // namespace

// ---------------------------------------------------------------------------------------------------
const char* team_name(int team, bool vs_ai) {
    static char buf[2][24];
    const char* base = i18n::T(team == 0 ? i18n::STR_TEAM_1 : i18n::STR_TEAM_2);
    if (vs_ai && team == 1) snprintf(buf[1], sizeof buf[1], "%s (%s)", base, i18n::T(i18n::STR_TEAM_AI));
    else snprintf(buf[team & 1], sizeof buf[0], "%s", base);
    return buf[team & 1];
}

void init_palette() {
    for (int y = 0; y < H; ++y) {
        const int t = std::min(y, WATER_Y);
        sky_[y] = graphics_make_color(lerp(24, 150, t, WATER_Y), lerp(84, 204, t, WATER_Y), lerp(186, 238, t, WATER_Y));
        const int d = std::max(0, y - WATER_Y);
        water_[y] = graphics_make_color(lerp(34, 8, std::min(d, 40), 40), lerp(112, 56, std::min(d, 40), 40), lerp(210, 128, std::min(d, 40), 40));
    }
    for (int i = 0; i < 32; ++i) wave_lut_[i] = (uint8_t)(1.5f + 1.5f * sinf((float)i * 6.2831853f / 32.f));
    C_FOAM   = graphics_make_color(200, 236, 255);
    // Matieres : les couleurs du prototype web (terrain.ts)
    static const uint32_t rgb[MAT_COUNT] = {
        0x000000, 0x6E4823, 0x8B5A2B, 0x388E3C, 0x4CAF50, 0xA0522D, 0x5D4037,
        0xA04000, 0xBA4A00, 0x873600, 0xEDBB99, 0x4A4A4A, 0x5A5A5A, 0x6E6E6E, 0x2E7D32,
        0x212121, 0x37474F, 0xFF5722, 0xFF9800, 0x78909C };
    for (int m = 0; m < MAT_COUNT; ++m) {
        const int r = (rgb[m] >> 16) & 255, g = (rgb[m] >> 8) & 255, b = rgb[m] & 255;
        mat_[m] = graphics_make_color(r, g, b);
        mat_dark_[m] = graphics_make_color(r * 82 / 100, g * 82 / 100, b * 82 / 100);
    }
    C_TEAM[0]   = graphics_make_color(232,  64,  64);
    C_TEAM_D[0] = graphics_make_color(160,  36,  40);
    C_TEAM[1]   = graphics_make_color( 70, 130, 240);
    C_TEAM_D[1] = graphics_make_color( 38,  80, 170);
    C_SKIN   = graphics_make_color(250, 200, 170);
    C_BLACK  = graphics_make_color(  8,   8,  12);
    C_WHITE  = graphics_make_color(250, 250, 250);
    C_GRAVE  = graphics_make_color(150, 152, 160);
    C_VOID   = graphics_make_color( 12,  16,  30);
    C_EARTH  = graphics_make_color(130,  84,  48);
    C_SMOKE  = graphics_make_color(170, 170, 176);
    C_FIRE1  = graphics_make_color(255, 120,  30);
    C_FIRE2  = graphics_make_color(255, 220,  80);
    C_SPARK  = graphics_make_color(255, 255, 200);
    C_SPLASH = graphics_make_color(150, 210, 250);
    C_ROCKET = graphics_make_color( 60,  60,  66);
    C_GREEN  = graphics_make_color( 40, 120,  48);
    C_GOLD   = graphics_make_color(250, 210,  60);
    C_RED    = graphics_make_color(240,  50,  50);
}

void snap_camera(const Game& g, State& s) {
    const Worm& w = active_worm(g);
    s.cam_x = std::max(0.f, std::min((float)W - SCR_W, w.x - SCR_W / 2));
    s.cam_y = std::max(0.f, std::min((float)H - AREA_H, w.y - AREA_H / 2));
}

void update_camera(const Game& g, State& s) {
    float tx, ty;
    bool have = false;
    if (g.phase == PH_PLAY && wants_cursor(g) && !g.fired) { tx = g.cursor_x; ty = g.cursor_y; have = true; }
    else {
        const Projectile* best = nullptr;
        for (const Projectile& p : g.proj) if (p.live && (!best || p.age < best->age)) best = &p;
        if (best) { tx = best->x; ty = best->y; have = true; }
        else if (g.phase == PH_PLAY) { const Worm& w = active_worm(g); tx = w.x; ty = w.y - 10; have = true; }
    }
    if (!have) return;
    const float gx = std::max(0.f, std::min((float)W - SCR_W, tx - SCR_W / 2));
    const float gy = std::max(0.f, std::min((float)H - AREA_H, ty - AREA_H / 2));
    const float k = 0.2f;
    s.cam_x += (gx - s.cam_x) * k;
    s.cam_y += (gy - s.cam_y) * k;
}

void draw(const Game& g, const State& s, uint32_t now) {
    draw_terrain(g, s, now);
    const Cam cam = make_cam(s);
    for (int t = 0; t < TEAMS; ++t)
        for (int i = 0; i < g.opt.worms_per_team; ++i) draw_worm(g, s, cam, t, i, now);
    for (const Projectile& p : g.proj) if (p.live) draw_projectile(g, s, cam, p);
    draw_fx(g, s, cam);
    draw_aim(g, s, cam);
    draw_top_bar(g, s);
    draw_bottom_bar(g, s);
    draw_banner(g, s, now);
    if (s.arsenal) draw_arsenal(g, s);
}

} // namespace worms_view
