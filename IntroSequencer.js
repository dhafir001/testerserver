/**
 * MODULE 6: VOICE-OVER INTRO SEQUENCER & SUBTITLE ENGINE
 * Menjalankan antrean narasi intro (Index 0 - 11), menangani fallback durasi otomatis
 * jika audio gagal dimuat (404), serta menangani fitur "[Space / Klik] Lewati Intro".
 * File: ./IntroSequencer.js
 */
(function (window) {
  'use strict';
  window.Blindspot = window.Blindspot || {};

  /**
   * Data Antrean Narasi Resmi (Index 0 - 11)
   */
  const INTRO_NARRATION_QUEUE = Object.freeze([
    {
      index: 0,
      file: 'assets/audio/intro_01.mp3',
      duration: 3000,
      text: 'Catatan log... Aku bahkan tidak tahu hari apa ini sekarang.',
      delayAfter: 800
    },
    {
      index: 1,
      file: 'assets/audio/intro_02.mp3',
      duration: 5000,
      text: 'Lampu di lantai tiga padam berjam-jam lalu, dan pintu keluar darurat tidak merespons.',
      delayAfter: 1000
    },
    {
      index: 2,
      file: 'assets/audio/intro_03.mp3',
      duration: 4000,
      text: 'Dokter bilang ini hanya stres. Kelelahan sensorik.',
      delayAfter: 600
    },
    {
      index: 3,
      file: 'assets/audio/intro_04.mp3',
      duration: 7000,
      text: 'Kelelahan retina yang mempermainkan mata di kegelapan... Tapi stres tidak menciptakan bayangan, kan?',
      delayAfter: 1200
    },
    {
      index: 4,
      file: 'assets/audio/intro_05.mp3',
      duration: 3000,
      text: 'Benda itu tidak di depanmu. Tidak pernah di tempat yang kau pandang.',
      delayAfter: 700
    },
    {
      index: 5,
      file: 'assets/audio/intro_06.mp3',
      duration: 4000,
      text: 'Dia menunggu tepat di sudut matamu... di titik buta.',
      delayAfter: 1000
    },
    {
      index: 6,
      file: 'assets/audio/intro_07.mp3',
      duration: 5000,
      text: 'Tiap kali kau menoleh menatapnya, dia lenyap. Namun begitu kau melihat ke depan lagi...',
      delayAfter: 400
    },
    {
      index: 7,
      file: 'assets/audio/intro_08.mp3',
      duration: 2000,
      text: '...dia melangkah maju satu langkah.',
      delayAfter: 1500
    },
    {
      index: 8,
      file: 'assets/audio/intro_09.mp3',
      duration: 5000,
      text: 'Mataku terasa perih terbakar. Air mataku terus keluar, tapi aku takut memejamkannya.',
      delayAfter: 600
    },
    {
      index: 9,
      file: 'assets/audio/intro_10.mp3',
      duration: 6000,
      text: 'Karena setiap kali aku berkedip... aku bersumpah mendengar napasnya tepat di leherku.',
      delayAfter: 1200
    },
    {
      index: 10,
      file: 'assets/audio/intro_11.mp3',
      duration: 4000,
      text: 'Jika kau juga terjebak di sini... jangan berbalik. Tetap fokus menatap lurus ke depan.',
      delayAfter: 800
    },
    {
      index: 11,
      file: 'assets/audio/intro_12.mp3',
      duration: 4000,
      text: 'Dan apa pun yang kau lakukan... jangan pernah menatap langsung ke sudut itu.',
      delayAfter: 2000
    }
  ]);

  class IntroSequencer {
    constructor(settingsManager, audioEngine, onCompleteCallback) {
      this.settings = settingsManager;
      this.audioEngine = audioEngine;
      this.onComplete = onCompleteCallback;

      // Satu instance elemen <audio> dinamis untuk seluruh Voice-Over
      this.voAudio = null;
      try {
        this.voAudio = new Audio();
        this.voAudio.preload = 'auto';
      } catch (_) {}

      // DOM Elements
      this.overlayEl = document.getElementById('intro-sequencer-overlay');
      this.subtitleEl = document.getElementById('intro-subtitle-text');
      this.logCounterEl = document.getElementById('vo-log-counter');
      this.skipBtn = document.getElementById('btn-skip-intro');

      this.isRunning = false;
      this.currentIndex = -1;
      this.activeTimeoutId = null;
      this.delayTimeoutId = null;

      this._boundKeydownHandler = (e) => this._handleKeydown(e);
      this._boundOverlayClickHandler = () => {
        if (this.isRunning) {
          this.skip();
        }
      };
      this._bindSkipButton();
    }

    _bindSkipButton() {
      if (this.skipBtn) {
        this.skipBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.isRunning) {
            this.skip();
          }
        });
      }
      if (this.overlayEl) {
        this.overlayEl.addEventListener('click', this._boundOverlayClickHandler);
      }
    }

    _handleKeydown(e) {
      if (!this.isRunning) return;
      if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter' || e.key === 'Enter') {
        e.preventDefault();
        this.skip();
      }
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.currentIndex = 0;

      if (this.overlayEl) {
        this.overlayEl.style.display = 'flex';
        this.overlayEl.style.opacity = '1';
        this.overlayEl.style.pointerEvents = 'auto';
        this.overlayEl.classList.add('active');
        this.overlayEl.setAttribute('aria-hidden', 'false');
      }

      window.addEventListener('keydown', this._boundKeydownHandler);
      this._playEntry(0);
    }

    skip() {
      if (!this.isRunning) return;
      try {
        this.audioEngine.playClickSfx();
      } catch (_) {}
      this._cleanupSequence();
      this._finishIntoGameplay();
    }

    _playEntry(index) {
      if (!this.isRunning) return;
      if (index >= INTRO_NARRATION_QUEUE.length) {
        this._cleanupSequence();
        this._finishIntoGameplay();
        return;
      }

      this.currentIndex = index;
      const item = INTRO_NARRATION_QUEUE[index];

      // Update indikator nomor log
      if (this.logCounterEl) {
        const num = String(index + 1).padStart(2, '0');
        const total = String(INTRO_NARRATION_QUEUE.length).padStart(2, '0');
        this.logCounterEl.textContent = `VOICE_LOG // ${num} / ${total}`;
      }

      // Tampilkan subtitle dengan transisi fade-in halus
      if (this.subtitleEl) {
        this.subtitleEl.textContent = item.text;
        requestAnimationFrame(() => {
          if (this.subtitleEl && this.isRunning) {
            this.subtitleEl.classList.add('visible');
          }
        });
      }

      // Bersihkan listener & timer sebelumnya pada satu instance Audio
      this._clearTimersAndAudioListeners();

      let settled = false;
      const advanceAfterLine = () => {
        if (settled || !this.isRunning) return;
        settled = true;
        this._clearTimersAndAudioListeners();

        // Fade-out subtitle terlebih dahulu
        if (this.subtitleEl) {
          this.subtitleEl.classList.remove('visible');
        }

        // Tunggu sesuai DelayAfter sebelum masuk ke kalimat berikutnya
        this.delayTimeoutId = setTimeout(() => {
          this._playEntry(index + 1);
        }, item.delayAfter);
      };

      const startDurationFallback = (durationMs) => {
        clearTimeout(this.activeTimeoutId);
        this.activeTimeoutId = setTimeout(() => {
          advanceAfterLine();
        }, durationMs);
      };

      if (!this.voAudio) {
        startDurationFallback(item.duration);
        return;
      }

      try {
        // Hitung volume VO berdasarkan Master Volume & SFX Volume
        const masterNorm = Math.max(0, Math.min(1, (this.settings.state.masterVolume || 0) / 100));
        const sfxNorm = Math.max(0, Math.min(1, (this.settings.state.sfxVolume || 0) / 100));
        this.voAudio.volume = Math.max(0, Math.min(1, masterNorm * sfxNorm));

        this._onEnded = () => advanceAfterLine();
        this._onError = () => {
          try {
            this.audioEngine.playVoiceOverCuePulse();
          } catch (_) {}
          startDurationFallback(item.duration);
        };

        this.voAudio.addEventListener('ended', this._onEnded, { once: true });
        this.voAudio.addEventListener('error', this._onError, { once: true });

        this.voAudio.src = item.file;
        const flatFile = item.file.split('/').pop();
        const playPromise = this.voAudio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              startDurationFallback(item.duration + 400);
            })
            .catch(() => {
              try {
                this.voAudio.src = flatFile;
                const p2 = this.voAudio.play();
                if (p2 && typeof p2.then === 'function') {
                  p2.then(() => {
                    startDurationFallback(item.duration + 400);
                  }).catch(() => {
                    this.audioEngine.playVoiceOverCuePulse();
                    startDurationFallback(item.duration);
                  });
                } else {
                  startDurationFallback(item.duration);
                }
              } catch (_) {
                this.audioEngine.playVoiceOverCuePulse();
                startDurationFallback(item.duration);
              }
            });
        } else {
          startDurationFallback(item.duration);
        }
      } catch (_) {
        try {
          this.audioEngine.playVoiceOverCuePulse();
        } catch (_e) {}
        startDurationFallback(item.duration);
      }
    }

    _clearTimersAndAudioListeners() {
      if (this.activeTimeoutId) {
        clearTimeout(this.activeTimeoutId);
        this.activeTimeoutId = null;
      }
      if (this.delayTimeoutId) {
        clearTimeout(this.delayTimeoutId);
        this.delayTimeoutId = null;
      }
      if (this.voAudio) {
        if (this._onEnded) {
          this.voAudio.removeEventListener('ended', this._onEnded);
          this._onEnded = null;
        }
        if (this._onError) {
          this.voAudio.removeEventListener('error', this._onError);
          this._onError = null;
        }
        try {
          this.voAudio.pause();
        } catch (_) {}
      }
    }

    _cleanupSequence() {
      this.isRunning = false;
      this._clearTimersAndAudioListeners();
      window.removeEventListener('keydown', this._boundKeydownHandler);

      if (this.subtitleEl) {
        this.subtitleEl.classList.remove('visible');
        this.subtitleEl.textContent = '';
      }

      if (this.overlayEl) {
        this.overlayEl.classList.remove('active');
        this.overlayEl.setAttribute('aria-hidden', 'true');
        this.overlayEl.style.opacity = '0';
        this.overlayEl.style.pointerEvents = 'none';
        this.overlayEl.style.display = 'none';
      }
    }

    _finishIntoGameplay() {
      if (typeof this.onComplete === 'function') {
        this.onComplete();
      }
    }
  }

  window.Blindspot.INTRO_NARRATION_QUEUE = INTRO_NARRATION_QUEUE;
  window.Blindspot.IntroSequencer = IntroSequencer;
})(window);
