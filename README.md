# BLINDSPOT — Psychological Horror 3D Web Game (Flat Directory Ready)

Seluruh file HTML, CSS, modul JavaScript, dan folder aset audio kini telah diperbaiki untuk struktur **1 folder (flat directory)** yang siap dijalankan secara lokal maupun di-hosting di **GitHub Pages**:

```text
HORROR GAME/
├── index.html                        # File utama HTML5 (path skrip & CSS flat ./...)
├── style.css                         # Stylesheet utama UI, transisi kelopak mata & HUD
├── main.js                           # Entry point bootstrap aplikasi
├── SettingsManager.js                # Modul pengaturan & localStorage
├── HorrorAudioEngine.js              # Modul BGM, SFX & Ambience Koridor (dengan try...catch)
├── HorrorVisualRenderer.js           # Modul renderer Canvas 3D koridor menu & film grain
├── BlindspotAnomalyController.js     # Modul siluet blindspot & glitch judul
├── IntroSequencer.js                 # Modul antrean Voice-Over Intro (01-12) & Subtitle
├── floorThreeExpansion.js            # Modul Lantai 3, Kamar 304, Panel 3B, Basement & Lantai 2
├── gameScene.js                      # Modul utama Three.js FPP Bedroom, Lorong & Pointer Lock
├── GameScene.js                      # Bundel cadangan kompatibilitas (case-sensitive safe)
├── MainMenuUIController.js           # Kontroller transisi Start Game, Overlay & Pointer Lock
└── assets/
    └── audio/                        # Seluruh aset suara Voice-Over, BGM & SFX lengkap
```
