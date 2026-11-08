// Tests du moteur Worms (PC, sans materiel) : g++ -std=c++17 -I../main/games/worms
#include "worms.h"
#include <cstdio>
#include <cstdlib>
#include <vector>
#include <cstring>
using namespace worms;

static int fails = 0;
#define CHECK(c) do { if (!(c)) { printf("ECHEC %s:%d  %s\n", __FILE__, __LINE__, #c); ++fails; } } while (0)

static uint8_t mem[W * H];

static int count_solid(const Game& g) { int n = 0; for (int i = 0; i < W * H; ++i) n += g.terrain[i] != 0; return n; }

static void test_maps() {
    static Game g;
    for (int m = 0; m < MAP_COUNT; ++m)
        for (uint32_t seed = 1; seed <= 20; ++seed) {
            init(g, mem);
            MatchOptions o; o.map = (MapId)m; o.seed = seed * 7919; o.worms_per_team = 4;
            start(g, o);
            int s = count_solid(g);
            CHECK(s > W * H / 20 && s < W * H * 3 / 4);
            for (int t = 0; t < TEAMS; ++t)
                for (int i = 0; i < 4; ++i) {
                    const Worm& w = g.worms[t][i];
                    CHECK(w.alive);
                    CHECK(w.x > 5 && w.x < W - 5);
                    CHECK(w.y < WATER_Y);
                    if (!body_free(g, (int)w.x, (int)w.y)) printf("  place: carte %d seed %u equipe %d ver %d x=%d y=%d\n", m, (unsigned)seed, t, i, (int)w.x, (int)w.y);
                    CHECK(body_free(g, (int)w.x, (int)w.y));
                    bool ground = false;
                    for (int xx = -2; xx <= 2; ++xx) if (solid(g, (int)w.x + xx, (int)w.y + 1)) ground = true;
                    CHECK(ground);
                }
        }
}

static void test_determinism() {
    static Game a, b; static uint8_t m2[W * H];
    init(a, mem); init(b, m2);
    MatchOptions o; o.seed = 4242; o.map = MAP_PROCEDURAL;
    start(a, o); start(b, o);
    CHECK(memcmp(mem, m2, sizeof mem) == 0);
    CHECK(a.worms[0][0].x == b.worms[0][0].x);
}

static void test_bazooka_crater() {
    static Game g;
    init(g, mem);
    MatchOptions o; o.map = MAP_FORTRESS; o.wind_mode = 0; o.seed = 3; start(g, o);
    int before = count_solid(g);
    Worm& me = active_worm(g);
    g.weapon = WP_BAZOOKA;
    me.facing = me.x < W / 2 ? 1 : -1; me.aim = 45;
    Input fire; fire.a_held = true;
    for (int i = 0; i < 80 && !g.fired; ++i) step(g, fire);
    CHECK(g.fired);
    Input idle;
    for (int i = 0; i < 600; ++i) step(g, idle);
    CHECK(count_solid(g) < before);
}

static void test_fall_water_and_damage() {
    static Game g;
    init(g, mem);
    MatchOptions o; o.map = MAP_ISLANDS; o.seed = 11; start(g, o);
    Worm& w = g.worms[1][0];
    // Un ver place au-dessus de l'eau se noie
    w.x = 20; w.y = 300; w.vx = w.vy = 0;
    for (int x = 0; x < 60; ++x) for (int y = 200; y < H; ++y) g.terrain[y * W + x] = 0;
    Input idle;
    for (int i = 0; i < 600 && w.alive; ++i) step(g, idle);
    CHECK(!w.alive && !w.grave);
}

static void test_ai_full_games() {
    static Game g;
    int finished = 0, total = 0;
    for (int m = 0; m < MAP_COUNT; ++m)
        for (uint32_t seed = 1; seed <= 6; ++seed) {
            init(g, mem);
            MatchOptions o; o.map = (MapId)m; o.seed = seed * 104729; o.ai_mask = 3;
            o.ai_level = (uint8_t)(seed % 3); o.worms_per_team = 2; o.turn_sec = 30;
            start(g, o);
            AiState ai[2]; ai_reset(ai[0]); ai_reset(ai[1]);
            ++total;
            for (int f = 0; f < 30 * 60 * 40 && g.phase != PH_OVER; ++f) {
                Input in; ai_input(g, ai[g.turn_team], in);
                step(g, in);
            }
            if (g.phase == PH_OVER) ++finished;
            // Invariants
            for (int t = 0; t < TEAMS; ++t) for (int i = 0; i < 2; ++i) CHECK(g.worms[t][i].hp >= -200);
        }
    printf("IA contre IA : %d / %d parties terminees\n", finished, total);
    CHECK(finished * 10 >= total * 8);
}

static void test_weapons() {
    static Game g;
    init(g, mem);
    MatchOptions o; o.map = MAP_ISLANDS; o.seed = 5; start(g, o);
    Input in; in.weapon_set = WP_SKIP;
    int t0 = g.turn_team;
    step(g, in);
    CHECK(g.weapon == WP_SKIP);
    in = Input{}; in.a_pressed = true;
    step(g, in);
    Input idle;
    for (int i = 0; i < 400 && g.turn_team == t0; ++i) step(g, idle);
    CHECK(g.turn_team != t0);
    CHECK(weapon_def(WP_BANANA).damage == 90 && weapon_def(WP_HOLY).ammo == 1);
}

int main() {
    test_maps();
    test_determinism();
    test_bazooka_crater();
    test_fall_water_and_damage();
    test_weapons();
    test_ai_full_games();
    printf(fails ? "%d ECHEC(S)\n" : "TOUS LES TESTS PASSENT\n", fails);
    return fails ? 1 : 0;
}
