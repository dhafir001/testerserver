(function (window) {
  'use strict';
  window.Blindspot = window.Blindspot || {};

  /**
   * MODULE 3: 3D CORRIDOR & ANALOG FILM GRAIN RENDERER (Web Performance Aware)
   * File: ./HorrorVisualRenderer.js
   */

  class HorrorVisualRenderer {
    constructor(settingsManager) {
      this.settings = settingsManager;
      this.sceneCanvas = document.getElementById('scene-canvas');
      this.sceneCtx = this.sceneCanvas.getContext('2d');
      this.grainCanvas = document.getElementById('grain-canvas');
      this.grainCtx = this.grainCanvas.getContext('2d');

      this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0, rawX: -9999, rawY: -9999 };
      this.particles = [];
      this.frameCount = 0;

      this._initParticles();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('mousemove', (e) => this._onMouseMove(e));
    }

    _getQualityScale() {
      const q = this.settings.state.graphicsQuality;
      if (q === 'Low') return 0.5;
      if (q === 'Medium') return 0.75;
      return 1.0;
    }

    resize() {
      const scale = this._getQualityScale();
      this.sceneCanvas.width = Math.max(320, Math.floor(window.innerWidth * scale));
      this.sceneCanvas.height = Math.max(200, Math.floor(window.innerHeight * scale));

      const grainScale = scale * 0.45;
      this.grainCanvas.width = Math.max(160, Math.floor(window.innerWidth * grainScale));
      this.grainCanvas.height = Math.max(100, Math.floor(window.innerHeight * grainScale));
    }

    _initParticles() {
      this.particles = [];
      for (let i = 0; i < 65; i++) {
        this.particles.push({
          x: Math.random(),
          y: Math.random(),
          z: Math.random(),
          size: 0.6 + Math.random() * 1.8,
          speedZ: 0.0006 + Math.random() * 0.0014
        });
      }
    }

    _onMouseMove(e) {
      this.pointer.rawX = e.clientX;
      this.pointer.rawY = e.clientY;
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      const sens = this.settings.state.mouseSensitivity;
      const invY = this.settings.state.invertY ? -1 : 1;

      this.pointer.targetX = normX * 38 * sens;
      this.pointer.targetY = normY * 24 * sens * invY;
    }

    render(timestamp) {
      this.frameCount++;
      this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.06;
      this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.06;

      this._render3DCorridor(timestamp);

      if (this.settings.state.postProcessing && this.frameCount % 2 === 0) {
        this._renderGrain();
      }
    }

    _render3DCorridor(timestamp) {
      const ctx = this.sceneCtx;
      const w = this.sceneCanvas.width;
      const h = this.sceneCanvas.height;

      ctx.fillStyle = '#020204';
      ctx.fillRect(0, 0, w, h);

      const vanishX = w * 0.5 - this.pointer.x;
      const vanishY = h * 0.46 - this.pointer.y;

      const flickerWave = Math.sin(timestamp * 0.003) * Math.cos(timestamp * 0.019);
      const spike = Math.random() > 0.985 ? 0.25 : 1.0;
      const lightAlpha = Math.max(0.03, (0.11 + flickerWave * 0.03) * spike);

      const depthCount = this.settings.state.graphicsQuality === 'Low' ? 5 : 9;
      ctx.strokeStyle = `rgba(110, 130, 145, ${lightAlpha * 0.45})`;
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(vanishX, vanishY);
      ctx.moveTo(w, 0); ctx.lineTo(vanishX, vanishY);
      ctx.moveTo(0, h); ctx.lineTo(vanishX, vanishY);
      ctx.moveTo(w, h); ctx.lineTo(vanishX, vanishY);
      ctx.stroke();

      const slowWalkOffset = (timestamp * 0.00018) % (1 / depthCount);
      for (let i = 1; i <= depthCount; i++) {
        const depth = Math.pow((i / depthCount) + slowWalkOffset, 1.75);
        const rw = w * depth;
        const rh = h * depth;
        const rx = vanishX - rw * 0.5;
        const ry = vanishY - rh * 0.46;

        ctx.strokeStyle = `rgba(95, 35, 30, ${(1 - depth) * lightAlpha * 0.9})`;
        ctx.strokeRect(rx, ry, rw, rh);
      }

      const glowGrad = ctx.createRadialGradient(
        vanishX, vanishY, 2,
        vanishX, vanishY, Math.max(w, h) * 0.42
      );
      glowGrad.addColorStop(0, `rgba(165, 200, 220, ${lightAlpha * 1.15})`);
      glowGrad.addColorStop(0.28, `rgba(120, 18, 18, ${lightAlpha * 0.55})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      const maxParticles = this.settings.state.graphicsQuality === 'Low' ? 20
        : this.settings.state.graphicsQuality === 'Medium' ? 40 : 65;

      ctx.fillStyle = 'rgba(175, 195, 210, 0.26)';
      for (let i = 0; i < maxParticles; i++) {
        const p = this.particles[i];
        p.z -= p.speedZ;
        if (p.z <= 0.05) {
          p.z = 1.0;
          p.x = Math.random();
          p.y = Math.random();
        }
        const projScale = 1 / p.z;
        const px = vanishX + (p.x - 0.5) * w * projScale * 0.45;
        const py = vanishY + (p.y - 0.5) * h * projScale * 0.45;
        if (px >= 0 && px <= w && py >= 0 && py <= h) {
          const r = p.size * (1.2 - p.z);
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.5, r), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    _renderGrain() {
      const ctx = this.grainCtx;
      const w = this.grainCanvas.width;
      const h = this.grainCanvas.height;
      const imgData = ctx.createImageData(w, h);
      const buf = new Uint32Array(imgData.data.buffer);

      for (let i = 0; i < buf.length; i++) {
        const shade = (Math.random() * 255) | 0;
        buf[i] = (42 << 24) | (shade << 16) | (shade << 8) | shade;
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }

  window.Blindspot.HorrorVisualRenderer = HorrorVisualRenderer;
})(window);
