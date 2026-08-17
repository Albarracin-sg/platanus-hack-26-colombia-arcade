// PORTAL 11:59 — module: AUDIO (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// AUDIO — one ambient engine + 5 SFX, all Web-Audio primitives (R-8.β).
// Wrapped in try/catch; gated on START1 user gesture (R-6.β).
// ---------------------------------------------------------------------------
let AUDIO_CONTEXT = null;
function getAudioContext(scene) {
  if (AUDIO_CONTEXT) return AUDIO_CONTEXT;
  try {
    const Ctor = (scene && (scene.sound && scene.sound.context))
      || (window.AudioContext || window.webkitAudioContext);
    AUDIO_CONTEXT = new Ctor();
    return AUDIO_CONTEXT;
  } catch (_) { return null; }
}

const AUDIO = (() => {
  function _noiseBuffer(ctx) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.0, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.7;
    return buf;
  }

  function startAmbient(scene) {
    if (scene._ambientStarted) return;
    const ctx = getAudioContext(scene);
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const noise = ctx.createBufferSource();
      noise.buffer = _noiseBuffer(ctx);
      noise.loop = true;
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1800;
      bandpass.Q.value = 1.2;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.3;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 60;
      lfo.connect(lfoGain).connect(bandpass.frequency);
      const gain = ctx.createGain();
      gain.gain.value = 0.0;
      noise.connect(bandpass).connect(gain).connect(ctx.destination);
      noise.start();
      lfo.start();
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.4);
      scene.audio = { ctx, noise, bandpass, lfo, lfoGain, gain };
      scene._ambientStarted = true;
    } catch (_) { /* silent fail — R-8.β spirit */ }
  }

  function setPhase(scene, era) {
    if (!scene.audio || !scene.audio.bandpass) return;
    const cfg = CONSTANTS.ERA_CONFIG[Math.max(0, Math.min(3, (era || 1) - 1))];
    try {
      const t = scene.audio.ctx.currentTime;
      scene.audio.bandpass.frequency.cancelScheduledValues(t);
      scene.audio.bandpass.frequency.linearRampToValueAtTime(cfg.audioCutoff, t + 0.3);
    } catch (_) {}
  }

  function stop(scene) {
    if (!scene.audio) return;
    try {
      scene.audio.gain.gain.cancelScheduledValues(scene.audio.ctx.currentTime);
      scene.audio.gain.gain.linearRampToValueAtTime(0.0, scene.audio.ctx.currentTime + 0.2);
      scene.audio.noise.stop(scene.audio.ctx.currentTime + 0.3);
      scene._ambientStarted = false;
    } catch (_) {}
  }

  function _envOsc(ctx, type, fromFreq, toFreq, durMs, attack, gainPeak) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), ctx.currentTime + durMs / 1000);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + attack / 1000);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durMs / 1000 + 0.05);
  }

  function playSfx(scene, type) {
    const ctx = getAudioContext(scene);
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      switch (type) {
        case 'dash':
          _envOsc(ctx, 'sawtooth', 100, 400, 80, 10, 0.18);
          break;
        case 'jump':
          _envOsc(ctx, 'triangle', 200, 600, 100, 10, 0.16);
          break;
        case 'hit':
          _envOsc(ctx, 'square', 80, 60, 150, 5, 0.20);
          break;
        case 'pickup':
          _envOsc(ctx, 'sine', 800, 1200, 120, 8, 0.18);
          break;
        case 'bus_arrive': {
          [200, 400, 600].forEach((f, i) => {
            setTimeout(() => _envOsc(ctx, 'sine', f, f * 0.98, 800, 30, 0.12), i * 60);
          });
          break;
        }
        case 'phase_change':
          _envOsc(ctx, 'triangle', 240, 360, 500, 20, 0.14);
          break;
      }
    } catch (_) {}
  }

  return { startAmbient, setPhase, playSfx, stop };
})();
