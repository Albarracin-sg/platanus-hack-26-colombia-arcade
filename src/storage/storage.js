// PORTAL 11:59 — module: STORAGE (split from game.js, do not edit by hand; edit this file and run `node scripts/build.js`)

// ---------------------------------------------------------------------------
// STORAGE — window.platanusArcadeStorage bridge with localStorage fallback.
// Top-5 leaderboard keyed by CONSTANTS.STORAGE_KEY (R-7).
// ---------------------------------------------------------------------------
const STORAGE = (() => {
  function bridge() {
    try {
      if (typeof window !== 'undefined' && window.platanusArcadeStorage) {
        return window.platanusArcadeStorage;
      }
    } catch (_) { /* sandbox may not have window */ }
    return {
      async get(key) {
        try {
          const raw = window.localStorage.getItem(key);
          return raw === null
            ? { found: false, value: null }
            : { found: true, value: JSON.parse(raw) };
        } catch (_) { return { found: false, value: null }; }
      },
      async set(key, value) {
        try {
          const serialized = JSON.stringify(value);
          // size guard (~64 KiB per entry, R-7.β).
          if (serialized.length >= 65536) return;
          window.localStorage.setItem(key, serialized);
        } catch (_) { /* quota exceeded — ignore */ }
      },
      async remove(key) {
        try { window.localStorage.removeItem(key); } catch (_) {}
      },
    };
  }

  function isHighScoreEntry(e) {
    if (!e || typeof e !== 'object') return false;
    if (typeof e.initials !== 'string' || !/^[A-Z]{3}$/.test(e.initials)) return false;
    if (typeof e.score !== 'number' || !Number.isFinite(e.score) || e.score < 0) return false;
    if (typeof e.season !== 'string' || e.season.length === 0) return false;
    if (typeof e.ts !== 'string' || e.ts.length === 0) return false;
    return true;
  }

  async function leaderboardRead(scene) {
    scene.storage = scene.storage || {};
    if (scene.storage._cache) return scene.storage._cache;
    const b = bridge();
    let entries = [];
    try {
      const res = await b.get(CONSTANTS.STORAGE_KEY);
      if (res && res.found && Array.isArray(res.value)) {
        for (const e of res.value) if (isHighScoreEntry(e)) entries.push(e);
      }
    } catch (_) { /* treat as empty */ }
    // Sort by score desc; ties broken by season alphabetically (deterministic), not ts (R-7.δ).
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.season.localeCompare(b.season);
    });
    entries = entries.slice(0, 5);
    scene.storage._cache = entries;
    return entries;
  }

  function leaderboardQualifies(entries, score) {
    if (!Array.isArray(entries) || entries.length < 5) return score > 0;
    return score > entries[entries.length - 1].score;
  }

  async function leaderboardWrite(scene, entry) {
    if (!isHighScoreEntry(entry)) return;
    const entries = await leaderboardRead(scene);
    entries.push(entry);
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.season.localeCompare(b.season);
    });
    const trimmed = entries.slice(0, 5);
    scene.storage._cache = trimmed;
    try {
      const b = bridge();
      await b.set(CONSTANTS.STORAGE_KEY, trimmed);
    } catch (_) { /* bridge failure — cache only */ }
  }

  function clearCache(scene) {
    if (scene && scene.storage) scene.storage._cache = null;
  }

  return { bridge, isHighScoreEntry, leaderboardRead, leaderboardWrite, leaderboardQualifies, clearCache };
})();
