/**
 * MODULE 5: UI, START TRANSITION, INTRO SEQUENCER & EYELID GAMEPLAY CONTROLLER
 * File: ./MainMenuUIController.js
 */
(function (window) {
  'use strict';
  window.Blindspot = window.Blindspot || {};

  class MainMenuUIController {
    constructor(settings, audio, renderer, anomaly) {
      this.settings = settings;
      this.audio = audio;
      this.renderer = renderer;
      this.anomaly = anomaly;

      // Main Menu & Modal References
      this.autoplayOverlay = document.getElementById('autoplay-overlay');
      this.mainMenuWrapper = document.getElementById('main-menu-wrapper');
      this.btnStartGame = document.getElementById('btn-start-game');
      this.settingsBackdrop = document.getElementById('settings-modal-backdrop');
      this.creditsBackdrop = document.getElementById('credits-modal-backdrop');

      // Menu Background Layers
      this.sceneCanvas = document.getElementById('scene-canvas');
      this.ambientFlicker = document.getElementById('ambient-flicker');
      this.blindspotLayer = document.getElementById('blindspot-layer');

      // Blackout, Intro Sequencer & In-Game Viewport References
      this.blackoutCurtain = document.getElementById('blackout-curtain');
      this.introSequencerOverlay = document.getElementById('intro-sequencer-overlay');
      this.gameViewportContainer = document.getElementById('game-viewport-container');
      this.eyelidTop = document.getElementById('eyelid-top');
      this.eyelidBottom = document.getElementById('eyelid-bottom');
      this.gameCanvas = document.getElementById('gameCanvas');
      this.pointerLockStatusEl = document.getElementById('fpp-pointerlock-status');
      this.btnExitToMenu = document.getElementById('btn-exit-to-menu');

      // Legacy Transition Elements (kept for compatibility)
      this.transitionScreen = document.getElementById('game-transition-screen');
      this.transitionEpigraph = document.getElementById('transition-epigraph');
      this.loadingTelemetry = document.getElementById('loading-telemetry');
      this.returnMenuBtn = document.getElementById('return-menu-btn');

      // Settings Form Controls
      this.sliderMasterVol = document.getElementById('slider-master-vol');
      this.labelMasterVol = document.getElementById('label-master-vol');
      this.sliderSfxVol = document.getElementById('slider-sfx-vol');
      this.labelSfxVol = document.getElementById('label-sfx-vol');
      this.sliderMouseSens = document.getElementById('slider-mouse-sens');
      this.labelMouseSens = document.getElementById('label-mouse-sens');
      this.toggleInvertY = document.getElementById('toggle-invert-y');
      this.selectQuality = document.getElementById('select-graphics-quality');
      this.togglePostFx = document.getElementById('toggle-postfx');
      this.saveStatusMsg = document.getElementById('settings-save-status');
      this.hudFovStatus = document.getElementById('hud-fov-status');
      this.quitFeedbackMsg = document.getElementById('quit-feedback-msg');

      this.activeGameInstance = null;
      this.eyelidHideTimer = null;

      // Instance IntroSequencer terhubung ke transisi masuk FPP Gameplay
      this.introSequencer = new window.Blindspot.IntroSequencer(
        this.settings,
        this.audio,
        () => this._enterGameplayFromIntro()
      );

      this._syncControlsFromState();
      this._applyVisualSettingsToDOM();
      this._bindEvents();
      this._startHudClock();
    }

    _syncControlsFromState() {
      const s = this.settings.state;
      if (this.sliderMasterVol) this.sliderMasterVol.value = s.masterVolume;
      if (this.labelMasterVol) this.labelMasterVol.textContent = `${s.masterVolume}%`;

      if (this.sliderSfxVol) this.sliderSfxVol.value = s.sfxVolume;
      if (this.labelSfxVol) this.labelSfxVol.textContent = `${s.sfxVolume}%`;

      if (this.sliderMouseSens) this.sliderMouseSens.value = s.mouseSensitivity.toFixed(1);
      if (this.labelMouseSens) this.labelMouseSens.textContent = `${Number(s.mouseSensitivity).toFixed(1)}x`;

      if (this.toggleInvertY) {
        this.toggleInvertY.setAttribute('aria-pressed', String(s.invertY));
        this.toggleInvertY.textContent = s.invertY ? 'ON' : 'OFF';
      }

      if (this.selectQuality) this.selectQuality.value = s.graphicsQuality;

      if (this.togglePostFx) {
        this.togglePostFx.setAttribute('aria-pressed', String(s.postProcessing));
        this.togglePostFx.textContent = s.postProcessing ? 'ON' : 'OFF';
      }
    }

    _applyVisualSettingsToDOM() {
      const s = this.settings.state;
      document.body.classList.remove('quality-low', 'quality-medium', 'quality-high');
      document.body.classList.add(`quality-${s.graphicsQuality.toLowerCase()}`);

      if (s.postProcessing) {
        document.body.classList.remove('postfx-off');
      } else {
        document.body.classList.add('postfx-off');
      }

      if (this.hudFovStatus) {
        this.hudFovStatus.textContent =
          `OPTIC_SENS: ${Number(s.mouseSensitivity).toFixed(1)}x | QUALITY: ${s.graphicsQuality.toUpperCase()}`;
      }

      this.renderer.resize();
      this.audio.applyRealTimeVolume();
    }

    _bindEvents() {
      // 1. Autoplay Policy Gate Overlay (Fail-safe: works on click, pointerdown, touchstart, or keydown)
      let gateUnlocked = false;
      const unlockHandler = () => {
        if (gateUnlocked) return;
        gateUnlocked = true;
        if (this.autoplayOverlay) {
          this.autoplayOverlay.classList.add('dismissed');
          this.autoplayOverlay.style.pointerEvents = 'none';
          this.autoplayOverlay.style.opacity = '0';
          setTimeout(() => {
            if (this.autoplayOverlay && this.autoplayOverlay.classList.contains('dismissed')) {
              this.autoplayOverlay.style.display = 'none';
            }
          }, 1300);
        }
        this.audio.unlockAndFadeIn();
        this.audio.playClickSfx();
        this.anomaly.triggerTitleGlitch(320);
      };
      window.__blindspotUnlockGate = unlockHandler;
      if (this.autoplayOverlay) {
        this.autoplayOverlay.addEventListener('click', unlockHandler);
        this.autoplayOverlay.addEventListener('pointerdown', unlockHandler);
        this.autoplayOverlay.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            unlockHandler();
          }
        });
      }
      if (window.__blindspotGateClickedEarly) {
        unlockHandler();
      }

      // 2. Attach Hover & Click SFX
      document.querySelectorAll('[data-ui-sfx="true"]').forEach((el) => {
        el.addEventListener('mouseenter', () => this.audio.playHoverSfx());
        el.addEventListener('click', () => this.audio.playClickSfx());
      });

      // 3. Main Menu Navigation Buttons
      if (this.btnStartGame) {
        this.btnStartGame.addEventListener('click', () => {
          this.triggerStartGameTransition();
        });
      }

      const btnOpenSettings = document.getElementById('btn-open-settings');
      if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', () => {
          this.openSettingsModal();
        });
      }

      const btnOpenCredits = document.getElementById('btn-open-credits');
      if (btnOpenCredits) {
        btnOpenCredits.addEventListener('click', () => {
          this.openCreditsModal();
        });
      }

      // 4. Settings Modal Controls
      if (this.sliderMasterVol) {
        this.sliderMasterVol.addEventListener('input', (e) => {
          const val = Number(e.target.value);
          this.settings.state.masterVolume = val;
          if (this.labelMasterVol) this.labelMasterVol.textContent = `${val}%`;
          this.audio.applyRealTimeVolume();
          if (this.saveStatusMsg) this.saveStatusMsg.textContent = 'PERUBAHAN BELUM DISIMPAN KE STORAGE';
        });
      }

      if (this.sliderSfxVol) {
        this.sliderSfxVol.addEventListener('input', (e) => {
          const val = Number(e.target.value);
          this.settings.state.sfxVolume = val;
          if (this.labelSfxVol) this.labelSfxVol.textContent = `${val}%`;
          if (this.saveStatusMsg) this.saveStatusMsg.textContent = 'PERUBAHAN BELUM DISIMPAN KE STORAGE';
        });
        this.sliderSfxVol.addEventListener('change', () => {
          this.audio.playHoverSfx();
        });
      }

      if (this.sliderMouseSens) {
        this.sliderMouseSens.addEventListener('input', (e) => {
          const val = Number(e.target.value);
          this.settings.state.mouseSensitivity = val;
          if (this.labelMouseSens) this.labelMouseSens.textContent = `${val.toFixed(1)}x`;
          this._applyVisualSettingsToDOM();
          if (this.saveStatusMsg) this.saveStatusMsg.textContent = 'PERUBAHAN BELUM DISIMPAN KE STORAGE';
        });
      }

      if (this.toggleInvertY) {
        this.toggleInvertY.addEventListener('click', () => {
          this.settings.state.invertY = !this.settings.state.invertY;
          this._syncControlsFromState();
          if (this.saveStatusMsg) this.saveStatusMsg.textContent = 'PERUBAHAN BELUM DISIMPAN KE STORAGE';
        });
      }

      if (this.selectQuality) {
        this.selectQuality.addEventListener('change', (e) => {
          this.settings.state.graphicsQuality = e.target.value;
          this._applyVisualSettingsToDOM();
          if (this.saveStatusMsg) this.saveStatusMsg.textContent = 'PERUBAHAN BELUM DISIMPAN KE STORAGE';
        });
      }

      if (this.togglePostFx) {
        this.togglePostFx.addEventListener('click', () => {
          this.settings.state.postProcessing = !this.settings.state.postProcessing;
          this._syncControlsFromState();
          this._applyVisualSettingsToDOM();
          if (this.saveStatusMsg) this.saveStatusMsg.textContent = 'PERUBAHAN BELUM DISIMPAN KE STORAGE';
        });
      }

      const btnSaveSettings = document.getElementById('btn-save-settings');
      if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', () => {
          const ok = this.settings.save();
          if (this.saveStatusMsg) {
            this.saveStatusMsg.textContent = ok
              ? 'TERSIMPAN KE LOCALSTORAGE BROWSER'
              : 'KONFIGURASI AKTIF DI MEMORI SESI';
          }
          setTimeout(() => {
            this.closeSettingsModal();
          }, 220);
        });
      }

      const btnResetSettings = document.getElementById('btn-reset-settings');
      if (btnResetSettings) {
        btnResetSettings.addEventListener('click', () => {
          this.settings.reset();
          this._syncControlsFromState();
          this._applyVisualSettingsToDOM();
          if (this.saveStatusMsg) this.saveStatusMsg.textContent = 'DIKEMBALIKAN KE PENGATURAN DEFAULT';
        });
      }

      const btnCloseSettingsX = document.getElementById('btn-close-settings-x');
      if (btnCloseSettingsX) {
        btnCloseSettingsX.addEventListener('click', () => {
          this.closeSettingsModal();
        });
      }

      // 5. Credits / Quit Modal Actions
      const btnCloseCreditsX = document.getElementById('btn-close-credits-x');
      if (btnCloseCreditsX) {
        btnCloseCreditsX.addEventListener('click', () => {
          this.closeCreditsModal();
        });
      }

      const btnCancelQuit = document.getElementById('btn-cancel-quit');
      if (btnCancelQuit) {
        btnCancelQuit.addEventListener('click', () => {
          this.closeCreditsModal();
        });
      }

      const btnConfirmQuit = document.getElementById('btn-confirm-quit');
      if (btnConfirmQuit) {
        btnConfirmQuit.addEventListener('click', () => {
          if (this.quitFeedbackMsg) this.quitFeedbackMsg.textContent = 'MEMUTUSKAN TRANSMISI CAM_04...';
          this.audio.fadeVolumeTo(0, 1000);
          setTimeout(() => {
            this.closeCreditsModal();
            gateUnlocked = false;
            if (this.autoplayOverlay) {
              this.autoplayOverlay.style.display = 'flex';
              requestAnimationFrame(() => {
                this.autoplayOverlay.classList.remove('dismissed');
                this.autoplayOverlay.style.opacity = '1';
                this.autoplayOverlay.style.pointerEvents = 'auto';
              });
            }
            this.audio.unlocked = false;
            if (this.quitFeedbackMsg) this.quitFeedbackMsg.textContent = 'STATUS: TERKUNCI DI DALAM KORIDOR';
          }, 1050);
        });
      }

      // 6. Pointer Lock pada klik di #gameCanvas / #game-viewport-container & tombol keluar kembali ke Menu
      if (this.gameCanvas) {
        this.gameCanvas.addEventListener('click', () => {
          this._requestBodyPointerLock();
        });
      }

      document.addEventListener('pointerlockchange', () => {
        if (!this.pointerLockStatusEl) return;
        const locked = Boolean(document.pointerLockElement);
        this.pointerLockStatusEl.textContent = locked
          ? 'POINTER LOCK: AKTIF [ESC UNTUK MELEPAS]'
          : 'KLIK LAYAR KORIDOR UNTUK MENGUNCI KURSOR (POINTER LOCK)';
      });

      if (this.btnExitToMenu) {
        this.btnExitToMenu.addEventListener('click', () => {
          this.returnToMainMenu();
        });
      }

      if (this.returnMenuBtn) {
        this.returnMenuBtn.addEventListener('click', () => {
          this.returnToMainMenu();
        });
      }

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (this.settingsBackdrop && this.settingsBackdrop.classList.contains('open')) {
            this.closeSettingsModal();
          }
          if (this.creditsBackdrop && this.creditsBackdrop.classList.contains('open')) {
            this.closeCreditsModal();
          }
        }
      });
    }

    openSettingsModal() {
      if (this.saveStatusMsg) this.saveStatusMsg.textContent = 'KONFIGURASI SINKRON DENGAN LOCALSTORAGE';
      if (this.settingsBackdrop) this.settingsBackdrop.classList.add('open');
    }

    closeSettingsModal() {
      if (this.settingsBackdrop) this.settingsBackdrop.classList.remove('open');
    }

    openCreditsModal() {
      if (this.creditsBackdrop) this.creditsBackdrop.classList.add('open');
    }

    closeCreditsModal() {
      if (this.creditsBackdrop) this.creditsBackdrop.classList.remove('open');
    }

    /**
     * 1. Transisi Pasca-Klik START:
     * - Kunci/nonaktifkan tombol START agar tidak bisa diklik ganda.
     * - Picu Pointer Lock secara aman dari event klik pengguna.
     * - Pastikan overlay gate disembunyikan penuh.
     * - Fade-out volume BGM menu secara bertahap hingga senyap (1.5 detik), lalu pause & stop.
     * - Terapkan fade-to-black pekat pada layar dan sembunyikan seluruh UI Main Menu (display: none).
     * - Jalankan IntroSequencer (Index 0 - 11).
     */
    triggerStartGameTransition() {
      if (!this.btnStartGame || this.btnStartGame.disabled) return;
      this.btnStartGame.disabled = true;

      // Pastikan autoplay-overlay benar-benar tersembunyi
      if (this.autoplayOverlay) {
        this.autoplayOverlay.classList.add('dismissed');
        this.autoplayOverlay.style.opacity = '0';
        this.autoplayOverlay.style.pointerEvents = 'none';
        this.autoplayOverlay.style.display = 'none';
      }

      // Picu Pointer Lock secara aman langsung dari event klik tombol Start Game
      this._requestBodyPointerLock();

      this.anomaly.triggerTitleGlitch(420);
      if (this.mainMenuWrapper) {
        this.mainMenuWrapper.classList.add('fading-out');
        this.mainMenuWrapper.style.pointerEvents = 'none';
      }
      if (this.blackoutCurtain) {
        this.blackoutCurtain.classList.remove('hidden');
        this.blackoutCurtain.style.display = 'block';
        this.blackoutCurtain.style.opacity = '1';
        this.blackoutCurtain.style.pointerEvents = 'auto';
        this.blackoutCurtain.classList.add('active');
      }

      let transitionStarted = false;
      const proceedToIntro = () => {
        if (transitionStarted) return;
        transitionStarted = true;
        if (this.mainMenuWrapper) {
          this.mainMenuWrapper.classList.add('hidden-menu');
          this.mainMenuWrapper.style.opacity = '0';
          this.mainMenuWrapper.style.pointerEvents = 'none';
          this.mainMenuWrapper.style.display = 'none';
        }
        this.introSequencer.start();
      };

      // Fail-safe watchdog jika tab tidak aktif atau requestAnimationFrame tertunda
      setTimeout(proceedToIntro, 1650);

      // Fade-out BGM 1500ms lalu pause & hentikan pemutaran audio menu
      try {
        this.audio.fadeOutAndStopMenuBgm(1500)
          .then(proceedToIntro)
          .catch(proceedToIntro);
      } catch (_) {
        proceedToIntro();
      }
    }

    /**
     * 4. Transisi Masuk ke Gameplay (FPP In-Game) setelah Intro selesai atau di-skip:
     * - Sembunyikan overlay subtitle intro & blackout curtain secara tuntas (opacity: 0, pointer-events: none, display: none).
     * - Putar audio suasana koridor looping: assets/audio/ambience_game.mp3.
     * - Tampilkan <canvas id="gameCanvas"> dengan animasi "kelopak mata terbuka" (2 detik).
     * - Panggil initGameScene() & minta Pointer Lock API.
     */
    _enterGameplayFromIntro() {
      // 1. Sembunyikan tirai blackout statis & overlay transisi agar tidak menutupi canvas Three.js
      if (this.blackoutCurtain) {
        this.blackoutCurtain.classList.remove('active');
        this.blackoutCurtain.classList.add('hidden');
        this.blackoutCurtain.style.opacity = '0';
        this.blackoutCurtain.style.pointerEvents = 'none';
        this.blackoutCurtain.style.display = 'none';
      }

      if (this.introSequencerOverlay) {
        this.introSequencerOverlay.classList.remove('active');
        this.introSequencerOverlay.setAttribute('aria-hidden', 'true');
        this.introSequencerOverlay.style.opacity = '0';
        this.introSequencerOverlay.style.pointerEvents = 'none';
        this.introSequencerOverlay.style.display = 'none';
      }

      if (this.transitionScreen) {
        this.transitionScreen.style.opacity = '0';
        this.transitionScreen.style.pointerEvents = 'none';
        this.transitionScreen.style.display = 'none';
      }

      if (this.mainMenuWrapper) {
        this.mainMenuWrapper.classList.add('hidden-menu');
        this.mainMenuWrapper.style.opacity = '0';
        this.mainMenuWrapper.style.pointerEvents = 'none';
        this.mainMenuWrapper.style.display = 'none';
      }

      // Sembunyikan canvas background menu agar tidak membebani GPU saat di dalam game
      if (this.sceneCanvas) this.sceneCanvas.style.display = 'none';
      if (this.ambientFlicker) this.ambientFlicker.style.display = 'none';
      if (this.blindspotLayer) this.blindspotLayer.style.display = 'none';

      // 2. Siapkan tirai kelopak mata untuk animasi pembukaan 2 detik
      if (this.eyelidHideTimer) {
        clearTimeout(this.eyelidHideTimer);
        this.eyelidHideTimer = null;
      }
      if (this.eyelidTop) {
        this.eyelidTop.style.display = 'block';
        this.eyelidTop.style.opacity = '1';
        this.eyelidTop.style.pointerEvents = 'none';
      }
      if (this.eyelidBottom) {
        this.eyelidBottom.style.display = 'block';
        this.eyelidBottom.style.opacity = '1';
        this.eyelidBottom.style.pointerEvents = 'none';
      }

      // 3. Tampilkan viewport game FPP & pastikan canvas Three.js terlihat penuh
      if (this.gameViewportContainer) {
        this.gameViewportContainer.classList.remove('eyes-open');
        this.gameViewportContainer.classList.add('active');
        this.gameViewportContainer.style.display = 'block';
        this.gameViewportContainer.style.opacity = '1';
        this.gameViewportContainer.setAttribute('aria-hidden', 'false');
      }

      if (this.gameCanvas) {
        this.gameCanvas.style.display = 'block';
        this.gameCanvas.style.opacity = '1';
        this.gameCanvas.style.visibility = 'visible';
      }

      // 4. Inisialisasi scene 3D (hook initGameScene) dengan penanganan error aman
      try {
        if (typeof window.initGameScene === 'function') {
          this.activeGameInstance = window.initGameScene(this.gameCanvas, this.settings.state);
        } else if (window.Blindspot && typeof window.Blindspot.initGameScene === 'function') {
          this.activeGameInstance = window.Blindspot.initGameScene(this.gameCanvas, this.settings.state);
        }
      } catch (err) {
        console.error('Error saat inisialisasi GameScene:', err);
      }

      // 5. Putar audio suasana koridor looping: assets/audio/ambience_game.mp3
      try {
        this.audio.startGameAmbience();
      } catch (_) {}

      // 6. Picu animasi transisi "kelopak mata terbuka" (membelah vertikal ke atas & bawah selama 2 detik)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this.gameViewportContainer) {
            this.gameViewportContainer.classList.add('eyes-open');
          }
        });
      });

      // Setelah animasi kelopak mata terbuka selesai (2050ms), sembunyikan elemen kelopak mata sepenuhnya
      this.eyelidHideTimer = setTimeout(() => {
        if (this.eyelidTop) {
          this.eyelidTop.style.opacity = '0';
          this.eyelidTop.style.pointerEvents = 'none';
          this.eyelidTop.style.display = 'none';
        }
        if (this.eyelidBottom) {
          this.eyelidBottom.style.opacity = '0';
          this.eyelidBottom.style.pointerEvents = 'none';
          this.eyelidBottom.style.display = 'none';
        }
        this._requestBodyPointerLock();
      }, 2050);

      // Minta akses Pointer Lock segera
      this._requestBodyPointerLock();
    }

    _requestBodyPointerLock() {
      try {
        if (
          this.activeGameInstance &&
          this.activeGameInstance.controls &&
          typeof this.activeGameInstance.controls.lock === 'function'
        ) {
          this.activeGameInstance.controls.lock();
          return;
        }
        const target = this.gameCanvas && this.gameCanvas.style.display !== 'none'
          ? this.gameCanvas
          : document.body;
        if (target && typeof target.requestPointerLock === 'function' && !document.pointerLockElement) {
          const lockPromise = target.requestPointerLock();
          if (lockPromise && typeof lockPromise.catch === 'function') {
            lockPromise.catch(() => {});
          }
        }
      } catch (_) {}
    }

    returnToMainMenu() {
      if (this.eyelidHideTimer) {
        clearTimeout(this.eyelidHideTimer);
        this.eyelidHideTimer = null;
      }

      if (typeof window.Blindspot.stopGameScene === 'function') {
        window.Blindspot.stopGameScene();
      }
      this.activeGameInstance = null;

      if (this.gameViewportContainer) {
        this.gameViewportContainer.classList.remove('eyes-open', 'active');
        this.gameViewportContainer.style.display = 'none';
        this.gameViewportContainer.setAttribute('aria-hidden', 'true');
      }

      if (this.blackoutCurtain) {
        this.blackoutCurtain.classList.remove('active');
        this.blackoutCurtain.classList.add('hidden');
        this.blackoutCurtain.style.opacity = '0';
        this.blackoutCurtain.style.pointerEvents = 'none';
        this.blackoutCurtain.style.display = 'none';
      }

      if (this.sceneCanvas) this.sceneCanvas.style.display = 'block';
      if (this.ambientFlicker) this.ambientFlicker.style.display = 'block';
      if (this.blindspotLayer) this.blindspotLayer.style.display = 'block';

      if (this.mainMenuWrapper) {
        this.mainMenuWrapper.classList.remove('hidden-menu', 'fading-out');
        this.mainMenuWrapper.style.display = 'flex';
        this.mainMenuWrapper.style.opacity = '1';
        this.mainMenuWrapper.style.pointerEvents = 'auto';
      }
      if (this.btnStartGame) {
        this.btnStartGame.disabled = false;
      }

      this.audio.resumeMenuBgm();
    }

    _startHudClock() {
      const clockEl = document.getElementById('hud-clock');
      if (!clockEl) return;
      let sec = 9;
      setInterval(() => {
        sec = (sec + 1) % 60;
        const pad = String(sec).padStart(2, '0');
        clockEl.textContent = `OCT 29 // 03:14:${pad} AM`;
      }, 1000);
    }
  }

  window.Blindspot.MainMenuUIController = MainMenuUIController;
})(window);
