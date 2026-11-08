#!/bin/sh
# Tests PC du portage AKA (sans materiel, sans SDL) — depuis aka/ :  sh test/run_tests.sh
#   1. regles du moteur (cartes, physique, armes, IA contre IA), avec ASan + UBSan
#   2. la vraie coquille + la vue, rejouees par script (menus -> match -> pause), captures .ppm
set -e
cd "$(dirname "$0")/.."
g++ -std=c++17 -O1 -g -Wall -Wextra -Werror -fsanitize=address,undefined -I main/games/worms \
    test/worms_rules.cpp main/games/worms/worms.cpp main/games/worms/ai.cpp -o /tmp/worms_rules
/tmp/worms_rules
sh test/run_preview.sh "${PREVIEW_OUT:-/tmp/worms_preview}" 0
