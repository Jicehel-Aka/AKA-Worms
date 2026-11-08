/*
  pc_assets.cpp — Embarque title.bin (le meme fichier que la console) dans l'executable,
  sous le MEME nom de symbole que celui de l'ESP-IDF
  (EMBED_FILES) : la coquille et la vue n'ont donc rien a changer.
  Necessite GCC ou Clang sous Linux / MinGW (directive .incbin).
*/
#ifndef WORMS_ASSET_DIR
#error "WORMS_ASSET_DIR doit pointer vers main/assets (cf. pc/CMakeLists.txt)"
#endif

#ifdef _WIN32
#define WORMS_SEC_BEGIN ".section .rdata,\"dr\"\n"
#define WORMS_SEC_END   ".text\n"
#else
#define WORMS_SEC_BEGIN ".pushsection .rodata\n"
#define WORMS_SEC_END   ".popsection\n"
#endif

asm(WORMS_SEC_BEGIN
    ".balign 4\n"
    ".global _binary_title_bin_start\n_binary_title_bin_start:\n"
    ".incbin \"" WORMS_ASSET_DIR "/title.bin\"\n"
    WORMS_SEC_END);
