/*
  shell_preview.cpp — Fait tourner la VRAIE coquille (shell.cpp, ui.cpp, i18n.cpp), le module, la vue et le
  moteur sur PC, sans SDL ni materiel : les boutons sont rejoues par un script, l'ecran 320x240 est ecrit en
  .ppm a des images precises. Verifie que tout s'enchaine (menus -> match -> fin) et que le rendu est correct.
  Compilation : voir test/run_preview.sh
*/
#include "../main/shell/shell.h"
#include "../main/shell/save.h"
#include "../main/core/graphics.h"
#include "../main/core/input.h"
#include "../main/core/audio.h"
#include "../main/tasks/task_system.h"
#include "../pc/pc_platform.h"
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>

asm(".section .rodata\n.global _binary_title_bin_start\n_binary_title_bin_start:\n.incbin \"main/assets/title.bin\"\n.text\n");

static uint16_t g_fb[320 * 240];
static bool g_quit = false;
void pc_present(const uint16_t* fb) { std::memcpy(g_fb, fb, sizeof g_fb); }
void pc_apply_zoom(int) {}
void pc_request_quit() { g_quit = true; }
bool pc_quit_requested() { return g_quit; }
namespace tasks { void return_to_loader() { g_quit = true; } }

namespace core {
void audio_init() {}
void audio_set_master_volume(uint8_t) {}
void audio_play_tune(Tune) {}
void audio_stop_music() {}
void audio_set_music_volume(float) {}
void audio_set_sfx_volume(float) {}
void audio_music_tick(uint32_t) {}
void audio_play_pmf(const void*) {}
#define S(n) void n() { ++g_sfx_count; }
static int g_sfx_count = 0;
S(sfx_cursor) S(sfx_select) S(sfx_cancel) S(sfx_move) S(sfx_capture) S(sfx_multi_capture) S(sfx_promote)
S(sfx_gameover) S(sfx_draw) S(sfx_illegal) S(sfx_menu_ok) S(sfx_menu_back) S(sfx_fire) S(sfx_shot)
S(sfx_boom_small) S(sfx_boom_big) S(sfx_splash) S(sfx_jump) S(sfx_hurt) S(sfx_death) S(sfx_turn) S(sfx_tick)
S(sfx_teleport) S(sfx_sudden)
}

static void dump(const std::string& path) {
    FILE* f = fopen(path.c_str(), "wb");
    fprintf(f, "P6\n320 240\n255\n");
    for (int i = 0; i < 320 * 240; ++i) {
        const uint16_t c = g_fb[i];
        unsigned char rgb[3] = { (unsigned char)((c & 31) << 3), (unsigned char)(((c >> 5) & 63) << 2), (unsigned char)(((c >> 11) & 31) << 3) };
        fwrite(rgb, 1, 3, f);
    }
    fclose(f);
}

using core::Button;
struct Press { int from, to; Button b; };

int main(int argc, char** argv) {
    const std::string out = argc > 1 ? argv[1] : "/tmp/shell_preview";
    const int mode = argc > 2 ? atoi(argv[2]) : 0;     // 0 = visite des menus + match hotseat ; 1 = solo IA jusqu'a la fin
    std::string cmd = "mkdir -p " + out; if (system(cmd.c_str())) return 1;
    save::set_dir((out + "/data").c_str());
    pc_set_data_dir((out + "/data").c_str());
    core::graphics_init();
    shell::init();

    std::vector<Press> script;
    std::vector<int> shots;
    int frames;
    auto tap = [&](int f, Button b) { script.push_back({f, f + 1, b}); };
    if (mode == 0) {
        shots = { 5, 12, 20, 28, 36, 44, 60, 90, 120, 160, 200, 240, 300, 360, 420, 480 };
        tap(10, Button::A);                // titre -> menu
        tap(18, Button::A);                // Passe & Joue -> preparation
        tap(24, Button::Right);            // carte suivante
        tap(30, Button::Down); tap(34, Button::Down); tap(38, Button::Down); tap(42, Button::Down); tap(46, Button::Down);
        tap(50, Button::A);                // JOUER
        script.push_back({70, 72, Button::Left});
        script.push_back({90, 200, Button::Right});     // marche
        script.push_back({210, 235, Button::Up});       // vise plus haut
        tap(245, Button::C);                           // arsenal
        tap(250, Button::Down); tap(254, Button::A);   // grenade
        script.push_back({270, 330, Button::A});       // charge puis relache -> tir
        tap(380, Button::D);                           // zoom carte
        tap(430, Button::Menu);                        // pause
        frames = 500;
    } else {
        shots = { 3000, 5000 };
        tap(10, Button::A);
        tap(18, Button::Down); tap(20, Button::A);     // Solo contre l'IA
        tap(30, Button::Down); tap(34, Button::Down); tap(38, Button::Down); tap(42, Button::Down); tap(46, Button::Down); tap(50, Button::Down);
        tap(54, Button::A);
        frames = 9000;
    }

    bool held[(int)Button::COUNT];
    uint32_t now = 1000;
    for (int f = 0; f < frames && !g_quit; ++f) {
        for (int i = 0; i < (int)Button::COUNT; ++i) held[i] = false;
        for (const Press& p : script) if (f >= p.from && f <= p.to) held[(int)p.b] = true;
        if (mode == 1 && f > 60 && f % 7 == 0) held[(int)Button::A] = (f / 7) % 11 == 0;     // le joueur tire de temps en temps
        if (mode == 1 && f > 60) { held[(int)Button::Right] = (f / 90) % 2 == 0; held[(int)Button::Left] = !held[(int)Button::Right]; }
        core::pc_input_feed(held);
        core::input_poll(now);
        shell::update(now);
        shell::draw();
        core::graphics_present();
        for (int s : shots) if (s == f) { char b[64]; snprintf(b, sizeof b, "/f%05d.ppm", f); dump(out + b); }
        now += 33;
    }
    dump(out + "/last.ppm");
    printf("fin a l'image %d (quit=%d)\n", frames, (int)g_quit);
    return 0;
}
