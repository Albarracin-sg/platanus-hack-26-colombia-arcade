// PORTAL 11:59 — module: STATE (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// STATE — authoritative FSM. Single source of truth for timer/lives/score.
// ---------------------------------------------------------------------------
const STATE = (() => {
  const SEASONS = ['rain', 'christmas', 'independence', 'regular_night', 'rain_mystical'];

  function init(scene) {
    scene.state = {
      timer: 90,
      lives: 3,
      combo: 1,
      nivel: 1,
      score: 0,
      season: SEASONS[Math.floor(Math.random() * SEASONS.length)],
      era: 1,
      phase: 'loading',
      damaged: 0,
      invulnUntil: 0,
      busReached: false,
      started: false,
      reason: '',
    };
    scene.phase = scene.phase || {};
    scene.phase.currentEra = 1;
    scene.phase.transitioning = false;
  }

  function startRun(scene) {
    if (!scene.state) init(scene);
    const s = scene.state;
    s.timer = 90;
    s.lives = 3;
    s.combo = 1;
    s.nivel = 1;
    s.score = 0;
    s.season = SEASONS[Math.floor(Math.random() * SEASONS.length)];
    s.era = 1;
    s.phase = 'playing';
    s.damaged = 0;
    s.invulnUntil = 0;
    s.busReached = false;
    s.started = true;
    s.reason = '';
    scene.phase.currentEra = 1;
    scene.phase.transitioning = false;
    if (scene.phase.lastEraFired !== undefined) scene.phase.lastEraFired = 0;
  }

  function comboDodge(scene) {
    const s = scene.state;
    if (s.combo < 4) s.combo += 1; // R-3.δ: hard cap at 4×.
  }

  function onHit(scene) {
    const s = scene.state;
    if (s.invulnUntil && scene.time && scene.time.now < s.invulnUntil) return;
    if (s.phase !== 'playing' && s.phase !== 'level2') return;
    s.lives = Math.max(0, s.lives - 1);
    s.combo = 1;
    s.invulnUntil = (scene.time ? scene.time.now : 0) + 1200;
    if (scene.player) {
      scene.player.flashUntil = (scene.time ? scene.time.now : 0) + 1200;
      // respawn at impact point (R-4.β) — keep current player.x/y, no full restart.
    }
    if (scene.fx && EFFECTS) EFFECTS.shake(scene, 200, 4);
    if (s.lives <= 0) endRun(scene, 'sin_vidas');
  }

  function onPickup(scene) {
    const s = scene.state;
    if (s.phase !== 'playing' && s.phase !== 'level2') return;
    if (s.lives < 4) {
      s.lives += 1; // R-4.δ
    } else {
      s.score += 5000; // +5000 flat bonus at cap (design Open-Q #6).
    }
    if (AUDIO) AUDIO.playSfx(scene, 'pickup');
  }

  function onBusEntry(scene) {
    const s = scene.state;
    if (s.busReached) return;
    s.busReached = true;
    s.nivel = 2; // R-3.β: nunca decrementa.
    s.phase = 'level2';
    if (AUDIO) AUDIO.playSfx(scene, 'bus_arrive');
  }

  function endRun(scene, reason) {
    const s = scene.state;
    // R-1.δ edge case: time-up wins over same-frame hits.
    if (s.phase === 'game_over_time' || s.phase === 'llegaste') return;
    if (reason === 'game_over_time') s.phase = 'game_over_time';
    else if (reason === 'llegaste') s.phase = 'llegaste';
    else s.phase = 'game_over_lives';
    s.reason = reason;
  }

  function tick(scene, dt) {
    const s = scene.state;
    if (!s || !s.started) return;
    if (s.phase === 'game_over_time' || s.phase === 'game_over_lives' || s.phase === 'llegaste') return;
    // 1.0 s/s countdown, R-1.α.
    s.timer = Math.max(0, s.timer - dt);
    // Per-second score (user decision): dt is in seconds, keeps the score gate reachable.
    if (s.phase === 'playing' || s.phase === 'level2') {
      const t = Math.floor(s.timer);
      s.score += t * 100 * s.nivel * s.combo * dt;
    }
    // Phase flips at 68/46/24/0 (R-2.α).
    // era semantics: era 1 = 90→68; era 2 = 68→46; era 3 = 46→24; era 4 = 24→0.
    let newEra;
    if (s.timer > 68) newEra = 1;
    else if (s.timer > 46) newEra = 2;
    else if (s.timer > 24) newEra = 3;
    else newEra = 4;
    if (newEra !== scene.phase.currentEra) {
      scene.phase.currentEra = newEra;
      s.era = newEra;
      if (PHASE) PHASE.onThresholdCross(scene, newEra);
    }
    // End-of-run resolution. Bus-at-exact-zero loses to TIEMPO (R-1.δ / R-2.ε).
    if (s.timer <= 0 && s.phase !== 'game_over_time' && s.phase !== 'llegaste') {
      if (s.phase === 'level2') endRun(scene, 'llegaste');
      else endRun(scene, 'game_over_time');
    }
  }

  return { init, startRun, tick, comboDodge, onHit, onPickup, onBusEntry, endRun, SEASONS };
})();
