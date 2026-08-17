// PORTAL 11:59 — module: INPUT (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// INPUT — translate raw keydown/keyup into a per-frame action snapshot.
// Honours CABINET_KEYS via a reverse index (R-6.γ, R-6.δ).
// ---------------------------------------------------------------------------
function normalizeIncomingKey(key) {
  if (typeof key !== 'string' || key.length === 0) return '';
  if (key === ' ') return 'space';
  if (key === 'Spacebar') return 'space';
  if (key.length === 1) return key.toLowerCase();
  return key;
}

const INPUT = (() => {
  const reverseIndex = {};
  for (const [arcade, keys] of Object.entries(CONSTANTS.CABINET_KEYS)) {
    for (const k of keys) {
      reverseIndex[normalizeIncomingKey(k)] = arcade;
    }
  }

  function install(scene) {
    scene.input.actions = {
      up: false, down: false, left: false, right: false,
      dashPressed: false, jumpPressed: false, startPressed: false,
    };
    const pressed = { _consumed: false };

    scene.input.keyboard.on('keydown', (event) => {
      const code = reverseIndex[normalizeIncomingKey(event.key)];
      if (!code) return;
      const a = scene.input.actions;
      if (code === 'P1_U') a.up = true;
      else if (code === 'P1_D') a.down = true;
      else if (code === 'P1_L') a.left = true;
      else if (code === 'P1_R') a.right = true;
      else if (code === 'P1_1') { if (!a.dashPressed) a.dashPressed = true; }
      else if (code === 'P1_2') { if (!a.jumpPressed) a.jumpPressed = true; }
      else if (code === 'START1') { if (!a.startPressed) a.startPressed = true; pressed._consumed = false; }
    });

    scene.input.keyboard.on('keyup', (event) => {
      const code = reverseIndex[normalizeIncomingKey(event.key)];
      if (!code) return;
      const a = scene.input.actions;
      if (code === 'P1_U') a.up = false;
      else if (code === 'P1_D') a.down = false;
      else if (code === 'P1_L') a.left = false;
      else if (code === 'P1_R') a.right = false;
    });
    return pressed;
  }

  function snapshot(scene) {
    const a = scene.input && scene.input.actions ? scene.input.actions : null;
    if (!a) return { up: false, down: false, left: false, right: false, dashPressed: false, jumpPressed: false, startPressed: false };
    return {
      up: a.up, down: a.down, left: a.left, right: a.right,
      dashPressed: a.dashPressed, jumpPressed: a.jumpPressed, startPressed: a.startPressed,
    };
  }

  function consume(scene) {
    const a = scene.input.actions;
    a.dashPressed = false;
    a.jumpPressed = false;
    // startPressed is consumed by SCREENS.startEdge()
  }

  function startEdge(scene) {
    const a = scene.input.actions;
    const v = a.startPressed;
    a.startPressed = false;
    return v;
  }

  return { install, snapshot, consume, startEdge, reverseIndex };
})();
