#!/usr/bin/env node
/**
 * Generates 3 RGBA PNG icons for the PWA manifest using only Node.js built-ins.
 * Output: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
 */
import { deflateSync } from 'node:zlib';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

const RED   = [0xE5, 0x25, 0x21, 0xFF];
const WHITE = [0xFF, 0xFF, 0xFF, 0xFF];

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

function buildPNG(size, getPixel) {
  const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = 1 + size * 4;
  const raw = Buffer.allocUnsafe(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = getPixel(x / size, y / size);
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

// Signed distance from point (px,py) to segment (ax,ay)-(bx,by)
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const HALF_STROKE = 0.08;

// Returns true if normalized coordinate (nx, ny) falls within the letter M shape.
// M is defined by 4 segments: left stem, right stem, left diagonal, right diagonal.
function isLetterM(nx, ny) {
  return (
    distSeg(nx, ny, 0.15, 0.10, 0.15, 0.90) < HALF_STROKE || // left stem
    distSeg(nx, ny, 0.85, 0.10, 0.85, 0.90) < HALF_STROKE || // right stem
    distSeg(nx, ny, 0.15, 0.10, 0.50, 0.50) < HALF_STROKE || // left diagonal
    distSeg(nx, ny, 0.85, 0.10, 0.50, 0.50) < HALF_STROKE    // right diagonal
  );
}

// mScale < 1 shrinks the M toward the center (used for maskable safe-zone compliance).
// mScale = 1.0 for regular icons; 0.75 places the M within the PWA 80% safe zone.
function makePixelFn(mScale) {
  return (nx, ny) => {
    const mx = (nx - 0.5) / mScale + 0.5;
    const my = (ny - 0.5) / mScale + 0.5;
    return isLetterM(mx, my) ? WHITE : RED;
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const icons = [
    { file: 'icon-192.png',          size: 192, scale: 1.0  },
    { file: 'icon-512.png',          size: 512, scale: 1.0  },
    { file: 'icon-maskable-512.png', size: 512, scale: 0.75 },
  ];

  await Promise.all(icons.map(({ file, size, scale }) =>
    writeFile(join(OUT_DIR, file), buildPNG(size, makePixelFn(scale)))
  ));

  console.log(`Generated ${icons.length} icons in ${OUT_DIR}`);
  for (const { file, size } of icons) console.log(`  ${file} (${size}x${size})`);
}

main().catch(err => { console.error(err); process.exit(1); });
