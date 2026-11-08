#pragma once
#include <cstdint>
namespace save {
// Reglages de Worms AKA Battle, ranges dans /sdcard/WORMS/config.dat
// (noms longs acceptes : CONFIG_FATFS_LFN_HEAP).
struct Config {
    uint8_t level       {1};   // IA : 0 Novice, 1 Arcade, 2 Maitre
    uint8_t language    {0};
    uint8_t music_vol   {35};
    uint8_t sfx_vol     {85};
    uint8_t zoom        {2};   // version PC : 1, 2, 3 ou 4 (= plein ecran) ; ignore sur la AKA
    // Reglages du match (ecran « Preparer le match »)
    uint8_t map         {0};   // 0..4 : Iles, Canyon, Forteresse, Volcan, Procedurale
    uint8_t worms       {2};   // vers par equipe, 1..4
    uint8_t hp_idx      {1};   // 0 = 50, 1 = 100, 2 = 150 PV
    uint8_t wind        {2};   // 0 aucun, 1 faible, 2 normal, 3 fort
    uint8_t time_idx    {2};   // duree du tour : 0 = 20 s, 1 = 30 s, 2 = 45 s, 3 = 60 s, 4 = 90 s
    uint8_t cam_far     {0};   // derniere vue choisie : 0 proche, 1 carte entiere
};
// Dossier du jeu (defaut : /sdcard/WORMS ; la version PC passe le sien).
void set_dir(const char* dir);
bool load(Config& c);
bool save(const Config& c);
}
