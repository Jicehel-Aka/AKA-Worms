#!/bin/sh
# Fait tourner la vraie coquille sur PC (sans SDL) et ecrit des captures .ppm.
#   sh test/run_preview.sh [dossier_sortie] [mode]     (depuis aka/)   mode 0 = menus + match, 1 = solo jusqu'a la fin
set -e
OUT=${1:-/tmp/shell_preview}; MODE=${2:-0}
g++ -std=c++17 -O1 -g -Wall -Wextra -Wno-unused-parameter -Wno-narrowing -fsanitize=address,undefined \
    -I main -I main/shell -I main/core -I main/games/worms -I components/gamebuino/include_lib -I pc \
    test/shell_preview.cpp pc/pc_graphics.cpp pc/pc_input.cpp \
    main/shell/shell.cpp main/shell/ui.cpp main/shell/i18n.cpp main/shell/save.cpp \
    main/games/worms/worms.cpp main/games/worms/ai.cpp main/games/worms/worms_view.cpp main/games/worms/worms_module.cpp \
    main/assets/gfx/font_accents.cpp -o /tmp/shell_preview
/tmp/shell_preview "$OUT" "$MODE"
