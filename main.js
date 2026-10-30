/**
 * BLINDSPOT — Application Entry Point
 * Mendukung pemuatan dari satu folder (flat) maupun subfolder, serta aman terhadap timing DOMContentLoaded.
 * File: main.js
 */
(function (window) {
  'use strict';

  function bootstrapBlindspot() {
    if (window.__blindspotBootstrapped) return;
    if (
      !window.Blindspot ||
      !window.Blindspot.SettingsManager ||
      !window.Blindspot.HorrorAudioEngine ||
      !window.Blindspot.HorrorVisualRenderer ||
      !window.Blindspot.BlindspotAnomalyController ||
      !window.Blindspot.IntroSequencer ||
      !window.Blindspot.MainMenuUIController
    ) {
      return;
    }
    window.__blindspotBootstrapped = true;

    const {
      SettingsManager,
      HorrorAudioEngine,
      HorrorVisualRenderer,
      BlindspotAnomalyController,
      MainMenuUIController
    } = window.Blindspot;

    const settingsManager = new SettingsManager();
    const audioEngine = new HorrorAudioEngine(settingsManager);
    const visualRenderer = new HorrorVisualRenderer(settingsManager);
    const anomalyController = new BlindspotAnomalyController();

    new MainMenuUIController(
      settingsManager,
      audioEngine,
      visualRenderer,
      anomalyController
    );

    const loop = (timestamp) => {
      visualRenderer.render(timestamp);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  window.__bootstrapBlindspot = bootstrapBlindspot;

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootstrapBlindspot);
  } else {
    bootstrapBlindspot();
  }
  window.addEventListener('load', bootstrapBlindspot);
})(window);
