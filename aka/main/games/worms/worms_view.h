/*
===============================================================================
  worms_view.h — Rendu de Worms AKA Battle (320x240)
-------------------------------------------------------------------------------
  Zone de jeu : 320 x 208 (entre les deux bandeaux de ui.h). Deux vues :
    proche   1 pixel de decor = 1 pixel d'ecran, la camera suit l'action
    carte    toute la carte (800x450) a l'echelle 0,4 (= 320 x 180)
  Le decor est dessine ligne par ligne en bandes de couleur (peu d'appels
  graphiques), puis les vers, projectiles, effets et les bandeaux.
===============================================================================
*/
#pragma once
#include <cstdint>
#include "worms.h"

namespace worms_view {

struct State {
    float    cam_x{0}, cam_y{0};       // coin haut-gauche de la vue proche (pixels du monde)
    bool     far{false};               // vue « carte entiere »
    bool     arsenal{false};           // le menu d'armes est ouvert
    int      arsenal_sel{0};
    uint8_t  timer_pref{3};            // minuterie voulue pour les armes a retardement
    bool     vs_ai{false};
    uint32_t banner_until{0};          // annonce « Tour de ... »
    int      banner_team{0};
    bool     banner_sudden{false};
};

void init_palette();                                        // apres ui::init_palette()
void snap_camera(const worms::Game& g, State& s);           // place la camera sur le ver actif
void update_camera(const worms::Game& g, State& s);         // une fois par image
void draw(const worms::Game& g, const State& s, uint32_t now);
const char* team_name(int team, bool vs_ai);                // « Rouge », « Bleu (IA) »...

} // namespace worms_view
