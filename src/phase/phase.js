// PORTAL 11:59 — module: PHASE (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// PHASE — 4 era configs + transitions + bus swap (level 2 cutscene).
// ---------------------------------------------------------------------------
const PHASE = (() => {
  function configFor(era) { return CONSTANTS.ERA_CONFIG[Math.max(0, Math.min(3, (era || 1) - 1))]; }

  function currentEra(scene) { return scene.phase.currentEra || 1; }

  function onThresholdCross(scene, newEra) {
    const cfg = configFor(newEra);
    // Audio cutoff shift.
    if (AUDIO) AUDIO.setPhase(scene, newEra);
    // Palette tween on the street background. Cheaper: directly repaint.
    if (scene.world && scene.world.streetGfx) {
      const g = scene.world.streetGfx;
      g.clear();
      g.fillStyle(cfg.palette.sky, 1);
      g.fillRect(0, 0, CONSTANTS.GAME_WIDTH, 80);
      g.fillStyle(cfg.palette.road, 1);
      g.fillRect(0, 80, CONSTANTS.GAME_WIDTH, CONSTANTS.GAME_HEIGHT - 80);
      g.fillStyle(0x222222, 1);
      g.fillRect(0, 80, CONSTANTS.GAME_WIDTH, 14);
      g.fillRect(0, CONSTANTS.GAME_HEIGHT - 80, CONSTANTS.GAME_WIDTH, 14);
    }
    // Era 4 enables ghost cosmetic overlay; others disable.
    if (EFFECTS) EFFECTS.toggleGhostLayer(scene, !!cfg.ghost);
    if (AUDIO) AUDIO.playSfx(scene, 'phase_change');
    // Brief flash on phase change.
    if (EFFECTS) EFFECTS.flashWhite(scene, 180);
  }

  function transitionToBus(scene) {
    if (scene.phase.transitioning) return Promise.resolve();
    scene.phase.transitioning = true;
    return new Promise((resolve) => {
      const start = Date.now();
      if (EFFECTS) EFFECTS.letterbox(scene, true);
      scene.cameras.main.fadeOut(600, 0, 0, 0);
      scene.cameras.main.once('camerafadeoutcomplete', () => {
        try {
          STATE.onBusEntry(scene);
          WORLD.buildInterior(scene);
          ENTITY.clearAll(scene);
          ENTITY.spawnPlayer(scene);
          // Reposition player at interior door area.
          scene.player.x = CONSTANTS.GAME_WIDTH / 2;
          scene.player.y = CONSTANTS.GAME_HEIGHT * 0.55;
          scene.cameras.main.fadeIn(600, 0, 0, 0);
          scene.cameras.main.once('camerafadeincomplete', () => {
            if (EFFECTS) EFFECTS.letterbox(scene, false);
            scene.phase.transitioning = false;
            const dur = Date.now() - start;
            // R-5.β: total transition ≤ 1.5 s.
            resolve(dur);
          });
        } catch (e) { resolve(Date.now() - start); }
      });
    });
  }

  return { configFor, currentEra, onThresholdCross, transitionToBus };
})();
