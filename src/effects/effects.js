// PORTAL 11:59 — module: EFFECTS (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// EFFECTS — particles, screen shake, scanlines, ghost layer.
// ---------------------------------------------------------------------------
const EFFECTS = (() => {
  function spawnBurst(scene, x, y, color, count) {
    if (!scene.fx) return;
    if (!scene.fx.bursts) scene.fx.bursts = [];
    const n = Math.min(count | 0, 8);
    for (let i = 0; i < n; i++) {
      const g = scene.add.graphics();
      g.fillStyle(color, 1);
      g.fillRect(-2, -2, 4, 4);
      g.x = x; g.y = y;
      const vx = (Math.random() - 0.5) * 200;
      const vy = -100 - Math.random() * 150;
      g.vx = vx; g.vy = vy;
      g.setDepth(8);
      scene.fx.bursts.push(g);
    }
  }

  function tickBursts(scene, dt) {
    if (!scene.fx || !scene.fx.bursts) return;
    const remain = [];
    for (const p of scene.fx.bursts) {
      p.vy = (p.vy || 0) + 600 * dt;
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      p.alpha = Math.max(0, p.alpha - dt * 2.5);
      if (p.alpha <= 0) p.destroy();
      else remain.push(p);
    }
    scene.fx.bursts = remain;
  }

  function shake(scene, ms, intensity) {
    if (!scene.cameras || !scene.cameras.main) return;
    const cam = scene.cameras.main;
    const ix = intensity | 0;
    const t = scene.tweens.addCounter({
      from: 0, to: ix * 2, duration: ms,
      onUpdate: (tw) => {
        const v = tw.value;
        cam.setFollowOffset(-v + Math.random() * v, -v + Math.random() * v);
      },
      onComplete: () => cam.setFollowOffset(0, 0),
    });
    if (scene._shakeTween) scene._shakeTween.remove();
    scene._shakeTween = t;
    scene.time.delayedCall(ms + 50, () => cam.setFollowOffset(0, 0));
  }

  function toggleGhostLayer(scene, on) {
    if (!scene.fx) scene.fx = {};
    if (!scene.fx.ghostOverlay) {
      const g = scene.add.graphics();
      g.setDepth(11);
      g.alpha = 0;
      scene.fx.ghostOverlay = g;
    }
    const overlay = scene.fx.ghostOverlay;
    if (on) {
      overlay.clear();
      overlay.fillStyle(0x10182a, 0.25);
      overlay.fillRect(0, 0, CONSTANTS.GAME_WIDTH, CONSTANTS.GAME_HEIGHT);
      overlay.fillStyle(0xbfa3ff, 0.05);
      for (let i = 0; i < 30; i++) overlay.fillRect(Math.random() * CONSTANTS.GAME_WIDTH, Math.random() * CONSTANTS.GAME_HEIGHT, 1, 18);
      scene.tweens.add({ targets: overlay, alpha: 0.45, duration: 400 });
    } else {
      scene.tweens.add({ targets: overlay, alpha: 0, duration: 200, onComplete: () => overlay.setVisible(false) });
    }
  }

  function scanlines(scene) {
    if (scene.fx && scene.fx.scanlineOverlay) return;
    const g = scene.add.graphics();
    g.setDepth(20);
    for (let y = 0; y < CONSTANTS.GAME_HEIGHT; y += 3) {
      g.fillStyle(0x000000, 0.10);
      g.fillRect(0, y, CONSTANTS.GAME_WIDTH, 1);
    }
    scene.fx = scene.fx || {};
    scene.fx.scanlineOverlay = g;
  }

  function flashWhite(scene, ms) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, CONSTANTS.GAME_WIDTH, CONSTANTS.GAME_HEIGHT);
    g.setDepth(25);
    g.alpha = 1;
    scene.tweens.add({ targets: g, alpha: 0, duration: ms || 200, onComplete: () => g.destroy() });
  }

  function letterbox(scene, on) {
    if (!scene.fx) scene.fx = {};
    if (!scene.fx.letterbox) {
      const g = scene.add.graphics();
      g.setDepth(24);
      scene.fx.letterbox = g;
    }
    const g = scene.fx.letterbox;
    g.clear();
    if (on) {
      g.fillStyle(0x000000, 1);
      g.fillRect(0, 0, CONSTANTS.GAME_WIDTH, 80);
      g.fillRect(0, CONSTANTS.GAME_HEIGHT - 80, CONSTANTS.GAME_WIDTH, 80);
    }
  }

  return { spawnBurst, tickBursts, shake, toggleGhostLayer, scanlines, flashWhite, letterbox };
})();
