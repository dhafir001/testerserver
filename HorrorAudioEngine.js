/**
 * MODULE 2: HORROR AUDIO ENGINE
 * Mendukung pemutaran dari folder yang sama (./*.mp3) maupun subfolder (assets/audio/*.mp3)
 * dengan fallback Web Audio API otomatis dan penanganan error try...catch penuh.
 * File: ./HorrorAudioEngine.js
 */
(function (window) {
  'use strict';
  window.Blindspot = window.Blindspot || {};

  class HorrorAudioEngine {
    constructor(settingsManager) {
      this.settings = settingsManager;
      this.AUDIO_PATHS = {
        bgm: ['assets/audio/bgm_menu.mp3', 'bgm_menu.mp3'],
        hover: ['assets/audio/ui_hover.mp3', 'ui_hover.mp3'],
        click: ['assets/audio/ui_click.mp3', 'ui_click.mp3'],
        ambienceGame: ['assets/audio/ambience_game.mp3', 'ambience_game.mp3']
      };

      this.bgmElement = document.getElementById('bgm-audio');
      this.ambienceElement = document.getElementById('ambience-game-audio');
      this.unlocked = false;
      this.usingSynthBgm = false;
      this.usingSynthAmbience = false;
      this.bgmStopped = false;
      this.fadeMultiplier = 0;
      this.fadeRafId = null;

      this.bgmPathIndex = 0;
      this.ambiencePathIndex = 0;

      this.audioCtx = null;
      this.synthMasterGain = null;
      this.synthAmbienceGain = null;

      this._setupBgmElement();
      this._setupAmbienceElement();
    }

    _setupBgmElement() {
      if (!this.bgmElement) return;
      try {
        this.bgmPathIndex = 0;
        this.bgmElement.src = this.AUDIO_PATHS.bgm[0];
        this.bgmElement.loop = true;
        this.bgmElement.volume = 0;

        this.bgmElement.addEventListener('error', () => {
          try {
            if (this.bgmPathIndex + 1 < this.AUDIO_PATHS.bgm.length) {
              this.bgmPathIndex++;
              this.bgmElement.src = this.AUDIO_PATHS.bgm[this.bgmPathIndex];
              if (this.unlocked && !this.bgmStopped) {
                const p = this.bgmElement.play();
                if (p && typeof p.catch === 'function') {
                  p.catch(() => {
                    this.usingSynthBgm = true;
                    this._startSynthDrone();
                  });
                }
              }
              return;
            }
            this.usingSynthBgm = true;
            if (this.unlocked && !this.bgmStopped) {
              this._startSynthDrone();
            }
          } catch (_) {
            this.usingSynthBgm = true;
          }
        });
      } catch (_) {
        this.usingSynthBgm = true;
      }
    }

    _setupAmbienceElement() {
      try {
        if (!this.ambienceElement) {
          this.ambienceElement = new Audio();
          this.ambienceElement.id = 'ambience-game-audio';
        }
        this.ambiencePathIndex = 0;
        this.ambienceElement.src = this.AUDIO_PATHS.ambienceGame[0];
        this.ambienceElement.loop = true;
        this.ambienceElement.preload = 'auto';
        this.ambienceElement.volume = 0;

        this.ambienceElement.addEventListener('error', () => {
          try {
            if (this.ambiencePathIndex + 1 < this.AUDIO_PATHS.ambienceGame.length) {
              this.ambiencePathIndex++;
              this.ambienceElement.src = this.AUDIO_PATHS.ambienceGame[this.ambiencePathIndex];
              return;
            }
            this.usingSynthAmbience = true;
          } catch (_) {
            this.usingSynthAmbience = true;
          }
        });
      } catch (_) {
        this.usingSynthAmbience = true;
      }
    }

    unlockAndFadeIn() {
      if (this.unlocked) return;
      this.unlocked = true;
      this.bgmStopped = false;

      this._initWebAudioContext();

      try {
        if (this.bgmElement && !this.usingSynthBgm) {
          const playPromise = this.bgmElement.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              try {
                if (this.bgmPathIndex + 1 < this.AUDIO_PATHS.bgm.length) {
                  this.bgmPathIndex++;
                  this.bgmElement.src = this.AUDIO_PATHS.bgm[this.bgmPathIndex];
                  const p2 = this.bgmElement.play();
                  if (p2 && typeof p2.catch === 'function') {
                    p2.catch(() => {
                      this.usingSynthBgm = true;
                      this._startSynthDrone();
                    });
                  }
                } else {
                  this.usingSynthBgm = true;
                  this._startSynthDrone();
                }
              } catch (_) {
                this.usingSynthBgm = true;
                this._startSynthDrone();
              }
            });
          }
        } else {
          this.usingSynthBgm = true;
          this._startSynthDrone();
        }
      } catch (_) {
        this.usingSynthBgm = true;
        this._startSynthDrone();
      }

      this.fadeVolumeTo(1.0, 2400);
    }

    fadeOutAndStopMenuBgm(durationMs = 1500) {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          this.stopMenuBgm();
          resolve();
        };
        setTimeout(finish, durationMs + 200);
        try {
          this.fadeVolumeTo(0, durationMs, finish);
        } catch (_) {
          finish();
        }
      });
    }

    stopMenuBgm() {
      this.bgmStopped = true;
      if (this.fadeRafId) {
        cancelAnimationFrame(this.fadeRafId);
        this.fadeRafId = null;
      }
      this.fadeMultiplier = 0;

      if (this.bgmElement) {
        try {
          this.bgmElement.pause();
          this.bgmElement.currentTime = 0;
          this.bgmElement.volume = 0;
        } catch (_) {}
      }

      if (this.synthMasterGain && this.audioCtx) {
        try {
          this.synthMasterGain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
        } catch (_) {}
      }
    }

    resumeMenuBgm() {
      this.stopGameAmbience();
      this.bgmStopped = false;
      if (this.bgmElement && !this.usingSynthBgm) {
        try {
          this.bgmElement.currentTime = 0;
          const p = this.bgmElement.play();
          if (p && typeof p.catch === 'function') {
            p.catch(() => {
              this.usingSynthBgm = true;
              this._startSynthDrone();
            });
          }
        } catch (_) {
          this.usingSynthBgm = true;
          this._startSynthDrone();
        }
      } else {
        this._startSynthDrone();
      }
      this.fadeVolumeTo(1.0, 1600);
    }

    startGameAmbience() {
      this._initWebAudioContext();
      const targetVol = this._getMasterVolumeNormalized() * 0.75;

      if (this.ambienceElement && !this.usingSynthAmbience) {
        try {
          this.ambienceElement.currentTime = 0;
          this.ambienceElement.volume = targetVol;
          const p = this.ambienceElement.play();
          if (p && typeof p.catch === 'function') {
            p.catch(() => {
              try {
                if (this.ambiencePathIndex + 1 < this.AUDIO_PATHS.ambienceGame.length) {
                  this.ambiencePathIndex++;
                  this.ambienceElement.src = this.AUDIO_PATHS.ambienceGame[this.ambiencePathIndex];
                  const p2 = this.ambienceElement.play();
                  if (p2 && typeof p2.catch === 'function') {
                    p2.catch(() => {
                      this.usingSynthAmbience = true;
                      this._startSynthCorridorAmbience(targetVol);
                    });
                  }
                } else {
                  this.usingSynthAmbience = true;
                  this._startSynthCorridorAmbience(targetVol);
                }
              } catch (_) {
                this.usingSynthAmbience = true;
                this._startSynthCorridorAmbience(targetVol);
              }
            });
          }
          return;
        } catch (_) {
          this.usingSynthAmbience = true;
        }
      }
      this._startSynthCorridorAmbience(targetVol);
    }

    stopGameAmbience() {
      if (this.ambienceElement) {
        try {
          this.ambienceElement.pause();
          this.ambienceElement.currentTime = 0;
        } catch (_) {}
      }
      if (this.synthAmbienceGain && this.audioCtx) {
        try {
          this.synthAmbienceGain.gain.setTargetAtTime(0.0001, this.audioCtx.currentTime, 0.1);
        } catch (_) {}
      }
    }

    fadeVolumeTo(targetMultiplier, durationMs = 1500, onComplete = null) {
      if (this.fadeRafId) {
        cancelAnimationFrame(this.fadeRafId);
      }
      const startMultiplier = this.fadeMultiplier;
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / Math.max(1, durationMs));
        const eased = -(Math.cos(Math.PI * progress) - 1) / 2;
        this.fadeMultiplier = startMultiplier + (targetMultiplier - startMultiplier) * eased;
        this.applyRealTimeVolume();

        if (progress < 1) {
          this.fadeRafId = requestAnimationFrame(step);
        } else if (typeof onComplete === 'function') {
          onComplete();
        }
      };

      this.fadeRafId = requestAnimationFrame(step);
    }

    applyRealTimeVolume() {
      const masterNorm = this._getMasterVolumeNormalized();
      const menuClamped = Math.max(0, Math.min(1, masterNorm * this.fadeMultiplier));

      if (!this.bgmStopped) {
        if (this.bgmElement && !this.usingSynthBgm) {
          try {
            this.bgmElement.volume = menuClamped;
          } catch (_) {}
        }

        if (this.synthMasterGain && this.audioCtx) {
          try {
            this.synthMasterGain.gain.setTargetAtTime(
              menuClamped * 0.38,
              this.audioCtx.currentTime,
              0.06
            );
          } catch (_) {}
        }
      }

      if (this.ambienceElement && !this.ambienceElement.paused) {
        try {
          this.ambienceElement.volume = Math.max(0, Math.min(1, masterNorm * 0.75));
        } catch (_) {}
      }

      if (this.synthAmbienceGain && this.audioCtx) {
        try {
          this.synthAmbienceGain.gain.setTargetAtTime(
            masterNorm * 0.25,
            this.audioCtx.currentTime,
            0.08
          );
        } catch (_) {}
      }
    }

    playHoverSfx() {
      if (!this.unlocked) return;
      const effectiveVol = this._getEffectiveSfxVolume();
      if (effectiveVol <= 0.001) return;
      this._playSfxWithFallback(this.AUDIO_PATHS.hover, effectiveVol, () => {
        this._playSynthHover(effectiveVol);
      });
    }

    playClickSfx() {
      if (!this.unlocked) return;
      const effectiveVol = this._getEffectiveSfxVolume();
      if (effectiveVol <= 0.001) return;
      this._playSfxWithFallback(this.AUDIO_PATHS.click, effectiveVol, () => {
        this._playSynthClick(effectiveVol);
      });
    }

    _playSfxWithFallback(paths, volume, synthFallback) {
      const tryPath = (idx) => {
        if (idx >= paths.length) {
          try { synthFallback(); } catch (_) {}
          return;
        }
        try {
          const audio = new Audio(paths[idx]);
          audio.volume = volume;
          const p = audio.play();
          if (p && typeof p.catch === 'function') {
            p.catch(() => tryPath(idx + 1));
          }
        } catch (_) {
          tryPath(idx + 1);
        }
      };
      tryPath(0);
    }

    playVoiceOverCuePulse() {
      this._initWebAudioContext();
      const vol = this._getEffectiveSfxVolume();
      if (!this.audioCtx || vol <= 0.001) return;
      try {
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(58, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.45);

        gain.gain.setValueAtTime(vol * 0.14, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.48);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (_) {}
    }

    _getMasterVolumeNormalized() {
      return Math.max(0, Math.min(1, (this.settings.state.masterVolume || 0) / 100));
    }

    _getEffectiveSfxVolume() {
      const master = this._getMasterVolumeNormalized();
      const sfx = Math.max(0, Math.min(1, (this.settings.state.sfxVolume || 0) / 100));
      return Math.max(0, Math.min(1, master * sfx));
    }

    _initWebAudioContext() {
      try {
        if (this.audioCtx) {
          if (this.audioCtx.state === 'suspended' && typeof this.audioCtx.resume === 'function') {
            this.audioCtx.resume().catch(() => {});
          }
          return;
        }
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.audioCtx = new AudioCtx();
      } catch (_) {}
    }

    _startSynthDrone() {
      this._initWebAudioContext();
      if (!this.audioCtx || this.synthMasterGain) return;

      try {
        const ctx = this.audioCtx;
        this.synthMasterGain = ctx.createGain();
        this.synthMasterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        this.synthMasterGain.connect(ctx.destination);

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(46.25, ctx.currentTime);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(65.41, ctx.currentTime);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.14, ctx.currentTime);
        lfoGain.gain.setValueAtTime(55, ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(145, ctx.currentTime);
        filter.Q.setValueAtTime(4.5, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(this.synthMasterGain);

        osc1.start();
        osc2.start();
        lfo.start();

        this.applyRealTimeVolume();
      } catch (_) {}
    }

    _startSynthCorridorAmbience(targetVol) {
      this._initWebAudioContext();
      if (!this.audioCtx) return;

      if (this.synthAmbienceGain) {
        try {
          this.synthAmbienceGain.gain.setTargetAtTime(targetVol * 0.35, this.audioCtx.currentTime, 0.3);
        } catch (_) {}
        return;
      }

      try {
        const ctx = this.audioCtx;
        this.synthAmbienceGain = ctx.createGain();
        this.synthAmbienceGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        this.synthAmbienceGain.connect(ctx.destination);

        const hum1 = ctx.createOscillator();
        const hum2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();

        hum1.type = 'sine';
        hum1.frequency.setValueAtTime(55, ctx.currentTime);

        hum2.type = 'sawtooth';
        hum2.frequency.setValueAtTime(110, ctx.currentTime);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(120, ctx.currentTime);
        filter.Q.setValueAtTime(3.2, ctx.currentTime);

        hum1.connect(filter);
        hum2.connect(filter);
        filter.connect(this.synthAmbienceGain);

        hum1.start();
        hum2.start();

        this.synthAmbienceGain.gain.setTargetAtTime(targetVol * 0.35, ctx.currentTime, 0.5);
      } catch (_) {}
    }

    _playSynthHover(vol) {
      if (!this.audioCtx) return;
      try {
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(190, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(88, ctx.currentTime + 0.065);

        gain.gain.setValueAtTime(vol * 0.16, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.075);
      } catch (_) {}
    }

    _playSynthClick(vol) {
      if (!this.audioCtx) return;
      try {
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(125, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(36, ctx.currentTime + 0.16);

        gain.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.17);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch (_) {}
    }
  }

  window.Blindspot.HorrorAudioEngine = HorrorAudioEngine;
})(window);
