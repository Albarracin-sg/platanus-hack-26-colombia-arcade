// PORTAL 11:59 — El Último Transmi
// Platanus Hack 26 — Colombia Arcade
// Single-player horizontal lane-dodge at a Bogotá paradero.
// Esquivá el tráfico que cruza la avenida de noche, saltá charcos y conos,
// agachate bajo letreros y trailers, y subite al último TransMilenio.
// Editable surface (HARD INVARIANT): game.js, metadata.json, cover.png ONLY.

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const W = 800;
const H = 600;
const STORAGE_KEY = 'portal-11:59:lb:v2';
const STAGE_TIME = [45, 40];
const PLAYER_Y = 500;
// Horizontal lanes (far, middle, near). Player moves between them with W/S.
const LANES = [305, 415, 500];
const CARS = [0xe74c3c, 0x2c5fa6, 0xf1c40f, 0x8e44ad, 0x16a085];
const PAL = [
  { skyTop: 0x1c2340, skyBottom: 0x2a3352, road: 0x202028, lane: 0xfff5b3, curb: 0x3a3a44, build: 0x141a30, win: 0xf4c95d, moon: 0xe8ecf2 },
  { skyTop: 0x0b0618, skyBottom: 0x231040, road: 0x160d26, lane: 0xbfa3ff, curb: 0x2a1a3a, build: 0x0d071a, win: 0xff8fc8, moon: 0xbfa3ff }
];
const LETTER_GRID = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', '.', '-'],
  ['DEL', 'END']
];
// DO NOT replace existing keys — they map to physical cabinet wiring.
// To add local-test shortcuts, append extra keys to any array.
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d', 'b'],
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
  START2: ['2']
};
// Obstacle definitions — center-based boxes; y is the hitbox vertical center.
const OBS = {
  puddle:    { w: 48,  h: 20, y: 500 },
  cone:      { w: 34,  h: 40, y: 500 },
  skate:     { w: 56,  h: 36, y: 500 },
  moto:      { w: 92,  h: 34, y: 500, sp: 205 },
  car:       { w: 130, h: 44, y: 500, sp: 180 },
  carMid:    { w: 130, h: 44, y: 415, sp: 240 },
  truck:     { w: 220, h: 90, y: 305, sp: 150, hit: false },
  bar:       { w: 170, h: 58, y: 449, sp: 150 },
  truckNear: { w: 200, h: 58, y: 449, sp: 160 },
  ghost:     { w: 60,  h: 40, y: 415, sp: 255 }
};
// Spawn type tables per stage (relative weights; 'static' picks puddle/cone/skate).
const SPAWN = [
  [
    { t: 'static', w: 34 }, { t: 'carMid', w: 20 }, { t: 'car', w: 16 },
    { t: 'moto', w: 12 }, { t: 'bar', w: 10 }, { t: 'truck', w: 8 }
  ],
  [
    { t: 'static', w: 24 }, { t: 'ghost', w: 16 }, { t: 'bar', w: 15 },
    { t: 'truckNear', w: 10 }, { t: 'carMid', w: 14 }, { t: 'car', w: 12 },
    { t: 'moto', w: 8 }, { t: 'truck', w: 8 }
  ]
];
const STATIC_TYPES = ['puddle', 'puddle', 'cone', 'cone', 'skate'];
const STATIC_COLS = [150, 400, 650];

// ---------------------------------------------------------------------------
// Math / helpers
// ---------------------------------------------------------------------------
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function rand(a, b) { return a + Math.random() * (b - a); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) {
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  return 1 - Math.pow(1 - t, 3);
}
function overlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}
function lerpColor(c0, c1, t) {
  const r = ((c0 >> 16) & 255) + ((((c1 >> 16) & 255) - ((c0 >> 16) & 255)) * t);
  const gr = ((c0 >> 8) & 255) + ((((c1 >> 8) & 255) - ((c0 >> 8) & 255)) * t);
  const b = (c0 & 255) + (((c1 & 255) - (c0 & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(gr) << 8) | Math.round(b);
}

// ---------------------------------------------------------------------------
// Input — reverse index over CABINET_KEYS (never raw keys in game logic).
// ---------------------------------------------------------------------------
function keyName(k) { return typeof k === 'string' && k.length === 1 ? k.toLowerCase() : k; }
const KEY2CODE = {};
for (const code in CABINET_KEYS) {
  for (const k of CABINET_KEYS[code]) KEY2CODE[keyName(k)] = code;
}
const INPUT = {
  down: {},
  edge: {},
  onKeyDown(e) {
    const code = KEY2CODE[keyName(e.key)];
    if (!code) return;
    if (!this.down[code]) this.edge[code] = true;
    this.down[code] = true;
    e.preventDefault();
  },
  onKeyUp(e) {
    const code = KEY2CODE[keyName(e.key)];
    if (!code) return;
    this.down[code] = false;
  },
  pressed(code) { return !!this.edge[code]; },
  held(code) { return !!this.down[code]; },
  consume() { this.edge = {}; }
};

// ---------------------------------------------------------------------------
// Audio — generated Web Audio tones only, gated on the START gesture.
// ---------------------------------------------------------------------------
const AUDIO = {
  ctx: null,
  init() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {}
  },
  tone(type, f0, f1, dur, vol) {
    try {
      if (!this.ctx) return;
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(1, f0), t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) {}
  },
  noise(dur, vol) {
    try {
      if (!this.ctx) return;
      const c = this.ctx, t = c.currentTime;
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource();
      s.buffer = buf;
      const g = c.createGain();
      g.gain.setValueAtTime(vol || 0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(g); g.connect(c.destination);
      s.start(t);
    } catch (e) {}
  },
  jump()  { this.tone('triangle', 300, 700, 0.09, 0.12); },
  crouch(){ this.noise(0.14, 0.08); },
  lane()  { this.tone('sine', 480, 320, 0.07, 0.08); },
  hit()   { this.tone('square', 95, 50, 0.17, 0.18); },
  near()  { this.tone('sine', 900, 1500, 0.06, 0.09); },
  beep()  { this.tone('square', 440, 440, 0.09, 0.09); },
  horn()  { this.tone('sawtooth', 140, 130, 0.7, 0.13); this.tone('sawtooth', 105, 100, 0.7, 0.13); },
  stage() { const n = [392, 523, 659]; for (let i = 0; i < n.length; i++) setTimeout(() => this.tone('square', n[i], n[i], 0.12, 0.1), i * 120); },
  win()   { const n = [392, 523, 659, 784]; for (let i = 0; i < n.length; i++) setTimeout(() => this.tone('square', n[i], n[i], 0.16, 0.1), i * 130); },
  over()  { const n = [330, 262, 196]; for (let i = 0; i < n.length; i++) setTimeout(() => this.tone('square', n[i], n[i], 0.2, 0.1), i * 170); }
};

// ---------------------------------------------------------------------------
// Music — procedural chiptune loop (Profile A: cozy exploration). Starts on
// the START1 gesture (next to AUDIO.init), plays during gameplay, ducks
// briefly when a strong SFX fires, stops on game over. Reuses AUDIO.tone.
// ---------------------------------------------------------------------------
const MUSIC = {
  step: 125,                                          // ~120 BPM, 16th notes — driving energy
  _pos: 0, _mute: 0, t: null,
  // 3 sections x 24 steps -> 72-step cycle (~9 s before repeat).
  // Square waves, staccato, bass pumping on every step. D minor. Original melodies
  // composed in the driving, emotional style of an Undertale battle track.
  // A: driving verse — syncopated lead over relentless bass
  // B: emotional bridge — opens up, more space, Bb color
  // C: climax — reaches high (F5) then resolves home
  T: [
    { l: [294,0,349,0, 440,440,0,587, 523,0,440,0, 349,0,392,440, 0,349,0,294, 0,0,330,349],
      b: [147,147,147,147, 117,117,117,117, 175,175,175,175, 131,131,131,131, 147,147,147,147, 117,117,131,131] },
    { l: [466,0,440,0, 349,0,392,0, 440,0,587,0, 523,0,440,0, 392,0,349,0, 294,0,0,0],
      b: [117,117,117,117, 98,98,98,98, 117,117,117,117, 131,131,131,131, 147,147,147,147, 110,110,110,110] },
    { l: [587,0,523,0, 440,0,349,0, 392,0,440,0, 587,0,698,0, 587,0,523,440, 392,0,349,0],
      b: [147,147,147,147, 117,117,117,117, 98,98,98,98, 131,131,131,131, 147,147,147,147, 147,147,147,147] }
  ],
  play() {
    if (this.t) return;
    this.t = setInterval(() => {
      if (performance.now() < this._mute) { this._pos = (this._pos + 1) % 72; return; }
      const i = this._pos % 24, s = (this._pos / 24) | 0;
      const lf = this.T[s].l[i], bf = this.T[s].b[i];
      if (lf) AUDIO.tone('square', lf, lf, 0.11, 0.05);
      if (bf) AUDIO.tone('square', bf, bf, 0.11, 0.04);
      this._pos = (this._pos + 1) % 72;
    }, this.step);
  },
  duck(ms) { this._mute = performance.now() + ms; },
  stop() { if (this.t) clearInterval(this.t); this.t = null; this._pos = 0; }
};

// ---------------------------------------------------------------------------
// Storage — window.platanusArcadeStorage bridge with localStorage fallback.
// Top-5 leaderboard; always validate data read back (shape may have changed).
// ---------------------------------------------------------------------------
const STORAGE = (() => {
  function bridge() {
    try {
      if (typeof window !== 'undefined' && window.platanusArcadeStorage) {
        return window.platanusArcadeStorage;
      }
    } catch (e) {}
    return {
      async get(key) {
        try {
          const raw = window.localStorage.getItem(key);
          return raw === null ? { found: false, value: null } : { found: true, value: JSON.parse(raw) };
        } catch (e) { return { found: false, value: null }; }
      },
      async set(key, value) {
        try {
          const serialized = JSON.stringify(value);
          if (serialized.length >= 65536) return;
          window.localStorage.setItem(key, serialized);
        } catch (e) {}
      }
    };
  }
  function valid(e) {
    return !!e && typeof e === 'object' &&
      typeof e.initials === 'string' && /^[A-Z]{3}$/.test(e.initials) &&
      typeof e.score === 'number' && Number.isFinite(e.score) && e.score >= 0 &&
      typeof e.ts === 'string' && e.ts.length > 0;
  }
  return {
    async read() {
      try {
        const res = await bridge().get(STORAGE_KEY);
        if (res && res.found && Array.isArray(res.value)) {
          const entries = res.value.filter(valid);
          entries.sort((a, b) => b.score - a.score);
          return entries.slice(0, 5);
        }
      } catch (e) {}
      return [];
    },
    async write(entries) {
      try {
        await bridge().set(STORAGE_KEY, entries.slice(0, 5));
      } catch (e) {}
    },
    qualifies(score, entries) {
      if (score <= 0) return false;
      if (entries.length < 5) return true;
      return score > entries[entries.length - 1].score;
    }
  };
})();
// ---------------------------------------------------------------------------
// Procedural drawing helpers
// ---------------------------------------------------------------------------
function drawPlayer(g, o) {
  g.clear();
  const crouched = o.state === 'crouch';
  const jumping = o.state === 'jump';
  const skin = 0xf3c39a;
  const hair = 0x2c3e50;
  const shirt = 0xf4c95d;
  const shirtB = 0xd4a93a;
  const pants = 0x2c3e50;
  // Shadow at ground line (y≈50)
  g.fillStyle(0x000000, 0.35);
  g.fillEllipse(24, 50, 44, 10);
  if (crouched) {
    // Planted feet + short bent legs
    g.fillStyle(pants, 1);
    g.fillRect(13, 47, 9, 4);
    g.fillRect(26, 47, 9, 4);
    g.fillRect(15, 40, 6, 8);
    g.fillRect(27, 40, 6, 8);
    // Hunched body, wide and short
    g.fillStyle(shirt, 1);
    g.fillRoundedRect(11, 26, 26, 14, 5);
    g.fillStyle(shirtB, 1);
    g.fillRoundedRect(11, 34, 26, 6, 3);
    // Head low and slightly forward (to the right)
    g.fillStyle(skin, 1);
    g.fillCircle(27, 21, 5);
    g.fillStyle(hair, 1);
    g.fillRoundedRect(21, 14, 11, 7, 3);
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(28, 21, 1.2);
  } else {
    const legY = jumping ? 34 : 36;
    const legH = jumping ? 10 : 12;
    // Feet
    g.fillStyle(pants, 1);
    g.fillRect(14, 47, 8, 4);
    g.fillRect(26, 47, 8, 4);
    // Legs (tucked when jumping)
    g.fillRect(16, legY, 6, legH);
    g.fillRect(26, legY, 6, legH);
    // Body/shirt
    g.fillStyle(shirt, 1);
    g.fillRoundedRect(14, 18, 20, 18, 4);
    g.fillStyle(shirtB, 1);
    g.fillRoundedRect(14, 30, 20, 6, 3);
    // Head
    g.fillStyle(skin, 1);
    g.fillCircle(24, 12, 6);
    // Hair
    g.fillStyle(hair, 1);
    g.fillRoundedRect(18, 5, 12, 7, 3);
    // Eyes
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(22, 12, 1.2);
    g.fillCircle(26, 12, 1.2);
  }
}
function drawObstacle(g, o) {
  g.clear();
  const t = o.type;
  const halfW = o.w / 2, halfH = o.h / 2;
  g.fillStyle(0x000000, 0.35);
  g.fillEllipse(0, halfH + 4, o.w, 8);
  if (t === 'puddle') {
    g.fillStyle(0x3d5a80, 0.8);
    g.fillEllipse(0, 0, o.w * 0.8, o.h);
    g.fillStyle(0x6fa8dc, 0.7);
    g.fillEllipse(0, -2, o.w * 0.45, o.h * 0.5);
    g.fillStyle(0x8fc9f2, 0.6);
    g.fillEllipse(2, -3, o.w * 0.2, o.h * 0.25);
  } else if (t === 'cone') {
    g.fillStyle(0xe67e22, 1);
    g.fillTriangle(-halfW, halfH, halfW, halfH, 0, -halfH);
    g.fillStyle(0xf8f8f8, 1);
    g.fillRect(-halfW * 0.55, 0, halfW * 1.1, 4);
  } else if (t === 'skate') {
    g.fillStyle(0xb3372a, 1);
    g.fillRoundedRect(-halfW, -halfH * 0.5, o.w, o.h * 0.55, 4);
    g.fillStyle(0xecf0f1, 1);
    g.fillRect(-halfW * 0.6, halfH * 0.4, o.w * 0.3, o.h * 0.45);
    g.fillRect(halfW * 0.3, halfH * 0.4, o.w * 0.3, o.h * 0.45);
  } else if (t === 'moto') {
    g.fillStyle(0x2c3e50, 1);
    g.fillRoundedRect(-halfW + 6, -halfH + 4, o.w - 12, 8, 3);
    g.fillStyle(0x222222, 1);
    g.fillCircle(-halfW + 8, halfH - 6, 7);
    g.fillCircle(halfW - 8, halfH - 6, 7);
    g.fillStyle(0xf1c40f, 1);
    g.fillRect(halfW - 20, -halfH - 6, 5, 8);
  } else if (t === 'car' || t === 'carMid' || t === 'ghost') {
    const col = t === 'ghost' ? 0x9b59b6 : CARS[(o.seed || 0) % CARS.length];
    const a = t === 'ghost' ? 0.55 : 1;
    // Outline
    g.fillStyle(0x1a1a22, a);
    g.fillRoundedRect(-halfW - 2, -halfH - 2, o.w + 4, o.h + 4, 8);
    // Body
    g.fillStyle(col, a);
    g.fillRoundedRect(-halfW, -halfH, o.w, o.h, 7);
    // Roof line
    g.fillRoundedRect(-halfW + 8, -halfH - 4, o.w - 16, 6, 3);
    // Windows (top + bottom strips)
    g.fillStyle(0xb3d4ff, a * 0.85);
    g.fillRect(-halfW + 10, -halfH + 2, o.w - 20, 5);
    g.fillRect(-halfW + 10, halfH - 7, o.w - 20, 5);
    // Headlights (left = front of car since it moves leftward toward player)
    g.fillStyle(0xffd166, a);
    g.fillCircle(-halfW + 4, -halfH + 4, 2.5);
    g.fillCircle(-halfW + 4, halfH - 4, 2.5);
    // Taillights (right = rear)
    g.fillStyle(0xe74c3c, a);
    g.fillCircle(halfW - 4, -halfH + 4, 2);
    g.fillCircle(halfW - 4, halfH - 4, 2);
    // Wheels (two visible, dark with hubcap)
    g.fillStyle(0x111118, a);
    g.fillCircle(-halfW + 12, halfH + 1, 5);
    g.fillCircle(halfW - 12, halfH + 1, 5);
    g.fillStyle(0x555566, a);
    g.fillCircle(-halfW + 12, halfH + 1, 2);
    g.fillCircle(halfW - 12, halfH + 1, 2);
  } else if (t === 'bar') {
    g.fillStyle(0xf4c95d, 1);
    g.fillRect(-6, -halfH, 12, o.h);
    g.fillRect(-halfW + 14, -halfH + 10, 4, 14);
    g.fillRect(halfW - 18, -halfH + 10, 4, 14);
    g.fillStyle(0x2c2c38, 1);
    g.fillRoundedRect(-halfW, -halfH, o.w, o.h, 4);
    g.fillStyle(0xf4c95d, 1);
    g.fillRect(-halfW, -halfH + 4, o.w, 4);
    g.fillRect(-halfW, halfH - 8, o.w, 4);
    g.fillRect(-halfW + 8, -halfH + 4, 4, o.h - 12);
    g.fillRect(halfW - 12, -halfH + 4, 4, o.h - 12);
  } else if (t === 'truck' || t === 'truckNear') {
    g.fillStyle(0x22222c, 1);
    g.fillRoundedRect(-halfW, -halfH, o.w, o.h, 6);
    g.fillStyle(0x3498db, 1);
    g.fillRoundedRect(-halfW + 6, -halfH + 6, o.w - 12, o.h * 0.55, 4);
    g.fillStyle(0xf4c95d, 1);
    g.fillRect(-halfW + 6, halfH - 14, o.w - 12, 6);
    g.fillStyle(0x22222c, 1);
    g.fillRect(halfW - 26, -halfH + 6, 20, o.h - 12);
    g.fillStyle(0xd9e2f2, 0.7);
    g.fillRect(halfW - 20, -halfH + 10, 8, 10);
    g.fillRect(halfW - 20, halfH - 20, 8, 10);
    g.fillStyle(0x1a1a22, 1);
    g.fillCircle(-halfW + 12, halfH - 4, 6);
    g.fillCircle(halfW - 12, halfH - 4, 6);
  }
}

// ---------------------------------------------------------------------------
// Main scene
// ---------------------------------------------------------------------------
class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    this.stage = 1;
    this.playing = false;
    this.screen = 'title';
    this.timeScale = 0;
    this.elapsed = 0;
    this.score = 0;
    this.lives = 3;
    this.counted = {};
    this.obstacles = [];
    this.parts = [];
    this.rain = [];
    this.best = null;
    this.dx = 0;
    this.countT = 0;
    this.startDelay = 0;
    this.fadeStep = 0;
    this.bus = null;
    this.won = false;
    this.palIdx = 0;
    this.lerpT = 0;
    this.moving = false;
    this.moveDir = 1;

    this.initAudio = false;
    this.inputOn = false;

    this.keys = {};
    for (const code in CABINET_KEYS) this.keys[code] = { pressed: false, held: false };

    this.buildWorld();
    this.buildRain();
    this.buildPlayerTextures();
    this.buildPlayer();
    this.buildHUD();
    this.buildBanner();
    this.drawHearts();

    this.events.on('shutdown', () => this.teardown());
    this.events.once('destroy', () => this.teardown());

    this.enterTitle();

    this.setupInput();
  }

  setupInput() {
    this.inputOn = true;
    this._kdn = (e) => INPUT.onKeyDown(e);
    this._kup = (e) => INPUT.onKeyUp(e);
    window.addEventListener('keydown', this._kdn);
    window.addEventListener('keyup', this._kup);
  }

  teardown() {
    if (!this.inputOn) return;
    this.inputOn = false;
    if (this._kdn) window.removeEventListener('keydown', this._kdn);
    if (this._kup) window.removeEventListener('keyup', this._kup);
    this._kdn = null;
    this._kup = null;
  }

  // ---- World / scenery -----------------------------------------------------
  buildWorld() {
    const c = this.add.container(0, 0);
    c.setDepth(-2);
    this.city = c;
    this.worldParts = {};
    this.drawCity(0);
  }

  drawCity(t) {
    const c = this.city;
    c.removeAll(true);
    const p = this.palette();
    const ctx = this.add.graphics();
    c.add(ctx);
    ctx.fillGradientStyle(p.skyTop, p.skyTop, p.skyBottom, p.skyBottom, 1);
    ctx.fillRect(0, 0, W, H);
    // Moon
    ctx.fillStyle(p.moon, 0.9);
    ctx.fillCircle(640, 96, 34);
    ctx.fillStyle(p.skyTop, 1);
    ctx.fillCircle(628, 86, 8);
    ctx.fillCircle(650, 108, 6);
    ctx.fillCircle(636, 112, 5);
    // Stars
    ctx.fillStyle(0xffffff, 0.55);
    for (let i = 0; i < 46; i++) {
      const x = ((i * 197) % W);
      const y = 8 + ((i * 53) % 130);
      ctx.fillRect(x, y, 2, 2);
    }
    // Skyline
    let seed = 12345;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const winW = this.palIdx === 1 ? 0xff8fc8 : 0xf4c95d;
    ctx.fillStyle(p.build, 1);
    let x = -30;
    while (x < W + 40) {
      const bw = 50 + rnd() * 55;
      const bh = 80 + rnd() * 150;
      ctx.fillRect(x, 250 - bh, bw, bh);
      ctx.fillStyle(winW, this.stage === 2 ? 0.5 : 0.28);
      const cols = Math.max(2, Math.floor(bw / 18));
      const rows = Math.max(3, Math.floor(bh / 24));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (rnd() < 0.5) ctx.fillRect(x + 6 + i * 14, 258 - bh + 10 + j * 20, 6, 9);
        }
      }
      ctx.fillStyle(p.build, 1);
      x += bw + 14;
    }
    // Road band
    ctx.fillStyle(p.road, 1);
    ctx.fillRect(0, 250, W, 350);
    // Curb strip
    ctx.fillStyle(p.curb, 1);
    ctx.fillRect(0, 250, W, 6);
    // Lane dashes
    ctx.fillStyle(p.lane, 0.5);
    for (let y = 356; y <= 463; y += 107) {
      for (let dx = 18; dx < W; dx += 80) {
        ctx.fillRect(dx, y, 42, 4);
      }
    }
    // Guide columns (bus stops)
    ctx.fillStyle(0xffffff, 0.55);
    ctx.fillRect(266, 250, 2, 350);
    ctx.fillRect(533, 250, 2, 350);
    ctx.fillStyle(0xffffff, 0.28);
    ctx.fillRect(268, 250, 2, 350);
    ctx.fillRect(535, 250, 2, 350);
    // Static posts / barrier dots along the curb
    ctx.fillStyle(0x8a8a96, 0.8);
    for (let x = 20; x < W; x += 130) {
      ctx.fillRect(x, 254, 4, 14);
    }
    // Paradero shelter at left edge
    const shel = this.add.graphics();
    shel.fillStyle(0x22222c, 0.95);
    shel.fillRoundedRect(0, 300, 66, 8, 2);
    shel.fillRoundedRect(0, 300, 4, 96, 2);
    shel.fillRoundedRect(62, 300, 4, 96, 2);
    shel.fillStyle(0xf4c95d, 0.9);
    shel.fillRect(8, 304, 12, 3);
    shel.fillRect(44, 304, 12, 3);
    shel.fillStyle(0x8fc9f2, 0.5);
    shel.fillRect(6, 314, 52, 46);
    c.add(shel);
    // Static columns (hazard markers)
    this.worldParts.cols = [];
    for (const cx of STATIC_COLS) {
      const col = this.add.graphics();
      col.fillStyle(0xe67e22, 1);
      col.fillRect(cx - 3, 258, 6, 14);
      col.fillStyle(0xf8f8f8, 1);
      col.fillRect(cx - 3, 258, 6, 4);
      c.add(col);
      this.worldParts.cols.push({ g: col, x: cx, busy: 0, until: 0 });
    }
  }

  palette() { return PAL[this.palIdx]; }

  buildRain() {
    if (this.rainLayer) {
      this.rainLayer.destroy();
      this.rainLayer = null;
    }
    const c = this.add.container(0, 0);
    c.setDepth(2);
    this.rainLayer = c;
    const n = this.stage === 2 ? 44 : 24;
    this.rain = [];
    for (let i = 0; i < n; i++) {
      const g = this.add.graphics();
      c.add(g);
      this.rain.push({ g, x: rand(0, W), y: rand(0, H), sp: rand(180, 380) });
    }
  }

  updateRain(dt) {
    const n = this.rain.length;
    for (let i = 0; i < n; i++) {
      const r = this.rain[i];
      r.y += r.sp * dt;
      r.x -= r.sp * 0.28 * dt;
      if (r.y > H) { r.y = -8; r.x = rand(0, W); }
      if (r.x < -4) r.x = W + 4;
      r.g.clear();
      r.g.fillStyle(this.stage === 2 ? 0x6dd5ed : 0x9db2d4, 0.5);
      r.g.fillRect(r.x, r.y, 2, 9);
    }
  }

  // ---- Player ---------------------------------------------------------------
  buildPlayerTextures() {
    for (const st of ['stand', 'crouch', 'jump']) {
      const g = this.add.graphics();
      drawPlayer(g, { state: st, stretch: 1 });
      g.generateTexture('p_' + st, 48, 56);
      g.destroy();
    }
  }

  buildPlayer() {
    this.player = this.physics.add.existing(this.add.sprite(90, PLAYER_Y, 'p_stand'), false);
    const p = this.player;
    p.setDepth(10);
    p.state = 'stand';
    p.lane = 2;
    p.vy = 0;
    p.grounded = true;
    p.invuln = 0;
    p.shadow = this.add.ellipse(90, PLAYER_Y + 26, 40, 10, 0x000000, 0.4);
    p.shadow.setDepth(9);
  }

  playerBox() {
    const p = this.player;
    if (p.state === 'jump') return { x: p.x, y: p.y - 20, w: 26, h: 44 };
    if (p.state === 'crouch') return { x: p.x, y: p.y - 8, w: 26, h: 24 };
    return { x: p.x, y: p.y - 20, w: 26, h: 44 };
  }

  updatePlayer(dt) {
    const p = this.player;
    const right = INPUT.held('P1_R');
    const left = INPUT.held('P1_L');
    this.dx = (right ? 1 : 0) - (left ? 1 : 0);
    const wantJump = INPUT.held('P1_1');
    const wantCrouch = INPUT.held('P1_2');
    if (INPUT.pressed('P1_U') && p.lane > 0) { p.lane--; AUDIO.lane(); }
    if (INPUT.pressed('P1_D') && p.lane < LANES.length - 1) { p.lane++; AUDIO.lane(); }
    const laneY = LANES[p.lane];
    if (p.grounded) {
      p.y = lerp(p.y, laneY, Math.min(1, 12 * dt));
      if (Math.abs(p.y - laneY) < 1) p.y = laneY;
    } else {
      p.vy += 1500 * dt;
      p.y += p.vy * dt;
      if (p.y >= laneY) { p.y = laneY; p.vy = 0; p.grounded = true; }
    }
    const prevState = p.state;
    if (!p.grounded) p.state = 'jump';
    else if (wantCrouch && !wantJump) p.state = 'crouch';
    else p.state = 'stand';
    if (wantJump && p.grounded) {
      p.vy = -540;
      p.grounded = false;
      p.state = 'jump';
      AUDIO.jump();
    }
    const stretch = p.state === 'jump' ? 0.75 : 1;
    p.setTexture('p_' + p.state);
    p.setScale(stretch, stretch);
    p.x = clamp(p.x + this.dx * 260 * dt, 40, W - 40);
    if (p.invuln > 0) {
      p.invuln -= dt;
      const a = 0.4 + 0.4 * Math.abs(Math.sin(this.time.now * 0.05));
      p.setAlpha(a);
      if (p.invuln <= 0) p.setAlpha(1);
    }
    p.shadow.setPosition(p.x, LANES[p.lane] + 26);
    const sc = p.state === 'jump' ? 0.7 : 1;
    p.shadow.setScale(sc, 1);
  }

  // ---- Spawning ---------------------------------------------------------------
  pickType() {
    const table = SPAWN[this.stage - 1];
    let total = 0;
    for (const e of table) total += e.w;
    let roll = Math.random() * total;
    for (const e of table) {
      roll -= e.w;
      if (roll <= 0) return e.t;
    }
    return 'car';
  }

  spawnObstacle() {
    const stage = this.stage;
    let type = this.pickType();
    if (type === 'static') type = STATIC_TYPES[Math.floor(Math.random() * STATIC_TYPES.length)];
    if (this.obstacles.length >= 13) return;
    if (stage === 1 && type === 'ghost') type = 'carMid';
    if (stage === 1 && type === 'truckNear') type = 'bar';
    if (type === 'truck' && stage === 1) {
      for (const o of this.obstacles) {
        if (o.type === 'truck' && o.x > W - 260) return;
      }
    }
    let x = W + 100;
    if (type === 'truck') x = W + 120;
    if (type === 'ghost') x = W + 120;
    if (type === 'static') {
      const cols = STATIC_COLS.slice();
      const p = this.player;
      for (let i = cols.length - 1; i >= 0; i--) {
        const busy = this.worldParts.cols[i];
        if (busy.until > this.time.now) { cols.splice(i, 1); continue; }
        if (Math.abs(cols[i] - p.x) < 110) { cols.splice(i, 1); }
      }
      if (cols.length === 0) return;
      const ci = Math.floor(Math.random() * cols.length);
      const cx = cols[ci];
      x = cx;
      const busy = this.worldParts.cols.find((c) => c.x === cx);
      if (!busy) return;
      busy.busy = 1;
      busy.until = this.time.now + 4500;
    }
    const def = OBS[type];
    const speed = type === 'static' ? 0 : (def.sp || 170) * (stage === 2 ? 1.3 : 1) + this.elapsed * 0.006;
    let oy = def.y;
    if (type === 'static') {
      oy = Math.random() < 0.6 ? LANES[this.player.lane] : LANES[Math.floor(Math.random() * LANES.length)];
    }
    const o = {
      type, x, y: oy, w: def.w, h: def.h,
      hit: def.hit !== false, sp: speed, seed: Math.floor(Math.random() * CARS.length),
      life: type === 'static' ? 4.5 : 0, armed: type === 'static' ? 0.5 : 0,
      arm: 0.5, blinkT: 0
    };
    if (type === 'static') o.life = 4.5;
    this.obstacles.push(o);
    const g = this.add.graphics();
    g.setDepth(5);
    drawObstacle(g, o);
    o.g = g;
    o.bg = null;
    if (type === 'ghost') {
      g.setAlpha(0.55);
    }
  }

  updateSpawn(dt) {
    if (!this.playing || this.screen !== 'play') return;
    const base = this.stage === 1 ? 1000 : 720;
    const min = this.stage === 1 ? 500 : 360;
    const interval = Math.max(min, base - this.elapsed * 9) * (0.85 + Math.random() * 0.3) / 1000;
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = interval;
      this.spawnObstacle();
    }
  }

  updateObs(dt) {
    const p = this.player;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (o.type === 'static') {
        const gone = o.life <= 0;
        if (gone) {
          this.obstacles.splice(i, 1);
          o.g.destroy();
          for (const busy of this.worldParts.cols) {
            if (busy.x === o.x) {
              busy.busy = 0;
              busy.until = 0;
            }
          }
          continue;
        }
        o.life -= dt;
        o.arm -= dt;
        if (o.arm > 0 || o.life < 0.9) {
          o.blinkT -= dt;
          if (o.blinkT <= 0) {
            o.blinkT = 0.1;
            o.g.setVisible(!o.g.visible);
          }
        } else if (!o.g.visible) {
          o.g.setVisible(true);
        }
      } else {
        o.x -= o.sp * dt;
        if (o.x + o.w / 2 < -40) {
          this.obstacles.splice(i, 1);
          o.g.destroy();
          continue;
        }
      }
      o.g.setPosition(o.x, o.y);
      if (o.type === 'car' || o.type === 'carMid' || o.type === 'ghost') {
        o.g.setScale(1, 1);
      }
      if (this.screen === 'play' && this.playing) {
        this.checkCollision(o);
        this.checkNearMiss(o);
      }
    }
  }

  checkCollision(o) {
    const p = this.player;
    if (p.invuln > 0) return;
    if (o.type === 'static' && o.arm > 0) return;
    if (!o.hit) return;
    if (Math.abs(o.y - LANES[p.lane]) > 45) return;  // only collide within player's lane
    const pb = this.playerBox();
    if (overlap(pb, o)) {
      this.hit();
    }
  }

  checkNearMiss(o) {
    if (o.type === 'static' || o.type === 'bar' || o.type === 'truck' || o.type === 'truckNear') return;
    const p = this.player;
    if (!o.scored && o.x + o.w / 2 < p.x) {
      o.scored = true;
      const jc = p.state === 'jump' || p.state === 'crouch';
      if (jc && Math.abs(o.y - LANES[p.lane]) < 45) {
        this.score += 25;
        this.scoreTextUpdate();
        AUDIO.near();
        this.burst(p.x, p.y, 6, 0x2ecc71);
      }
    }
  }

  hit() {
    const p = this.player;
    this.lives--;
    this.drawHearts();
    MUSIC.duck(180);
    AUDIO.hit();
    this.cameras.main.shake(160, 0.008);
    this.flashRed();
    this.burst(p.x, p.y, 8, 0xff5577);
    if (this.lives <= 0) {
      this.endGame();
    } else {
      p.invuln = 1.2;
    }
  }

  burst(x, y, n, col) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(60, 220);
      const g = this.add.graphics();
      g.setDepth(40);
      g.fillStyle(col, 1);
      g.fillCircle(0, 0, 3);
      g.setPosition(x, y);
      this.parts.push({ g, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.7) });
    }
  }

  updateParts(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const pt = this.parts[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.g.destroy();
        this.parts.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 420 * dt;
      pt.g.setPosition(pt.x, pt.y);
      pt.g.setAlpha(pt.life / 0.7);
    }
  }

  flashRed() {
    if (this.flash) this.flash.destroy();
    this.flash = this.add.rectangle(W / 2, H / 2, W, H, 0xff0000, 0.18);
    this.flash.setDepth(75);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 260, onComplete: () => this.flash.destroy() });
  }

  // ---- HUD / banners -----------------------------------------------------------
  buildHUD() {
    this.hud = this.add.container(0, 0);
    this.hud.setDepth(30);
    this.hearts = [];
    for (let i = 0; i < 3; i++) {
      const h = this.add.graphics();
      h.setPosition(20 + i * 40, 22);
      this.hud.add(h);
      this.hearts.push(h);
    }
    this.label = this.add.text(16, 44, 'PUNTaje'.toUpperCase(), { fontFamily: 'monospace', fontSize: '14px', color: '#aeb6c8' });
    this.hud.add(this.label);
    this.scoreText = this.add.text(16, 60, '0', { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' });
    this.hud.add(this.scoreText);
    this.stageText = this.add.text(W - 16, 22, '', { fontFamily: 'monospace', fontSize: '16px', color: '#f4c95d' }).setOrigin(1, 0);
    this.hud.add(this.stageText);
    this.timerText = this.add.text(W - 16, 44, '', { fontFamily: 'monospace', fontSize: '14px', color: '#aeb6c8' }).setOrigin(1, 0);
    this.hud.add(this.timerText);
  }

  drawHearts() {
    for (let i = 0; i < this.hearts.length; i++) {
      const h = this.hearts[i];
      h.clear();
      if (i < this.lives) {
        h.fillStyle(0xe74c3c, 1);
        h.fillRoundedRect(-8, -7, 16, 14, 4);
        h.fillStyle(0xffffff, 0.9);
        h.fillRect(-4, -3, 4, 4);
      } else {
        h.fillStyle(0x55555e, 1);
        h.fillRoundedRect(-8, -7, 16, 14, 4);
      }
    }
  }

  scoreTextUpdate() {
    this.scoreText.setText(String(Math.floor(this.score)));
    if (this.best !== null && Math.floor(this.score) > this.best) this.best = Math.floor(this.score);
  }

  buildBanner() {
    this.banner = this.add.container(0, 0);
    this.banner.setDepth(65);
    this.bannerBg = this.add.rectangle(W / 2, 210, 0, 52, 0x000000, 0.72);
    this.banner.add(this.bannerBg);
    this.bannerText = this.add.text(W / 2, 210, '', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.banner.add(this.bannerText);
    this.banner.setAlpha(0);
  }

  showBanner(txt, ms, sub) {
    this.bannerText.setText(txt);
    this.bannerBg.width = this.bannerText.width + 60;
    this.bannerBg.setPosition(W / 2, 210);
    this.banner.setAlpha(0);
    this.tweens.add({ targets: this.banner, alpha: 1, duration: 200 });
    this.banner.setVisible(true);
    if (sub) {
      this.subText = this.add.text(W / 2, 246, sub, {
        fontFamily: 'monospace', fontSize: '14px', color: '#d5dbe8'
      }).setOrigin(0.5);
      this.subText.setDepth(65);
    }
    this.time.delayedCall(ms || 2200, () => {
      this.tweens.add({ targets: this.banner, alpha: 0, duration: 300, onComplete: () => {
        this.banner.setVisible(false);
        if (this.subText) { this.subText.destroy(); this.subText = null; }
      } });
    });
  }

  // ---- Screens ------------------------------------------------------------------
  enterTitle() {
    this.screen = 'title';
    this.cameras.main.fadeIn(600);
    const g = this.add.graphics();
    g.setDepth(55);
    g.fillStyle(0x05080f, 0.9);
    g.fillRect(0, 0, W, H);
    const t1 = this.add.text(W / 2, 130, 'PORTAL 11:59', {
      fontFamily: 'monospace', fontSize: '52px', color: '#f4c95d', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(56);
    const t2 = this.add.text(W / 2, 186, 'EL ÚLTIMO TRANSMÍ', {
      fontFamily: 'monospace', fontSize: '24px', color: '#8fc9f2', fontStyle: 'bold', letterSpacing: 2
    }).setOrigin(0.5).setDepth(56);
    const t3 = this.add.text(W / 2, 250, 'Cambiá de carril con el joystick,\nesquivá el tráfico, saltá los\ncharcos, agachate bajo los letreros\ny subite al bus antes de la medianoche.', {
      fontFamily: 'monospace', fontSize: '15px', color: '#c5ccd8', align: 'center', lineSpacing: 6
    }).setOrigin(0.5).setDepth(56);
    const t4 = this.add.text(W / 2, 430, 'JOYSTICK  •  W/S: CARRIL  •  U: SALTAR  •  I: AGACHARSE', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(56);
    const t5 = this.add.text(W / 2, 480, 'ENTER: EMPEZAR', {
      fontFamily: 'monospace', fontSize: '15px', color: '#f4c95d', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(56);
    this.titleStuff = [g, t1, t2, t3, t4, t5];
    this.tweens.add({
      targets: t1, alpha: 1, duration: 500, yoyo: true, repeat: -1
    });
    const bus = this.add.graphics();
    bus.setDepth(56);
    bus.setPosition(0, 0);
    this.drawBusArt(bus, 400, 520, 0.7);
    this.titleStuff.push(bus);
    if (this.best === null) this.loadBest();
  }

  drawBusArt(g, cx, cy, s) {
    g.fillStyle(0xc0392b, 1);
    g.fillRoundedRect(cx - 165 * s, cy - 40 * s, 330 * s, 90 * s, 10);
    g.fillStyle(0xf4c95d, 1);
    g.fillRect(cx - 165 * s, cy - 40 * s, 330 * s, 8 * s);
    g.fillRect(cx - 165 * s, cy + 42 * s, 330 * s, 4 * s);
    g.fillStyle(0x3a3a44, 1);
    g.fillRoundedRect(cx - 150 * s, cy - 25 * s, 250 * s, 60 * s, 6);
    g.fillStyle(0x8fc9f2, 0.6);
    g.fillRect(cx - 140 * s, cy - 18 * s, 60 * s, 46 * s);
    g.fillRect(cx - 60 * s, cy - 18 * s, 60 * s, 46 * s);
    g.fillRect(cx + 20 * s, cy - 18 * s, 60 * s, 46 * s);
    g.fillStyle(0x22222c, 1);
    g.fillCircle(cx - 110 * s, cy + 46 * s, 12 * s);
    g.fillCircle(cx + 60 * s, cy + 46 * s, 12 * s);
  }

  startGame() {
    this.destroyTitle();
    this.playing = true;
    this.screen = 'count';
    this.countT = 3;
    this.startDelay = 0;
    this.hud.setVisible(true);
    this.stageText.setText('ETAPA 1');
    this.updateTimer();
    this.countdown();
  }

  countdown() {
    if (this.countdownText) this.countdownText.destroy();
    this.countdownText = this.add.text(W / 2, H / 2 - 40, String(Math.ceil(this.countT)), {
      fontFamily: 'monospace', fontSize: '96px', color: '#f4c95d', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(40);
    AUDIO.beep();
    this.tweens.add({ targets: this.countdownText, scale: 1.6, alpha: 0, duration: 800, ease: 'Cubic.easeOut' });
  }

  updateCount(dt) {
    this.countT -= dt;
    if (this.countT <= 0) {
      this.countT = 0;
      this.screen = 'play';
      this.spawnT = 1.2;
      this.elapsed = 0;
      this.timer = STAGE_TIME[this.stage - 1];
      this.showBanner('¡A CORRER!', 800);
      this.updateTimer();
    }
  }

  setupStage(stage) {
    this.stage = stage;
    this.palIdx = stage === 2 ? 1 : 0;
    this.lerpT = 0;
    if (this.busG) { this.busG.destroy(); this.busG = null; this.bus = null; }
    this.drawCity(0);
    this.buildRain();
    if (stage === 2) this.showBanner('ETAPA 2: NOCHES DE NEÓN', 2200);
    else this.showBanner('ETAPA 1: ÚLTIMO TURNO', 2200);
    this.timer = STAGE_TIME[stage - 1];
    this.updateTimer();
    this.stageText.setText('ETAPA ' + stage);
  }

  updateTimer() {
    const s = Math.max(0, Math.ceil(this.timer || 0));
    this.timerText.setText('00:' + String(s).padStart(2, '0'));
    if (s <= 5 && this.screen === 'play') {
      this.timerText.setColor('#ff5577');
    } else {
      this.timerText.setColor('#aeb6c8');
    }
  }

  endStage() {
    this.screen = 'busIn';
    this.playing = false;
    this.score += 250;
    this.scoreTextUpdate();
    for (const o of this.obstacles) o.g.destroy();
    this.obstacles = [];
    if (this.busG) this.busG.destroy();
    this.bus = { x: W + 80, t: 0, entered: false };
    this.busG = this.add.graphics();
    this.busG.setDepth(8);
    this.busDoor = null;
    AUDIO.horn();
    this.showBanner('¡EL TRANSMÍ LLEGÓ!', 2200);
  }

  updateBusIn(dt) {
    const b = this.bus;
    if (!b) return;
    b.t += dt;
    const target = 240;
    const easeT = easeOutCubic(clamp(b.t / 2.4, 0, 1));
    b.x = lerp(W + 80, target, easeT);
    this.busG.clear();
    this.drawBusArt(this.busG, b.x, 480, 1);
    if (b.t > 1.1 && !b.entered) {
      b.entered = true;
      this.boardBus();
    }
  }

  boardBus() {
    this.screen = 'board';
    this.player.setTexture('p_stand');
    this.player.state = 'stand';
    this.player.lane = 2;
    this.player.x = 90;
    this.player.y = LANES[2];
    this.player.vy = 0;
    this.player.grounded = true;
    this.player.invuln = 0;
    this.player.setAlpha(1);
    this.player.setScale(1, 1);
    this.player.shadow.setScale(1, 1);
    this.player.shadow.setPosition(90, LANES[2] + 26);
    this.boarding = true;
    this.showBanner('SUBIENDO AL BUS', 1500);
  }

  updateBoard(dt) {
    const p = this.player;
    const doorX = this.bus.x + 121;
    if (!this.boarding) return;
    if (Math.abs(p.x - doorX) > 8) {
      p.x += Math.sign(doorX - p.x) * 130 * dt;
      p.shadow.setPosition(p.x, LANES[p.lane] + 26);
    } else {
      this.boarding = false;
      this.enterBus();
    }
  }

  enterBus() {
    this.screen = 'fade';
    this.fadeStep = 0;
    this.fadeRect = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0);
    this.fadeRect.setDepth(70);
    this.tweens.add({ targets: this.fadeRect, alpha: 1, duration: 700, onComplete: () => {
      if (this.stage === 2) {
        this.won = true;
        this.screen = 'win';
        AUDIO.win();
        this.finalizeScores();
      } else {
        this.setupStage(2);
        this.playing = true;
        if (this.busG) { this.busG.destroy(); this.busG = null; this.bus = null; }
        this.player.x = 90;
        this.player.lane = 2;
        this.player.y = LANES[2];
        this.player.vy = 0;
        this.player.grounded = true;
        this.player.setAlpha(1);
        this.player.setScale(1, 1);
        this.player.shadow.setPosition(90, LANES[2] + 26);
        this.player.shadow.setScale(1, 1);
        this.countT = 2.5;
        this.screen = 'count';
        this.countdown();
      }
      this.tweens.add({ targets: this.fadeRect, alpha: 0, duration: 500, onComplete: () => this.fadeRect.destroy() });
    } });
  }

  endGame() {
    if (this.screen === 'over' || this.screen === 'win') return;
    this.playing = false;
    MUSIC.stop();
    if (this.stage === 2 && !this.won) {
      this.won = true;
      this.screen = 'win';
      AUDIO.win();
      this.showBanner('¡LLEGASTE AL ÚLTIMO TRANSMÍ!', 2600, 'Subiste al bus antes de la medianoche');
    } else {
      this.screen = 'over';
      AUDIO.over();
      this.showBanner('SE ACABÓ EL TIEMPO', 2200, 'El bus se fue sin vos...');
    }
    this.finalizeScores();
  }

  finalizeScores() {
    const sc = Math.floor(this.score);
    const ts = new Date().toISOString();
    this.finalScore = sc;
    STORAGE.read().then((entries) => {
      if (STORAGE.qualifies(sc, entries)) {
        this.screen = 'initials';
        this.showInitials(sc, ts, entries);
      } else {
        this.screen = 'lb';
        this.showLeaderboard(entries, sc);
      }
    });
  }

  showInitials(sc, ts, entries) {
    this.cur = { initials: 'AAA', pos: 0, row: 0, col: 3 };
    this.entries = entries;
    this.initialsObj = { sc, ts };
    const bg = this.add.rectangle(W / 2, H / 2, 500, 330, 0x10131c, 0.95);
    bg.setDepth(62);
    const t1 = this.add.text(W / 2, 190, '¡RÉCORD!', {
      fontFamily: 'monospace', fontSize: '32px', color: '#f4c95d', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(62);
    const t2 = this.add.text(W / 2, 228, 'Ingresá tus iniciales', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aeb6c8'
    }).setOrigin(0.5).setDepth(62);
    this.initialText = this.add.text(W / 2, 270, 'AAA', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(62);
    this.gridText = this.add.text(W / 2, 360, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#8fc9f2', align: 'center', lineSpacing: 8
    }).setOrigin(0.5).setDepth(62);
    this.initialBg = bg;
    this.initialsStuff = [bg, t1, t2, this.initialText, this.gridText];
    this.drawGrid();
    this.hintText = this.add.text(W / 2, 470, 'JOYSTICK: MOVER   •   U: SELECCIONAR   •   I: LISTO', {
      fontFamily: 'monospace', fontSize: '12px', color: '#c5ccd8'
    }).setOrigin(0.5).setDepth(62);
    this.initialsStuff.push(this.hintText);
  }

  drawGrid() {
    let out = '';
    for (let r = 0; r < LETTER_GRID.length; r++) {
      let row = '';
      for (let c = 0; c < LETTER_GRID[r].length; c++) {
        const sel = this.cur.row === r && this.cur.col === c;
        row += (sel ? '> ' : '  ') + LETTER_GRID[r][c] + (sel ? ' <' : '  ') + '  ';
      }
      out += row + '\n';
    }
    this.gridText.setText(out);
    this.initialText.setText(this.cur.initials);
  }

  updateInitials(dt) {
    const c = this.cur;
    if (INPUT.pressed('P1_1')) {
      const cell = LETTER_GRID[c.row][c.col];
      if (cell === 'DEL') {
        c.initials = 'AAA';
      } else if (cell === 'END') {
        this.confirmInitials();
        return;
      } else if (c.pos < 3) {
        c.initials = c.initials.substring(0, c.pos) + cell + c.initials.substring(c.pos + 1);
        c.pos++;
      }
      this.drawGrid();
    }
    if (INPUT.pressed('P1_2')) {
      this.confirmInitials();
      return;
    }
    const mv = INPUT.pressed('P1_U') || INPUT.pressed('P1_D') || INPUT.pressed('P1_L') || INPUT.pressed('P1_R');
    if (mv) {
      if (INPUT.pressed('P1_U')) c.row = Math.max(0, c.row - 1);
      if (INPUT.pressed('P1_D')) c.row = Math.min(LETTER_GRID.length - 1, c.row + 1);
      if (INPUT.pressed('P1_L')) c.col = Math.max(0, c.col - 1);
      if (INPUT.pressed('P1_R')) c.col = Math.min(LETTER_GRID[c.row].length - 1, c.col + 1);
      this.drawGrid();
    }
  }

  confirmInitials() {
    const initials = (this.cur.initials || 'AAA').toUpperCase().replace(/[^A-Z]/g, '');
    const final = (initials + 'AAA').substring(0, 3);
    const entry = { initials: final, score: Math.floor(this.initialsObj.sc), ts: this.initialsObj.ts };
    const entries = this.entries.concat(entry);
    entries.sort((a, b) => b.score - a.score);
    const top = entries.slice(0, 5);
    STORAGE.write(top).then(() => {
      this.cleanupInitials();
      this.screen = 'lb';
      this.showLeaderboard(top, this.finalScore);
    });
  }

  cleanupInitials() {
    if (this.initialsStuff) {
      for (const el of this.initialsStuff) el.destroy();
      this.initialsStuff = null;
    }
  }

  showLeaderboard(entries, sc) {
    this.lb = this.add.container(0, 0);
    this.lb.setDepth(60);
    const bg = this.add.rectangle(W / 2, H / 2, 460, 380, 0x10131c, 0.95);
    this.lb.add(bg);
    const t1 = this.add.text(W / 2, 230, 'MEJORES VIAJES', {
      fontFamily: 'monospace', fontSize: '26px', color: '#f4c95d', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.lb.add(t1);
    const rows = this.add.text(W / 2, 300, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', align: 'center', lineSpacing: 10
    }).setOrigin(0.5);
    this.lb.add(rows);
    const lines = entries.map((e, i) => {
      const tag = e.score === sc ? '  <' : '';
      return String(i + 1) + '. ' + e.initials + '  ' + String(e.score).padStart(6, ' ') + tag;
    });
    if (lines.length === 0) {
      rows.setText('(sin viajes todavía)');
    } else {
      rows.setText(lines.join('\n'));
    }
    const t2 = this.add.text(W / 2, 460, 'TU PUNTAJE: ' + sc, {
      fontFamily: 'monospace', fontSize: '18px', color: '#8fc9f2', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.lb.add(t2);
    const t3 = this.add.text(W / 2, 500, 'ENTER: VOLVER A JUGAR', {
      fontFamily: 'monospace', fontSize: '14px', color: '#c5ccd8'
    }).setOrigin(0.5);
    this.lb.add(t3);
  }

  loadBest() {
    STORAGE.read().then((entries) => {
      if (entries.length > 0) this.best = entries[0].score;
    });
  }

  // ---- Input handling for screens ---------------------------------------------
  handleTitleInput() {
    if (INPUT.pressed('START1') || INPUT.pressed('START2') || INPUT.pressed('P1_1')) {
      if (!this.initAudio) {
        this.initAudio = true;
        AUDIO.init();
      }
      MUSIC.play();
      this.startGame();
    }
  }

  handleOverInput() {
    if (INPUT.pressed('START1') || INPUT.pressed('START2')) {
      this.restart();
    }
  }

  handleWinInput() {
    if (INPUT.pressed('START1') || INPUT.pressed('START2')) {
      this.restart();
    }
  }

  handleInitialsInput(dt) {
    this.updateInitials(dt);
  }

  handleLeaderboardInput() {
    if (INPUT.pressed('START1') || INPUT.pressed('START2')) {
      this.restart();
    }
  }

  restart() {
    this.destroyTitle();
    this.teardown();
    this.scene.restart();
  }

  destroyTitle() {
    if (this.titleStuff) {
      for (const el of this.titleStuff) el.destroy();
      this.titleStuff = null;
    }
  }

  update(time, delta) {
    let dt = delta / 1000;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    this.updateRain(dt);
    this.updateParts(dt);
    if (this.screen === 'title') {
      this.handleTitleInput();
      this.updatePlayerVisual();
      INPUT.consume();
      return;
    }
    if (this.screen === 'count') {
      this.updateCount(dt);
      this.updatePlayerVisual();
      this.updateSpawn(dt);
      INPUT.consume();
      return;
    }
    if (this.screen === 'play') {
      this.elapsed += dt;
      this.timer -= dt;
      this.updateTimer();
      if (this.timer <= 0) {
        this.endStage();
      } else {
        this.updatePlayer(dt);
        this.updateSpawn(dt);
        this.updateObs(dt);
      }
      INPUT.consume();
      return;
    }
    if (this.screen === 'busIn') {
      this.updateBusIn(dt);
      INPUT.consume();
      return;
    }
    if (this.screen === 'board') {
      this.updateBoard(dt);
      this.updateObs(dt);
      INPUT.consume();
      return;
    }
    if (this.screen === 'fade') {
      INPUT.consume();
      return;
    }
    if (this.screen === 'over') {
      this.handleOverInput();
      INPUT.consume();
      return;
    }
    if (this.screen === 'win') {
      this.handleWinInput();
      INPUT.consume();
      return;
    }
    if (this.screen === 'initials') {
      this.handleInitialsInput(dt);
      INPUT.consume();
      return;
    }
    if (this.screen === 'lb') {
      this.handleLeaderboardInput();
      INPUT.consume();
      return;
    }
    INPUT.consume();
  }

  updatePlayerVisual() {
    const p = this.player;
    const right = INPUT.held('P1_R');
    const left = INPUT.held('P1_L');
    const wantJump = INPUT.held('P1_1');
    const wantCrouch = INPUT.held('P1_2');
    if (INPUT.pressed('P1_U') && p.lane > 0) p.lane--;
    if (INPUT.pressed('P1_D') && p.lane < LANES.length - 1) p.lane++;
    this.dx = (right ? 1 : 0) - (left ? 1 : 0);
    p.y = lerp(p.y, LANES[p.lane], Math.min(1, 12 * 0.016));
    p.setTexture('p_' + (wantJump ? 'jump' : (wantCrouch ? 'crouch' : 'stand')));
    p.setScale(1, 1);
    p.shadow.setPosition(p.x, LANES[p.lane] + 26);
    p.shadow.setScale(1, 1);
  }
}

// ---------------------------------------------------------------------------
// Phaser bootstrap
// ---------------------------------------------------------------------------
const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#05080f',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade' },
  scene: [GameScene]
};
window.__portal1159Game = new Phaser.Game(config);



