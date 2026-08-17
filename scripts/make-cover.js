// PORTAL 11:59 — cover generator
// Pure-Node PNG encoder (zlib + manual chunks + CRC32). No canvas, no image libs.
// Paints the night-Bogotá scene pixel-by-pixel into an RGBA buffer:
// gradient sky, stars, moon, skyline, red TransMilenio bus, rain, ghosts, 11:59.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 800;
const H = 600;
const img = new Uint8Array(W * H * 4);

// ---------------------------------------------------------------- helpers
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blendPx(x, y, r, g, b, a) {
  const i = (y * W + x) * 4;
  const ia = img[i + 3] / 255;
  const outA = a + ia * (1 - a);
  if (outA <= 0) return;
  const k = 1 - a;
  img[i] = Math.round((r * a + img[i] * ia * k) / outA);
  img[i + 1] = Math.round((g * a + img[i + 1] * ia * k) / outA);
  img[i + 2] = Math.round((b * a + img[i + 2] * ia * k) / outA);
  img[i + 3] = Math.round(outA * 255);
}

function fillRect(x, y, w, h, r, g, b, a = 1) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W - 1, Math.round(x + w) - 1);
  const y1 = Math.min(H - 1, Math.round(y + h) - 1);
  for (let yy = y0; yy <= y1; yy++) {
    for (let xx = x0; xx <= x1; xx++) {
      blendPx(xx, yy, r, g, b, a);
    }
  }
}

function fillCircle(xc, yc, rad, r, g, b, a = 1) {
  const x0 = Math.max(0, Math.floor(xc - rad));
  const y0 = Math.max(0, Math.floor(yc - rad));
  const x1 = Math.min(W - 1, Math.ceil(xc + rad));
  const y1 = Math.min(H - 1, Math.ceil(yc + rad));
  const r2 = rad * rad;
  for (let yy = y0; yy <= y1; yy++) {
    for (let xx = x0; xx <= x1; xx++) {
      const dx = xx - xc, dy = yy - yc;
      if (dx * dx + dy * dy <= r2) blendPx(xx, yy, r, g, b, a);
    }
  }
}

function fillRoundedRect(x, y, w, h, rad, r, g, b, a = 1) {
  fillRect(x + rad, y, w - rad * 2, h, r, g, b, a);
  fillRect(x, y + rad, w, h - rad * 2, r, g, b, a);
  fillCircle(x + rad, y + rad, rad, r, g, b, a);
  fillCircle(x + w - rad - 1, y + rad, rad, r, g, b, a);
  fillCircle(x + rad, y + h - rad - 1, rad, r, g, b, a);
  fillCircle(x + w - rad - 1, y + h - rad - 1, rad, r, g, b, a);
}

// 3x5 pixel font (digits, colon, A-Z, space).
const FONT = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '001', '010', '010'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
  ':': ['000', '010', '000', '010', '000'], ' ': ['000', '000', '000', '000', '000'],
  'A': ['111', '101', '111', '101', '101'], 'B': ['110', '101', '110', '101', '110'],
  'C': ['111', '100', '100', '100', '111'], 'D': ['110', '101', '101', '101', '110'],
  'E': ['111', '100', '111', '100', '111'], 'F': ['111', '100', '111', '100', '100'],
  'G': ['111', '100', '101', '101', '111'], 'H': ['101', '101', '111', '101', '101'],
  'I': ['111', '010', '010', '010', '111'], 'J': ['001', '001', '001', '101', '111'],
  'K': ['101', '101', '110', '101', '101'], 'L': ['100', '100', '100', '100', '111'],
  'M': ['101', '111', '111', '101', '101'], 'N': ['111', '101', '101', '101', '101'],
  'O': ['111', '101', '101', '101', '111'], 'P': ['111', '101', '111', '100', '100'],
  'Q': ['111', '101', '101', '110', '110'], 'R': ['110', '101', '110', '101', '101'],
  'S': ['111', '100', '111', '001', '111'], 'T': ['111', '010', '010', '010', '010'],
  'U': ['101', '101', '101', '101', '111'], 'V': ['101', '101', '101', '101', '010'],
  'W': ['101', '101', '111', '111', '101'], 'X': ['101', '101', '010', '101', '101'],
  'Y': ['101', '101', '010', '010', '010'], 'Z': ['111', '001', '010', '100', '111'],
};

function textW(str, scale, gap) {
  return str.length * (3 * scale) + (str.length - 1) * gap;
}

function drawText(str, x, y, scale, color, gap) {
  const [r, g, b] = color;
  const gx = gap === undefined ? scale : gap;
  for (let i = 0; i < str.length; i++) {
    const glyph = FONT[str[i]] || FONT[' '];
    const ox = x + i * (3 * scale + gx);
    for (let ry = 0; ry < 5; ry++) {
      for (let cx = 0; cx < 3; cx++) {
        if (glyph[ry][cx] === '1') fillRect(ox + cx * scale, y + ry * scale, scale, scale, r, g, b);
      }
    }
  }
}

function drawTextWithOutline(str, cx, y, scale, color, outline) {
  const w = textW(str, scale, scale);
  const x = Math.round(cx - w / 2);
  drawText(str, x + 3, y, scale, outline);
  drawText(str, x - 3, y, scale, outline);
  drawText(str, x, y + 3, scale, outline);
  drawText(str, x, y - 3, scale, outline);
  drawText(str, x, y, scale, color);
}

// ---------------------------------------------------------------- scene
const rand = mulberry32(1159);
const SKY_TOP = [10, 14, 34];      // #0a0e22
const SKY_HORIZON = [58, 32, 80];  // #3a2050

for (let y = 0; y < 330; y++) {
  const t = y / 329;
  const r = Math.round(SKY_TOP[0] + (SKY_HORIZON[0] - SKY_TOP[0]) * t);
  const g = Math.round(SKY_TOP[1] + (SKY_HORIZON[1] - SKY_TOP[1]) * t);
  const b = Math.round(SKY_TOP[2] + (SKY_HORIZON[2] - SKY_TOP[2]) * t);
  fillRect(0, y, W, 1, r, g, b);
}
fillRect(0, 330, W, 30, 18, 12, 34); // haze band above the skyline

// Moon with soft glow.
const moonX = 618, moonY = 92, moonR = 40;
fillCircle(moonX, moonY, 92, 201, 214, 255, 0.05);
fillCircle(moonX, moonY, 72, 201, 214, 255, 0.08);
fillCircle(moonX, moonY, 54, 214, 224, 255, 0.12);
fillCircle(moonX, moonY, moonR, 230, 236, 250, 1);
fillCircle(moonX - 12, moonY - 10, 6, 185, 196, 221, 0.5);
fillCircle(moonX + 10, moonY + 8, 8, 185, 196, 221, 0.4);
fillCircle(moonX + 2, moonY + 20, 4, 185, 196, 221, 0.4);

// Stars.
for (let i = 0; i < 140; i++) {
  const x = Math.floor(rand() * W);
  const y = 8 + Math.floor(rand() * 290);
  const dx = x - moonX, dy = y - moonY;
  if (dx * dx + dy * dy < 95 * 95) continue;
  const br = 0.35 + rand() * 0.65;
  const w = rand() < 0.12 ? 2 : 1;
  const tint = rand();
  const cr = tint < 0.7 ? 230 : tint < 0.85 ? 200 : 160;
  fillRect(x, y, w, w, cr, 214, 255, br);
}

// City skyline.
let cx = -5;
while (cx < W + 5) {
  const bw = 55 + Math.floor(rand() * 62);
  const bh = 62 + Math.floor(rand() * 116);
  const top = 332 - bh;
  fillRect(cx, top, bw, 332 - top, 11, 7, 18, 1);
  if (bh > 150) fillRect(cx + bw / 2 - 1, top - 12, 2, 12, 11, 7, 18); // antenna
  if (bh > 170) fillCircle(cx + bw / 2, top - 13, 2, 244, 201, 93, 0.9); // beacon
  // lit windows
  for (let wy = top + 8; wy < 318; wy += 16) {
    for (let wx = cx + 6; wx < cx + bw - 8; wx += 14) {
      if (rand() < 0.22) fillRect(wx, wy, 3, 4, 244, 201, 93, 0.75);
    }
  }
  cx += bw + 6;
}

// Road.
fillRect(0, 505, W, 95, 20, 20, 22, 1);
fillRect(0, 505, W, 4, 26, 26, 30, 1);
for (let x = 20; x < W; x += 100) fillRect(x, 552, 60, 7, 255, 245, 179, 0.85);
// wet-road puddle glints
for (let i = 0; i < 26; i++) {
  const x = Math.floor(rand() * W);
  const y = 520 + Math.floor(rand() * 70);
  fillRect(x, y, 14 + Math.floor(rand() * 22), 1, 109, 213, 237, 0.16 + rand() * 0.12);
}

// Bus reflection on wet road.
for (let y = 508; y < 600; y++) {
  const t = (y - 508) / 92;
  const a = 0.30 * (1 - t);
  fillRect(120, y, 560, 1, 140, 40, 32, a);
}

// TransMilenio bus.
const busX = 110, busY = 350, busW = 580, busH = 155;
fillRoundedRect(busX, busY, busW, busH, 18, 192, 57, 43, 1);     // shell
fillRect(busX, busY, busW, 12, 150, 34, 28, 1);                 // roof shadow
fillRoundedRect(busX + 8, busY + 58, busW - 16, 14, 4, 244, 201, 93, 1); // yellow stripe
// headlight
fillCircle(busX + busW - 26, busY + 22, 9, 255, 236, 170, 1);
fillCircle(busX + busW - 26, busY + 22, 16, 255, 236, 170, 0.25);
// doors (front + back)
fillRect(busX + 16, busY + 96, 26, 44, 128, 30, 24, 1);
fillRect(busX + busW - 42, busY + 96, 26, 44, 128, 30, 24, 1);
// windows (lit band with mullions)
fillRect(busX + 22, busY + 18, busW - 44, 26, 255, 245, 179, 0.95);
for (let i = 0; i < 9; i++) fillRect(busX + 22 + i * 60, busY + 14, 12, 34, 150, 34, 28, 1);
fillRect(busX + 22, busY + 44, busW - 44, 4, 150, 34, 28, 1);
// side text
drawTextWithOutline('PORTAL', 400, busY + 80, 5, [255, 245, 179], [60, 12, 10]);
drawTextWithOutline('11:59', 400, busY + 108, 6, [244, 201, 93], [60, 12, 10]);
// wheels
fillCircle(busX + 46, busY + busH - 12, 16, 20, 20, 22, 1);
fillCircle(busX + 46, busY + busH - 12, 7, 90, 90, 100, 1);
fillCircle(busX + busW - 46, busY + busH - 12, 16, 20, 20, 22, 1);
fillCircle(busX + busW - 46, busY + busH - 12, 7, 90, 90, 100, 1);

// Ghosts (surreal translucent figures).
function ghost(x, y, r, alpha, eyeR) {
  fillCircle(x, y - r * 0.2, r * 0.75, 223, 243, 255, alpha);
  fillCircle(x - r * 0.55, y + r * 0.15, r * 0.5, 223, 243, 255, alpha);
  fillCircle(x + r * 0.55, y + r * 0.15, r * 0.5, 223, 243, 255, alpha);
  fillCircle(x, y + r * 0.5, r * 0.65, 223, 243, 255, alpha);
  fillCircle(x - eyeR, y - r * 0.15, eyeR, 26, 43, 58, 0.85);
  fillCircle(x + eyeR, y - r * 0.15, eyeR, 26, 43, 58, 0.85);
}
ghost(128, 268, 26, 0.32, 4);
ghost(668, 318, 18, 0.26, 3);
ghost(452, 76, 12, 0.20, 2);

// Big countdown.
drawTextWithOutline('11:59', 400, 128, 11, [244, 201, 93], [16, 8, 26]);
drawTextWithOutline('EL ULTIMO TRANSMI', 400, 218, 4, [185, 198, 232], [16, 8, 26]);

// Rain streaks (two layers).
function rain(layer, alpha) {
  for (let i = 0; i < 42; i++) {
    const x = Math.floor(rand() * (W + 30)) - 15;
    const y = layer === 0 ? 0 : Math.floor(rand() * 400);
    const len = 12 + Math.floor(rand() * 14);
    const dr = 0.9;
    for (let t = 0; t < len; t++) {
      const px = x + t * dr;
      const py = y + t * 2.4;
      if (px < 0 || px >= W || py < 0 || py >= H) continue;
      blendPx(Math.floor(px), Math.floor(py), 159, 184, 255, alpha * (1 - t / len));
    }
  }
}
rain(0, 0.16);
rain(1, 0.10);

// Subtle scanlines.
for (let y = 3; y < H; y += 4) fillRect(0, y, W, 1, 0, 0, 0, 0.05);
// Vignette.
fillRect(0, 0, W, 6, 0, 0, 0, 0.18);
fillRect(0, H - 6, W, 6, 0, 0, 0, 0.18);

// ---------------------------------------------------------------- PNG encode
let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePNG() {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const stride = W * 4;
  const raw = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(img.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const png = encodePNG();
const outPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'cover.png');
writeFileSync(outPath, png);
console.log(`cover.png written: ${png.length} bytes (${W}x${H}, RGBA PNG)`);
