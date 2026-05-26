#!/usr/bin/env node
/**
 * Generates clockwork-themed PWA icons and compact game sprites using only Node.js built-ins.
 */
import { deflateSync } from 'node:zlib';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');
const ASSET_DIR = join(__dirname, '..', 'src', 'assets', 'images');

const WORKSHOP = [0x10, 0x34, 0x39, 0xFF];
const WORKSHOP_LIGHT = [0x19, 0x4C, 0x50, 0xFF];
const BRASS = [0xC9, 0x97, 0x3A, 0xFF];
const BRASS_LIGHT = [0xF4, 0xD5, 0x8D, 0xFF];
const TEAL = [0x36, 0x94, 0x8F, 0xFF];
const GLOW = [0x9A, 0xF5, 0xED, 0xFF];
const TRANSPARENT = [0x00, 0x00, 0x00, 0x00];

// CRC32 table for PNG chunk checksums
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(d.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crcBuf]);
}

function buildPNG(width, height, getPixel) {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = 1 + width * 4;
  const raw = Buffer.allocUnsafe(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel((x + 0.5) / width, (y + 0.5) / height);
      const off = y * stride + 1 + x * 4;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b; raw[off + 3] = a;
    }
  }

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function makeClockIconPixel(scale) {
  return (nx, ny) => {
    const x = (nx - 0.5) / scale;
    const y = (ny - 0.5) / scale;
    const radius = Math.hypot(x, y);
    const angle = Math.atan2(y, x);
    const tooth = Math.cos(angle * 12) > 0.38 && radius < 0.45 && radius > 0.35;
    if (tooth || (radius > 0.31 && radius < 0.39)) return BRASS;
    if (radius < 0.30) {
      if (distSeg(x, y, 0, 0, 0, -0.17) < 0.026 || distSeg(x, y, 0, 0, 0.13, 0.08) < 0.026) {
        return TEAL;
      }
      if (radius < 0.045) return BRASS;
      return BRASS_LIGHT;
    }
    return (nx + ny > 0.92 && nx + ny < 1.12) ? WORKSHOP_LIGHT : WORKSHOP;
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(ASSET_DIR, { recursive: true });

  const icons = [
    { file: 'icon-192.png',          size: 192, scale: 1.0  },
    { file: 'icon-512.png',          size: 512, scale: 1.0  },
    { file: 'icon-maskable-512.png', size: 512, scale: 0.75 },
  ];

  await Promise.all(icons.map(({ file, size, scale }) =>
    writeFile(join(OUT_DIR, file), buildPNG(size, size, makeClockIconPixel(scale)))
  ));

  const gearBit = buildPNG(32, 32, (nx, ny) => {
    const x = nx - 0.5;
    const y = ny - 0.5;
    const radius = Math.hypot(x, y);
    const angle = Math.atan2(y, x);
    const tooth = Math.cos(angle * 8) > 0.28 && radius >= 0.30 && radius <= 0.47;
    if (tooth || (radius >= 0.25 && radius <= 0.38)) return BRASS;
    if (radius < 0.17) return TEAL;
    if (radius < 0.25) return BRASS_LIGHT;
    return TRANSPARENT;
  });
  const beacon = buildPNG(32, 64, (nx, ny) => {
    const x = nx - 0.5;
    const dialY = ny - 0.28;
    const dialRadius = Math.hypot(x, dialY);
    if (ny > 0.82 && Math.abs(x) < 0.28) return BRASS;
    if (Math.abs(x) < 0.055 && ny > 0.30 && ny <= 0.84) return BRASS;
    if (dialRadius < 0.23 && dialRadius > 0.17) return BRASS;
    if (dialRadius <= 0.17) {
      if (distSeg(x, dialY, 0, 0, 0, -0.11) < 0.022 || distSeg(x, dialY, 0, 0, 0.09, 0.05) < 0.022) return GLOW;
      return TEAL;
    }
    return TRANSPARENT;
  });
  await Promise.all([
    writeFile(join(ASSET_DIR, 'gear-bit.png'), gearBit),
    writeFile(join(ASSET_DIR, 'beacon.png'), beacon),
  ]);

  console.log(`Generated ${icons.length} icons in ${OUT_DIR}`);
  for (const { file, size } of icons) console.log(`  ${file} (${size}x${size})`);
  console.log(`Generated clockwork sprites in ${ASSET_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
