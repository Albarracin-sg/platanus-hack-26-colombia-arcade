// PORTAL 11:59 — module: BOOT (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// BOOT — Phaser.Game config, scene registration, composition root.
// ---------------------------------------------------------------------------
const BOOT = (() => {
  class StreetScene extends Phaser.Scene {
    constructor() { super(CONSTANTS.SCENE_KEYS.STREET); }

    create() {
      this.fx = {};
      STATE.init(this);
      // Initialize sub-systems in order (design §2).
      WORLD.buildStreet(this);
      ENTITY.initPools(this);
      ENTITY.spawnPlayer(this);
      if (EFFECTS) EFFECTS.scanlines(this);
      HUD.build(this);
      SCREENS.showTitle(this);
      INPUT.install(this);
      // If a previous leaderboard exists, prefetch (non-blocking).
      STORAGE.leaderboardRead(this).catch(() => {});
    }

    update(_, dt) {
      // Phase-driven updates first.
      const input = INPUT.snapshot(this);
      const now = this.time ? this.time.now : 0;
      // Process input START press → restart / open leaderboard / close anything.
      if (input.startPressed) {
        const mode = this.screens && this.screens.titleMode;
        if (mode === 'leaderboard') {
          SCREENS.hideLeaderboard(this);
          SCREENS.showTitle(this);
          INPUT.consume(this); INPUT.startEdge(this); return;
        }
        if (mode === 'title' || !this.state.started) {
          SCREENS.hideTitle(this);
          STATE.startRun(this);
          AUDIO.startAmbient(this);
          AUDIO.setPhase(this, 1);
          INPUT.consume(this); INPUT.startEdge(this); return;
        }
        if (this.state.phase === 'game_over_time' || this.state.phase === 'game_over_lives' || this.state.phase === 'llegaste') {
          // If initials modal is up, START1 skips it and restarts.
          if (this.screens && this.screens.initialEntry) {
            SCREENS.hideInitialEntry(this);
            if (this.screens) this.screens._initialsTriggered = false;
          }
          // Restart.
          const score = Math.floor(this.state.score);
          const qualifies = score > 0;
          AUDIO.stop(this);
          STATE.init(this);
          STORAGE.clearCache(this);
          WORLD.clearInterior(this);
          WORLD.buildStreet(this);
          ENTITY.clearAll(this);
          ENTITY.spawnPlayer(this);
          SCREENS.hideTitle(this);
          SCREENS.hideLeaderboard(this);
          SCREENS.hideInitialEntry(this);
          if (this.screens) this.screens._initialsTriggered = false;
          STATE.startRun(this);
          AUDIO.startAmbient(this);
          AUDIO.setPhase(this, 1);
          INPUT.consume(this); INPUT.startEdge(this); return;
        }
      }
      // B1 from title opens the leaderboard.
      if (!this.state.started && input.dashPressed) {
        if (this.screens && this.screens.titleMode === 'title') {
          SCREENS.showLeaderboardModal(this);
          INPUT.consume(this); return;
        }
      }
      // Live play updates.
      if (this.state && this.state.started && (this.state.phase === 'playing' || this.state.phase === 'level2')) {
        STATE.tick(this, dt / 1000);
        const cfg = PHASE.configFor(this.phase.currentEra);
        ENTITY.updatePlayer(this, dt / 1000, input, cfg);
        ENTITY.updateObstacles(this, now);
        WORLD.tick(this);
        if (EFFECTS) EFFECTS.tickBursts(this, dt / 1000);
      }
      // Bus-interior 10→1 countdown overlay (R-5.ε).
      if (this.state && this.state.phase === 'level2' && this.state.timer <= 10 && this.state.timer > 0) {
        if (!this.hud._countdown) {
          this.hud._countdown = this.add.text(CONSTANTS.GAME_WIDTH / 2, CONSTANTS.GAME_HEIGHT / 2 - 60, '', {
            fontFamily: 'monospace', fontSize: '64px', color: '#fff5b3',
          }).setOrigin(0.5).setDepth(40);
        }
        this.hud._countdown.setText(String(Math.ceil(this.state.timer)));
      }
      // Initial-entry mode (R-7.β): route joystick + B1/B2 to the modal handlers.
      if (this.screens && this.screens.initialEntry) {
        if (this.screens.initialEntry.tick) this.screens.initialEntry.tick();
        if (input.dashPressed && this.screens.initialEntry.advance) this.screens.initialEntry.advance();
        if (input.jumpPressed && this.screens.initialEntry.b2) this.screens.initialEntry.b2();
      }
      // Snap-input edges after each frame.
      INPUT.consume(this);
      // Final HUD refresh.
      HUD.refresh(this);
    }
  }

  class BusInteriorScene extends Phaser.Scene {
    constructor() { super(CONSTANTS.SCENE_KEYS.INTERIOR); }
    create() {
      // Used only as a placeholder for scene.start() safety; logic stays in Street.
      this.add.text(CONSTANTS.GAME_WIDTH / 2, CONSTANTS.GAME_HEIGHT / 2, 'BUS INTERIOR', {
        fontFamily: 'monospace', fontSize: '28px', color: '#fff5b3',
      }).setOrigin(0.5);
    }
  }

  function launch() {
    if (typeof Phaser === 'undefined') return null;
    const config = {
      type: Phaser.AUTO,
      width: CONSTANTS.GAME_WIDTH,
      height: CONSTANTS.GAME_HEIGHT,
      parent: 'game-root',
      backgroundColor: '#05080f',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [StreetScene, BusInteriorScene],
    };
    return new Phaser.Game(config);
  }

  return { launch, StreetScene, BusInteriorScene };
})();

// Boot once at module evaluation.
BOOT.launch();
