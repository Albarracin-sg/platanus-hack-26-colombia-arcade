// PORTAL 11:59 — El Último Transmi
// Platanus Hack 26 — Colombia Arcade
// 1/2-player horizontal lane-dodge at a Bogotá TransMilenio station.
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
const MAX_OBSTACLES = 10;
const MAX_OBSTACLE_SPEED = 285;
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
  student:   { w: 85,  h: 100, sp: 130 },
  businessman: { w: 80,  h: 100, sp: 150 },
  tourist:   { w: 85,  h: 100, sp: 120 },
  guard:     { w: 80,  h: 100, sp: 160 }
};
const SPAWN = [
  [
    { t: 'police', w: 15 }, { t: 'vendor', w: 15 }, { t: 'singer', w: 10 },
    { t: 'kid', w: 10 }, { t: 'student', w: 10 },
    { t: 'businessman', w: 15 }, { t: 'tourist', w: 10 }, { t: 'guard', w: 10 }
  ],
  [
    { t: 'police', w: 13 }, { t: 'vendor', w: 13 }, { t: 'singer', w: 11 },
    { t: 'kid', w: 12 }, { t: 'student', w: 9 },
    { t: 'businessman', w: 18 }, { t: 'tourist', w: 12 }, { t: 'guard', w: 12 }
  ],
  [
    { t: 'police', w: 11 }, { t: 'vendor', w: 11 }, { t: 'singer', w: 11 },
    { t: 'kid', w: 14 }, { t: 'student', w: 8 },
    { t: 'businessman', w: 15 }, { t: 'tourist', w: 15 }, { t: 'guard', w: 15 }
  ],
  [
    { t: 'police', w: 10 }, { t: 'vendor', w: 9 }, { t: 'singer', w: 9 },
    { t: 'kid', w: 15 }, { t: 'student', w: 9 },
    { t: 'businessman', w: 12 }, { t: 'tourist', w: 18 }, { t: 'guard', w: 18 }
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
  baseBpm: 170, maxBpm: 260, currentBpm: 170,
  playing: false, _timer: null, _step: 0, _stage: 1, _mute: 0, _pat: null, _bass: null, _stab: null, _run: 0,
  P: [
    '1000100010001000|0010001000100010|0000100000001000|1000000000001000',
    '1000101010001010|0010001000100010|0000100000001010|1000000010000000',
    '1000101010101010|1010101010101010|0000101000001010|1000000010001000',
    '1010101010101010|1010101010101010|0000101000101010|1000100010001000'
  ],
  B: ['1151153151153151', '1152353151235153', '2252354252352542', '3353465353465653'],
  X: ['0001000100010001', '0010010000100100', '0010011000100110', '0101011001010110'],
  distCurve: null,
  init() {
    if (this.distCurve) return;
    const c = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      c[i] = (Math.PI + 100) * x / (Math.PI + 100 * Math.abs(x));
    }
    this.distCurve = c;
  },
  kick() {
    try {
      if (!AUDIO.ctx) return;
      const c = AUDIO.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain(), ws = c.createWaveShaper();
      o.type = 'sine';
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      ws.curve = this.distCurve;
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(ws); ws.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 0.35);
    } catch (e) {}
  },
  hihat() {
    try {
      if (!AUDIO.ctx) return;
      const c = AUDIO.ctx, t = c.currentTime;
      const len = Math.floor(c.sampleRate * 0.04);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource();
      s.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 7000;
      const g = c.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      s.connect(f); f.connect(g); g.connect(c.destination);
      s.start(t);
    } catch (e) {}
  },
  snare() {
    try {
      if (!AUDIO.ctx) return;
      const c = AUDIO.ctx, t = c.currentTime;
      const len = Math.floor(c.sampleRate * 0.12);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const ns = c.createBufferSource();
      ns.buffer = buf;
      const bf = c.createBiquadFilter();
      bf.type = 'bandpass'; bf.frequency.value = 3000;
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.35, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      ns.connect(bf); bf.connect(ng); ng.connect(c.destination);
      ns.start(t);
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.1);
      const og = c.createGain();
      og.gain.setValueAtTime(0.3, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(og); og.connect(c.destination);
      o.start(t); o.stop(t + 0.15);
    } catch (e) {}
  },
  hoover() {
    try {
      if (!AUDIO.ctx) return;
      const c = AUDIO.ctx, t = c.currentTime;
      const freqs = [110, 138.6, 164.8];
      for (let i = 0; i < 3; i++) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freqs[i], t);
        if (i > 0) o.detune.setValueAtTime(i === 1 ? 8 : -8, t);
        const g = c.createGain();
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g); g.connect(c.destination);
        o.start(t); o.stop(t + 0.25);
      }
    } catch (e) {}
  },
  bass(f) { AUDIO.tone('sawtooth', f, f * 0.84, 0.13, 0.055); },
  stab(f) { AUDIO.tone('square', f, f * 0.62, 0.045, 0.045); },
  tick() {
    if (!this.playing) return;
    if (this._mute && performance.now() < this._mute) {
      this._step = (this._step + 1) % 16;
      return;
    }
    const p = this._pat || this.P[0].split('|');
    if (p[0][this._step] === '1') this.kick();
    if (p[1][this._step] === '1') this.hihat();
    if (p[2][this._step] === '1') this.snare();
    if (p[3][this._step] === '1') this.hoover();
    const bass = this._bass && +this._bass[this._step];
    if (bass) this.bass(42 + bass * 9 + this._stage * 3);
    if (this._stab && this._stab[this._step] === '1') this.stab(340 + this._stage * 42);
    this._step = (this._step + 1) % 16;
  },
  play(stage) {
    this.stop();
    this.init();
    if (stage) this._stage = clamp(stage, 1, 4);
    this.currentBpm = [172, 196, 224, 252][this._stage - 1];
    this._pat = this.P[this._stage - 1].split('|');
    this._bass = this.B[this._stage - 1];
    this._stab = this.X[this._stage - 1];
    this.playing = true;
    this._step = 0;
    const iv = 60000 / this.currentBpm / 4;
    const run = ++this._run;
    this._timer = setInterval(() => { if (run === this._run) this.tick(); }, iv);
  },
  loseLife() {
    this.duck(300);
  },
  duck(ms) { this._mute = performance.now() + ms; },
  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this._step = 0;
    this._pat = this._bass = this._stab = null;
    this._mute = 0;
    this._stage = 1;
    this.playing = false;
    this.currentBpm = this.baseBpm;
    this._run++;
  }
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
function drawPlayer(g, o, shirtColor) {
  g.clear();
  const crouched = o.state === 'crouch';
  const jumping = o.state === 'jump';
  const skin = 0xf3c39a;
  const hair = 0x2c3e50;
  const shirt = shirtColor || 0xf4c95d;
  const shirtB = shirt === 0xf4c95d ? 0xd4a93a : (shirt === 0x3498db ? 0x2980b9 : shirt);
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

  } else if (t === 'businessman') {
    g.fillStyle(0x111111, 1);
    g.fillRect(-16, hh - 10, 12, 10);
    g.fillRect(4, hh - 10, 12, 10);
    g.fillStyle(0x2c3e50, 1);
    g.fillRect(-12, hh * 0.3, 10, hh * 0.45);
    g.fillRect(2, hh * 0.3, 10, hh * 0.45);
    g.fillStyle(0x2c3e50, 1);
    g.fillRoundedRect(-22, -hh * 0.35, 44, hh * 0.7, 5);
    g.fillStyle(0xecf0f1, 1);
    g.fillRect(-8, -hh * 0.35, 16, 10);
    g.fillStyle(0xc0392b, 1);
    g.fillRect(-2, -hh * 0.25, 4, hh * 0.35);
    g.fillTriangle(-4, -hh * 0.25 + hh * 0.35, 4, -hh * 0.25 + hh * 0.35, 0, -hh * 0.25 + hh * 0.35 + 8);
    g.fillStyle(0x5d4e37, 1);
    g.fillRoundedRect(14, -hh * 0.05, 16, 22, 3);
    g.fillRect(18, -hh * 0.15, 8, 6);
    g.fillStyle(0xf3c39a, 1);
    g.fillCircle(0, -hh * 0.55, 12);
    g.fillStyle(0x2c3e50, 1);
    g.fillRoundedRect(-12, -hh * 0.72, 24, 12, 4);
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(-4, -hh * 0.55, 2);
    g.fillCircle(4, -hh * 0.55, 2);

  } else if (t === 'tourist') {
    g.fillStyle(0x8B7355, 1);
    g.fillRect(-14, hh - 10, 12, 10);
    g.fillRect(2, hh - 10, 12, 10);
    g.fillStyle(0x7d6b5d, 1);
    g.fillRect(-10, hh * 0.3, 8, hh * 0.4);
    g.fillRect(2, hh * 0.3, 8, hh * 0.4);
    g.fillStyle(0xe67e22, 1);
    g.fillRoundedRect(-20, -hh * 0.25, 40, hh * 0.6, 5);
    g.fillStyle(0xf39c12, 1);
    for (let px = -16; px < 16; px += 8) {
      g.fillRect(px, -hh * 0.15, 4, 4);
      g.fillRect(px + 4, -hh * 0.05, 4, 4);
    }
    g.fillStyle(0x3498db, 1);
    g.fillRoundedRect(16, hh * 0.0, 14, hh * 0.4, 3);
    g.fillRect(22, hh * 0.3, 3, hh * 0.15);
    g.fillStyle(0xf4c95d, 1);
    g.fillEllipse(0, -hh * 0.78, 32, 10);
    g.fillRoundedRect(-10, -hh * 0.85, 20, 6, 3);
    g.fillStyle(0xf3c39a, 1);
    g.fillCircle(0, -hh * 0.55, 12);
    g.fillStyle(0x333333, 1);
    g.fillRect(-8, -hh * 0.58, 16, 3);
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(-4, -hh * 0.55, 2);
    g.fillCircle(4, -hh * 0.55, 2);

  } else if (t === 'guard') {
    g.fillStyle(0x111111, 1);
    g.fillRect(-16, hh - 10, 12, 10);
    g.fillRect(4, hh - 10, 12, 10);
    g.fillStyle(0x0d0d1a, 1);
    g.fillRect(-12, hh * 0.3, 10, hh * 0.45);
    g.fillRect(2, hh * 0.3, 10, hh * 0.45);
    g.fillStyle(0x1a1a2e, 1);
    g.fillRoundedRect(-22, -hh * 0.35, 44, hh * 0.7, 5);
    g.fillStyle(0xf4c95d, 1);
    g.fillCircle(-14, -hh * 0.2, 4);
    g.fillStyle(0x333333, 1);
    g.fillRoundedRect(-8, -hh * 0.15, 16, 10, 2);
    g.fillStyle(0xf4c95d, 1);
    g.fillRect(-4, -hh * 0.1, 8, 3);
    g.fillStyle(0x555555, 1);
    g.fillRect(18, -hh * 0.3, 4, hh * 0.4);
    g.fillStyle(0xf4c95d, 0.6);
    g.fillCircle(20, -hh * 0.5, 12);
    g.fillStyle(0x444444, 1);
    g.fillRect(16, -hh * 0.45, 8, 6);
    g.fillStyle(0xf3c39a, 1);
    g.fillCircle(0, -hh * 0.55, 12);
    g.fillStyle(0x1a1a2e, 1);
    g.fillRoundedRect(-14, -hh * 0.72, 28, 10, 3);
    g.fillStyle(0x1f1f28, 1);
    g.fillCircle(-4, -hh * 0.55, 2);
    g.fillCircle(4, -hh * 0.55, 2);
  }
}

// ---------------------------------------------------------------------------
// Main scene
// ---------------------------------------------------------------------------
class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    this.stage = 1;
    this.playerMode = 1;
    this.playing = false;
    this.screen = 'title';
    this.timeScale = 0;
    this.elapsed = 0;
    this.score = 0;
    this.p1Lives = 3;
    this.p2Lives = 3;
    this.recoveryTimer = 0;
    this.threatLevel = 0;
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
    this.buildPlayer2();
    this.buildHUD();
    this.syncModeVisibility();
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
      drawPlayer(g, { state: st, stretch: 1 }, 0xf4c95d);
      g.generateTexture('p_' + st, 80, 100);
      g.destroy();
    }
    for (const st of ['stand', 'crouch', 'jump']) {
      const g = this.add.graphics();
      drawPlayer(g, { state: st, stretch: 1 }, 0x3498db);
      g.generateTexture('p2_' + st, 80, 100);
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
    p.id = 1;
    p.lives = 3;
    p.alive = true;
    p.streak = 0;
    p.hitRecovery = 0;
    p.shadow = this.add.ellipse(90, PLAYER_Y + 48, 60, 14, 0x000000, 0.4);
    p.shadow.setDepth(9);
  }

  buildPlayer2() {
    this.player2 = this.physics.add.existing(this.add.sprite(160, PLAYER_Y, 'p2_stand'), false);
    const p = this.player2;
    p.setDepth(10);
    p.state = 'stand';
    p.lane = 2;
    p.vy = 0;
    p.grounded = true;
    p.invuln = 0;
    p.id = 2;
    p.lives = 0;
    p.alive = false;
    p.streak = 0;
    p.hitRecovery = 0;
    p.shadow = this.add.ellipse(160, PLAYER_Y + 48, 60, 14, 0x000000, 0.4);
    p.shadow.setDepth(9);
    p.setVisible(false);
    p.shadow.setVisible(false);
  }

  playerBox(p) {
    if (p.state === 'jump') return { x: p.x, y: p.y - 30, w: 50, h: 70 };
    if (p.state === 'crouch') return { x: p.x, y: p.y - 15, w: 50, h: 40 };
    return { x: p.x, y: p.y - 30, w: 50, h: 70 };
  }

  setPlayerVisible(p, visible) {
    if (!p) return;
    p.setVisible(visible);
    p.shadow.setVisible(visible);
    const label = p.id === 1 ? this.p1Label : this.p2Label;
    if (label) label.setVisible(visible);
  }

  syncModeVisibility() {
    const two = this.playerMode === 2;
    this.setPlayerVisible(this.player, this.player.alive);
    this.setPlayerVisible(this.player2, two && this.player2.alive);
    if (this.p2Hud) for (const el of this.p2Hud) el.setVisible(two);
  }

  alivePlayers() {
    const list = this.player.alive ? [this.player] : [];
    if (this.playerMode === 2 && this.player2.alive) list.push(this.player2);
    return list;
  }

  updateOnePlayer(dt, p, n) {
    if (!p || !p.alive) return;
    const pre = n === 1 ? 'P1_' : 'P2_';
    const right = INPUT.held(pre + 'R');
    const left = INPUT.held(pre + 'L');
    const dx = (right ? 1 : 0) - (left ? 1 : 0);
    const wantJump = INPUT.held(pre + '1');
    const wantCrouch = INPUT.held(pre + '2');
    if (p.hitRecovery > 0) p.hitRecovery -= dt;
    if (INPUT.pressed(pre + 'U') && p.lane > 0) {
      p.lane--; AUDIO.lane();
      this.burst(p.x, p.y + 45, 2, 0x999988);
    }
    if (INPUT.pressed(pre + 'D') && p.lane < LANES.length - 1) {
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
    p.setTexture((n === 1 ? 'p_' : 'p2_') + p.state);
    p.setScale(stretch, stretch);
    p.x = clamp(p.x + dx * 260 * dt, 50, W - 50);
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

  updatePlayer(dt) {
    this.updateOnePlayer(dt, this.player, 1);
  }

  updatePlayer2(dt) {
    if (this.playerMode === 2) this.updateOnePlayer(dt, this.player2, 2);
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
    if (this.obstacles.length >= MAX_OBSTACLES) return;
    const target = this.selectTarget();
    if (!target) return;

    const def = OBS[type];
    const spMul = STAGE_SPEED_MUL[stage - 1] || 1;
    const speed = Math.min(MAX_OBSTACLE_SPEED, (def.sp || 170) * spMul + this.elapsed * 0.006);
    const r = Math.random();
    const pattern = r < 0.48 ? 'direct' : (r < 0.8 ? 'cutoff' : 'late');
    let laneIdx = target.lane;
    if (pattern !== 'direct') {
      const side = Math.random() < 0.5 ? -1 : 1;
      laneIdx = clamp(target.lane + side, 0, LANES.length - 1);
    }
    const oy = LANES[laneIdx];

    const o = {
      type, x: W + 100, y: oy, w: def.w, h: def.h,
      hit: true, sp: speed, seed: Math.floor(Math.random() * 100), lane: laneIdx,
      targetId: target.id, pattern, steered: pattern !== 'late', steerT: 0,
      fromY: oy, toY: oy, near: {}
    };

    this.obstacles.push(o);
    const g = this.add.graphics();
    g.setDepth(5);
    drawObstacle(g, o);
    o.g = g;
    o.bg = null;
  }

  selectTarget() {
    const all = this.alivePlayers();
    if (!all.length) return null;
    const ready = all.filter((p) => p.hitRecovery <= 0);
    const pool = ready.length ? ready : all;
    let leader = pool[0];
    for (const p of pool) if (p.streak > leader.streak) leader = p;
    if (pool.length > 1 && Math.random() > 0.68) return pool[Math.floor(Math.random() * pool.length)];
    return leader;
  }

  steerObstacle(o, dt) {
    if (o.pattern !== 'late' || o.steered || o.x > 430 || o.x < 220) return;
    const target = this.alivePlayers().find((p) => p.id === o.targetId);
    if (!target) return;
    const lo = Math.max(0, o.lane - 1);
    const hi = Math.min(LANES.length - 1, o.lane + 1);
    o.toLane = clamp(target.lane, lo, hi);
    o.fromY = o.y;
    o.toY = LANES[o.toLane];
    o.steerT = 0;
    o.steered = true;
  }

  updateSpawn(dt) {
    if (!this.playing || this.screen !== 'play') return;
    // Breathing room after hit
    if (this.recoveryTimer > 0) {
      this.recoveryTimer -= dt;
      this.spawnT = Math.max(0.5, this.spawnT - dt);
      return;
    }
    // Threat level: gradually tightens spacing, capped at 1.0
    this.threatLevel = Math.min(1.0, this.threatLevel + dt * 0.08);
    const threatMul = 1.0 - this.threatLevel * 0.25;
    const cfg = STAGE_DIFFICULTY[this.stage - 1] || [720, 360];
    const base = cfg[0], min = cfg[1];
    const ramp = this.stage >= 4 ? 18 : this.stage === 3 ? 14 : this.stage === 2 ? 11 : 9;
    const interval = Math.max(min, base - this.elapsed * ramp) * (0.85 + Math.random() * 0.3) * threatMul / 1000;
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = interval;
      this.spawnObstacle();
    }
  }

  updateObs(dt) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      this.steerObstacle(o, dt);
      if (o.steerT < 1) {
        o.steerT = Math.min(1, o.steerT + dt * 1.6);
        o.y = lerp(o.fromY, o.toY, easeOutCubic(o.steerT));
      }
      o.x -= o.sp * dt;
      if (o.x + o.w / 2 < -40) {
        this.obstacles.splice(i, 1);
        o.g.destroy();
        continue;
      }
      o.g.setPosition(o.x, o.y);
      if (this.screen === 'play' && this.playing) {
        for (const p of this.alivePlayers()) {
          this.checkCollision(o, p, this.playerBox(p));
          this.checkNearMiss(o, p);
        }
      }
    }
  }

  checkCollision(o, p, pb) {
    if (!p.alive || p.invuln > 0) return;
    if (Math.abs(o.y - LANES[p.lane]) > 45) return;
    if (overlap(pb, o)) {
      this.hit(p);
    }
  }

  checkNearMiss(o, p) {
    if (!p.alive || o.near[p.id] || o.x + o.w / 2 >= p.x) return;
    o.near[p.id] = true;
    if (Math.abs(o.y - LANES[p.lane]) >= 55) return;
    p.streak++;
    const jc = p.state === 'jump' || p.state === 'crouch';
    if (!jc) return;
    this.score += 25;
    this.scoreTextUpdate();
    AUDIO.near();
    this.burst(p.x, p.y, 6, 0x2ecc71);
  }

  hit(p) {
    if (!p.alive || p.invuln > 0) return;
    const isP2 = (p === this.player2);
    if (isP2) {
      this.p2Lives--;
      p.lives = this.p2Lives;
    } else {
      this.p1Lives--;
      p.lives = this.p1Lives;
    }
    p.streak = 0;
    p.hitRecovery = 1.5;
    this.drawHearts();
    this.recoveryTimer = 1.5;
    this.spawnT = Math.max(this.spawnT, 1.4);
    this.threatLevel = Math.max(0, this.threatLevel - 0.4);
    MUSIC.duck(180);
    MUSIC.loseLife();
    AUDIO.hit();
    this.cameras.main.shake(160, 0.008);
    this.flashRed();
    this.burst(p.x, p.y, 8, 0xff5577);
    if (p.lives <= 0) {
      p.alive = false;
      this.setPlayerVisible(p, false);
    }
    if (!this.alivePlayers().length) {
      this.endGame();
    } else if (p.alive) {
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
      this.parts.push({ g, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.7) });
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
    this.p2Hearts = [];
    for (let i = 0; i < 3; i++) {
      const h = this.add.graphics();
      h.setPosition(20 + i * 40, 22);
      this.hud.add(h);
      this.hearts.push(h);
    }
    for (let i = 0; i < 3; i++) {
      const h = this.add.graphics();
      h.setPosition(160 + i * 40, 22);
      this.hud.add(h);
      this.p2Hearts.push(h);
    }
    // P1/P2 indicators
    const p1Ind = this.add.text(8, 8, 'P1', { fontFamily: 'monospace', fontSize: '11px', color: '#f4c95d', fontStyle: 'bold' });
    this.hud.add(p1Ind);
    const p2Ind = this.add.text(148, 8, 'P2', { fontFamily: 'monospace', fontSize: '11px', color: '#3498db', fontStyle: 'bold' });
    this.hud.add(p2Ind);
    this.label = this.add.text(16, 44, 'PUNTaje'.toUpperCase(), { fontFamily: 'monospace', fontSize: '14px', color: '#aeb6c8' });
    this.hud.add(this.label);
    this.scoreText = this.add.text(16, 60, '0', { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' });
    this.hud.add(this.scoreText);
    this.stageText = this.add.text(W - 16, 22, '', { fontFamily: 'monospace', fontSize: '16px', color: '#f4c95d' }).setOrigin(1, 0);
    this.hud.add(this.stageText);
    this.timerText = this.add.text(W - 16, 44, '', { fontFamily: 'monospace', fontSize: '14px', color: '#aeb6c8' }).setOrigin(1, 0);
    this.hud.add(this.timerText);
    // P1/P2 labels above characters (dynamic, not in hud)
    this.p1Label = this.add.text(90, 495, 'P1', { fontFamily: 'monospace', fontSize: '13px', color: '#f4c95d', fontStyle: 'bold' }).setOrigin(0.5);
    this.p1Label.setDepth(30);
    this.p2Label = this.add.text(160, 495, 'P2', { fontFamily: 'monospace', fontSize: '13px', color: '#3498db', fontStyle: 'bold' }).setOrigin(0.5);
    this.p2Label.setDepth(30);
    this.p2Hud = [p2Ind].concat(this.p2Hearts);
    this.hud.setVisible(false);
  }

  drawHearts() {
    // P1 hearts (gold border)
    for (let i = 0; i < 3; i++) {
      const h = this.hearts[i];
      h.clear();
      h.setPosition(20 + i * 40, 22);
      if (i < this.p1Lives) {
        h.fillStyle(0xe74c3c, 1);
        h.fillRect(-8, -7, 6, 6); h.fillRect(2, -7, 6, 6);
        h.fillRect(-10, -2, 20, 6); h.fillRect(-6, 4, 12, 5);
        h.fillStyle(0xffffff, 0.9);
        h.fillRect(-4, -3, 4, 4);
      } else {
        h.fillStyle(0x55555e, 1);
        h.fillRect(-8, -4, 16, 8); h.fillRect(-5, 4, 10, 4);
      }
    }
    // P2 hearts (blue accent)
    for (let i = 0; i < 3; i++) {
      const h = this.p2Hearts[i];
      h.clear();
      h.setPosition(160 + i * 40, 22);
      if (i < this.p2Lives) {
        h.fillStyle(0x3498db, 1);
        h.fillRect(-8, -7, 6, 6); h.fillRect(2, -7, 6, 6);
        h.fillRect(-10, -2, 20, 6); h.fillRect(-6, 4, 12, 5);
        h.fillStyle(0xffffff, 0.9);
        h.fillRect(-4, -3, 4, 4);
      } else {
        h.fillStyle(0x55555e, 1);
        h.fillRect(-8, -4, 16, 8); h.fillRect(-5, 4, 10, 4);
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
    const t4 = this.add.text(W / 2, 410, 'P1 + P2: JOYSTICK / BOTONES ARCADE', {
      fontFamily: 'monospace', fontSize: '14px', color: '#f4c95d', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(56);
    const t4b = this.add.text(W / 2, 435, 'START1: 1 PLAYER   •   START2: 2 PLAYERS', {
      fontFamily: 'monospace', fontSize: '14px', color: '#3498db', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(56);
    const t5 = this.add.text(W / 2, 480, 'START1 / START2: ELEGIR MODO', {
      fontFamily: 'monospace', fontSize: '15px', color: '#f4c95d', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(56);
    this.titleStuff = [g, t1, t2, t3, t4, t4b, t5];
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
    this.destroyTutorial();
    this.destroyMode();
    this.p1Lives = 3;
    this.p2Lives = this.playerMode === 2 ? 3 : 0;
    this.resetPlayer(this.player, 90, true);
    this.resetPlayer(this.player2, 160, this.playerMode === 2);
    this.recoveryTimer = 0;
    this.threatLevel = 0;
    this.playing = true;
    this.screen = 'count';
    this.countT = 3;
    this.startDelay = 0;
    this.hud.setVisible(true);
    this.drawHearts();
    this.stageText.setText('ETAPA 1');
    this.updateTimer();
    this.countdown();
  }

  resetPlayer(p, x, revive) {
    if (!p) return;
    if (revive) {
      p.alive = true;
      p.lives = 3;
      p.streak = 0;
    }
    if (!p.alive) {
      this.setPlayerVisible(p, false);
      return;
    }
    p.setTexture(p.id === 1 ? 'p_stand' : 'p2_stand');
    p.state = 'stand';
    p.lane = 2;
    p.x = x;
    p.y = LANES[2];
    p.vy = 0;
    p.grounded = true;
    p.invuln = 0;
    p.hitRecovery = 0;
    p.setAlpha(1);
    p.setScale(1, 1);
    this.setPlayerVisible(p, true);
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
    this.resetPlayer(this.player, 90, false);
    this.resetPlayer(this.player2, 160, false);
    this.boardingPlayer = this.alivePlayers()[0];
    if (!this.boardingPlayer) return this.endGame();
    this.boarding = true;
    this.showBanner('SUBIENDO AL BUS', 1500);
  }

  updateBoard(dt) {
    const p = this.boardingPlayer;
    const doorX = this.bus.x + 121;
    if (!this.boarding || !p || !p.alive) return this.endGame();
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
         this.resetPlayer(this.player, 90, false);
         this.resetPlayer(this.player2, 160, false);
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
    this.hintText = this.add.text(W / 2, 470, 'P1_U/D/L/R: MOVER   •   P1_1: SELECCIONAR   •   P1_2: LISTO', {
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
    const t3 = this.add.text(W / 2, 500, 'START1 / START2: VOLVER A JUGAR', {
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
    if (INPUT.pressed('START1') || INPUT.pressed('START2')) {
      if (!this.initAudio) {
        this.initAudio = true;
        AUDIO.init();
      }
      this.enterModeSelect();
    }
  }

  enterModeSelect() {
    this.screen = 'mode';
    this.destroyTitle();
    this.modeStuff = [];
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x05080f, 0.97).setDepth(55);
    this.modeStuff.push(bg);
    const title = this.add.text(W / 2, 110, 'SELECT PLAYER MODE', {
      fontFamily: 'monospace', fontSize: '28px', color: '#f4c95d', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(56);
    this.modeStuff.push(title);
    const one = this.add.text(270, 245, '1 PLAYER', { fontFamily: 'monospace', fontSize: '25px', color: '#f4c95d', fontStyle: 'bold' }).setOrigin(0.5).setDepth(56);
    const two = this.add.text(530, 245, '2 PLAYERS', { fontFamily: 'monospace', fontSize: '25px', color: '#3498db', fontStyle: 'bold' }).setOrigin(0.5).setDepth(56);
    const oneSub = this.add.text(270, 290, 'START1\nP1 solo', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(56);
    const twoSub = this.add.text(530, 290, 'START2\nP1 + P2', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(56);
    this.modeText = this.add.text(W / 2, 180, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(56);
    this.modePrompt = this.add.text(W / 2, 470, 'P1_U / P1_D / P1_L / P1_R: TOGGLE', { fontFamily: 'monospace', fontSize: '13px', color: '#aeb6c8' }).setOrigin(0.5).setDepth(56);
    const confirm = this.add.text(W / 2, 515, 'START1: CONFIRM 1 PLAYER   •   START2: CONFIRM 2 PLAYERS', { fontFamily: 'monospace', fontSize: '13px', color: '#f4c95d', fontStyle: 'bold' }).setOrigin(0.5).setDepth(56);
    this.modeStuff.push(one, two, oneSub, twoSub, this.modeText, this.modePrompt, confirm);
    this.updateModeSelection();
  }

  updateModeSelection() {
    const two = this.playerMode === 2;
    this.modeText.setText('SELECTED: ' + (two ? '2 PLAYERS' : '1 PLAYER'));
  }

  handleModeInput() {
    const nav = INPUT.pressed('P1_U') || INPUT.pressed('P1_D') || INPUT.pressed('P1_L') || INPUT.pressed('P1_R');
    if (nav) {
      this.playerMode = this.playerMode === 1 ? 2 : 1;
      this.updateModeSelection();
    }
    if (INPUT.pressed('START1')) {
      this.playerMode = 1;
      this.syncModeVisibility();
      this.enterTutorial();
    }
    if (INPUT.pressed('START2')) {
      this.playerMode = 2;
      this.syncModeVisibility();
      this.enterTutorial();
    }
  }

  destroyMode() {
    if (this.modeStuff) {
      for (const el of this.modeStuff) el.destroy();
      this.modeStuff = null;
    }
  }

  enterTutorial() {
    this.screen = 'tutorial';
    this.destroyTitle();
    this.destroyMode();
    this.tutStuff = [];
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x05080f, 0.96).setDepth(55);
    this.tutStuff.push(bg);
    this.tutorialText(W / 2, 32, 'CÓMO JUGAR • CONTROLES ARCADE', 25, '#f4c95d', true);
    this.controllerPanel(205, 0xf4c95d, 'JUGADOR 1', 'P1_', 'START1');
    this.controllerPanel(595, 0x3498db, 'JUGADOR 2', 'P2_', 'START2');
    this.tutorialText(W / 2, 500, 'Esquivá personajes • saltá o agachate para near-miss +25 pts', 12, '#8fc9f2');
    this.tutorialText(W / 2, 524, 'Vidas independientes • en 2P la partida termina cuando ambos caen', 11, '#aeb6c8');
    const start = this.add.text(W / 2, 565, 'START1 / START2: ¡A CORRER!', { fontFamily: 'monospace', fontSize: '16px', color: '#f4c95d', fontStyle: 'bold' }).setOrigin(0.5).setDepth(56);
    this.tutStuff.push(start);
    this.tweens.add({ targets: start, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
  }

  tutorialText(x, y, text, size, color, bold) {
    const t = this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: size + 'px', color, fontStyle: bold ? 'bold' : 'normal' }).setOrigin(0.5).setDepth(56);
    this.tutStuff.push(t);
    return t;
  }

  controllerPanel(x, color, title, prefix, start) {
    this.tutorialText(x, 80, title, 16, '#' + color.toString(16).padStart(6, '0'), true);
    this.tutorialText(x, 112, 'JOYSTICK', 11, '#aeb6c8', true);
    this.tutorialText(x, 140, prefix + 'U  ↑    ' + prefix + 'D  ↓', 14, '#ffffff', true);
    this.tutorialText(x, 164, prefix + 'L  ←    ' + prefix + 'R  →', 14, '#ffffff', true);
    this.tutorialText(x, 201, 'ACTION BUTTONS', 11, '#aeb6c8', true);
    this.tutorialText(x, 230, prefix + '1  JUMP     ' + prefix + '2  DUCK', 12, '#ffffff', true);
    this.tutorialText(x, 258, prefix + '3  EXTRA    ' + prefix + '4  EXTRA', 12, '#c5ccd8');
    this.tutorialText(x, 286, prefix + '5  EXTRA    ' + prefix + '6  EXTRA', 12, '#c5ccd8');
    this.tutorialText(x, 334, start, 14, '#' + color.toString(16).padStart(6, '0'), true);
    this.tutorialText(x, 360, start === 'START1' ? 'CONFIRM 1 PLAYER / START' : 'CONFIRM 2 PLAYERS / START', 10, '#aeb6c8');
  }

  handleTutorialInput() {
    if (INPUT.pressed('START1') || INPUT.pressed('START2')) {
      MUSIC.play(this.stage);
      this.startGame();
    }
  }

  destroyTutorial() {
    if (this.tutStuff) {
      for (const el of this.tutStuff) el.destroy();
      this.tutStuff = null;
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
    if (this.screen === 'mode') {
      this.handleModeInput();
      INPUT.consume();
      return;
    }
    if (this.screen === 'tutorial') {
      this.handleTutorialInput();
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
        this.updatePlayer2(dt);
        if (this.player.alive) this.p1Label.setPosition(this.player.x, this.player.y + 55);
        if (this.playerMode === 2 && this.player2.alive) this.p2Label.setPosition(this.player2.x, this.player2.y + 55);
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
    this.updateOnePlayer(0.016, this.player, 1);
    if (this.playerMode === 2) this.updateOnePlayer(0.016, this.player2, 2);
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
