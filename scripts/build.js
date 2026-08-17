// PORTAL 11:59 — build script
// Concatenates src/** modules in dependency order into a single plain-script game.js.
// No bundling, no minification, no ES-module syntax — the game must remain one script.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MODULES = [
  'src/config/constants.js',
  'src/input/input.js',
  'src/storage/storage.js',
  'src/state/state.js',
  'src/world/world.js',
  'src/entity/entity.js',
  'src/effects/effects.js',
  'src/audio/audio.js',
  'src/phase/phase.js',
  'src/hud/hud.js',
  'src/screens/screens.js',
  'src/boot/boot.js',
];

const parts = [];
for (const rel of MODULES) {
  const file = resolve(root, rel);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n').length;
  const bytes = Buffer.byteLength(src, 'utf8');
  console.log(`  ${rel}  (${lines} lines, ${bytes} bytes)`);
  parts.push(src);
}

const output = parts.join('\n');
const outBytes = Buffer.byteLength(output, 'utf8');
writeFileSync(resolve(root, 'game.js'), output, 'utf8');
console.log(`\ngame.js written: ${outBytes} bytes`);
