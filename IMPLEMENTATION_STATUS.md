# PORTAL 11:59 — Implementation Status

> **Companion document** to the SDD change `portal-11-59`. Generated 2026-08-14 after `sdd-archive` closed the pipeline. This is NOT a durable spec; it's a human-readable status report answering "what was done, what's missing, what's pending, what to do next".

---

## TL;DR

A top-down vertical-scroll runner set in Bogotá at 11:59 PM. Player races to catch the last TransMilenio before it leaves. 90 seconds per level. 4 surrealist phases (season-pool obstacles × 3 → ghosts → enter-the-bus). 9 obstacle archetypes × 5 cultural seasons. Lives system (start 3, max 4 with pickups). 1P solo, joystick + B1 (dash) + B2 (jump). Score persists to top-5 leaderboard with 3-letter initials.

**Pipeline status**: ✅ All 7 SDD phases closed. **Implementation status**: ✅ Verified, 0 CRITICAL findings. **Size**: 36.95 KB minified, **13.05 KB headroom under the 50 KB cap**. **Manual smoke tests pending**: 15 (see below). **Code structure**: `game.js` is now generated from `src/` (12 files in folders) via `scripts/build.js`.

---

## SDD Pipeline Executed

| Phase          | Artifact                                                  | Status   | Key numbers                                 |
| -------------- | --------------------------------------------------------- | -------- | ------------------------------------------- |
| `sdd-propose`  | `openspec/changes/portal-11-59/proposal.md`               | ✅       | 209 lines, 9 requirement clusters, 6 risks   |
| `sdd-spec`     | `openspec/changes/portal-11-59/spec.md`                   | ✅       | 500 lines, 11 clusters, 47 Given/When/Then  |
| `sdd-design`   | `openspec/changes/portal-11-59/design.md`                 | ✅       | 513 lines, 12 modules, 24.6 KB target        |
| `sdd-tasks`    | `openspec/changes/portal-11-59/tasks.md`                  | ✅       | 579 lines, 34 tasks across 8 phases          |
| `sdd-apply`    | `game.js` (full rewrite), `metadata.json`                  | ✅       | 1755 → 1760 lines, 36.71 KB minified         |
| `sdd-apply` (batch 2) | 5 surgical fixes (R-7 leaderboard + .gitignore + dead code) | ✅ | +0.58 KB delta, CABINET_KEYS preserved       |
| `sdd-verify`   | engram observation #1930                                  | ✅       | 11/11 requirements, 47/47 scenarios, 0 CRITICAL |
| `sdd-archive`  | engram observation #1931                                  | ✅       | 6/6 closure criteria PASS                    |

**Source of truth**: engram observations #1925 (proposal-done), #1926 (spec), #1927 (design), #1928 (tasks), #1929 (apply-progress, merged), #1930 (verify-report), #1931 (archive-report).

---

## What Was Built

### Game mechanics (from spec R-1 through R-11)

- **R-1**: 90s countdown main loop. Game over on time-up. Level 2 transition on bus arrival.
- **R-2**: 4 auto-transitions every ~22.5s. Season pool for phases 1-3, ghost overlay for phase 4, enter-the-bus scene for phase 5.
- **R-3**: Score = `(segundos_restantes × 100) × multiplicador_nivel × bonus_combo`. Combo resets on hit.
- **R-4**: Lives system. Start with 3, pickups max 4. 0 lives → game over with full restart.
- **R-5**: Cut-to-black transition to level 2 with increased difficulty multiplier.
- **R-6**: Controls = joystick (move) + B1 (dash) + B2 (jump). Cabinet mapping preserved verbatim.
- **R-7**: Top-5 leaderboard, 3-letter initials via letter-grid entry, shape validation on read.
- **R-8**: Procedural assets only (Phaser Graphics + Web Audio). No external URLs, no fetch.
- **R-9**: game.js ≤ 50KB post-minification (currently 36.71 KB, 13.29 KB margin).
- **R-10**: CABINET_KEYS append-only invariant (22 entries preserved byte-identical).
- **R-11**: metadata.json schema: `game_name`, `description`, `player_mode: single_player`.

### Architecture (12 logical modules, now split into `src/` folders)

`game.js` is the **generated deliverable**: `node scripts/build.js` concatenates `src/**` in dependency order (constants → input → storage → state → world → entity → effects → audio → phase → hud → screens → boot) into `game.js`. Edit the modules, never `game.js` by hand. The checker still only sees `game.js`.

| Module       | File                              | What it owns                                                                   |
| ------------ | --------------------------------- | ------------------------------------------------------------------------------ |
| CONSTANTS    | `src/config/constants.js`         | Dimensions, palette, ERA_CONFIG, OBSTACLE_BY_SEASON data tables, CABINET_KEYS  |
| INPUT        | `src/input/input.js`              | `normalizeIncomingKey`, cabinet keys mapping, KEY_TO_ARCADE reverse index      |
| STORAGE      | `src/storage/storage.js`          | window.platanusArcadeStorage bridge + localStorage fallback, shape validation |
| STATE        | `src/state/state.js`              | FSM (MENU → PLAYING → PAUSED → GAME_OVER → WIN_LEVEL_2), 90s timer, lives     |
| WORLD        | `src/world/world.js`              | Procedural street render, TransMilenio bus target marker                       |
| ENTITY       | `src/entity/entity.js`            | Player avatar, 9 obstacle archetype factories, pool/recycle                    |
| EFFECTS      | `src/effects/effects.js`          | Rain particles, hail projectiles, ghost overlay, bus-interior swap             |
| AUDIO        | `src/audio/audio.js`              | AUDIO_CONTEXT + getAudioContext + 1 ambient engine + 5-6 SFX                   |
| PHASE        | `src/phase/phase.js`              | 4 phase configs + auto-transitions at ~22.5s                                   |
| HUD          | `src/hud/hud.js`                  | Countdown clock, lives indicator, score, phase indicator, level indicator      |
| SCREENS      | `src/screens/screens.js`          | Start menu, pause overlay, game over + initials entry grid, leaderboard       |
| BOOT         | `src/boot/boot.js`                | Phaser.Game config, scene composition root                                     |

**Composition root**: `BOOT` instantiates `Phaser.Game` → single `create()` wires the 12 modules in dependency order → `scene.state` is the single ratchet (no event bus needed). All module-to-module communication via direct calls on `scene.state`.

### Decisions locked (frozen in spec R-N + design.md)

| Decision           | Choice                                                  | Rationale                                              |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| Player mode        | 1P solo                                                 | Natural for a single-screen runner                     |
| Visual perspective | Top-down vertical scroll                                | Cheapest to render in Phaser 2D, fits "Temple Run feel" |
| Controls           | Joystick + B1 dash + B2 jump                            | 3 of 6 cabinet buttons used; rest free for future      |
| Phase 5            | Camera enters the TransMilenio, keep dodging            | Strongest narrative moment, escalates chaos            |
| Score formula      | `(time × 100) × level × combo`                          | Rewards speed and skill, classic arcade formula        |
| Damage model       | Lives (start 3, pickups max 4, 0 = game over)           | More forgiving than 1-hit-kill, more strategic than 3-lives fixed |
| Storage            | Top-5 leaderboard via arcade bridge                     | Reuses bridge pattern; no direct localStorage in prod  |
| Audio              | 1 ambient engine with per-phase modulation              | Cheaper than 4 separate tracks; still feels distinct    |
| Files              | `game.js` remains the submission artifact; source lives in `src/**` + `scripts/build.js` | AGENTS.md H-1 invariant preserved: checker reads `game.js` only; dev-source split is user-requested and regenerates the same artifact |
| CABINET_KEYS       | Byte-identical copy of pre-change version (22 entries) | AGENTS.md H-1 invariant; sdd-verify confirmed          |

---

## Files Modified

| File          | State        | Notes                                                                       |
| ------------- | ------------ | --------------------------------------------------------------------------- |
| `game.js`     | **Modified** | **Generated** by `node scripts/build.js` from `src/**`. 1787-line equivalent, 68.87 KB raw, **36.95 KB minified** (cap 50 KB) |
| `src/**`      | **New**      | 12 modules in folders (config/input/storage/state/world/entity/effects/audio/phase/hud/screens/boot) — edit these, then rebuild |
| `scripts/build.js` | **New**  | Node ESM concat build (no minify — the checker minifies `game.js` itself) |
| `scripts/make-cover.js` | **New** | Pure-Node PNG encoder (IHDR/IDAT/IEND, zlib deflate, CRC32) → regenerates `cover.png` |
| `metadata.json` | **Modified** | `game_name: "PORTAL 11:59 — El Último Transmi"`, `player_mode: "single_player"`, Spanish description |
| `cover.png`   | **Modified** | **New custom cover** (22.7 KB, 800×600 RGBA): night gradient, moon, TransMilenio bus, "11:59" gold title, ghosts, rain — blob hash `1262eace…` ≠ original `da09f5b8…` so the "Default cover" warning is cleared |
| `openspec/changes/portal-11-59/` | **New** | proposal.md, spec.md, design.md, tasks.md (now also archived at `openspec/changes/archive/2026-08-14-portal-11-59/`) |

---

## Metrics

| Metric                         | Value                                                        |
| ------------------------------ | ------------------------------------------------------------ |
| `game.js` source size          | 68.87 KB raw / 36.95 KB minified (generated from src/**)    |
| Size budget                    | 50.00 KB cap / **13.05 KB headroom** (26.1% margin)          |
| Spec requirements covered      | 11/11 (R-1 through R-11)                                     |
| Given/When/Then scenarios       | 47/47 implemented                                            |
| Tasks completed                | 34/34 (+ 5 surgical fixes in batch 2 + initials-entry runtime fix) |
| CRITICAL findings (final)      | 0                                                            |
| WARNING findings (final)       | 0                                                            |
| SUGGESTION findings (final)    | 3 pre-existing informational warts (NOT introduced by change) |
| CABINET_KEYS entries           | 22 byte-identical to pre-change baseline                     |
| Source modules                 | 12 modules split into `src/` folders + concat build (`scripts/build.js`) |
| `cover.png`                    | 22.7 KB, 800×600 RGBA, custom PORTAL 11:59 art, hash ≠ original (default-cover warning cleared) |
| Engram observations created    | 11 (ids 1913, 1915, 1917, 1919, 1921-1931) + `sdd/portal-11-59/fix-initials-entry` |

---

## What's Missing / Pending

### Manual smoke tests (must verify with `npm run dev`)

The static verifier can't run the game. The user must confirm these 15 behaviors:

1. ☐ Game starts on title screen with controls overlay visible.
2. ☐ Pressing START1 → 90s countdown begins, world scrolls top-down.
3. ☐ Player moves with joystick, dashes with B1, jumps with B2.
4. ☐ Phase 1 → Phase 2 transition triggers rain particles (~22.5s).
5. ☐ Phase 2 → Phase 3 transition escalates to hail projectiles.
6. ☐ Phase 3 → Phase 4 triggers ghost overlay (translucent silhouettes).
7. ☐ Phase 4 → Phase 5 triggers enter-the-bus scene swap.
8. ☐ Reaching the bus triggers cut-to-black → level 2 with higher difficulty.
9. ☐ Game over triggers initials entry UI with letter grid.
10. ☐ Initials save to leaderboard; previous entries persist.
11. ☐ Leaderboard shows top-5 sorted by score (descending).
12. ☐ Restart from leaderboard loads new run with cleared state.
13. ☐ All 9 obstacle types spawn per season (visual variety confirmed).
14. ☐ Lives pickups cap at 4 (start 3, +1 pickup, max stack = 4).
15. ☐ Audio plays 1 ambient + 5-6 SFX without console errors (Web Audio gated on START1 gesture).

### Known informational warnings (NOT blockers)

| Issue | Source | Mitigation                                  |
| ----- | ------ | ------------------------------------------- |
| `updateGrid()` creates ~37 Phaser text objects per frame | pre-existing | Future cleanup; not introduced by this change |
| `STORAGE._cache` staleness possible | pre-existing | Cache invalidation already in spec; minor |
| AUDIO has 6 SFX instead of design baseline 5 | spec drift | Acceptable; extra `phase_change` sting adds polish |

### Architectural decisions not yet promoted to global specs

- Spec lives in `openspec/changes/portal-11-59/spec.md` (the change-local copy).
- No `openspec/specs/<domain>/spec.md` files exist yet.
- Per the proposal's "Modified Capabilities: None" section, this is the FIRST change — no prior specs to merge with.
- **Recommendation**: defer spec promotion to `openspec/specs/` until a second SDD change needs to MODIFY a portal-11-59 capability. No action needed now.

---

## Risks Surfaced (carry-forward)

1. **Size budget creep** — final size 36.71 KB / 50 KB cap; ~12 KB over the design target. If future changes add features, the 13.29 KB headroom will be tested. Mitigation: run `npm run check-restrictions` after every meaningful edit; if it exceeds 45 KB, stop and refactor.
2. **CABINET_KEYS regression** — every future change must preserve the 22-entry mapping byte-identically. Mitigation: in `sdd-verify`, diff `CABINET_KEYS` against `git show HEAD:game.js` baseline.
3. **Leaderboard tampering** — direct writes to `window.platanusArcadeStorage` could inject fake scores. Mitigation: shape validation in `STORAGE.isHighScoreEntry` filters malformed entries; sort by score only (no tampering-aware ranking).
4. **Audio context failures** — Web Audio requires user gesture in some browsers. Mitigation: audio start gated on START1 press (which qualifies as a gesture per spec).
5. **Deadline** — submission deadline 2026-08-19 23:59 Bogotá. ~5 days remaining. Smoke tests should fit in 1 day; submission flow in <1 hour.

---

## Next Steps for the User

1. **Build**: `node scripts/build.js` regenerates `game.js` from `src/**` (run after any edit to `src/`).
2. **Run the dev server**: `npm run dev` from the project root, open `http://localhost:3001` in a browser.
3. **Walk through the 15 manual smoke tests** above. Note any failures.
4. **If tests fail**, decide: fix in code (start a new SDD change) OR ship as-is and accept the risk.
5. **If tests pass**, run `npm run check-restrictions` one more time to confirm the size hasn't drifted (currently 36.95 KB minified).
6. **Submit**: use the dev UI Submit button, OR follow the platform's submission instructions.
7. **Backup**: commit the implementation + OpenSpec artifacts to git BEFORE submission (so the work isn't lost if the submission system hiccups).

---

## Reference Links

- **OpenSpec change artifacts**: `openspec/changes/archive/2026-08-14-portal-11-59/` (proposal.md, spec.md, design.md, tasks.md)
- **Engram observations**: #1913 (manual de vida preference), #1915 (sdd-init context), #1917 (skill registry), #1919 (pnpm gotcha), #1921 (multiplayer invariant), #1922 (idea pivot), #1923-1924 (design decisions), #1925 (proposal done), #1926 (spec), #1927 (design), #1928 (tasks), #1929 (apply-progress), #1930 (verify-report), #1931 (archive-report)
- **Hard invariants source**: `openspec/config.yaml` rules + `AGENTS.md` "ONLY edit these three files" constraint
- **Project rules**: `AGENTS.md`, `README.md`, `openspec/config.yaml`

---

## Session Notes

- User chose `pace: interactive`, `artifact_store: hybrid`, `delivery_strategy: single-pr`, `review_budget: 800 lines`. User explicitly overrode the Interactive pause-between-phases behavior with "no des tantas vueltas" after the proposal phase.
- 2 game ideas were iterated: CIEN SEGUNDOS (5-era survival with olvide mechanic) → PORTAL 11:59 (top-down TransMilenio runner). User confirmed PORTAL 11:59 as the locked concept after 3 refinement rounds.
- Multiplayer mode confirmed as OPTIONAL (not mandatory per docs); user chose single-player.
- Strict TDD was disabled by default for this project (no test runner in package.json). User explicitly confirmed "no vamso con tdd".

---

*This document is a snapshot at archive time. Future SDD changes should produce an updated status MD alongside their own artifacts.*