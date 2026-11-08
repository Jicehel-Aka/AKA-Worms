idf_component_register(
    SRCS
        app_main.cpp
        core/graphics.cpp
        core/input.cpp
        core/audio.cpp

        shell/shell.cpp
        shell/ui.cpp
        shell/i18n.cpp
        shell/save.cpp

        games/worms/worms.cpp
        games/worms/ai.cpp
        games/worms/worms_view.cpp
        games/worms/worms_module.cpp

        tasks/task_system.cpp
        tasks/task_game.cpp

        assets/gfx/font_accents.cpp

    INCLUDE_DIRS
        . core shell tasks games assets/gfx

    # title.bin : 150 Ko en flash (ecran-titre 320x240 BGR565).
    EMBED_FILES
        assets/title.bin

    # RAPPEL : les composants vont dans REQUIRES, PAS dans INCLUDE_DIRS.
    REQUIRES
        gamebuino nvs_flash app_update esp_partition esp_system fatfs esp_hw_support
)

# Les libelles traduits peuvent depasser les tampons d'affichage : snprintf tronque proprement, ce n'est pas une erreur.
target_compile_options(${COMPONENT_LIB} PRIVATE -Wno-format-truncation)
