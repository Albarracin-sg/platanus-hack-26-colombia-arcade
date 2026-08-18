// PORTAL 11:59 — El Último Transmi
// Platanus Hack 26 — Colombia Arcade
// Single-player horizontal lane-dodge at a Bogotá TransMilenio station.
// Editable surface (HARD INVARIANT): game.js, metadata.json, cover.png ONLY.

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const W = 800;
const H = 600;
const STORAGE_KEY = 'portal-11:59:lb:v2';
const STAGE_TIME = [45, 40, 35, 30];
const STAGE_DIFFICULTY = [[1200, 600], [900, 450], [700, 350], [500, 250]];
const STAGE_SPEED_MUL = [0.8, 1.0, 1.2, 1.4];
const PLAYER_Y = 540;
const LANES = [260, 330, 400, 470, 540];
const CARS = [0xe74c3c, 0x2c5fa6, 0xf1c40f, 0x8e44ad, 0x16a085];
const PAL = [
  { skyTop: 0x2a2a2a, skyBottom: 0x4a4a4a, road: 0x888888, lane: 0xf4c95d, curb: 0xc0392b, build: 0x666666, win: 0x888888, moon: 0xaaaaaa, rain: 0x999999 },
  { skyTop: 0x1a1a1a, skyBottom: 0x3a3a3a, road: 0x7a7a7a, lane: 0xf4c95d, curb: 0xe74c3c, build: 0x5a5a5a, win: 0x777777, moon: 0x999999, rain: 0x888888 },
  { skyTop: 0x0f0f0f, skyBottom: 0x2a2a2a, road: 0x6a6a6a, lane: 0xf4c95d, curb: 0xc0392b, build: 0x4a4a4a, win: 0x666666, moon: 0x888888, rain: 0x777777 },
  { skyTop: 0x050505, skyBottom: 0x1a1a1a, road: 0x5a5a5a, lane: 0xf4c95d, curb: 0xe74c3c, build: 0x3a3a3a, win: 0x555555, moon: 0x777777, rain: 0x666666 }
];
const LETTER_GRID = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', '.', '-'],
  ['DEL', 'END']
];
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
const OBS = {
  police:    { w: 80,  h: 100, sp: 180 },
  vendor:    { w: 90,  h: 100, sp: 140 },
  singer:    { w: 80,  h: 100, sp: 160 },
  kid:       { w: 60,  h: 75,  sp: 220 },
  student:   { w: 85,  h: 100, sp: 130 }
};
const SPAWN = [
  [
    { t: 'police', w: 25 }, { t: 'vendor', w: 25 }, { t: 'singer', w: 20 },
    { t: 'kid', w: 15 }, { t: 'student', w: 15 }
  ],
  [
    { t: 'police', w: 22 }, { t: 'vendor', w: 22 }, { t: 'singer', w: 20 },
    { t: 'kid', w: 20 }, { t: 'student', w: 16 }
  ],
  [
    { t: 'police', w: 20 }, { t: 'vendor', w: 20 }, { t: 'singer', w: 20 },
    { t: 'kid', w: 25 }, { t: 'student', w: 15 }
  ],
  [
    { t: 'police', w: 20 }, { t: 'vendor', w: 18 }, { t: 'singer', w: 18 },
    { t: 'kid', w: 28 }, { t: 'student', w: 16 }
  ]
];

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
// Input
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
// Audio
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
// Music
// ---------------------------------------------------------------------------
const MUSIC = {
  step: 125,
  _pos: 0, _stage: 1, _mute: 0, t: null,
  S: [
    { l: [294,0,349,0, 440,440,0,587, 523,0,440,0, 349,0,392,440, 0,349,0,294, 0,0,330,349],
      b: [147,147,147,147, 117,117,117,117, 175,175,175,175, 131,131,131,131, 147,147,147,147, 117,117,131,131] },
    { l: [349,0,440,349, 440,0,523,0, 349,0,440,587, 659,0,523,440, 440,0,440,349, 392,0,349,0],
      b: [87,87,87,87, 131,131,131,131, 87,87,87,87, 175,175,175,175, 131,131,131,131, 98,98,98,98] },
    { l: [440,0,587,440, 659,0,587,0, 440,523,659,0, 784,0,659,587, 523,0,587,440, 0,440,0,523],
      b: [110,110,110,110, 131,131,131,131, 147,147,147,147, 110,110,110,110, 165,165,165,165, 110,110,110,110] },
    { l: [262,0,330,392, 523,0,392,330, 392,0,494,0, 587,0,494,330, 392,0,330,0, 262,196,262,0],
      b: [131,131,131,131, 98,98,98,98, 131,131,131,131, 196,196,196,196, 131,131,131,131, 87,87,87,87] }
  ],
  play(stage) {
    if (stage && this._stage !== stage) {
      this._stage = Math.min(4, Math.max(1, stage | 0));
      this._pos = 0;
    }
    if (this.t) return;
    this.t = setInterval(() => {
      if (performance.now() < this._mute) { this._pos = (this._pos + 1) % 24; return; }
      const tr = this.S[this._stage - 1] || this.S[0];
      const lf = tr.l[this._pos], bf = tr.b[this._pos];
      if (lf) AUDIO.tone('square', lf, lf, 0.11, 0.05);
      if (bf) AUDIO.tone('square', bf, bf, 0.11, 0.04);
      this._pos = (this._pos + 1) % 24;
    }, this.step);
  },
  duck(ms) { this._mute = performance.now() + ms; },
  stop() { if (this.t) clearInterval(this.t); this.t = null; this._pos = 0; this._stage = 1; }
};

// ---------------------------------------------------------------------------
// Storage
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
// Procedural drawing — Player (80×100 texture)
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

  g.fillStyle(0x000000, 0.35);
  g.fillEllipse(40, 92, 50, 12);

  if (crouched) {
    g.fillStyle(pants, 1);
    g.fillRect(20, 85, 14, 7);
    g.fillRect(44, 85, 14, 7);
    g.fillRect(24, 70, 10, 16);
    g.fillRect(46, 70, 10, 16);
    g.fillStyle(shirt, 1);
    g.fillRoundedRect(18, 44, 44, 26, 6);
    g.fillStyle(shirtB, 1);
    g.fillRoundedRect(18, 60, 44, 10, 4);
    g.fillStyle(skin, 1);
    g.fillCircle(46, 36, 9);
    g.fillStyle(hair, 1);
    g.fillRoundedRect(36, 24, 18, 12, 4);
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(48, 36, 2);
  } else {
    const legY = jumping ? 58 : 62;
    const legH = jumping ? 18 : 22;
    g.fillStyle(pants, 1);
    g.fillRect(22, 85, 14, 7);
    g.fillRect(44, 85, 14, 7);
    g.fillRect(26, legY, 10, legH);
    g.fillRect(44, legY, 10, legH);
    g.fillStyle(shirt, 1);
    g.fillRoundedRect(22, 30, 36, 32, 5);
    g.fillStyle(shirtB, 1);
    g.fillRoundedRect(22, 52, 36, 10, 4);
    g.fillStyle(skin, 1);
    g.fillCircle(40, 20, 11);
    g.fillStyle(hair, 1);
    g.fillRoundedRect(29, 7, 22, 13, 5);
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(37, 20, 2);
    g.fillCircle(43, 20, 2);
  }
}

// ---------------------------------------------------------------------------
// Procedural drawing — Obstacles (detailed, 80×100+)
// ---------------------------------------------------------------------------
function drawObstacle(g, o) {
  g.clear();
  const t = o.type;
  const hw = o.w / 2, hh = o.h / 2;

  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(0, hh + 5, o.w * 0.7, 10);

  if (t === 'police') {
    g.fillStyle(0x111111, 1);
    g.fillRect(-18, hh - 12, 14, 12);
    g.fillRect(4, hh - 12, 14, 12);
    g.fillStyle(0x1a1a4e, 1);
    g.fillRect(-14, hh * 0.3, 12, hh * 0.5);
    g.fillRect(2, hh * 0.3, 12, hh * 0.5);
    g.fillStyle(0x1a1a4e, 1);
    g.fillRoundedRect(-22, -hh * 0.35, 44, hh * 0.7, 5);
    g.fillStyle(0x111111, 1);
    g.fillRect(-20, hh * 0.15, 40, 6);
    g.fillStyle(0xf4c95d, 1);
    g.fillRect(-4, hh * 0.15, 8, 6);
    g.fillStyle(0xf4c95d, 1);
    g.fillCircle(-12, -hh * 0.1, 5);
    g.fillStyle(0xd4a93a, 1);
    g.fillCircle(-12, -hh * 0.1, 3);
    g.fillStyle(0x2a2a6e, 1);
    g.fillRect(-22, -hh * 0.3, 8, 10);
    g.fillRect(14, -hh * 0.3, 8, 10);
    g.fillStyle(0xf3c39a, 1);
    g.fillCircle(0, -hh * 0.55, 13);
    g.fillStyle(0x1a1a4e, 1);
    g.fillRoundedRect(-16, -hh * 0.8, 32, 12, 4);
    g.fillStyle(0x111122, 1);
    g.fillRect(-18, -hh * 0.68, 36, 5);
    g.fillStyle(0xf4c95d, 1);
    g.fillCircle(0, -hh * 0.74, 3);
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(-4, -hh * 0.55, 2);
    g.fillCircle(4, -hh * 0.55, 2);

  } else if (t === 'vendor') {
    g.fillStyle(0x4a3520, 1);
    g.fillRect(-16, hh - 10, 12, 10);
    g.fillRect(4, hh - 10, 12, 10);
    g.fillStyle(0x654321, 1);
    g.fillRect(-12, hh * 0.3, 10, hh * 0.45);
    g.fillRect(2, hh * 0.3, 10, hh * 0.45);
    g.fillStyle(0xd4782a, 1);
    g.fillRoundedRect(-20, -hh * 0.25, 40, hh * 0.6, 5);
    g.fillStyle(0xc0392b, 1);
    g.fillRoundedRect(-hw * 0.9, -hh * 0.5, o.w * 0.7, o.h * 0.75, 6);
    g.fillStyle(0xf4c95d, 1);
    g.fillRect(-hw * 0.7, -hh * 0.3, o.w * 0.4, 5);
    g.fillRect(-hw * 0.7, -hh * 0.05, o.w * 0.4, 5);
    g.fillRect(-hw * 0.7, hh * 0.15, o.w * 0.4, 5);
    g.fillStyle(0x2ecc71, 1);
    g.fillCircle(-hw * 0.6, -hh * 0.55, 6);
    g.fillStyle(0xf39c12, 1);
    g.fillCircle(-hw * 0.35, -hh * 0.6, 5);
    g.fillStyle(0xe74c3c, 1);
    g.fillCircle(-hw * 0.5, -hh * 0.7, 4);
    g.fillStyle(0xa93226, 1);
    g.fillRect(-14, -hh * 0.2, 4, hh * 0.4);
    g.fillRect(10, -hh * 0.2, 4, hh * 0.4);
    g.fillStyle(0xf3c39a, 1);
    g.fillCircle(0, -hh * 0.45, 12);
    g.fillStyle(0xd4a93a, 1);
    g.fillRoundedRect(-14, -hh * 0.7, 28, 8, 4);
    g.fillRect(-18, -hh * 0.62, 36, 4);
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(-4, -hh * 0.45, 2);
    g.fillCircle(4, -hh * 0.45, 2);

  } else if (t === 'singer') {
    g.fillStyle(0x2c3e50, 1);
    g.fillRect(-16, hh - 10, 12, 10);
    g.fillRect(4, hh - 10, 12, 10);
    g.fillStyle(0x7d3c98, 1);
    g.fillRect(-12, hh * 0.3, 10, hh * 0.45);
    g.fillRect(2, hh * 0.3, 10, hh * 0.45);
    g.fillStyle(0x27ae60, 1);
    g.fillRoundedRect(-20, -hh * 0.25, 40, hh * 0.6, 5);
    g.fillStyle(0x9b59b6, 1);
    g.fillRect(-18, -hh * 0.2, 12, hh * 0.45);
    g.fillRect(6, -hh * 0.2, 12, hh * 0.45);
    g.fillStyle(0x8b4513, 1);
    g.fillRect(-16, -hh * 0.2, 4, hh * 0.6);
    g.fillStyle(0xd4a93a, 1);
    g.fillEllipse(8, hh * 0.1, 20, 28);
    g.fillStyle(0x8b4513, 1);
    g.fillCircle(8, hh * 0.1, 4);
    g.fillRect(16, -hh * 0.4, 4, hh * 0.5);
    g.fillStyle(0xf3c39a, 1);
    g.fillCircle(0, -hh * 0.45, 12);
    g.fillStyle(0x2c3e50, 1);
    g.fillRoundedRect(-14, -hh * 0.65, 28, 14, 5);
    g.fillRect(-14, -hh * 0.45, 6, 20);
    g.fillRect(8, -hh * 0.45, 6, 20);
    g.fillStyle(0xf3c39a, 1);
    g.fillRect(18, -hh * 0.15, 8, 16);
    g.fillStyle(0x333333, 1);
    g.fillCircle(22, -hh * 0.2, 5);
    g.fillStyle(0x555555, 1);
    g.fillRect(20, -hh * 0.15, 4, 12);
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(-4, -hh * 0.45, 2);
    g.fillCircle(4, -hh * 0.45, 2);

  } else if (t === 'kid') {
    g.fillStyle(0xe74c3c, 1);
    g.fillRect(-12, hh - 8, 10, 8);
    g.fillRect(2, hh - 8, 10, 8);
    g.fillStyle(0x2c3e50, 1);
    g.fillRect(-8, hh * 0.25, 8, hh * 0.4);
    g.fillRect(2, hh * 0.35, 8, hh * 0.3);
    g.fillStyle(0x3498db, 1);
    g.fillRoundedRect(-14, -hh * 0.2, 28, hh * 0.5, 4);
    g.fillStyle(0xe74c3c, 1);
    g.fillRect(-12, -hh * 0.05, 24, 5);
    g.fillStyle(0xf3c39a, 1);
    g.fillRect(-18, -hh * 0.1, 6, 14);
    g.fillRect(12, -hh * 0.15, 6, 14);
    g.fillStyle(0xf3c39a, 1);
    g.fillCircle(0, -hh * 0.4, 10);
    g.fillStyle(0x2c3e50, 1);
    g.fillRoundedRect(-11, -hh * 0.6, 22, 10, 4);
    g.fillCircle(-8, -hh * 0.55, 4);
    g.fillCircle(6, -hh * 0.58, 3);
    g.fillCircle(0, -hh * 0.62, 3);
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(-3, -hh * 0.4, 2);
    g.fillCircle(3, -hh * 0.4, 2);

  } else if (t === 'student') {
    g.fillStyle(0x111111, 1);
    g.fillRect(-16, hh - 10, 12, 10);
    g.fillRect(4, hh - 10, 12, 10);
    g.fillStyle(0x1a1a4e, 1);
    g.fillRect(-12, hh * 0.3, 10, hh * 0.45);
    g.fillRect(2, hh * 0.3, 10, hh * 0.45);
    g.fillStyle(0xecf0f1, 1);
    g.fillRoundedRect(-20, -hh * 0.25, 40, hh * 0.6, 5);
    g.fillStyle(0xc0392b, 1);
    g.fillRect(-3, -hh * 0.2, 6, 20);
    g.fillTriangle(-5, -hh * 0.2 + 20, 5, -hh * 0.2 + 20, 0, -hh * 0.2 + 28);
    g.fillStyle(0xe67e22, 1);
    g.fillRoundedRect(-hw * 0.95, -hh * 0.55, o.w * 0.75, o.h * 0.8, 7);
    g.fillStyle(0x27ae60, 1);
    g.fillRoundedRect(-hw * 0.7, hh * 0.0, o.w * 0.4, o.h * 0.25, 4);
    g.fillStyle(0xd35400, 1);
    g.fillRect(-14, -hh * 0.2, 5, hh * 0.45);
    g.fillRect(9, -hh * 0.2, 5, hh * 0.45);
    g.fillStyle(0x3498db, 1);
    g.fillRect(-hw * 0.6, -hh * 0.6, 16, 4);
    g.fillStyle(0xe74c3c, 1);
    g.fillRect(-hw * 0.5, -hh * 0.68, 14, 4);
    g.fillStyle(0x2ecc71, 1);
    g.fillRect(-hw * 0.55, -hh * 0.75, 12, 4);
    g.fillStyle(0xf4c95d, 1);
    g.fillRect(-hw * 0.3, -hh * 0.72, 3, 14);
    g.fillStyle(0xf3c39a, 1);
    g.fillCircle(0, -hh * 0.45, 12);
    g.fillStyle(0x2c3e50, 1);
    g.fillRect(-10, -hh * 0.48, 8, 7);
    g.fillRect(2, -hh * 0.48, 8, 7);
    g.fillRect(-2, -hh * 0.45, 4, 2);
    g.fillStyle(0x85c1e9, 0.5);
    g.fillRect(-9, -hh * 0.47, 6, 5);
    g.fillRect(3, -hh * 0.47, 6, 5);
    g.fillStyle(0x2c3e50, 1);
    g.fillRoundedRect(-13, -hh * 0.65, 26, 10, 4);
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

    const floor = this.add.graphics();
    c.add(floor);
    const wall = this.add.graphics();
    c.add(wall);

    // === WALL (y: 0–200) ===
    wall.fillStyle(0x888888, 1);
    wall.fillRect(0, 0, W, 200);

    // Brick texture
    wall.fillStyle(0x5e5e5e, 0.25);
    for (let by = 0; by < 200; by += 20) {
      const off = (by / 20 % 2) * 30;
      for (let bx = off; bx < W; bx += 60) {
        wall.fillRect(bx, by, 58, 18);
      }
    }

    // Fluorescent lights
    wall.fillStyle(0xffffff, 1);
    wall.fillRect(80, 28, 220, 6);
    wall.fillRect(500, 28, 220, 6);
    wall.fillRect(280, 58, 240, 6);
    // Glow
    wall.fillStyle(0xffffee, 0.25);
    wall.fillRoundedRect(60, 16, 260, 40, 10);
    wall.fillRoundedRect(480, 16, 260, 40, 10);
    wall.fillRoundedRect(260, 46, 280, 40, 10);

    // Red warning line at y=200
    wall.fillStyle(0xc0392b, 1);
    wall.fillRect(0, 196, W, 8);
    // Yellow-black hazard stripe
    wall.fillStyle(0xf4c95d, 0.7);
    for (let sx = 0; sx < W; sx += 30) {
      wall.fillRect(sx, 196, 15, 8);
    }

    // === TRANSMILENIO LOGO ===
    const logoBg = this.add.graphics();
    c.add(logoBg);
    logoBg.fillStyle(0xc0392b, 0.9);
    logoBg.fillRoundedRect(280, 85, 240, 40, 6);
    const logoText = this.add.text(400, 105, 'TRANSMILENIO', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    c.add(logoText);

    // Route signs
    const routes = ['B', 'K', 'H', 'J'];
    const routeBgs = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12];
    for (let i = 0; i < 4; i++) {
      const rx = 130 + i * 170;
      const sg = this.add.graphics();
      c.add(sg);
      sg.fillStyle(routeBgs[i], 1);
      sg.fillRoundedRect(rx - 18, 140, 36, 28, 4);
      const rt = this.add.text(rx, 154, routes[i], {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5);
      c.add(rt);
    }

    // Colorful posters
    const posterColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6];
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const poster = this.add.graphics();
    c.add(poster);
    for (let i = 0; i < 5; i++) {
      const px = 20 + i * 160;
      const py = 130 + rnd() * 15;
      const pw = 45 + rnd() * 25;
      const ph = 40 + rnd() * 20;
      poster.fillStyle(posterColors[i], 0.75);
      poster.fillRoundedRect(px, py, pw, ph, 3);
      poster.fillStyle(0xffffff, 0.3);
      poster.fillRect(px + 3, py + 3, pw - 6, 2);
      poster.fillRect(px + 3, py + ph - 5, pw - 6, 2);
    }

    // Digital clock
    const clock = this.add.graphics();
    c.add(clock);
    clock.fillStyle(0x1a1a1a, 1);
    clock.fillRoundedRect(690, 30, 60, 30, 4);
    const clockText = this.add.text(720, 45, '11:59', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff3333'
    }).setOrigin(0.5);
    c.add(clockText);

    // Security cameras
    const cams = this.add.graphics();
    c.add(cams);
    cams.fillStyle(0x333333, 1);
    cams.fillRoundedRect(12, 8, 22, 14, 3);
    cams.fillRect(23, 22, 4, 10);
    cams.fillRoundedRect(766, 8, 22, 14, 3);
    cams.fillRect(773, 22, 4, 10);
    cams.fillStyle(0xff0000, 1);
    cams.fillCircle(18, 13, 2);
    cams.fillCircle(772, 13, 2);

    // === FLOOR (y: 200–600) ===
    floor.fillStyle(0x999999, 1);
    floor.fillRect(0, 204, W, H - 204);

    // Tile pattern
    for (let ty = 204; ty < H; ty += 40) {
      for (let tx = 0; tx < W; tx += 40) {
        const alt = ((tx / 40 + ty / 40) % 2 === 0) ? 0x0a0a0a : 0;
        floor.fillStyle(0x9a9a9a + alt, 1);
        floor.fillRect(tx + 1, ty + 1, 38, 38);
      }
    }

    // Floor reflections of lights
    floor.fillStyle(0xffffff, 0.12);
    floor.fillRect(80, 210, 220, 90);
    floor.fillRect(500, 210, 220, 90);
    floor.fillRect(280, 250, 240, 90);

    // Yellow safety lines between lanes
    floor.fillStyle(p.lane, 0.6);
    for (let i = 0; i < LANES.length - 1; i++) {
      const ly = (LANES[i] + LANES[i + 1]) / 2;
      for (let dx = 0; dx < W; dx += 50) {
        floor.fillRect(dx, ly - 1, 30, 3);
      }
    }

    // Directional arrows on floor
    floor.fillStyle(0xffffff, 0.1);
    for (let ay = 290; ay < H; ay += 130) {
      for (let ax = 150; ax < W; ax += 250) {
        floor.fillTriangle(ax - 12, ay, ax + 4, ay - 8, ax + 4, ay + 8);
        floor.fillRect(ax + 4, ay - 3, 12, 6);
      }
    }

    // === TURNSTILES (y: 204–240) ===
    const turn = this.add.graphics();
    c.add(turn);
    for (let i = 0; i < 5; i++) {
      const tx = 80 + i * 160;
      turn.fillStyle(0x555555, 1);
      turn.fillRect(tx, 206, 40, 28);
      turn.fillStyle(0xc0392b, 0.8);
      turn.fillRect(tx + 15, 210, 10, 20);
      turn.fillStyle(0x888888, 1);
      turn.fillRect(tx + 5, 218, 30, 3);
    }

    // === BENCHES ===
    const bench = this.add.graphics();
    c.add(bench);
    bench.fillStyle(0x4a4a4a, 1);
    bench.fillRect(15, 250, 65, 10);
    bench.fillStyle(0xc0392b, 0.5);
    bench.fillRect(15, 250, 65, 3);
    bench.fillStyle(0x4a4a4a, 1);
    bench.fillRect(720, 250, 65, 10);
    bench.fillStyle(0xc0392b, 0.5);
    bench.fillRect(720, 250, 65, 3);

    // === TRASH CANS ===
    const trash = this.add.graphics();
    c.add(trash);
    trash.fillStyle(0xc0392b, 1);
    trash.fillRoundedRect(8, 268, 22, 26, 4);
    trash.fillStyle(0xa93226, 1);
    trash.fillRect(8, 268, 22, 4);
    trash.fillStyle(0xc0392b, 1);
    trash.fillRoundedRect(770, 268, 22, 26, 4);
    trash.fillStyle(0xa93226, 1);
    trash.fillRect(770, 268, 22, 4);
  }

  palette() { return PAL[this.palIdx]; }

  // ---- Player ---------------------------------------------------------------
  buildPlayerTextures() {
    for (const st of ['stand', 'crouch', 'jump']) {
      const g = this.add.graphics();
      drawPlayer(g, { state: st, stretch: 1 });
      g.generateTexture('p_' + st, 80, 100);
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
    p.shadow = this.add.ellipse(90, PLAYER_Y + 48, 60, 14, 0x000000, 0.4);
    p.shadow.setDepth(9);
  }

  playerBox() {
    const p = this.player;
    if (p.state === 'jump') return { x: p.x, y: p.y - 30, w: 50, h: 70 };
    if (p.state === 'crouch') return { x: p.x, y: p.y - 15, w: 50, h: 40 };
    return { x: p.x, y: p.y - 30, w: 50, h: 70 };
  }

  updatePlayer(dt) {
    const p = this.player;
    const right = INPUT.held('P1_R');
    const left = INPUT.held('P1_L');
    this.dx = (right ? 1 : 0) - (left ? 1 : 0);
    const wantJump = INPUT.held('P1_1');
    const wantCrouch = INPUT.held('P1_2');
    if (INPUT.pressed('P1_U') && p.lane > 0) {
      p.lane--; AUDIO.lane();
      this.burst(p.x, p.y + 45, 2, 0x999988);
    }
    if (INPUT.pressed('P1_D') && p.lane < LANES.length - 1) {
      p.lane++; AUDIO.lane();
      this.burst(p.x, p.y + 45, 2, 0x999988);
    }
    const laneY = LANES[p.lane];
    if (p.grounded) {
      p.y = lerp(p.y, laneY, Math.min(1, 12 * dt));
      if (Math.abs(p.y - laneY) < 1) p.y = laneY;
    } else {
      p.vy += 1500 * dt;
      p.y += p.vy * dt;
      if (p.y >= laneY) {
        p.y = laneY; p.vy = 0; p.grounded = true;
        this.burst(p.x, p.y + 45, 4, 0x999988);
      }
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
    p.x = clamp(p.x + this.dx * 260 * dt, 50, W - 50);
    if (p.invuln > 0) {
      p.invuln -= dt;
      const a = 0.4 + 0.4 * Math.abs(Math.sin(this.time.now * 0.05));
      p.setAlpha(a);
      if (p.invuln <= 0) p.setAlpha(1);
    }
    p.shadow.setPosition(p.x, LANES[p.lane] + 48);
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
    return 'police';
  }

  spawnObstacle() {
    const stage = this.stage;
    const type = this.pickType();
    if (this.obstacles.length >= 13) return;

    const def = OBS[type];
    const spMul = STAGE_SPEED_MUL[stage - 1] || 1;
    const speed = (def.sp || 170) * spMul + this.elapsed * 0.006;

    const laneIdx = Math.floor(Math.random() * LANES.length);
    const oy = LANES[laneIdx];

    const o = {
      type, x: W + 100, y: oy, w: def.w, h: def.h,
      hit: true, sp: speed, seed: Math.floor(Math.random() * 100),
      life: 0, armed: 0, arm: 0, blinkT: 0
    };

    this.obstacles.push(o);
    const g = this.add.graphics();
    g.setDepth(5);
    drawObstacle(g, o);
    o.g = g;
    o.bg = null;
  }

  updateSpawn(dt) {
    if (!this.playing || this.screen !== 'play') return;
    const cfg = STAGE_DIFFICULTY[this.stage - 1] || [720, 360];
    const base = cfg[0], min = cfg[1];
    const ramp = this.stage >= 4 ? 18 : this.stage === 3 ? 14 : this.stage === 2 ? 11 : 9;
    const interval = Math.max(min, base - this.elapsed * ramp) * (0.85 + Math.random() * 0.3) / 1000;
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
      o.x -= o.sp * dt;
      if (o.x + o.w / 2 < -40) {
        this.obstacles.splice(i, 1);
        o.g.destroy();
        continue;
      }
      o.g.setPosition(o.x, o.y);
      if (this.screen === 'play' && this.playing) {
        this.checkCollision(o);
        this.checkNearMiss(o);
      }
    }
  }

  checkCollision(o) {
    const p = this.player;
    if (p.invuln > 0) return;
    if (Math.abs(o.y - LANES[p.lane]) > 45) return;
    const pb = this.playerBox();
    if (overlap(pb, o)) {
      this.hit();
    }
  }

  checkNearMiss(o) {
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
    const t3 = this.add.text(W / 2, 250, 'Corré por la estación de TransMilenio.\nCambiá de carril, saltá y agachate\npara esquivar a los personajes\ny alcanzar el último bus.', {
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
    this.palIdx = stage - 1;
    this.lerpT = 0;
    if (this.busG) { this.busG.destroy(); this.busG = null; this.bus = null; }
    this.drawCity(0);
    const titles = [
      'ETAPA 1: ÚLTIMO TURNO',
      'ETAPA 2: NOCHES DE NEÓN',
      'ETAPA 3: ARDIENTE NOCHE',
      'ETAPA 4: ALBOREZCA'
    ];
    this.showBanner(titles[stage - 1] || ('ETAPA ' + stage), 2200);
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
    this.player.shadow.setPosition(90, LANES[2] + 48);
    this.boarding = true;
    this.showBanner('SUBIENDO AL BUS', 1500);
  }

  updateBoard(dt) {
    const p = this.player;
    const doorX = this.bus.x + 121;
    if (!this.boarding) return;
    if (Math.abs(p.x - doorX) > 8) {
      p.x += Math.sign(doorX - p.x) * 130 * dt;
      p.shadow.setPosition(p.x, LANES[p.lane] + 48);
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
      if (this.stage === 4) {
        this.won = true;
        this.screen = 'win';
        this.showBanner('¡ALCANZASTE EL ALBA!', 2800, 'Cuatro etapas. La ciudad despertó.');
        AUDIO.win();
        this.finalizeScores();
      } else {
        const next = this.stage + 1;
        this.setupStage(next);
        this.playing = true;
        if (this.busG) { this.busG.destroy(); this.busG = null; this.bus = null; }
        this.player.x = 90;
        this.player.lane = 2;
        this.player.y = LANES[2];
        this.player.vy = 0;
        this.player.grounded = true;
        this.player.setAlpha(1);
        this.player.setScale(1, 1);
        this.player.shadow.setPosition(90, LANES[2] + 48);
        this.player.shadow.setScale(1, 1);
        this.countT = 2.5;
        this.screen = 'count';
        this.countdown();
        MUSIC.play(next);
      }
      this.tweens.add({ targets: this.fadeRect, alpha: 0, duration: 500, onComplete: () => this.fadeRect.destroy() });
    } });
  }

  endGame() {
    if (this.screen === 'over' || this.screen === 'win') return;
    this.playing = false;
    MUSIC.stop();
    this.screen = 'over';
    AUDIO.over();
    this.showBanner('SE ACABÓ EL TIEMPO', 2200, 'El bus se fue sin vos...');
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

  handleTitleInput() {
    if (INPUT.pressed('START1') || INPUT.pressed('START2') || INPUT.pressed('P1_1')) {
      if (!this.initAudio) {
        this.initAudio = true;
        AUDIO.init();
      }
      MUSIC.play(this.stage);
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
    // Rain disabled - indoor station
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
    p.shadow.setPosition(p.x, LANES[p.lane] + 48);
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
