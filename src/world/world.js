// PORTAL 11:59 — module: WORLD (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// WORLD — procedural street, bus, interior, lane stripes, world scroll.
// ---------------------------------------------------------------------------
const WORLD = (() => {
  function buildStreet(scene) {
    scene.world = scene.world || {};
    const g = scene.add.graphics();
    g.setDepth(-10);
    scene.world.streetGfx = g;

    // Sky band (top 80 px).
    const palette = CONSTANTS.ERA_CONFIG[0].palette;
    g.fillStyle(palette.sky, 1);
    g.fillRect(0, 0, CONSTANTS.GAME_WIDTH, 80);
    g.fillStyle(palette.road, 1);
    g.fillRect(0, 80, CONSTANTS.GAME_WIDTH, CONSTANTS.GAME_HEIGHT - 80);

    // Sidewalk strips.
    g.fillStyle(0x222222, 1);
    g.fillRect(0, 80, CONSTANTS.GAME_WIDTH, 14);
    g.fillRect(0, CONSTANTS.GAME_HEIGHT - 80, CONSTANTS.GAME_WIDTH, 14);

    // Lane stripes (animated by tween in updateScene).
    const stripeGfx = scene.add.graphics();
    stripeGfx.setDepth(-9);
    scene.world.stripeGfx = stripeGfx;
    drawLaneStripes(scene, stripeGfx, palette.stripe);

    // Parked TransMilenio bus sprite at top.
    const bus = scene.add.graphics();
    bus.setDepth(-8);
    scene.world.busGfx = bus;
    drawParkedBus(bus, scene);

    scene.world.scrollY = 0;
  }

  function drawLaneStripes(scene, g, color) {
    g.clear();
    g.fillStyle(color, 1);
    const stripeH = 12;
    const stripeW = 40;
    const gapY = 36;
    const startOffset = ((scene.world.scrollY || 0) % gapY);
    for (let y = 80 + 30 + startOffset; y < CONSTANTS.GAME_HEIGHT - 30; y += gapY) {
      g.fillRect(CONSTANTS.GAME_WIDTH / 2 - stripeW / 2, y, stripeW, stripeH);
    }
  }

  function drawParkedBus(g, scene) {
    const w = 220, h = 110;
    const x = CONSTANTS.GAME_WIDTH / 2 - w / 2;
    const y = -10;
    g.fillStyle(CONSTANTS.COLORS.busShell, 1);
    g.fillRoundedRect(x, y, w, h, 8);
    g.fillStyle(CONSTANTS.COLORS.busStripe, 1);
    g.fillRect(x + 6, y + 36, w - 12, 14);
    // Windows (illuminated).
    g.fillStyle(0xfff5b3, 1);
    g.fillRect(x + 12, y + 8, 22, 22);
    g.fillRect(x + 40, y + 8, 22, 22);
    g.fillRect(x + 68, y + 8, 22, 22);
    g.fillRect(x + 96, y + 8, 22, 22);
    g.fillRect(x + 124, y + 8, 22, 22);
    g.fillRect(x + 152, y + 8, 22, 22);
    g.fillRect(x + 180, y + 8, 22, 22);
    // Wheels.
    g.fillStyle(0x111111, 1);
    g.fillCircle(x + 30, y + h - 5, 10);
    g.fillCircle(x + w - 30, y + h - 5, 10);
    // Door indicator.
    g.fillStyle(0x2c5fa6, 1);
    g.fillRect(x + 8, y + h - 30, 14, 22);
    scene.world.busHitbox = { x, y, w, h };
  }

  function busHitbox(scene) {
    return scene.world.busHitbox;
  }

  function buildInterior(scene) {
    // Hide street layers.
    if (scene.world.streetGfx) scene.world.streetGfx.setVisible(false);
    if (scene.world.stripeGfx) scene.world.stripeGfx.setVisible(false);
    if (scene.world.busGfx) scene.world.busGfx.setVisible(false);
    // New interior graphics.
    if (scene.world.interiorGfx) scene.world.interiorGfx.destroy();
    const g = scene.add.graphics();
    g.setDepth(-8);
    const W = CONSTANTS.GAME_WIDTH;
    const H = CONSTANTS.GAME_HEIGHT;
    // Floor (slightly warm).
    g.fillStyle(0x3b2a1a, 1);
    g.fillRect(0, 80, W, H - 80);
    // Ceiling.
    g.fillStyle(0x202024, 1);
    g.fillRect(0, 0, W, 80);
    // Seats along left & right.
    g.fillStyle(0xc0392b, 1);
    for (let x = 30; x < W - 40; x += 90) {
      g.fillRect(x, 90, 18, 50);
      g.fillRect(x + 60, 90, 18, 50);
    }
    // Rails (horizontal grab bars).
    g.fillStyle(0xc8c8c8, 1);
    g.fillRect(40, 130, W - 80, 4);
    g.fillRect(40, 175, W - 80, 4);
    // Driver area (top, ahead).
    g.fillStyle(0x2c5fa6, 1);
    g.fillRect(W / 2 - 80, 36, 160, 50);
    scene.world.interiorGfx = g;
    scene.world.inInterior = true;
  }

  function clearInterior(scene) {
    if (scene.world.interiorGfx) {
      scene.world.interiorGfx.destroy();
      scene.world.interiorGfx = null;
    }
    scene.world.inInterior = false;
    if (scene.world.streetGfx) scene.world.streetGfx.setVisible(true);
    if (scene.world.stripeGfx) scene.world.stripeGfx.setVisible(true);
    if (scene.world.busGfx) scene.world.busGfx.setVisible(true);
  }

  function scrollTo(scene, dy) {
    scene.world.scrollY = (scene.world.scrollY || 0) + dy;
    if (scene.world.stripeGfx && scene.world.stripeGfx.visible) {
      drawLaneStripes(scene, scene.world.stripeGfx, CONSTANTS.ERA_CONFIG[(scene.phase.currentEra || 1) - 1].palette.stripe);
    }
  }

  function tick(scene) {
    const s = scene.state;
    if (!s || !s.started) return;
    if (s.phase !== 'playing' && s.phase !== 'level2') return;
    const era = scene.phase.currentEra || 1;
    const cfg = CONSTANTS.ERA_CONFIG[era - 1];
    const dy = cfg.scrollSpeed * (scene.game.loop.delta / 1000);
    if (scene.obstacles && scene.obstacles.children) {
      for (const o of scene.obstacles.children.entries) {
        o.y = (o.y || 0) + dy;
      }
    }
    scrollTo(scene, dy);
  }

  return { buildStreet, buildInterior, clearInterior, busHitbox, scrollTo, tick };
})();
