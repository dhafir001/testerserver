(function (window) {
  'use strict';
  window.Blindspot = window.Blindspot || {};

  /**
   * MODULE 4: VISUAL BLINDSPOT ENTITY & GLITCH CONTROLLER
   * File: ./BlindspotAnomalyController.js
   */

  class BlindspotAnomalyController {
    constructor() {
      this.entityEl = document.getElementById('blindspot-entity');
      this.titleEl = document.getElementById('game-title');
      this.statusEl = document.getElementById('blindspot-status');
      this.isEntityActive = false;
      this.hideTimer = null;

      this._scheduleNextGlitch();
      this._scheduleNextSilhouette();

      window.addEventListener('mousemove', (e) => this._checkPlayerGaze(e));
    }

    _scheduleNextGlitch() {
      const delay = 2200 + Math.random() * 4800;
      setTimeout(() => {
        this.triggerTitleGlitch(140 + Math.random() * 240);
        this._scheduleNextGlitch();
      }, delay);
    }

    triggerTitleGlitch(duration = 220) {
      if (!this.titleEl) return;
      this.titleEl.classList.add('glitch-active');
      setTimeout(() => {
        this.titleEl.classList.remove('glitch-active');
      }, duration);
    }

    _scheduleNextSilhouette() {
      const delay = 5500 + Math.random() * 7500;
      setTimeout(() => {
        this._spawnPeripheralSilhouette();
        this._scheduleNextSilhouette();
      }, delay);
    }

    _spawnPeripheralSilhouette() {
      if (!this.entityEl || this.isEntityActive) return;

      const spots = [
        { left: '2.5vw', bottom: '6vh' },
        { left: '84vw', bottom: '5vh' },
        { left: '4vw', bottom: '32vh' },
        { left: '82vw', bottom: '28vh' }
      ];
      const chosen = spots[Math.floor(Math.random() * spots.length)];

      this.entityEl.style.left = chosen.left;
      this.entityEl.style.bottom = chosen.bottom;
      this.entityEl.classList.remove('vanishing');
      this.entityEl.classList.add('visible');
      this.isEntityActive = true;

      if (this.statusEl) {
        this.statusEl.textContent = 'PERIPHERAL_SCAN: ANOMALY DETECTED IN BLINDSPOT';
        this.statusEl.classList.add('entity-near');
      }

      this.triggerTitleGlitch(180);

      const visibleDuration = 2300 + Math.random() * 1600;
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        this._vanishSilhouette();
      }, visibleDuration);
    }

    _checkPlayerGaze(e) {
      if (!this.isEntityActive || !this.entityEl) return;
      const rect = this.entityEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);

      if (dist < 240) {
        this._vanishSilhouette();
      }
    }

    _vanishSilhouette() {
      if (!this.isEntityActive || !this.entityEl) return;
      this.isEntityActive = false;
      clearTimeout(this.hideTimer);

      this.entityEl.classList.remove('visible');
      this.entityEl.classList.add('vanishing');

      if (this.statusEl) {
        this.statusEl.textContent = 'PERIPHERAL_SCAN: STABLE';
        this.statusEl.classList.remove('entity-near');
      }
    }
  }

  window.Blindspot.BlindspotAnomalyController = BlindspotAnomalyController;
})(window);
