// PORTAL 11:59 — module: HUD (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// HUD — top bar + leaderboard renderer.
// ---------------------------------------------------------------------------
const HUD = (() => {
  function build(scene) {
    const style = { fontFamily: 'monospace', fontSize: '20px', color: '#fff5b3' };
    const dim = { fontFamily: 'monospace', fontSize: '16px', color: '#9aa5b8' };
    const xMargin = 16;
    scene.hud = scene.hud || {};
    scene.hud.timer = scene.add.text(xMargin, 16, '90', style).setDepth(30);
    scene.hud.score = scene.add.text(CONSTANTS.GAME_WIDTH - xMargin, 16, '0', { ...style, fontSize: '20px' }).setOrigin(1, 0).setDepth(30);
    scene.hud.lives = scene.add.text(xMargin, 48, 'LIVES: 3', dim).setDepth(30);
    scene.hud.combo = scene.add.text(CONSTANTS.GAME_WIDTH - xMargin, 48, 'x1', dim).setOrigin(1, 0).setDepth(30);
    scene.hud.level = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 16, 'NIVEL 1', { ...style, fontSize: '18px' }).setOrigin(0.5, 0).setDepth(30);
    scene.hud.phase = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 48, 'NOCHE', dim).setOrigin(0.5, 0).setDepth(30);
    scene.hud.scoreLabel = scene.add.text(CONSTANTS.GAME_WIDTH - xMargin - 60, 16, 'SCORE', { ...dim, fontSize: '12px' }).setOrigin(1, 0).setDepth(30);
  }

  function refresh(scene) {
    if (!scene.hud) return;
    const s = scene.state;
    if (!s) return;
    const t = Math.ceil(s.timer);
    scene.hud.timer.setText(String(t));
    scene.hud.score.setText(String(Math.floor(s.score)));
    scene.hud.lives.setText('VIDAS: ' + s.lives);
    scene.hud.combo.setText('x' + s.combo);
    scene.hud.level.setText('NIVEL ' + s.nivel);
    const phaseNames = ['NOCHE', 'BOGOTA', 'LLUVIA', 'ALMAS'];
    scene.hud.phase.setText(phaseNames[(scene.phase.currentEra || 1) - 1] || '');
    // Last-5s flash on timer (R-1.i).
    if (scene.time) {
      if (t <= 5 && t > 0 && !scene.hud._flashTween) {
        scene.hud._flashTween = scene.tweens.addCounter({
          from: 0, to: 100, duration: 400, repeat: -1, yoyo: true,
          onUpdate: (tw) => {
            const v = Math.floor(tw.value);
            scene.hud.timer.setColor(v < 50 ? '#ff5577' : '#fff5b3');
          },
        });
      } else if (t > 5 && scene.hud._flashTween) {
        scene.hud._flashTween.stop();
        scene.hud._flashTween = null;
        scene.hud.timer.setColor('#fff5b3');
      }
    }
    // Inline game-over overlay.
    if (s.phase === 'game_over_time' || s.phase === 'game_over_lives' || s.phase === 'llegaste') {
      scene.hud.endLabel = scene.hud.endLabel || scene.add.text(CONSTANTS.GAME_WIDTH / 2, CONSTANTS.GAME_HEIGHT / 2 - 20, '', {
        fontFamily: 'monospace', fontSize: '48px', color: '#fff5b3',
      }).setOrigin(0.5).setDepth(40);
      const label = s.phase === 'game_over_time' ? 'TIEMPO'
        : s.phase === 'game_over_lives' ? 'SIN VIDAS'
        : 'LLEGASTE';
      scene.hud.endLabel.setText(label);
      const sub = scene.hud.endSub = scene.hud.endSub
        || scene.add.text(CONSTANTS.GAME_WIDTH / 2, CONSTANTS.GAME_HEIGHT / 2 + 36, '', {
          fontFamily: 'monospace', fontSize: '20px', color: '#9aa5b8',
        }).setOrigin(0.5).setDepth(40);
      sub.setText('PUNTAJE: ' + Math.floor(s.score) + '   |   START PARA REINICIAR');
    } else if (scene.hud.endLabel) {
      scene.hud.endLabel.setVisible(false);
      if (scene.hud.endSub) scene.hud.endSub.setVisible(false);
    }
    // R-7.α: when a run ends, show the initials modal IF the score qualifies for top 5.
    if ((s.phase === 'game_over_time' || s.phase === 'game_over_lives' || s.phase === 'llegaste')
        && scene.screens && !scene.screens.initialEntry && !scene.screens._initialsTriggered) {
      scene.screens._initialsTriggered = true;
      (async () => {
        try {
          const entries = await STORAGE.leaderboardRead(scene);
          if (STORAGE.leaderboardQualifies(entries, s.score)) {
            SCREENS.showInitialEntry(scene);
          }
        } catch (_) { /* bridge failure — skip modal, R-7.ε */ }
      })();
    }
  }

  function renderLeaderboard(scene, entries, x0, y0) {
    if (!scene.hud) scene.hud = {};
    if (scene.hud.leaderboardGroup) {
      scene.hud.leaderboardGroup.clear(true, true);
    }
    const grp = scene.add.container(x0 || 240, y0 || 220);
    scene.hud.leaderboardGroup = grp;
    grp.setDepth(45);
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(0, 0, 320, 220, 8);
    grp.add(bg);
    const title = scene.add.text(160, 16, 'MEJORES PUNTAJES', {
      fontFamily: 'monospace', fontSize: '18px', color: '#fff5b3',
    }).setOrigin(0.5, 0);
    grp.add(title);
    if (!entries || entries.length === 0) {
      grp.add(scene.add.text(160, 110, 'Aun sin marcas', { fontFamily: 'monospace', fontSize: '14px', color: '#9aa5b8' }).setOrigin(0.5));
    } else {
      entries.forEach((e, i) => {
        const y = 50 + i * 28;
        const row = scene.add.text(20, y, `${i + 1}. ${e.initials}   ${Math.floor(e.score).toString().padStart(6, '0')}   ${e.season}`, {
          fontFamily: 'monospace', fontSize: '14px', color: i === 0 ? '#ffd166' : '#fff5b3',
        });
        grp.add(row);
      });
    }
    const foot = scene.add.text(160, 200, 'START PARA JUGAR', {
      fontFamily: 'monospace', fontSize: '12px', color: '#9aa5b8',
    }).setOrigin(0.5, 1);
    grp.add(foot);
  }

  return { build, refresh, renderLeaderboard };
})();
