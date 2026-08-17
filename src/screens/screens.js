// PORTAL 11:59 — module: SCREENS (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// SCREENS — title, game-over, initials entry, leaderboard, controls.
// ---------------------------------------------------------------------------
const SCREENS = (() => {
  function _destroyOverlay(scene, key) {
    scene.screens = scene.screens || {};
    const o = scene.screens[key];
    if (!o) return;
    // `title`/`controls` store the container directly; `initialEntry` stores a
    // wrapper `{ container, state, ... }` and `leaderboard` is a flag. Only
    // destroy when a Phaser container is actually present (R-7.α).
    const target = (typeof o.destroy === 'function') ? o : (o.container || null);
    if (target && typeof target.destroy === 'function') target.destroy();
    scene.screens[key] = null;
  }

  function showTitle(scene) {
    _destroyOverlay(scene, 'title');
    const g = scene.add.container(0, 0);
    g.setDepth(50);
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(0, 0, CONSTANTS.GAME_WIDTH, CONSTANTS.GAME_HEIGHT);
    g.add(bg);
    const title = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 160, 'PORTAL 11:59', {
      fontFamily: 'monospace', fontSize: '56px', color: '#fff5b3',
    }).setOrigin(0.5);
    g.add(title);
    const sub = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 230, 'EL ULTIMO TRANSMI', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffd166',
    }).setOrigin(0.5);
    g.add(sub);
    const hook = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 290, 'Corres al ultimo bus antes de medianoche.\nSi lo tomas, Nivel 2: dentro del bus.', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9aa5b8', align: 'center',
    }).setOrigin(0.5);
    g.add(hook);
    const btn1 = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 380, 'START → JUGAR', {
      fontFamily: 'monospace', fontSize: '22px', color: '#fff5b3',
    }).setOrigin(0.5);
    g.add(btn1);
    const btn2 = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 420, 'B1 → MARCADOR', {
      fontFamily: 'monospace', fontSize: '18px', color: '#9aa5b8',
    }).setOrigin(0.5);
    g.add(btn2);
    const ctrls = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 510, 'WASD mover   |   B1 dash   |   B2 salto', {
      fontFamily: 'monospace', fontSize: '13px', color: '#9aa5b8',
    }).setOrigin(0.5);
    g.add(ctrls);
    scene.screens = scene.screens || {};
    scene.screens.title = g;
    scene.screens.titleMode = 'title';
  }

  function hideTitle(scene) {
    _destroyOverlay(scene, 'title');
    if (scene.screens) scene.screens.titleMode = null;
  }

  async function showLeaderboardModal(scene) {
    _destroyOverlay(scene, 'title');
    _destroyOverlay(scene, 'leaderboard');
    const entries = await STORAGE.leaderboardRead(scene);
    HUD.renderLeaderboard(scene, entries, 240, 200);
    if (!scene.screens) scene.screens = {};
    scene.screens.leaderboard = true;
    scene.screens.titleMode = 'leaderboard';
  }

  function hideLeaderboard(scene) {
    if (scene.hud && scene.hud.leaderboardGroup) {
      scene.hud.leaderboardGroup.destroy();
      scene.hud.leaderboardGroup = null;
    }
    _destroyOverlay(scene, 'leaderboard');
    if (scene.screens) scene.screens.titleMode = null;
  }

  function showInitialEntry(scene) {
    _destroyOverlay(scene, 'initialEntry');
    const g = scene.add.container(0, 0);
    g.setDepth(50);
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(0, 0, CONSTANTS.GAME_WIDTH, CONSTANTS.GAME_HEIGHT);
    g.add(bg);
    const title = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 100, 'INGRESA INICIALES', {
      fontFamily: 'monospace', fontSize: '24px', color: '#fff5b3',
    }).setOrigin(0.5);
    g.add(title);
    // Current chosen letters.
    const state = { letters: [], row: 0, col: 0, done: false };
    const lettersText = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 140, '___', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ffd166',
    }).setOrigin(0.5);
    g.add(lettersText);
    // Grid preview.
    const gridG = scene.add.graphics();
    g.add(gridG);
    const updateGrid = () => {
      gridG.clear();
      CONSTANTS.LETTER_GRID.forEach((row, ri) => {
        row.forEach((letter, ci) => {
          const x = 200 + ci * 60;
          const y = 220 + ri * 50;
          const isCursor = ri === state.row && ci === state.col;
          if (isCursor) {
            gridG.fillStyle(0xffd166, 0.3);
            gridG.fillRoundedRect(x - 22, y - 22, 44, 44, 4);
          }
          const t = scene.add.text(x, y, letter, {
            fontFamily: 'monospace', fontSize: '20px', color: isCursor ? '#fff5b3' : '#9aa5b8',
          }).setOrigin(0.5);
          g.add(t);
        });
      });
      lettersText.setText(
        state.letters.length
          ? state.letters.join('') + '_'.repeat(3 - state.letters.length)
          : '___'
      );
    };
    updateGrid();
    const hint = scene.add.text(CONSTANTS.GAME_WIDTH / 2, 510, 'Mover cursor | B1 fija letra | B2 listo | P1_L borra', {
      fontFamily: 'monospace', fontSize: '12px', color: '#9aa5b8',
    }).setOrigin(0.5);
    g.add(hint);

    if (!scene.screens) scene.screens = {};
    scene.screens.initialEntry = { container: g, state, updateGrid };

    const tickInput = () => {
      if (!scene.screens.initialEntry) return;
      const a = scene.input && scene.input.actions;
      if (!a) return;
      // Navigate the grid (P1_U/D/L/R).
      if (a._uEdge) {} // no per-frame edges — we use snapshot booleans for held navigation.
      const speed = 6; // cells per second-ish
      const dt = 1 / 60;
      const move = { u: a.up, d: a.down, l: a.left, r: a.right };
      // Fractional accumulators persist across frames; the cursor only moves
      // when the accumulator crosses an integer boundary. Rounding the live
      // row/col every frame would zero the accumulator and freeze the cursor.
      if (state.rowAcc === undefined) state.rowAcc = 0;
      if (state.colAcc === undefined) state.colAcc = 0;
      const RATE = 0.18;
      if (move.u) { state.rowAcc -= RATE; if (state.rowAcc <= -1) { state.rowAcc += 1; state.row = Math.max(0, state.row - 1); } }
      if (move.d) { state.rowAcc += RATE; if (state.rowAcc >= 1) { state.rowAcc -= 1; state.row = Math.min(CONSTANTS.LETTER_GRID.length - 1, state.row + 1); } }
      const colsMax = (CONSTANTS.LETTER_GRID[state.row] || []).length;
      if (move.l) { state.colAcc -= RATE; if (state.colAcc <= -1) { state.colAcc += 1; state.col = Math.max(0, state.col - 1); } }
      if (move.r) { state.colAcc += RATE; if (state.colAcc >= 1) { state.colAcc -= 1; state.col = Math.min(colsMax - 1, state.col + 1); } }
      updateGrid();
    };
    scene.screens.initialEntry.tick = tickInput;

    const finalize = async () => {
      if (state.done) return;
      state.done = true;
      // Pad to 3 letters for the storage validator (R-7.α: exactly 3 uppercase A–Z).
      while (state.letters.length < 3) state.letters.push('A');
      const entry = {
        initials: state.letters.join(''),
        score: Math.floor(scene.state.score),
        season: scene.state.season,
        ts: new Date().toISOString(),
      };
      await STORAGE.leaderboardWrite(scene, entry);
      _destroyOverlay(scene, 'initialEntry');
      showFinalLeaderboard(scene);
    };

    // B1: advance — fix the currently-highlighted letter, pushing it onto
    // `state.letters`. The insertion cursor is implicit in `state.letters.length`
    // so each B1 press advances to the next slot (R-7.β). At 3 letters the
    // entry is finalised automatically.
    scene.screens.initialEntry.advance = () => {
      if (state.done) return;
      const cellLetters = CONSTANTS.LETTER_GRID[state.row] || [];
      const letter = cellLetters[state.col] || 'A';
      if (letter === 'DEL') {
        if (state.letters.length > 0) state.letters.pop();
      } else if (letter === 'END') {
        finalize();
        return;
      } else if (state.letters.length < 3) {
        state.letters.push(letter);
      }
      if (state.letters.length >= 3) {
        finalize();
        return;
      }
      updateGrid();
    };

    // B2: also finalise with the letters currently entered (lets players who
    // pick fewer than 3 still submit, e.g. for very short entries).
    scene.screens.initialEntry.b2 = () => finalize();
  }

  function hideInitialEntry(scene) {
    _destroyOverlay(scene, 'initialEntry');
  }

  function showFinalLeaderboard(scene) {
    _destroyOverlay(scene, 'finalLeaderboard');
    (async () => {
      const entries = await STORAGE.leaderboardRead(scene);
      HUD.renderLeaderboard(scene, entries, 240, 180);
    })();
  }

  function showGameOver(scene, reason) {
    // Already rendered by HUD.refresh — this is an alias hook for clarity.
    // Use it to attach START1 retry.
    if (!scene.screens) scene.screens = {};
    scene.screens.gameOverReason = reason;
  }

  function showControls(scene) {
    _destroyOverlay(scene, 'controls');
    const g = scene.add.container(0, 0);
    g.setDepth(50);
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRect(0, 0, CONSTANTS.GAME_WIDTH, CONSTANTS.GAME_HEIGHT);
    g.add(bg);
    const rows = [
      'W A S D  — mover',
      'B1 (u)  — dash',
      'B2 (i)  — salto',
      'START1 (Enter) — reiniciar',
      'P1_L (a) — borrar letra',
    ];
    rows.forEach((line, i) => {
      g.add(scene.add.text(CONSTANTS.GAME_WIDTH / 2, 180 + i * 40, line, {
        fontFamily: 'monospace', fontSize: '20px', color: '#fff5b3',
      }).setOrigin(0.5));
    });
    g.add(scene.add.text(CONSTANTS.GAME_WIDTH / 2, 480, 'START PARA VOLVER', {
      fontFamily: 'monospace', fontSize: '16px', color: '#9aa5b8',
    }).setOrigin(0.5));
    scene.screens = scene.screens || {};
    scene.screens.controls = g;
  }

  function hideControls(scene) {
    _destroyOverlay(scene, 'controls');
  }

  return {
    showTitle, hideTitle,
    showLeaderboardModal, hideLeaderboard,
    showInitialEntry, hideInitialEntry,
    showFinalLeaderboard,
    showGameOver, showControls, hideControls,
  };
})();
