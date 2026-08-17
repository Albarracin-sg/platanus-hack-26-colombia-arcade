// PORTAL 11:59 — module: ENTITY (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// ENTITY — player sprite, obstacle pool, pickups, spawner, collision.
// ---------------------------------------------------------------------------
const ENTITY = (() => {
  function spawnPlayer(scene) {
    scene.player = {
      x: CONSTANTS.GAME_WIDTH / 2,
      y: CONSTANTS.GAME_HEIGHT * 0.7,
      vx: 0,
      speed: 220,
      dashUntil: 0,
      dashCooldownUntil: 0,
      ghostUntil: 0,
    };
    if (scene.playerGfx) scene.playerGfx.destroy();
    const g = scene.add.graphics();
    g.fillStyle(CONSTANTS.COLORS.p1, 1);
    g.fillRoundedRect(-12, -16, 24, 32, 4);
    g.fillStyle(0x000000, 0.4);
    g.fillCircle(-4, -4, 2);
    g.fillCircle(4, -4, 2);
    scene.playerGfx = g;
    scene.playerGfx.setDepth(5);
    updatePlayerGfx(scene);
  }

  function updatePlayerGfx(scene) {
    if (!scene.playerGfx) return;
    scene.playerGfx.x = scene.player.x;
    scene.playerGfx.y = scene.player.y;
    if (scene.player.flashUntil && scene.time && scene.time.now < scene.player.flashUntil) {
      scene.playerGfx.alpha = 0.5 + 0.5 * Math.abs(Math.sin(scene.time.now * 0.04));
    } else {
      scene.playerGfx.alpha = 1;
    }
  }

  function updatePlayer(scene, dt, input, eraConfig) {
    const p = scene.player;
    if (!p) return;
    const now = scene.time ? scene.time.now : 0;
    // Auto-runner: lateral steering only, fixed anchor y (R-6.γ).
    let vx = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    let speed = p.speed;
    if (input.dashPressed && now > p.dashCooldownUntil) {
      p.dashUntil = now + 200;
      p.dashCooldownUntil = now + 600;
      if (AUDIO) AUDIO.playSfx(scene, 'dash');
    }
    if (now < p.dashUntil) {
      speed *= 1.9;
      p.ghostUntil = p.dashUntil;
    }
    p.vx = vx * speed;
    p.x += p.vx * dt;
    // Clamp to playfield (y is fixed by the spawn anchor — never mutated by input).
    if (p.x < 24) p.x = 24;
    if (p.x > CONSTANTS.GAME_WIDTH - 24) p.x = CONSTANTS.GAME_WIDTH - 24;
    updatePlayerGfx(scene);
  }

  function initPools(scene) {
    if (!scene.obstacles) scene.obstacles = scene.add.group();
    if (!scene.pickupsGroup) scene.pickupsGroup = scene.add.group();
    scene.entitySpawn = { lastSpawn: 0 };
  }

  function pickArchetype(pool) {
    let total = 0;
    for (const a of pool) total += a.weight;
    let r = Math.random() * total;
    for (const a of pool) {
      r -= a.weight;
      if (r <= 0) return a;
    }
    return pool[pool.length - 1];
  }

  function drawArchetype(g, arch, isGhost, interior) {
    g.clear();
    const c = CONSTANTS.COLORS;
    const id = arch.id;
    const hb = arch.hitbox;
    g.fillStyle(c.danger, 1);
    if (isGhost) {
      g.fillStyle(c.ghost, 0.35);
    }
    const w = hb.w, h = hb.h;
    if (id === 'passenger') {
      g.fillStyle(isGhost ? c.ghost : 0xb38a5a, isGhost ? 0.35 : 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
      g.fillStyle(isGhost ? 0x000000 : 0xffe0c2, isGhost ? 0.35 : 1);
      g.fillCircle(0, -h / 2 + 8, 4);
    } else if (id === 'rail') {
      g.fillStyle(isGhost ? c.ghost : 0x888888, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2, -h / 2, w, h);
    } else if (id === 'stop') {
      g.fillStyle(isGhost ? c.ghost : 0x2c5fa6, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2, -h / 2, w, h);
    } else if (id === 'bag') {
      g.fillStyle(isGhost ? c.ghost : 0x6e3b1a, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle(0xfff5b3, isGhost ? 0.35 : 1);
      g.fillCircle(0, 0, 3);
    } else if (id === 'kid') {
      g.fillStyle(isGhost ? c.ghost : 0xffd166, isGhost ? 0.35 : 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    } else if (id === 'puddle' || id === 'mist') {
      g.fillStyle(isGhost ? c.ghost : 0x6dd5ed, isGhost ? 0.35 : 0.8);
      g.fillEllipse(0, 0, w, h);
    } else if (id === 'wet' || id === 'bench') {
      g.fillStyle(isGhost ? c.ghost : 0x444422, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2, -h / 2, w, h);
    } else if (id === 'umbrella') {
      g.fillStyle(isGhost ? c.ghost : 0xc0392b, isGhost ? 0.35 : 1);
      g.fillTriangle(-w / 2, 0, w / 2, 0, 0, -h / 2);
      g.fillStyle(0x222, isGhost ? 0.35 : 1);
      g.fillRect(-1, 0, 2, h / 2);
    } else if (id === 'vendor') {
      g.fillStyle(isGhost ? c.ghost : 0xa86b3a, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2, -h / 2 + 8, w, h - 8);
      g.fillStyle(isGhost ? c.ghost : 0xffd166, isGhost ? 0.35 : 1);
      g.fillTriangle(-w / 2, -h / 2 + 8, w / 2, -h / 2 + 8, 0, -h / 2 - 8);
    } else if (id === 'cart') {
      g.fillStyle(isGhost ? c.ghost : 0x6b3a14, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle(0x000, isGhost ? 0.35 : 1);
      g.fillCircle(-w / 2 + 4, h / 2 - 4, 3);
      g.fillCircle(w / 2 - 4, h / 2 - 4, 3);
    } else if (id === 'sign') {
      g.fillStyle(isGhost ? c.ghost : 0xdddddd, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2, -h / 2 + 8, w, 6);
      g.fillRect(-3, -h / 2, 6, h);
      g.fillStyle(c.red, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2 + 4, -h / 2 + 12, w - 8, h - 16);
    } else if (id === 'cone') {
      g.fillStyle(isGhost ? c.ghost : 0xff7733, isGhost ? 0.35 : 1);
      g.fillTriangle(-w / 2, h / 2, w / 2, h / 2, 0, -h / 2);
      g.fillStyle(0xffffff, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2, 0, w, 3);
    } else if (id === 'busstop') {
      g.fillStyle(isGhost ? c.ghost : 0x6dd5ed, isGhost ? 0.35 : 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      g.fillStyle(0xffffff, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2 + 6, -h / 2 + 6, w - 12, h / 2 - 8);
    } else if (id === 'tree') {
      g.fillStyle(isGhost ? c.ghost : 0x2c5fa6, isGhost ? 0.35 : 1);
      g.fillTriangle(-w / 2, h / 2, w / 2, h / 2, 0, -h);
      g.fillStyle(0x6b3a14, isGhost ? 0.35 : 1);
      g.fillRect(-2, h / 2 - 6, 4, 6);
    } else if (id === 'lightrope') {
      g.fillStyle(isGhost ? c.ghost : 0xfff5b3, isGhost ? 0.35 : 1);
      for (let i = -w / 2; i < w / 2; i += 8) {
        g.fillCircle(i, 0, 2);
      }
    } else if (id === 'lantern') {
      g.fillStyle(isGhost ? c.ghost : 0xffd166, isGhost ? 0.35 : 1);
      g.fillTriangle(-w / 2, h / 2 - 2, w / 2, h / 2 - 2, 0, -h / 2);
      g.fillStyle(0x222, isGhost ? 0.35 : 1);
      g.fillRect(-1, h / 2 - 2, 2, 4);
    } else if (id === 'giftbox') {
      g.fillStyle(isGhost ? c.ghost : 0xc0392b, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle(0xfff5b3, isGhost ? 0.35 : 1);
      g.fillRect(-2, -h / 2, 4, h);
      g.fillRect(-w / 2, -2, w, 4);
    } else if (id === 'flag') {
      g.fillStyle(isGhost ? c.ghost : 0xfff5b3, isGhost ? 0.35 : 1);
      g.fillRect(-1, -h, 2, h * 2);
      g.fillStyle(c.red, isGhost ? 0.35 : 1);
      g.fillTriangle(1, -h, 1, -h / 2, w / 2, -h * 0.75);
    } else if (id === 'parade') {
      g.fillStyle(isGhost ? c.ghost : 0xff5577, isGhost ? 0.35 : 1);
      g.fillCircle(-w / 4, 0, 8);
      g.fillCircle(w / 4, 0, 8);
      g.fillStyle(c.accent, isGhost ? 0.35 : 1);
      g.fillRect(-w / 2 + 2, -2, w - 4, 4);
    } else if (id === 'firework') {
      g.fillStyle(isGhost ? c.ghost : 0xff9b54, isGhost ? 0.35 : 1);
      g.fillCircle(0, 0, 6);
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 / 6) * i;
        g.fillRect(Math.cos(a) * 6 - 1, Math.sin(a) * 6 - 1, 2, 2);
      }
    } else if (id === 'spirit' || id === 'walker' || id === 'soul') {
      g.fillStyle(isGhost ? c.ghost : 0xbfa3ff, isGhost ? 0.35 : 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      g.fillStyle(0x000, isGhost ? 0.35 : 0.6);
      g.fillCircle(0, 0, 4);
    } else if (id === 'stare') {
      g.fillStyle(isGhost ? c.ghost : 0xff5577, isGhost ? 0.35 : 1);
      g.fillCircle(0, 0, w / 2);
      g.fillStyle(0x000, isGhost ? 0.35 : 1);
      g.fillCircle(-3, -2, 2);
      g.fillCircle(3, -2, 2);
    } else if (id === 'runner') {
      g.fillStyle(isGhost ? c.ghost : 0x9fb0c8, isGhost ? 0.35 : 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    } else if (id === 'shadow') {
      g.fillStyle(isGhost ? c.ghost : 0x222, isGhost ? 0.35 : 1);
      g.fillEllipse(0, 0, w, h);
    } else if (id === 'goldfish') {
      g.fillStyle(isGhost ? c.ghost : 0xff9b54, isGhost ? 0.35 : 1);
      g.fillEllipse(-w / 4, 0, w / 2, h / 2);
      g.fillTriangle(w / 2 - 2, -4, w / 2 - 2, 4, w / 2 + 4, 0);
    } else if (id === 'bumper') {
      g.fillStyle(isGhost ? c.ghost : 0xaaaaaa, isGhost ? 0.35 : 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    } else if (id === 'petal') {
      g.fillStyle(isGhost ? c.ghost : 0xff8fc8, isGhost ? 0.35 : 1);
      g.fillCircle(0, 0, w / 2);
    } else if (id === 'pickup') {
      g.fillStyle(isGhost ? c.ghost : c.pick, isGhost ? 0.35 : 1);
      g.fillCircle(0, 0, 10);
      g.fillStyle(0xffffff, isGhost ? 0.35 : 1);
      g.fillCircle(-3, -3, 2);
    } else {
      // Generic fallback: red square (damaging).
      g.fillStyle(c.danger, isGhost ? 0.35 : 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 4);
    }
  }

  function spawnObstacleFrom(scene, pool, isGhost, interior) {
    const arch = pickArchetype(pool);
    const hb = arch.hitbox;
    const g = scene.add.graphics();
    drawArchetype(g, arch, !!isGhost, !!interior);
    g.x = 24 + hb.w / 2 + Math.random() * (CONSTANTS.GAME_WIDTH - 48 - hb.w);
    g.y = -hb.h; // Spawn above the screen; world scroll pulls obstacles down onto the lane.
    scene.obstacles.add(g);
    g.archetype = arch;
    g.isGhost = !!isGhost;
    g.isPickup = !!arch.pickup;
    g.damaging = arch.damaging !== false && !isGhost;
    g.width = hb.w;
    g.height = hb.h;
  }

  function spawnObstacle(scene) {
    const era = scene.phase.currentEra || 1;
    const s = scene.state;
    if (s.phase === 'level2') {
      spawnObstacleFrom(scene, CONSTANTS.INTERIOR_POOL, false, true);
      return;
    }
    if (era === 4) {
      spawnObstacleFrom(scene, CONSTANTS.GHOST_POOL, true, false);
      return;
    }
    const season = s.season || 'regular_night';
    const pool = CONSTANTS.SEASON_POOLS[season] || CONSTANTS.SEASON_POOLS.regular_night;
    spawnObstacleFrom(scene, pool, false, false);
  }

  function maybeSpawnObstacle(scene, now) {
    const era = scene.phase.currentEra || 1;
    const cfg = CONSTANTS.ERA_CONFIG[era - 1];
    if (scene.phase.transitioning) return;
    if (now - (scene.entitySpawn.lastSpawn || 0) < cfg.spawnEveryMs) return;
    scene.entitySpawn.lastSpawn = now;
    spawnObstacle(scene);
  }

  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
  }

  function updateObstacles(scene, now) {
    maybeSpawnObstacle(scene, now);
    const s = scene.state;
    if (!s) return;
    const player = scene.player;
    if (!player) return;
    // Board the bus when the run earns the score gate (R-5 user decision).
    if (!scene.world.inInterior && s.phase === 'playing' && !s.busReached && s.timer > 0
        && s.score >= CONSTANTS.BUS_SCORE_GATE) {
      STATE.onBusEntry(scene);
      if (PHASE) PHASE.transitionToBus(scene);
      return;
    }
    const ghosts = [];
    for (const o of scene.obstacles.children.entries.slice()) {
      // Cull below playfield.
      if (o.y > CONSTANTS.GAME_HEIGHT + 60) {
        scene.obstacles.remove(o);
        o.destroy();
        continue;
      }
      // Pickup collision (R-4 life).
      if (o.isPickup && aabb(player.x, player.y, 24, 32, o.x, o.y, o.width, o.height)) {
        STATE.onPickup(scene);
        if (EFFECTS) EFFECTS.spawnBurst(scene, o.x, o.y, CONSTANTS.COLORS.pick, 6);
        scene.obstacles.remove(o);
        o.destroy();
        continue;
      }
      // Proximity dodge: obstacle has passed the player.
      if (!o.countedForDodge && o.y + (o.height || 20) / 2 < player.y - 12) {
        o.countedForDodge = true;
        if (!o.isGhost) STATE.comboDodge(scene);
      }
      // Damaging AABB.
      if (o.damaging && !o.isGhost && !o.isPickup
          && aabb(player.x, player.y, 24, 32, o.x, o.y, o.width, o.height)) {
        const nowT = scene.time ? scene.time.now : 0;
        if (!scene.player.ghostUntil || nowT > scene.player.ghostUntil) {
          STATE.onHit(scene);
          if (EFFECTS) EFFECTS.spawnBurst(scene, player.x, player.y, CONSTANTS.COLORS.danger, 8);
        }
      }
      if (o.isGhost) ghosts.push(o);
    }
    // Gentle alpha shimmer for ghosts.
    if (ghosts.length) {
      const a = 0.25 + 0.15 * Math.abs(Math.sin(now * 0.003));
      for (const g of ghosts) g.alpha = a;
    }
  }

  function clearAll(scene) {
    if (scene.obstacles) {
      for (const o of scene.obstacles.children.entries) o.destroy();
      scene.obstacles.clear();
    }
    if (scene.pickupsGroup) scene.pickupsGroup.clear();
  }

  return { spawnPlayer, updatePlayer, initPools, spawnObstacle, updateObstacles, clearAll };
})();
