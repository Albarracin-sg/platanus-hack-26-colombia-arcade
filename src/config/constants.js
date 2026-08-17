// PORTAL 11:59 — module: CONSTANTS (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// PORTAL 11:59 — El Último Transmi
// Platanus Hack 26 — Colombia Arcade
// 90-second single-player top-down vertical-scroll runner.
// Run toward the last TransMilenio before midnight; reach the bus to enter Nivel 2.
// Editable surface (HARD INVARIANT): this file, metadata.json, cover.png ONLY.

'use strict';

// ---------------------------------------------------------------------------
// CONSTANTS — pure data tables (sizes, palette, season pools, cabinet keys,
// phase thresholds). The only module that owns strings and tables.
// ---------------------------------------------------------------------------
const CONSTANTS = {
  GAME_WIDTH: 800,
  GAME_HEIGHT: 600,
  STORAGE_KEY: 'portal-11-59:lb:v1',
  SCENE_KEYS: { STREET: 'Street', INTERIOR: 'BusInterior' },
  PHASE_THRESHOLDS: [68, 46, 24, 0],
  BUS_SCORE_GATE: 120000, // Earn the ride: score needed to board the bus (R-5 user decision).
  COLORS: {
    sky: 0x10182a,
    skyNight: 0x070914,
    road: 0x1a1a1a,
    stripe: 0xfff5b3,
    accent: 0xf4c95d,
    p1: 0xffd166,
    red: 0xc0392b,
    blue: 0x2c5fa6,
    ghost: 0x9fb0c8,
    pick: 0x6dd5ed,
    danger: 0xff5577,
    busShell: 0xc0392b,
    busStripe: 0xf4c95d,
    letter: 0xf7ffd8,
    overlay: 0x05080f,
    textDim: 0x9aa5b8,
    textBright: 0xfff5b3,
  },
  LETTER_GRID: [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
    ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
    ['V', 'W', 'X', 'Y', 'Z', '.', '-'],
    ['DEL', 'END'],
  ],
  // DO NOT replace existing keys — they map to physical cabinet wiring.
  // To add local-test shortcuts, append extra keys to any array (R-10.α).
  CABINET_KEYS: {
    P1_U: ['w'],
    P1_D: ['s'],
    P1_L: ['a'],
    P1_R: ['d'],
    P1_1: ['u'],
    P1_2: ['i'],
    P1_3: ['o'],
    P1_4: ['j'],
    P1_5: ['k'],
    P1_6: ['l'],
    P2_U: ['ArrowUp'],
    P2_D: ['ArrowDown'],
    P2_L: ['ArrowLeft'],
    P2_R: ['ArrowRight'],
    P2_1: ['r'],
    P2_2: ['t'],
    P2_3: ['y'],
    P2_4: ['f'],
    P2_5: ['g'],
    P2_6: ['h'],
    START1: ['Enter'],
    START2: ['2'],
  },
  ERA_CONFIG: [
    // era 1 — calm Bogotá, evening commute
    { palette: { sky: 0x1f2a3a, road: 0x1a1a1a, stripe: 0xfff5b3, accent: 0xf4c95d },
      scrollSpeed: 130, audioCutoff: 1800, spawnEveryMs: 1100, ghost: false },
    // era 2 — past 22:30, vendors lit
    { palette: { sky: 0x231a36, road: 0x1c1422, stripe: 0xffd166, accent: 0xff9b54 },
      scrollSpeed: 160, audioCutoff: 1400, spawnEveryMs: 850, ghost: false },
    // era 3 — past 23:30, lluvia sutil
    { palette: { sky: 0x181024, road: 0x14101c, stripe: 0xc9d3ff, accent: 0x6dd5ed },
      scrollSpeed: 200, audioCutoff: 900, spawnEveryMs: 650, ghost: false },
    // era 4 — 23:36+, magical realism: translucent ghosts
    { palette: { sky: 0x0b0712, road: 0x0e0a18, stripe: 0xbfa3ff, accent: 0xff8fc8 },
      scrollSpeed: 240, audioCutoff: 380, spawnEveryMs: 500, ghost: true },
  ],
  // 5 seasons × 9 archetypes = 45 (R-2.β).
  // Each archetype is sampled by weight; ghost pool runs only in era 4.
  SEASON_POOLS: {
    rain: [
      { id: 'puddle',  hitbox: { w: 36, h: 12 }, damaging: false, weight: 1.2 },
      { id: 'vendor',  hitbox: { w: 28, h: 32 }, damaging: true,  weight: 1.0 },
      { id: 'umbrella',hitbox: { w: 26, h: 30 }, damaging: false, weight: 0.8 },
      { id: 'wet',     hitbox: { w: 40, h: 14 }, damaging: false, weight: 1.0 },
      { id: 'busstop', hitbox: { w: 48, h: 24 }, damaging: true,  weight: 0.7 },
      { id: 'cart',    hitbox: { w: 32, h: 28 }, damaging: true,  weight: 0.9 },
      { id: 'sign',    hitbox: { w: 22, h: 36 }, damaging: true,  weight: 0.6 },
      { id: 'cone',    hitbox: { w: 18, h: 18 }, damaging: true,  weight: 1.1 },
      { id: 'pickup',  hitbox: { w: 22, h: 22 }, damaging: false, weight: 0.5, pickup: true },
    ],
    christmas: [
      { id: 'tree',     hitbox: { w: 30, h: 36 }, damaging: true,  weight: 1.0 },
      { id: 'lightrope',hitbox: { w: 50, h: 10 }, damaging: false, weight: 0.9 },
      { id: 'vendor',   hitbox: { w: 28, h: 32 }, damaging: true,  weight: 1.0 },
      { id: 'cart',     hitbox: { w: 32, h: 28 }, damaging: true,  weight: 0.8 },
      { id: 'sign',     hitbox: { w: 22, h: 36 }, damaging: true,  weight: 0.7 },
      { id: 'cone',     hitbox: { w: 18, h: 18 }, damaging: true,  weight: 1.1 },
      { id: 'lantern',  hitbox: { w: 20, h: 24 }, damaging: false, weight: 0.6 },
      { id: 'giftbox',  hitbox: { w: 26, h: 26 }, damaging: true,  weight: 0.7 },
      { id: 'pickup',   hitbox: { w: 22, h: 22 }, damaging: false, weight: 0.5, pickup: true },
    ],
    independence: [
      { id: 'flag',     hitbox: { w: 18, h: 30 }, damaging: false, weight: 1.2 },
      { id: 'parade',   hitbox: { w: 36, h: 32 }, damaging: true,  weight: 0.9 },
      { id: 'vendor',   hitbox: { w: 28, h: 32 }, damaging: true,  weight: 1.0 },
      { id: 'cone',     hitbox: { w: 18, h: 18 }, damaging: true,  weight: 1.1 },
      { id: 'sign',     hitbox: { w: 22, h: 36 }, damaging: true,  weight: 0.7 },
      { id: 'busstop',  hitbox: { w: 48, h: 24 }, damaging: true,  weight: 0.7 },
      { id: 'cart',     hitbox: { w: 32, h: 28 }, damaging: true,  weight: 0.8 },
      { id: 'firework', hitbox: { w: 24, h: 24 }, damaging: false, weight: 0.6 },
      { id: 'pickup',   hitbox: { w: 22, h: 22 }, damaging: false, weight: 0.5, pickup: true },
    ],
    regular_night: [
      { id: 'vendor',  hitbox: { w: 28, h: 32 }, damaging: true,  weight: 1.0 },
      { id: 'cart',    hitbox: { w: 32, h: 28 }, damaging: true,  weight: 1.0 },
      { id: 'cone',    hitbox: { w: 18, h: 18 }, damaging: true,  weight: 1.2 },
      { id: 'sign',    hitbox: { w: 22, h: 36 }, damaging: true,  weight: 0.8 },
      { id: 'busstop', hitbox: { w: 48, h: 24 }, damaging: true,  weight: 0.8 },
      { id: 'puddle',  hitbox: { w: 36, h: 12 }, damaging: false, weight: 1.0 },
      { id: 'bench',   hitbox: { w: 40, h: 18 }, damaging: false, weight: 0.7 },
      { id: 'lantern', hitbox: { w: 20, h: 24 }, damaging: false, weight: 0.6 },
      { id: 'pickup',  hitbox: { w: 22, h: 22 }, damaging: false, weight: 0.5, pickup: true },
    ],
    rain_mystical: [
      { id: 'spirit',  hitbox: { w: 28, h: 28 }, damaging: true,  weight: 1.0 },
      { id: 'shadow',  hitbox: { w: 36, h: 24 }, damaging: false, weight: 1.1 },
      { id: 'lantern', hitbox: { w: 22, h: 26 }, damaging: false, weight: 0.8 },
      { id: 'goldfish',hitbox: { w: 24, h: 20 }, damaging: true,  weight: 0.6 },
      { id: 'mist',    hitbox: { w: 60, h: 14 }, damaging: false, weight: 0.9 },
      { id: 'bumper',  hitbox: { w: 36, h: 20 }, damaging: true,  weight: 0.7 },
      { id: 'petal',   hitbox: { w: 18, h: 18 }, damaging: false, weight: 1.2 },
      { id: 'umbrella',hitbox: { w: 26, h: 30 }, damaging: false, weight: 0.8 },
      { id: 'pickup',  hitbox: { w: 22, h: 22 }, damaging: false, weight: 0.5, pickup: true },
    ],
  },
  // Ghost obstacles (era 4) — translucent, non-damaging (R-2.γ).
  GHOST_POOL: [
    { id: 'soul',     hitbox: { w: 30, h: 40 }, weight: 1.0 },
    { id: 'walker',  hitbox: { w: 26, h: 36 }, weight: 1.0 },
    { id: 'stare',   hitbox: { w: 24, h: 24 }, weight: 0.8 },
    { id: 'runner',  hitbox: { w: 28, h: 32 }, weight: 0.9 },
  ],
  // Bus-interior obstacle pool (level 2, R-5.δ).
  INTERIOR_POOL: [
    { id: 'passenger', hitbox: { w: 28, h: 32 }, damaging: true,  weight: 1.2 },
    { id: 'rail',      hitbox: { w: 56, h: 10 }, damaging: true,  weight: 0.9 },
    { id: 'stop',      hitbox: { w: 60, h: 20 }, damaging: false, weight: 0.7 },
    { id: 'bag',       hitbox: { w: 22, h: 18 }, damaging: true,  weight: 1.0 },
    { id: 'kid',       hitbox: { w: 26, h: 28 }, damaging: true,  weight: 0.8 },
    { id: 'petal',     hitbox: { w: 18, h: 18 }, damaging: false, weight: 1.1 },
  ],
};
