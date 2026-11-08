/*
===============================================================================
  game_module.h — L'interface commune des jeux (coquille AKA)
-------------------------------------------------------------------------------
  La coquille s'occupe des menus, des regles, des options, de la langue, de la
  sauvegarde et du retour au loader ; le jeu se resume a quelques fonctions.
  Un MatchSetup decrit la partie a lancer.
===============================================================================
*/
#pragma once
#include <cstdint>
#include "i18n.h"

namespace shell {

struct MatchSetup {
    uint8_t map{0};         // 0..4 : Iles, Canyon, Forteresse, Volcan, Procedurale
    uint8_t worms{2};       // vers par equipe (1..4)
    uint8_t hp_idx{1};      // 0 = 50, 1 = 100, 2 = 150 PV
    uint8_t wind{2};        // 0 aucun, 1 faible, 2 normal, 3 fort
    uint8_t time_idx{2};    // 0 = 20 s, 1 = 30 s, 2 = 45 s, 3 = 60 s, 4 = 90 s
    uint8_t level{1};       // niveau de l'IA : 0 Novice, 1 Arcade, 2 Maitre
    bool    vs_ai{false};   // equipe 2 pilotee par l'IA
    bool    far{false};     // vue « carte entiere » au depart
    uint32_t seed{1};
};

struct GameModule {
    i18n::GameId id;
    void    (*start)(const MatchSetup& s);
    void    (*update)(uint32_t now_ms);   // une image a 30 fps (entrees + 2 pas de 60 Hz)
    void    (*draw)(uint32_t now_ms);     // dessine TOUT l'ecran (HUD compris)
    int     (*winner)();                  // 0 en cours, 1 equipe Rouge, 2 equipe Bleue, 3 egalite
    bool    (*far_view)();                // vue carte entiere active (pour la sauvegarder)
};

const GameModule& module_worms();

} // namespace shell
